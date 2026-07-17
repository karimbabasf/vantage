use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub start: String,
    pub end: String,
    pub all_day: bool,
    pub calendar_title: String,
    pub calendar_color_hex: String,
    pub location: Option<String>,
    pub is_recurring: bool,
    pub status: String,
    #[serde(default)]
    pub attendees: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RawMail {
    pub id: String,
    pub account: String,
    pub mailbox: String,
    pub sender_name: String,
    pub sender_address: String,
    pub subject: String,
    pub snippet: String,
    pub date: String,
    pub unread: bool,
    pub flagged: bool,
    pub to_me: bool,
    pub bulk: bool,
}

#[derive(Serialize)]
pub struct PermissionStatus {
    pub calendar: String,
    pub mail: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct IgProfile {
    pub username: String,
    pub name: String,
    pub avatar_url: Option<String>,
    pub followers: i64,
    pub following: Option<i64>,
    pub media_count: i64,
}

#[derive(Serialize, Clone, Debug)]
pub struct IgDelta {
    pub d24h: i64,
    pub d7d: i64,
}

#[derive(Serialize, Clone, Debug)]
pub struct IgSeriesPoint {
    pub t: String,
    pub followers: i64,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct IgMedia {
    pub id: String,
    pub caption: String,
    pub media_type: String,
    pub permalink: String,
    pub thumbnail_url: Option<String>,
    pub timestamp: String,
    pub likes: i64,
    pub comments: i64,
    pub saved: Option<i64>,
    pub reach: Option<i64>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct IgStats {
    pub connected: bool,
    pub profile: Option<IgProfile>,
    pub follower_delta: Option<IgDelta>,
    pub series: Vec<IgSeriesPoint>,
    pub reach24h: Option<i64>,
    pub reach7d: Option<i64>,
    pub likes7d: Option<i64>,
    pub comments7d: Option<i64>,
    pub media: Vec<IgMedia>,
    pub last_updated: Option<String>,
}

impl IgStats {
    pub fn disconnected() -> Self {
        IgStats {
            connected: false,
            profile: None,
            follower_delta: None,
            series: vec![],
            reach24h: None,
            reach7d: None,
            likes7d: None,
            comments7d: None,
            media: vec![],
            last_updated: None,
        }
    }
}
