use serde::Deserialize;
use swift_rs::{swift, SRString};

use crate::model::CalendarEvent;

swift!(fn vantage_events_json(start_ts: f64, end_ts: f64) -> SRString);
swift!(fn vantage_calendar_auth() -> SRString);

#[derive(Deserialize)]
struct ErrObj {
    error: String,
}

/// "granted" | "denied" | "unknown", without triggering a permission prompt.
pub fn auth_status() -> String {
    let s: SRString = unsafe { vantage_calendar_auth() };
    s.as_str().to_string()
}

/// Reads calendar events between two unix timestamps (seconds) via the in-process
/// Swift EventKit bridge. Recurring events arrive already expanded into occurrences.
pub fn read_events(start_ts: f64, end_ts: f64) -> Result<Vec<CalendarEvent>, String> {
    let raw: SRString = unsafe { vantage_events_json(start_ts, end_ts) };
    let json = raw.as_str();

    if let Ok(err) = serde_json::from_str::<ErrObj>(json) {
        return Err(err.error);
    }
    serde_json::from_str::<Vec<CalendarEvent>>(json).map_err(|e| format!("calendar parse error: {e}"))
}
