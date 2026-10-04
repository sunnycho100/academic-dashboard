export interface TimelineBlock {
  id: string
  label: string
  /** Minutes from local midnight of the day; may exceed 1440 past midnight */
  startMin: number
  endMin: number
  color?: string
  live?: boolean
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Planned lane: Timetable entries (local HH:MM). Rows without both times are skipped. */
export function plannedBlocks(
  entries: { id: string; plannedStart: string; plannedEnd: string; activityName: string }[],
): TimelineBlock[] {
  return entries
    .filter((e) => /^\d{1,2}:\d{2}$/.test(e.plannedStart) && /^\d{1,2}:\d{2}$/.test(e.plannedEnd))
    .map((e) => {
      const startMin = toMin(e.plannedStart)
      let endMin = toMin(e.plannedEnd)
      if (endMin <= startMin) endMin += 24 * 60 // runs past midnight
      return { id: e.id, label: e.activityName, startMin, endMin }
    })
}

/** Actual lane: time records, positioned relative to the local midnight of `day`. */
export function actualBlocks(
  records: { id: string; taskTitle: string; categoryColor: string; startTime: string; endTime: string }[],
  day: Date,
): TimelineBlock[] {
  const midnight = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
  const minutes = (iso: string) => Math.round((new Date(iso).getTime() - midnight) / 60_000)
  return records.map((r) => ({
    id: r.id,
    label: r.taskTitle,
    startMin: minutes(r.startTime),
    endMin: minutes(r.endTime),
    color: r.categoryColor,
  }))
}

/**
 * Hours the timeline draws: the whole day from midnight, so you can scroll back to
 * earlier work, extended past midnight when a block or "now" runs later.
 */
export function timelineRange(blocks: Pick<TimelineBlock, 'startMin' | 'endMin'>[], nowMin: number) {
  const endHour = Math.max(24, Math.floor(nowMin / 60) + 2, ...blocks.map((b) => Math.ceil(b.endMin / 60)))
  return { startHour: 0, endHour }
}
