import WidgetKit

// Called by addon.c; runs in the app's own process, which is what macOS accepts
@_cdecl("ad_reload_widgets")
public func reloadWidgets() {
  WidgetCenter.shared.reloadAllTimelines()
}
