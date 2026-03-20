# Auto-Logic Features

All automatic behaviors in the timetable and time records views that can be toggled on/off.

---

## Timetable (`components/timetable.tsx` + `hooks/use-timetable-logic.ts`)

### 1. Autofill Start
- **Location**: `TimetableRow` — `onFocus` of Planned Start input
- **Behavior**: Clicking an empty _Start_ field auto-fills it from the previous row's end time, or the current time rounded to the nearest 5 minutes if no previous row exists.
- **Helper**: `getAutofillTime()`, `roundUp5()`, `minutesToHHmm()`
- **Default**: On (green toggle)

### 2. Autofill End AM/PM
- **Location**: `TimetableRow` — `onFocus` of Planned End input
- **Behavior**: Tabbing into an empty _End_ field pre-sets the AM/PM half-day to match the start time so the user only needs to adjust the digits.
- **Helper**: `getEndTimeAmPmDefault()`
- **Default**: On (shares Autofill toggle)

### 3. Autopush (Cascade Planned Times)
- **Location**: `useTimetableLogic` — `handleActualEndChange()`
- **Behavior**: Entering an _Actual End_ time cascades all subsequent unfinished rows forward, preserving each activity's planned duration. Stops at blank rows, skips completed rows.
- **Default**: On (sky-blue toggle)

### 4. Auto-compute Expected Duration
- **Location**: `useTimetableLogic` — `updateEntry()`
- **Behavior**: Automatically calculates expected minutes from planned start/end times whenever either changes.
- **Helper**: `diffMinutes()`
- **Default**: Always on (no toggle)

### 5. Auto-compute Actual Duration
- **Location**: `useTimetableLogic` — `updateEntry()`
- **Behavior**: Automatically calculates actual minutes from actual start/end times whenever either changes.
- **Helper**: `diffMinutes()`
- **Default**: Always on (no toggle)

### 6. Auto-generate Variance Notes
- **Location**: `useTimetableLogic` — `updateEntry()`
- **Behavior**: When both expected and actual durations exist, auto-generates a variance note (e.g. "+15m over", "10m under", "On time").
- **Helper**: `varianceNote()`
- **Default**: Always on (no toggle)

### 7. Auto-save (Debounced)
- **Location**: `useTimetableLogic` — `debouncedSave()` / `persist()`
- **Behavior**: All timetable changes are saved to the server after a 600ms debounce. Also saves on unmount.
- **Default**: Always on (no toggle)

---

## Time Records (`components/time-records-dialog.tsx`)

### 8. Auto-shift End Time
- **Location**: `handleEditStartTimeChange()`
- **Behavior**: When editing a time record's start time, the end time automatically adjusts to preserve the original recording's duration.
- **Default**: Always on (no toggle yet)

### 9. Cascade Shift Subsequent Records
- **Location**: `handleSaveEdit()`
- **Behavior**: On save, calculates the time delta between the original and new start time, then shifts all subsequent records by the same amount.
- **Default**: Always on (no toggle yet)

---

## Toggleable Features Summary

| # | Feature | View | Toggle | Default |
|---|---------|------|--------|---------|
| 1 | Autofill Start | Timetable | ✅ Green | On |
| 2 | Autofill End AM/PM | Timetable | ✅ (shares #1) | On |
| 3 | Autopush Cascade | Timetable | ✅ Sky-blue | On |
| 4 | Auto-compute Expected | Timetable | — (always on) | On |
| 5 | Auto-compute Actual | Timetable | — (always on) | On |
| 6 | Auto-generate Notes | Timetable | — (always on) | On |
| 7 | Auto-save | Timetable | — (always on) | On |
| 8 | Auto-shift End Time | Time Records | — (always on) | On |
| 9 | Cascade Shift Records | Time Records | — (always on) | On |
