use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::Deserialize;

use crate::model::{IgDelta, IgMedia, IgProfile, IgSeriesPoint, IgStats};
use crate::{secrets, store};

const API: &str = "https://graph.facebook.com/v25.0";
const TOKEN_KEY: &str = "ig_user_token";
const PAGE_TOKEN_KEY: &str = "ig_page_token";

#[derive(Deserialize)]
struct Accounts {
    #[serde(default)]
    data: Vec<Page>,
}
#[derive(Deserialize)]
struct Page {
    id: String,
    #[serde(default)]
    access_token: Option<String>,
}
#[derive(Deserialize)]
struct IgLink {
    instagram_business_account: Option<IdObj>,
}
#[derive(Deserialize)]
struct IdObj {
    id: String,
}
#[derive(Deserialize)]
struct Profile {
    followers_count: Option<i64>,
    media_count: Option<i64>,
    username: Option<String>,
    name: Option<String>,
    profile_picture_url: Option<String>,
}
#[derive(Deserialize)]
struct MediaList {
    #[serde(default)]
    data: Vec<MediaNode>,
}
#[derive(Deserialize)]
struct MediaNode {
    id: String,
    caption: Option<String>,
    media_type: Option<String>,
    permalink: Option<String>,
    timestamp: Option<String>,
    like_count: Option<i64>,
    comments_count: Option<i64>,
}
#[derive(Deserialize)]
struct Insights {
    #[serde(default)]
    data: Vec<InsightMetric>,
}
#[derive(Deserialize)]
struct InsightMetric {
    name: String,
    total_value: Option<TotalValue>,
}
#[derive(Deserialize)]
struct TotalValue {
    value: Option<i64>,
}

async fn get_json<T: for<'de> Deserialize<'de>>(client: &reqwest::Client, url: &str) -> Result<T, String> {
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("graph {}: {}", status.as_u16(), text));
    }
    serde_json::from_str::<T>(&text).map_err(|e| format!("parse: {e}"))
}

/// Resolve (ig_user_id, best_token), caching the id and the longer-lived page token.
async fn resolve_ig(client: &reqwest::Client, token: &str) -> Result<(String, String), String> {
    if let (Some(id), Some(pt)) = (store::kv_get("ig_user_id"), secrets::get(PAGE_TOKEN_KEY)) {
        return Ok((id, pt));
    }
    let accounts: Accounts =
        get_json(client, &format!("{API}/me/accounts?fields=id,access_token&access_token={token}")).await?;
    let page = accounts.data.into_iter().next().ok_or("No Facebook Page is linked to this token.")?;
    let page_token = page.access_token.clone().unwrap_or_else(|| token.to_string());
    let link: IgLink = get_json(
        client,
        &format!("{API}/{}?fields=instagram_business_account&access_token={}", page.id, page_token),
    )
    .await?;
    let ig_id = link
        .instagram_business_account
        .ok_or("No Instagram Business account is linked to your Facebook Page.")?
        .id;
    store::kv_set("ig_user_id", &ig_id).ok();
    secrets::set(PAGE_TOKEN_KEY, &page_token).ok();
    Ok((ig_id, page_token))
}

async fn account_metrics(
    client: &reqwest::Client,
    ig_id: &str,
    token: &str,
    metrics: &str,
    since: i64,
    until: i64,
) -> HashMap<String, i64> {
    let url = format!(
        "{API}/{ig_id}/insights?metric={metrics}&period=day&metric_type=total_value&since={since}&until={until}&access_token={token}"
    );
    let mut map = HashMap::new();
    if let Ok(ins) = get_json::<Insights>(client, &url).await {
        for m in ins.data {
            if let Some(v) = m.total_value.and_then(|t| t.value) {
                map.insert(m.name, v);
            }
        }
    }
    map
}

pub async fn fetch_stats() -> Result<IgStats, String> {
    let token = match secrets::get(TOKEN_KEY) {
        Some(t) => t,
        None => return Ok(IgStats::disconnected()),
    };
    let client = reqwest::Client::new();
    let (ig_id, ptoken) = resolve_ig(&client, &token).await?;

    let profile: Profile = get_json(
        &client,
        &format!("{API}/{ig_id}?fields=followers_count,media_count,username,name,profile_picture_url&access_token={ptoken}"),
    )
    .await?;
    let followers = profile.followers_count.unwrap_or(0);

    let now = Utc::now().timestamp();
    store::insert_snapshot(now, followers, None, profile.media_count).ok();
    let d24h = store::followers_at_or_before(now - 86_400).map(|f| followers - f);
    let d7d = store::followers_at_or_before(now - 7 * 86_400).map(|f| followers - f);
    let series: Vec<IgSeriesPoint> = store::series_since(now - 14 * 86_400)
        .into_iter()
        .map(|(ts, f)| IgSeriesPoint {
            t: DateTime::from_timestamp(ts, 0).map(|d| d.to_rfc3339()).unwrap_or_default(),
            followers: f,
        })
        .collect();

    let media_list: MediaList = get_json(
        &client,
        &format!("{API}/{ig_id}/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count&limit=12&access_token={ptoken}"),
    )
    .await
    .unwrap_or(MediaList { data: vec![] });
    let media: Vec<IgMedia> = media_list
        .data
        .into_iter()
        .map(|m| IgMedia {
            id: m.id,
            caption: m.caption.unwrap_or_default(),
            media_type: m.media_type.unwrap_or_default(),
            permalink: m.permalink.unwrap_or_default(),
            thumbnail_url: None,
            timestamp: m.timestamp.unwrap_or_default(),
            likes: m.like_count.unwrap_or(0),
            comments: m.comments_count.unwrap_or(0),
            saved: None,
            reach: None,
        })
        .collect();

    let m24 = account_metrics(&client, &ig_id, &ptoken, "reach,likes,comments", now - 86_400, now).await;
    let m7 = account_metrics(&client, &ig_id, &ptoken, "reach,likes,comments", now - 7 * 86_400, now).await;

    Ok(IgStats {
        connected: true,
        profile: Some(IgProfile {
            username: profile.username.unwrap_or_default(),
            name: profile.name.unwrap_or_default(),
            avatar_url: profile.profile_picture_url,
            followers,
            following: None,
            media_count: profile.media_count.unwrap_or(0),
        }),
        follower_delta: Some(IgDelta {
            d24h: d24h.unwrap_or(0),
            d7d: d7d.unwrap_or(0),
        }),
        series,
        reach24h: m24.get("reach").copied(),
        reach7d: m7.get("reach").copied(),
        likes7d: m7.get("likes").copied(),
        comments7d: m7.get("comments").copied(),
        media,
        last_updated: Some(Utc::now().to_rfc3339()),
    })
}

pub async fn connect(token: String) -> Result<IgStats, String> {
    secrets::set(TOKEN_KEY, token.trim())?;
    store::kv_del("ig_user_id").ok();
    secrets::delete(PAGE_TOKEN_KEY).ok();
    fetch_stats().await
}

pub fn disconnect() -> Result<(), String> {
    secrets::delete(TOKEN_KEY).ok();
    secrets::delete(PAGE_TOKEN_KEY).ok();
    store::kv_del("ig_user_id").ok();
    Ok(())
}
