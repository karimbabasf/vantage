use std::path::PathBuf;

use rusqlite::{params, Connection};

fn db_path() -> PathBuf {
    let mut p = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    p.push("com.karim.vantage");
    std::fs::create_dir_all(&p).ok();
    p.push("vantage.db");
    p
}

pub fn open() -> Result<Connection, String> {
    let conn = Connection::open(db_path()).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS ig_snapshots (
            ts INTEGER PRIMARY KEY,
            followers INTEGER NOT NULL,
            following INTEGER,
            media_count INTEGER
         );
         CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);",
    )
    .map_err(|e| e.to_string())?;
    Ok(conn)
}

pub fn kv_set(key: &str, value: &str) -> Result<(), String> {
    let c = open()?;
    c.execute(
        "INSERT INTO kv(key,value) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value=?2",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn kv_get(key: &str) -> Option<String> {
    let c = open().ok()?;
    c.query_row("SELECT value FROM kv WHERE key=?1", [key], |r| r.get::<_, String>(0)).ok()
}

pub fn kv_del(key: &str) -> Result<(), String> {
    let c = open()?;
    c.execute("DELETE FROM kv WHERE key=?1", [key]).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn insert_snapshot(ts: i64, followers: i64, following: Option<i64>, media_count: Option<i64>) -> Result<(), String> {
    let c = open()?;
    c.execute(
        "INSERT INTO ig_snapshots(ts,followers,following,media_count) VALUES(?1,?2,?3,?4)
         ON CONFLICT(ts) DO UPDATE SET followers=?2, following=?3, media_count=?4",
        params![ts, followers, following, media_count],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Follower count from the most recent snapshot at or before `ts`, if any.
pub fn followers_at_or_before(ts: i64) -> Option<i64> {
    let c = open().ok()?;
    c.query_row(
        "SELECT followers FROM ig_snapshots WHERE ts <= ?1 ORDER BY ts DESC LIMIT 1",
        [ts],
        |r| r.get::<_, i64>(0),
    )
    .ok()
}

pub fn series_since(ts: i64) -> Vec<(i64, i64)> {
    let c = match open() {
        Ok(c) => c,
        Err(_) => return vec![],
    };
    let mut out = vec![];
    if let Ok(mut stmt) = c.prepare("SELECT ts,followers FROM ig_snapshots WHERE ts >= ?1 ORDER BY ts ASC") {
        if let Ok(rows) = stmt.query_map([ts], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?))) {
            for row in rows.flatten() {
                out.push(row);
            }
        }
    }
    out
}
