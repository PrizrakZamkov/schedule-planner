import type { Span, Task } from '../types'
import { addDays, fromKey, toKey } from './time'

export interface PlacedSpan {
  task: Task
  start: number // column index inside the week
  end: number
  row: number
  cutLeft: boolean
  cutRight: boolean
}

export const shiftDate = (date: string, days: number) => toKey(addDays(fromKey(date), days))

export const spanDays = (span: Span) => Math.round((fromKey(span.to).getTime() - fromKey(span.from).getTime()) / 86_400_000) + 1

// multi-day tasks of the week, each on the first row where it does not overlap another
export function layoutSpans(tasks: Task[], dates: string[]): PlacedSpan[] {
  const first = dates[0]
  const last = dates[dates.length - 1]
  const rowEnds: string[] = []

  return tasks
    .filter((t) => t.span && t.span.from <= last && t.span.to >= first)
    .sort((a, b) => a.span!.from.localeCompare(b.span!.from) || b.span!.to.localeCompare(a.span!.to))
    .map((task) => {
      const { from, to } = task.span!
      let row = rowEnds.findIndex((end) => end < from)
      if (row === -1) row = rowEnds.length
      rowEnds[row] = to
      return {
        task,
        start: from < first ? 0 : dates.indexOf(from),
        end: to > last ? dates.length - 1 : dates.indexOf(to),
        row,
        cutLeft: from < first,
        cutRight: to > last,
      }
    })
}
