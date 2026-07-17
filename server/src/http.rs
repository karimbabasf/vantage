//! HTTP surface: the routes the board calls. Handlers stay thin, the real work
//! lives in calendar/mail/instagram/secrets.

use std::path::PathBuf;

use axum::{
    extract::{Query, Request},
    http::{header, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::DateTime;
use serde::Deserialize;
use serde_json::json;
use tower_http::services::{ServeDir, ServeFile};

use crate::model::{CalendarEvent, IgStats, PermissionStatus, RawMail};
use crate::{ai, calendar, instagram, mail, secrets};

// ---------------------------------------------------------------- errors

pub struct ApiError(String);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": self.0 })),
        )
            .into_response()
    }
}

impl From<String> for ApiError {
    fn from(s: String) -> Self {
        ApiError(s)
    }
}

/// Calendar (EventKit), Mail (AppleScript) and Keychain calls all block. Off the
/// async workers they go, or one slow AppleScript stalls the whole server.
async fn blocking<T, F>(f: F) -> Result<T, ApiError>
where
    F: FnOnce() -> Result<T, String> + Send + 'static,
    T: Send + 'static,
{
    tokio::task::spawn_blocking(f)
        .await
        .map_err(|e| ApiError(format!("worker panicked: {e}")))?
        .map_err(ApiError)
}

fn iso_to_ts(iso: &str) -> Result<f64, String> {
    DateTime::parse_from_rfc3339(iso)
        .map(|d| d.timestamp() as f64)
        .map_err(|e| format!("bad date {iso}: {e}"))
}

// ---------------------------------------------------------------- guard

/// This server hands out the user's mail and calendar on loopback, so any page in
/// any browser could try to read it. Two checks close that:
///   1. A custom header, which a cross-origin page cannot send without a preflight
///      this router never answers.
///   2. An Origin allowlist, so only our own dev/prod pages are accepted.
async fn guard(req: Request, next: Next) -> Result<Response, StatusCode> {
    let headers = req.headers();

    if headers.get("x-vantage-client").is_none() {
        return Err(StatusCode::FORBIDDEN);
    }

    if let Some(origin) = headers.get(header::ORIGIN).and_then(|v| v.to_str().ok()) {
        let local = origin.starts_with("http://localhost:") || origin.starts_with("http://127.0.0.1:");
        if !local {
            return Err(StatusCode::FORBIDDEN);
        }
    }

    Ok(next.run(req).await)
}

// ---------------------------------------------------------------- router

pub fn router(dist: PathBuf) -> Router {
    let api = Router::new()
        .route("/health", get(health))
        .route("/permissions", get(permissions))
        .route("/events", get(events))
        .route("/mail/list", post(mail_list))
        .route("/mail/action", post(mail_action))
        .route("/instagram", get(ig_stats))
        .route("/instagram/refresh", post(ig_refresh))
        .route("/instagram/connect", post(ig_connect))
        .route("/instagram/disconnect", post(ig_disconnect))
        .route("/anthropic-key", get(anthropic_key_present).put(anthropic_key_set))
        .route("/ai/triage", post(ai_triage))
        .layer(middleware::from_fn(guard));

    // Everything that is not /api is the built React app; unknown paths fall back
    // to index.html so client-side routes survive a reload.
    let spa = ServeDir::new(&dist).fallback(ServeFile::new(dist.join("index.html")));

    Router::new().nest("/api", api).fallback_service(spa)
}

// ---------------------------------------------------------------- handlers

async fn health() -> Json<serde_json::Value> {
    Json(json!({ "ok": true }))
}

async fn permissions() -> Json<PermissionStatus> {
    // Calendar status is read without prompting. Mail is left "unknown" so we do not
    // trigger the Automation dialog before the user actually loads mail.
    let calendar = tokio::task::spawn_blocking(calendar::auth_status)
        .await
        .unwrap_or_else(|_| "unknown".to_string());

    Json(PermissionStatus {
        calendar,
        mail: "unknown".to_string(),
    })
}

#[derive(Deserialize)]
struct EventsQuery {
    start: String,
    end: String,
}

async fn events(Query(q): Query<EventsQuery>) -> Result<Json<Vec<CalendarEvent>>, ApiError> {
    let start = iso_to_ts(&q.start)?;
    let end = iso_to_ts(&q.end)?;
    Ok(Json(blocking(move || calendar::read_events(start, end)).await?))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MailListReq {
    my_addresses: Vec<String>,
    limit: usize,
}

async fn mail_list(Json(r): Json<MailListReq>) -> Result<Json<Vec<RawMail>>, ApiError> {
    let limit = r.limit.clamp(5, 100);
    Ok(Json(
        blocking(move || mail::read_recent(&r.my_addresses, limit)).await?,
    ))
}

#[derive(Deserialize)]
struct MailActionReq {
    action: String,
    account: String,
    mailbox: String,
    id: String,
}

async fn mail_action(Json(r): Json<MailActionReq>) -> Result<StatusCode, ApiError> {
    blocking(move || mail::run_action(&r.action, &r.account, &r.mailbox, &r.id)).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn ig_stats() -> Result<Json<IgStats>, ApiError> {
    Ok(Json(instagram::fetch_stats().await?))
}

async fn ig_refresh() -> Result<Json<IgStats>, ApiError> {
    Ok(Json(instagram::fetch_stats().await?))
}

#[derive(Deserialize)]
struct IgConnectReq {
    token: String,
}

async fn ig_connect(Json(r): Json<IgConnectReq>) -> Result<Json<IgStats>, ApiError> {
    Ok(Json(instagram::connect(r.token).await?))
}

async fn ig_disconnect() -> Result<StatusCode, ApiError> {
    blocking(instagram::disconnect).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn anthropic_key_present() -> Json<serde_json::Value> {
    let present = tokio::task::spawn_blocking(|| secrets::get("anthropic_key").is_some())
        .await
        .unwrap_or(false);
    Json(json!({ "present": present }))
}

#[derive(Deserialize)]
struct KeyReq {
    key: String,
}

async fn anthropic_key_set(Json(r): Json<KeyReq>) -> Result<StatusCode, ApiError> {
    blocking(move || {
        let key = r.key.trim();
        if key.is_empty() {
            secrets::delete("anthropic_key")
        } else {
            secrets::set("anthropic_key", key)
        }
    })
    .await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn ai_triage(Json(items): Json<Vec<ai::AiItem>>) -> Result<Json<Vec<ai::AiVerdict>>, ApiError> {
    Ok(Json(ai::triage(items).await?))
}
