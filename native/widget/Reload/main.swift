import Foundation
import WidgetKit

// Run from inside Academic Dashboard.app, so macOS knows which app's widgets to redraw.
WidgetCenter.shared.reloadAllTimelines()
// The request goes over XPC; exiting at once cancels it before macOS reads it
RunLoop.main.run(until: Date().addingTimeInterval(1))
