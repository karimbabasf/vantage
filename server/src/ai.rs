use serde::{Deserialize, Serialize};

use crate::secrets;

#[derive(Deserialize)]
pub struct AiItem {
    pub id: String,
    pub sender: String,
    pub subject: String,
    pub snippet: String,
}

#[derive(Serialize, Deserialize)]
pub struct AiVerdict {
    pub id: String,
    pub reason: String,
}

/// Optional deeper triage: asks Claude for a terse per-message reason.
/// Fully opt-in (needs a stored key). Callers fall back to the local heuristic on error.
pub async fn triage(items: Vec<AiItem>) -> Result<Vec<AiVerdict>, String> {
    let key = secrets::get("anthropic_key").ok_or("No Anthropic key set")?;
    if items.is_empty() {
        return Ok(vec![]);
    }

    let list = items
        .iter()
        .map(|i| format!("id={} | from {} | subject: {} | {}", i.id, i.sender, i.subject, i.snippet))
        .collect::<Vec<_>>()
        .join("\n");

    let prompt = format!(
        "You triage a busy founder's inbox. For each message decide, in at most 8 words, why it does or does not need a reply now. \
Return ONLY a JSON array of objects with keys \"id\" and \"reason\", nothing else.\n\n{list}"
    );

    let body = serde_json::json!({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 1024,
        "messages": [{ "role": "user", "content": prompt }]
    });

    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let text = resp.text().await.map_err(|e| e.to_string())?;
    let v: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    let content = v["content"][0]["text"].as_str().ok_or("Unexpected Claude response")?;

    let start = content.find('[').ok_or("No JSON array in response")?;
    let end = content.rfind(']').ok_or("No JSON array in response")? + 1;
    serde_json::from_str::<Vec<AiVerdict>>(&content[start..end]).map_err(|e| e.to_string())
}
