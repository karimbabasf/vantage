use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

use chrono::{Local, NaiveDateTime, TimeZone};

use crate::model::RawMail;

// Reads the newest N messages of each account's INBOX via a bounded range (never a
// full scan or a `whose` filter). Fields are FS(0x1f)/RS(0x1e) delimited.
//
// Mail returns `messages` newest-first: message 1 is the most recent, message c the
// oldest. So the newest slice is the HEAD, `1 thru hi`. Slicing the tail (`c-N+1 thru c`)
// silently yields the oldest mail in the box, which still parses and still sorts, so it
// looks healthy while showing mail weeks stale.
//
// Every property is fetched for the WHOLE range in one Apple Event. The obvious
// per-message form (`repeat with m in msgs`) costs one round trip per message per
// property, which walks IMAP and takes minutes or never returns. Same reason
// `extract name from` is not used here: it is a per-message Mail command, so the
// sender line is parsed in Rust instead.
//
// Message bodies are deliberately NOT read. `content of messages lo thru c` makes
// Mail pull every uncached message over IMAP: measured 21s and 59s per account,
// and it still timed out (-1712) on a second pass, so caching does not save it.
// That leaves `snippet` empty; see readme, the fix is a separate lazy endpoint
// that fetches bodies only for the handful of messages actually on screen.
const READ_SCRIPT: &str = r#"on run argv
	set N to 30
	if (count of argv) > 0 then set N to (item 1 of argv) as integer
	set {FS, RS} to {ASCII character 31, ASCII character 30}
	set outStr to ""
	tell application "Mail"
		repeat with acct in (every account)
			set theBox to missing value
			try
				set theBox to mailbox "INBOX" of acct
			end try
			if theBox is not missing value then
				set acctName to "Mail"
				try
					set acctName to (name of acct) as string
				end try
				set c to count of messages of theBox
				if c > 0 then
					set hi to N
					if hi > c then set hi to c

					tell theBox
						set subs to subject of messages 1 thru hi
						set ids to id of messages 1 thru hi
						set rds to read status of messages 1 thru hi
						set fls to flagged status of messages 1 thru hi
						set dts to date received of messages 1 thru hi
						set sndrs to sender of messages 1 thru hi
						set tos to {}
						try
							set tos to address of to recipients of messages 1 thru hi
						end try
					end tell

					repeat with i from 1 to (count of ids)
						set d to item i of dts
						set dISO to ((year of d) as string) & "-" & my pad(month of d as integer) & "-" & my pad(day of d) & "T" & my pad(hours of d) & ":" & my pad(minutes of d) & ":" & my pad(seconds of d)

						set toAddrs to ""
						try
							set AppleScript's text item delimiters to ","
							set toAddrs to (item i of tos) as string
							set AppleScript's text item delimiters to ""
						end try

						set outStr to outStr & acctName & FS & "INBOX" & FS & (item i of sndrs) & FS & (item i of subs) & FS & dISO & FS & (item i of rds) & FS & (item i of fls) & FS & (item i of ids) & FS & toAddrs & FS & "" & RS
					end repeat
				end if
			end if
		end repeat
	end tell
	return outStr
end run

on pad(n)
	set n to n as integer
	if n < 10 then return "0" & (n as string)
	return n as string
end pad"#;

const ACTION_SCRIPT: &str = r#"on run argv
	set theAction to item 1 of argv
	set acctName to item 2 of argv
	set boxName to item 3 of argv
	set targetId to (item 4 of argv) as integer
	tell application "Mail"
		set theBox to mailbox boxName of account acctName
		set theMsg to (first message of theBox whose id is targetId)
		if theAction is "read" then set read status of theMsg to true
		if theAction is "unread" then set read status of theMsg to false
		if theAction is "flag" then set flagged status of theMsg to true
		if theAction is "unflag" then set flagged status of theMsg to false
		if theAction is "open" then
			activate
			open theMsg
		end if
	end tell
	return "ok"
end run"#;

/// Splits a raw `sender` line into (display name, address). Mail's own
/// `extract name from` would cost one Apple Event per message, so we do it here.
/// Handles `Name <a@b.com>`, `<a@b.com>` and a bare `a@b.com`.
fn split_sender(raw: &str) -> (String, String) {
    let raw = raw.trim();
    match (raw.rfind('<'), raw.rfind('>')) {
        (Some(open), Some(close)) if close > open => {
            let addr = raw[open + 1..close].trim().to_string();
            let name = raw[..open].trim().trim_matches('"').trim().to_string();
            (name, addr)
        }
        _ => (String::new(), raw.to_string()),
    }
}

/// osascript with a hard ceiling. Mail can wedge indefinitely on a bad IMAP
/// connection; without this the worker thread never comes back.
fn osascript(script: &str, args: &[&str], timeout: Duration) -> Result<String, String> {
    let mut child = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let deadline = Instant::now() + timeout;
    loop {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(_) => break,
            None if Instant::now() >= deadline => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(format!("Mail did not respond within {}s", timeout.as_secs()));
            }
            None => std::thread::sleep(Duration::from_millis(50)),
        }
    }

    let out = child.wait_with_output().map_err(|e| e.to_string())?;
    if !out.status.success() {
        return Err(map_err(&String::from_utf8_lossy(&out.stderr)));
    }
    Ok(String::from_utf8_lossy(&out.stdout).into_owned())
}

fn parse_local_iso(s: &str) -> String {
    match NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S") {
        Ok(naive) => Local
            .from_local_datetime(&naive)
            .single()
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_else(|| Local::now().to_rfc3339()),
        Err(_) => Local::now().to_rfc3339(),
    }
}

fn is_bulk(addr: &str, snippet: &str) -> bool {
    let a = addr.to_lowercase();
    const PATS: [&str; 12] = [
        "noreply", "no-reply", "no_reply", "donotreply", "do-not-reply", "newsletter",
        "notification", "mailer@", "updates@", "bounce", "mailchimp", "substack",
    ];
    if PATS.iter().any(|p| a.contains(p)) {
        return true;
    }
    snippet.to_lowercase().contains("unsubscribe")
}

fn map_err(stderr: &str) -> String {
    if stderr.contains("Not authorized") || stderr.contains("-1743") || stderr.contains("not allowed") {
        "denied".to_string()
    } else {
        stderr.trim().to_string()
    }
}

pub fn read_recent(my_addresses: &[String], limit: usize) -> Result<Vec<RawMail>, String> {
    // Bodies dominate this call: Mail pulls any uncached message over IMAP, which
    // costs ~60s cold per account and drops to seconds once warm. Generous ceiling
    // so a cold first load completes rather than erroring.
    let stdout = osascript(READ_SCRIPT, &[&limit.to_string()], Duration::from_secs(150))?;

    let mine: Vec<String> = my_addresses.iter().map(|a| a.to_lowercase()).collect();
    let mut items: Vec<RawMail> = Vec::new();

    for rec in stdout.split('\u{1e}') {
        if rec.trim().is_empty() {
            continue;
        }
        let f: Vec<&str> = rec.split('\u{1f}').collect();
        if f.len() < 10 {
            continue;
        }
        let (name, addr) = split_sender(f[2]);
        let snippet = f[9].replace(['\r', '\n'], " ").trim().to_string();
        let to_lower = f[8].to_lowercase();
        let to_me = !mine.is_empty() && mine.iter().any(|m| to_lower.contains(m.as_str()));

        items.push(RawMail {
            id: f[7].trim().to_string(),
            account: f[0].to_string(),
            mailbox: f[1].to_string(),
            sender_name: if name.is_empty() { addr.clone() } else { name },
            sender_address: addr.clone(),
            subject: f[3].to_string(),
            snippet: snippet.clone(),
            date: parse_local_iso(f[4].trim()),
            unread: f[5].trim() != "true",
            flagged: f[6].trim() == "true",
            to_me,
            bulk: is_bulk(&addr, &snippet),
        });
    }

    items.sort_by(|a, b| b.date.cmp(&a.date));
    Ok(items)
}

pub fn run_action(action: &str, account: &str, mailbox: &str, id: &str) -> Result<(), String> {
    osascript(
        ACTION_SCRIPT,
        &[action, account, mailbox, id],
        Duration::from_secs(20),
    )?;
    Ok(())
}

/// Cheap probe: is Mail automation granted? Sends one trivial Apple Event.
#[allow(dead_code)]
pub fn is_granted() -> bool {
    Command::new("osascript")
        .arg("-e")
        .arg("tell application \"Mail\" to get name")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}
