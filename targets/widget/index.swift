import WidgetKit
import SwiftUI

@main
struct CadenceWidgets: WidgetBundle {
  var body: some Widget {
    CadenceTodayWidget()
  }
}

// MARK: - Data Model -----------------------------------------------------------

struct EventBrief: Codable, Hashable {
  let id: String
  let title: String
  let startH: Int
  let endH: Int
  let color: String
  let location: String?
}

struct WidgetPayload: Codable {
  let syncedAt: TimeInterval
  let events: [EventBrief]
}

enum WidgetStore {
  static let appGroup = "group.com.shoasano.scheduleapp"
  static let storageKey = "widget_data"

  static func load() -> WidgetPayload? {
    let defaults = UserDefaults(suiteName: appGroup)
    guard let str = defaults?.string(forKey: storageKey),
          let data = str.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(WidgetPayload.self, from: data)
  }
}

// MARK: - Timeline -------------------------------------------------------------

struct CadenceEntry: TimelineEntry {
  let date: Date
  let events: [EventBrief]
}

struct CadenceProvider: TimelineProvider {
  func placeholder(in context: Context) -> CadenceEntry {
    CadenceEntry(date: Date(), events: sampleEvents())
  }

  func getSnapshot(in context: Context, completion: @escaping (CadenceEntry) -> Void) {
    let payload = WidgetStore.load()
    completion(CadenceEntry(date: Date(), events: payload?.events ?? sampleEvents()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<CadenceEntry>) -> Void) {
    let payload = WidgetStore.load()
    let entry = CadenceEntry(date: Date(), events: payload?.events ?? [])
    // 30分ごとに再描画 (現在時刻に応じて next event が変わるため)
    let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
    completion(Timeline(entries: [entry], policy: .after(next)))
  }

  private func sampleEvents() -> [EventBrief] {
    [
      EventBrief(id: "1", title: "朝の読書", startH: 7, endH: 8, color: "blue", location: nil),
      EventBrief(id: "2", title: "チーム MTG", startH: 10, endH: 11, color: "orange", location: "Zoom"),
      EventBrief(id: "3", title: "ランチ", startH: 12, endH: 13, color: "green", location: nil),
    ]
  }
}

// MARK: - Color Mapping --------------------------------------------------------

func eventColor(_ id: String) -> Color {
  switch id {
  case "blue":   return Color(red: 0.039, green: 0.518, blue: 1.000)
  case "teal":   return Color(red: 0.188, green: 0.690, blue: 0.780)
  case "green":  return Color(red: 0.169, green: 0.659, blue: 0.290)
  case "orange": return Color(red: 1.000, green: 0.584, blue: 0.000)
  case "red":    return Color(red: 1.000, green: 0.231, blue: 0.188)
  case "pink":   return Color(red: 1.000, green: 0.176, blue: 0.333)
  case "purple": return Color(red: 0.686, green: 0.322, blue: 0.871)
  case "indigo": return Color(red: 0.345, green: 0.337, blue: 0.839)
  case "brown":  return Color(red: 0.545, green: 0.435, blue: 0.278)
  case "gray":   return Color(red: 0.431, green: 0.431, blue: 0.451)
  default:       return Color.blue
  }
}

func currentHour() -> Double {
  let comps = Calendar.current.dateComponents([.hour, .minute], from: Date())
  return Double(comps.hour ?? 0) + Double(comps.minute ?? 0) / 60.0
}

func formatHour(_ h: Int) -> String {
  String(format: "%02d:00", h)
}

func nextEvent(_ events: [EventBrief]) -> EventBrief? {
  let now = currentHour()
  return events.first { Double($0.endH) > now }
}

func dayLabel() -> String {
  let f = DateFormatter()
  f.locale = Locale(identifier: "ja_JP")
  f.dateFormat = "M月d日 (E)"
  return f.string(from: Date())
}

// MARK: - Widget Views ---------------------------------------------------------

struct SmallView: View {
  let entry: CadenceEntry
  var body: some View {
    let next = nextEvent(entry.events)
    let remaining = entry.events.filter { Double($0.endH) > currentHour() }.count
    return VStack(alignment: .leading, spacing: 4) {
      Text(dayLabel())
        .font(.system(size: 11, weight: .semibold))
        .foregroundColor(.secondary)
      if let n = next {
        Text(n.title)
          .font(.system(size: 17, weight: .bold))
          .foregroundColor(.primary)
          .lineLimit(2)
        HStack(spacing: 4) {
          Circle().fill(eventColor(n.color)).frame(width: 7, height: 7)
          Text("\(formatHour(n.startH)) – \(formatHour(n.endH))")
            .font(.system(size: 12, weight: .medium))
            .foregroundColor(.secondary)
        }
        Spacer(minLength: 0)
        Text("残り \(remaining) 件")
          .font(.system(size: 11, weight: .semibold))
          .foregroundColor(Color(red: 0.039, green: 0.518, blue: 1.000))
      } else {
        Spacer(minLength: 0)
        Text("今日の予定は完了！")
          .font(.system(size: 14, weight: .semibold))
          .foregroundColor(.primary)
        Spacer(minLength: 0)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

struct MediumView: View {
  let entry: CadenceEntry
  var body: some View {
    let now = currentHour()
    let upcoming = Array(entry.events.filter { Double($0.endH) > now }.prefix(3))
    return VStack(alignment: .leading, spacing: 6) {
      HStack {
        Text(dayLabel())
          .font(.system(size: 12, weight: .bold))
          .foregroundColor(.secondary)
        Spacer()
        Text("今日 \(entry.events.count) 件")
          .font(.system(size: 11, weight: .semibold))
          .foregroundColor(Color(red: 0.039, green: 0.518, blue: 1.000))
      }
      if upcoming.isEmpty {
        Spacer()
        Text("今日の予定は完了！")
          .font(.system(size: 16, weight: .semibold))
          .foregroundColor(.primary)
          .frame(maxWidth: .infinity, alignment: .center)
        Spacer()
      } else {
        ForEach(upcoming, id: \.id) { ev in
          HStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 2)
              .fill(eventColor(ev.color))
              .frame(width: 4, height: 28)
            VStack(alignment: .leading, spacing: 1) {
              Text(ev.title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.primary)
                .lineLimit(1)
              Text("\(formatHour(ev.startH)) – \(formatHour(ev.endH))")
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.secondary)
            }
            Spacer()
          }
        }
        Spacer(minLength: 0)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

struct LargeView: View {
  let entry: CadenceEntry
  var body: some View {
    let now = currentHour()
    let upcoming = Array(entry.events.filter { Double($0.endH) > now }.prefix(7))
    let past = entry.events.filter { Double($0.endH) <= now }
    return VStack(alignment: .leading, spacing: 8) {
      HStack {
        VStack(alignment: .leading, spacing: 2) {
          Text(dayLabel())
            .font(.system(size: 13, weight: .bold))
            .foregroundColor(.secondary)
          Text("今日の予定")
            .font(.system(size: 22, weight: .heavy))
            .foregroundColor(.primary)
        }
        Spacer()
        VStack(alignment: .trailing, spacing: 0) {
          Text("\(entry.events.count)")
            .font(.system(size: 26, weight: .heavy))
            .foregroundColor(Color(red: 0.039, green: 0.518, blue: 1.000))
          Text("件")
            .font(.system(size: 10, weight: .semibold))
            .foregroundColor(.secondary)
        }
      }

      Divider()

      if upcoming.isEmpty && past.isEmpty {
        Spacer()
        VStack(spacing: 4) {
          Text("今日の予定は完了！")
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(.primary)
          Text("お疲れさまでした")
            .font(.system(size: 12, weight: .medium))
            .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        Spacer()
      } else {
        VStack(alignment: .leading, spacing: 6) {
          ForEach(upcoming, id: \.id) { ev in
            HStack(spacing: 10) {
              RoundedRectangle(cornerRadius: 2)
                .fill(eventColor(ev.color))
                .frame(width: 4, height: 32)
              VStack(alignment: .leading, spacing: 2) {
                Text(ev.title)
                  .font(.system(size: 14, weight: .semibold))
                  .foregroundColor(.primary)
                  .lineLimit(1)
                HStack(spacing: 4) {
                  Text("\(formatHour(ev.startH)) – \(formatHour(ev.endH))")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.secondary)
                  if let loc = ev.location, !loc.isEmpty {
                    Text("・")
                      .font(.system(size: 11))
                      .foregroundColor(.secondary)
                    Text(loc)
                      .font(.system(size: 11, weight: .medium))
                      .foregroundColor(.secondary)
                      .lineLimit(1)
                  }
                }
              }
              Spacer()
            }
          }
        }
        Spacer(minLength: 0)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

// MARK: - Lock Screen Views (iOS 16+) -----------------------------------------

@available(iOS 16.0, *)
struct LockInlineView: View {
  let entry: CadenceEntry
  var body: some View {
    let next = nextEvent(entry.events)
    if let n = next {
      Text("\(formatHour(n.startH)) \(n.title)")
    } else {
      Text("予定なし")
    }
  }
}

@available(iOS 16.0, *)
struct LockRectangularView: View {
  let entry: CadenceEntry
  var body: some View {
    let now = currentHour()
    let upcoming = Array(entry.events.filter { Double($0.endH) > now }.prefix(2))
    return VStack(alignment: .leading, spacing: 2) {
      Text(dayLabel())
        .font(.system(size: 10, weight: .bold))
      if let first = upcoming.first {
        Text(first.title)
          .font(.system(size: 12, weight: .heavy))
          .lineLimit(1)
        Text("\(formatHour(first.startH))–\(formatHour(first.endH))")
          .font(.system(size: 10, weight: .semibold))
        if upcoming.count > 1 {
          let next = upcoming[1]
          Text("次: \(formatHour(next.startH)) \(next.title)")
            .font(.system(size: 9, weight: .medium))
            .lineLimit(1)
        }
      } else {
        Text("予定なし")
          .font(.system(size: 12, weight: .semibold))
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

@available(iOS 16.0, *)
struct LockCircularView: View {
  let entry: CadenceEntry
  var body: some View {
    let remaining = entry.events.filter { Double($0.endH) > currentHour() }.count
    return ZStack {
      AccessoryWidgetBackground()
      VStack(spacing: -2) {
        Text("\(remaining)")
          .font(.system(size: 22, weight: .heavy))
        Text("件")
          .font(.system(size: 8, weight: .semibold))
      }
    }
  }
}

struct CadenceWidgetEntryView: View {
  var entry: CadenceProvider.Entry
  @Environment(\.widgetFamily) var family

  var body: some View {
    Group {
      switch family {
      case .systemSmall:
        SmallView(entry: entry)
      case .systemLarge:
        LargeView(entry: entry)
#if canImport(WidgetKit)
      case .accessoryInline:
        if #available(iOS 16.0, *) {
          LockInlineView(entry: entry)
        } else { Text(entry.events.first?.title ?? "予定なし") }
      case .accessoryRectangular:
        if #available(iOS 16.0, *) {
          LockRectangularView(entry: entry)
        } else { Text(entry.events.first?.title ?? "予定なし") }
      case .accessoryCircular:
        if #available(iOS 16.0, *) {
          LockCircularView(entry: entry)
        } else { Text("\(entry.events.count)") }
#endif
      default:
        MediumView(entry: entry)
      }
    }
    .containerBackground(for: .widget) { Color(UIColor.systemBackground) }
  }
}

// MARK: - Widget Definition ----------------------------------------------------

struct CadenceTodayWidget: Widget {
  let kind: String = "CadenceTodayWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: CadenceProvider()) { entry in
      CadenceWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("今日の予定")
    .description("Cadence の今日の予定をホーム画面 / ロック画面で確認")
    .supportedFamilies(supportedFamiliesForOS())
  }
}

private func supportedFamiliesForOS() -> [WidgetFamily] {
  var f: [WidgetFamily] = [.systemSmall, .systemMedium, .systemLarge]
  if #available(iOS 16.0, *) {
    f.append(contentsOf: [.accessoryInline, .accessoryRectangular, .accessoryCircular])
  }
  return f
}
