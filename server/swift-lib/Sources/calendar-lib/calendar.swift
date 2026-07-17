import EventKit
import Foundation
import SwiftRs

// Returns today's (or any range's) events as a JSON array string, or {"error": "..."}.
// Runs in the host app process so the Calendar (TCC) grant attaches to Vantage.app.
@_cdecl("vantage_events_json")
public func vantage_events_json(_ startTs: Double, _ endTs: Double) -> SRString {
    let store = EKEventStore()
    let sema = DispatchSemaphore(value: 0)
    var granted = false
    store.requestFullAccessToEvents { ok, _ in
        granted = ok
        sema.signal()
    }
    sema.wait()

    if !granted {
        return SRString("{\"error\":\"denied\"}")
    }

    let start = Date(timeIntervalSince1970: startTs)
    let end = Date(timeIntervalSince1970: endTs)
    let cals = store.calendars(for: .event)
    let pred = store.predicateForEvents(withStart: start, end: end, calendars: cals)
    let events = store.events(matching: pred)

    let iso = ISO8601DateFormatter()
    iso.formatOptions = [.withInternetDateTime]

    var arr: [[String: Any]] = []
    for e in events {
        guard let sd = e.startDate, let ed = e.endDate else { continue }
        var attendees: [String] = []
        if let parts = e.attendees {
            for p in parts {
                let s = p.url.absoluteString
                if s.hasPrefix("mailto:") {
                    attendees.append(String(s.dropFirst(7)))
                }
            }
        }
        let loc: Any = e.location ?? NSNull()
        arr.append([
            "id": e.eventIdentifier ?? UUID().uuidString,
            "title": e.title ?? "",
            "start": iso.string(from: sd),
            "end": iso.string(from: ed),
            "allDay": e.isAllDay,
            "calendarTitle": e.calendar?.title ?? "",
            "calendarColorHex": hexFromCGColor(e.calendar?.cgColor),
            "location": loc,
            "isRecurring": e.hasRecurrenceRules,
            "status": statusStr(e.status),
            "attendees": attendees,
        ])
    }

    let data = (try? JSONSerialization.data(withJSONObject: arr)) ?? Data("[]".utf8)
    return SRString(String(data: data, encoding: .utf8) ?? "[]")
}

private func statusStr(_ s: EKEventStatus) -> String {
    switch s {
    case .confirmed: return "confirmed"
    case .tentative: return "tentative"
    case .canceled: return "canceled"
    default: return "none"
    }
}

private func hexFromCGColor(_ color: CGColor?) -> String {
    guard let comps = color?.components, comps.count >= 3 else { return "#8a8172" }
    let r = Int((comps[0] * 255).rounded())
    let g = Int((comps[1] * 255).rounded())
    let b = Int((comps[2] * 255).rounded())
    return String(format: "#%02X%02X%02X", r, g, b)
}

// Non-prompting: reports the current Calendar authorization without triggering a dialog.
@_cdecl("vantage_calendar_auth")
public func vantage_calendar_auth() -> SRString {
    switch EKEventStore.authorizationStatus(for: .event) {
    case .fullAccess: return SRString("granted")
    case .notDetermined: return SRString("unknown")
    default: return SRString("denied")
    }
}
