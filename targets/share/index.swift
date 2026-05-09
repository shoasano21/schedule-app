import UIKit
import Social
import UniformTypeIdentifiers

private let APP_GROUP = "group.com.shoasano.scheduleapp"
private let STORAGE_KEY = "pending_shares"

/// 共有シートで Cadence を選択した時のエントリポイント。
/// テキスト・URL を受け取り、App Group の UserDefaults に
/// JSON 配列で追記する。Cadence 本体起動時にこれを読みメモ化する。
class ShareViewController: SLComposeServiceViewController {

  override func isContentValid() -> Bool {
    return true
  }

  override func didSelectPost() {
    let group = DispatchGroup()
    var sharedURL: String?
    var sharedTitle: String? = self.contentText

    if let extensionItems = self.extensionContext?.inputItems as? [NSExtensionItem] {
      for item in extensionItems {
        guard let attachments = item.attachments else { continue }
        for attachment in attachments {
          if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
            group.enter()
            attachment.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { (data, _) in
              if let url = data as? URL {
                sharedURL = url.absoluteString
              } else if let urlStr = data as? String {
                sharedURL = urlStr
              }
              group.leave()
            }
          } else if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
            group.enter()
            attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { (data, _) in
              if let text = data as? String {
                if sharedURL == nil, let url = self.extractURL(from: text) {
                  sharedURL = url
                  if sharedTitle == nil || sharedTitle?.isEmpty == true {
                    sharedTitle = text
                  }
                } else if sharedTitle == nil || sharedTitle?.isEmpty == true {
                  sharedTitle = text
                }
              }
              group.leave()
            }
          }
        }
      }
    }

    group.notify(queue: .main) {
      if let url = sharedURL {
        self.savePending(url: url, title: sharedTitle ?? "")
      }
      self.extensionContext?.completeRequest(returningItems: nil)
    }
  }

  override func configurationItems() -> [Any]! {
    return []
  }

  // MARK: - Helpers

  private func extractURL(from text: String) -> String? {
    let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
    let range = NSRange(text.startIndex..., in: text)
    if let match = detector?.firstMatch(in: text, options: [], range: range),
       let r = Range(match.range, in: text) {
      return String(text[r])
    }
    return nil
  }

  private func savePending(url: String, title: String) {
    guard let defaults = UserDefaults(suiteName: APP_GROUP) else { return }
    let existing = defaults.string(forKey: STORAGE_KEY) ?? "[]"
    var list: [[String: Any]] = []
    if let data = existing.data(using: .utf8),
       let parsed = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
      list = parsed
    }
    let entry: [String: Any] = [
      "url": url,
      "title": title.trimmingCharacters(in: .whitespacesAndNewlines),
      "ts": Date().timeIntervalSince1970,
    ]
    list.append(entry)
    if let updated = try? JSONSerialization.data(withJSONObject: list),
       let updatedStr = String(data: updated, encoding: .utf8) {
      defaults.set(updatedStr, forKey: STORAGE_KEY)
    }
  }
}
