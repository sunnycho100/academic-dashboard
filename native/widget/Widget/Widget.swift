import AppIntents
import SwiftUI
import WidgetKit

// ── Status written by the app (widget-status.json in its Application Support folder) ──

struct Status: Codable {
  var title: String?
  var state: String // running, paused or idle
  var since: Double? // when the running stretch started, ms since 1970
  var elapsed: Double // seconds on the current activity at `at`
  var elapsedRunning: Bool
  var today: Double // seconds tracked today at `at`
  var todayRunning: Bool
  var rate: Double // hourly value in dollars
  var showEarnings: Bool
  var at: Double // ms since 1970

  func elapsed(at date: Date) -> Double { elapsed + (elapsedRunning ? max(0, date.timeIntervalSince1970 - at / 1000) : 0) }
  func today(at date: Date) -> Double { today + (todayRunning ? max(0, date.timeIntervalSince1970 - at / 1000) : 0) }
}

func loadStatus() -> Status? {
  // Inside the sandbox, NSHomeDirectory is the widget's container; the real home holds the file
  let home = String(cString: getpwuid(getuid()).pointee.pw_dir)
  let url = URL(fileURLWithPath: home + "/Library/Application Support/Academic Dashboard/widget-status.json")
  guard let data = try? Data(contentsOf: url) else { return nil }
  return try? JSONDecoder().decode(Status.self, from: data)
}

// ── Time or Earned, picked on the widget itself ──

let heroKey = "hero"

struct ShowBigNumber: AppIntent {
  static var title: LocalizedStringResource = "Show time or earnings"
  @Parameter(title: "Show") var mode: String
  init() {}
  init(mode: String) { self.mode = mode }
  func perform() async throws -> some IntentResult {
    UserDefaults.standard.set(mode, forKey: heroKey)
    return .result()
  }
}

// ── Timeline: one entry a minute, so the minutes count up without seconds ──

struct Entry: TimelineEntry {
  let date: Date
  let status: Status?
  let hero: String
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> Entry { Entry(date: .now, status: nil, hero: "time") }
  func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
    completion(Entry(date: .now, status: loadStatus(), hero: UserDefaults.standard.string(forKey: heroKey) ?? "time"))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    let status = loadStatus()
    let hero = UserDefaults.standard.string(forKey: heroKey) ?? "time"
    let start = Calendar.current.dateInterval(of: .minute, for: .now)?.start ?? .now
    let entries = (0..<60).map { Entry(date: start.addingTimeInterval(Double($0) * 60), status: status, hero: hero) }
    // The app asks for a redraw whenever a timer starts, pauses or switches
    completion(Timeline(entries: entries, policy: .atEnd))
  }
}

// ── Look: widget A (Swiss railway clock and Braun): paper card, one big number, a yellow minute sweep ──

let yellow = Color(red: 0.91, green: 0.70, blue: 0.12)

func clock(_ seconds: Double) -> String {
  let s = max(0, Int(seconds))
  return "\(s / 3600):" + String(format: "%02d", (s % 3600) / 60)
}

func money(_ dollars: Double) -> String {
  let f = NumberFormatter()
  f.numberStyle = .currency
  f.currencyCode = "USD"
  return f.string(from: NSNumber(value: (dollars * 100).rounded(.down) / 100)) ?? "$0.00"
}

struct WidgetView: View {
  let entry: Entry
  @Environment(\.widgetFamily) var family
  @Environment(\.colorScheme) var scheme

  var body: some View {
    let s = entry.status
    let earnings = s?.showEarnings ?? true
    let hero = earnings ? entry.hero : "time"
    let idle = s == nil || s?.state == "idle"
    let elapsed = idle ? (s?.today(at: entry.date) ?? 0) : (s?.elapsed(at: entry.date) ?? 0)
    let today = s?.today(at: entry.date) ?? 0
    let earned = today / 3600 * (s?.rate ?? 20)
    let big = hero == "money" ? money(earned) : clock(elapsed)
    let muted = Color.secondary
    let large = family != .systemSmall

    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .top) {
        VStack(alignment: .leading, spacing: 1) {
          Text(idle ? "Today" : (s?.title ?? "Today")).font(.system(size: large ? 15 : 13, weight: .medium)).lineLimit(1)
          Group {
            if s?.state == "running", let since = s?.since {
              Text("since ") + Text(Date(timeIntervalSince1970: since / 1000), style: .time)
            } else {
              Text(s?.state == "paused" ? "Paused" : "Nothing running")
            }
          }
          .font(.system(size: large ? 13 : 11)).foregroundStyle(muted)
        }
        Spacer(minLength: 6)
        if earnings && large {
          HStack(spacing: 10) {
            ForEach(["time", "money"], id: \.self) { k in
              Button(intent: ShowBigNumber(mode: k)) {
                Text(k == "time" ? "Time" : "Earned")
                  .font(.system(size: 13))
                  .foregroundStyle(hero == k ? Color.primary : muted)
                  .overlay(alignment: .bottom) { if hero == k { Rectangle().frame(height: 1.5).offset(y: 3) } }
              }
              .buttonStyle(.plain)
            }
          }
        }
      }

      Spacer(minLength: 0)
      Text(big)
        .font(.system(size: large ? 150 : 64, weight: .medium))
        .monospacedDigit()
        .tracking(-2)
        .lineLimit(1)
        .minimumScaleFactor(0.3)
        .foregroundStyle(s?.state == "paused" && hero == "time" ? muted : Color.primary)

      // The yellow sweep fills once a minute while a timer runs
      if s?.state == "running" {
        let minute = Calendar.current.dateInterval(of: .minute, for: entry.date) ?? DateInterval(start: entry.date, duration: 60)
        ProgressView(timerInterval: minute.start...minute.end, countsDown: false) { EmptyView() } currentValueLabel: { EmptyView() }
          .progressViewStyle(.linear).tint(yellow).padding(.top, large ? 12 : 6)
      } else {
        Rectangle().fill(muted.opacity(0.2)).frame(height: 3).padding(.top, large ? 12 : 6)
      }

      if large {
        HStack(alignment: .top) {
          stat("Today", clock(today))
          Spacer()
          if earnings {
            if hero == "time" { stat("Earned", money(earned)) } else if !idle { stat("This session", clock(elapsed)) }
          }
        }
        .padding(.top, 14)
      } else {
        Text(earnings ? "Today \(clock(today)) · \(money(earned))" : "Today \(clock(today))")
          .font(.system(size: 11)).foregroundStyle(muted).padding(.top, 6).lineLimit(1).minimumScaleFactor(0.7)
      }
    }
    .containerBackground(for: .widget) {
      scheme == .dark ? Color(red: 0.07, green: 0.07, blue: 0.067) : Color(red: 0.953, green: 0.945, blue: 0.925)
    }
  }

  func stat(_ label: String, _ value: String) -> some View {
    VStack(alignment: .leading, spacing: 1) {
      Text(label).font(.system(size: 13)).foregroundStyle(.secondary)
      Text(value).font(.system(size: 22, weight: .medium)).monospacedDigit()
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

struct AcademicTimerWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "academic-timer", provider: Provider()) { WidgetView(entry: $0) }
      .configurationDisplayName("Study timer")
      .description("What you're working on, today's total and what it earned.")
      .supportedFamilies([.systemSmall, .systemLarge])
  }
}

@main struct AcademicWidgets: WidgetBundle {
  var body: some Widget { AcademicTimerWidget() }
}
