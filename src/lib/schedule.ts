import type { Occurrence, Slot, Task, TemplateItem } from '../types'
import { fromKey, weekdayOf } from './time'

type Range = { start: number; end: number }

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

export function createTask(fields: Partial<Task> & { title: string }): Task {
  return {
    id: uid(),
    categoryId: null,
    priority: 2,
    deadline: null,
    slot: null,
    repeat: null,
    done: false,
    doneDates: [],
    ...fields,
    duration: fields.slot ? fields.slot.end - fields.slot.start : (fields.duration ?? 60),
  }
}

// a copy is always a single task, even when made from a repeating one
export function copyTask(task: Task, slot: Slot | null): Task {
  return {
    ...task,
    id: uid(),
    slot,
    repeat: null,
    done: false,
    doneDates: [],
    duration: slot ? slot.end - slot.start : task.slot ? task.slot.end - task.slot.start : task.duration,
  }
}

export const overlaps = (a: Range, b: Range) => a.start < b.end && b.start < a.end

// all tasks visible on a date, including repeating ones
export function occurrencesOn(tasks: Task[], date: string): Occurrence[] {
  const weekday = weekdayOf(fromKey(date))
  const result: Occurrence[] = []

  for (const task of tasks) {
    const { slot } = task
    if (!slot) continue

    if (task.repeat) {
      if (date >= slot.date && task.repeat.includes(weekday)) {
        result.push({ task, date, start: slot.start, end: slot.end, done: task.doneDates.includes(date) })
      }
    } else if (slot.date === date) {
      result.push({ task, date, start: slot.start, end: slot.end, done: task.done })
    }
  }

  return result.sort((a, b) => a.start - b.start)
}

export function hasConflict(tasks: Task[], slot: Slot, ignoreId?: string): boolean {
  return occurrencesOn(tasks, slot.date).some((o) => o.task.id !== ignoreId && overlaps(o, slot))
}

// first start time in [from, to] where `duration` fits between busy ranges
export function findFreeStart(busy: Range[], duration: number, from: number, to: number): number | null {
  let cursor = from
  for (const range of [...busy].sort((a, b) => a.start - b.start)) {
    if (range.start - cursor >= duration) return cursor
    cursor = Math.max(cursor, range.end)
  }
  return to - cursor >= duration ? cursor : null
}

const byUrgency = (a: Task, b: Task) =>
  (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999') ||
  b.priority - a.priority ||
  b.duration - a.duration

// greedy: the most urgent task takes the earliest free window before its deadline
export function autoPlan(tasks: Task[], days: { date: string; from: number }[], to: number): Task[] {
  let result = tasks
  const queue = tasks.filter((t) => !t.slot && !t.done).sort(byUrgency)

  for (const task of queue) {
    for (const { date, from } of days) {
      if (task.deadline && date > task.deadline) break

      const start = findFreeStart(occurrencesOn(result, date), task.duration, from, to)
      if (start === null) continue

      const slot = { date, start, end: start + task.duration }
      result = result.map((t) => (t.id === task.id ? { ...t, slot } : t))
      break
    }
  }

  return result
}

export function weekToTemplate(tasks: Task[], dates: string[]): TemplateItem[] {
  return dates.flatMap((date, weekday) =>
    occurrencesOn(tasks, date)
      .filter((o) => !o.task.repeat)
      .map(({ task, start, end }) => ({
        title: task.title,
        categoryId: task.categoryId,
        priority: task.priority,
        weekday,
        start,
        end,
      })),
  )
}

export function applyTemplate(tasks: Task[], template: TemplateItem[], dates: string[]) {
  let result = tasks
  let skipped = 0

  for (const { weekday, start, end, ...fields } of template) {
    const slot = { date: dates[weekday], start, end }
    if (hasConflict(result, slot)) {
      skipped++
      continue
    }
    result = [...result, createTask({ ...fields, slot })]
  }

  return { tasks: result, skipped }
}

export interface Placed {
  occ: Occurrence
  lane: number
  lanes: number
}

// overlapping tasks share the column width side by side
export function layoutDay(items: Occurrence[]): Placed[] {
  const result: Placed[] = []
  let group: Placed[] = []
  let laneEnds: number[] = []
  let groupEnd = -1

  const flush = () => {
    group.forEach((p) => (p.lanes = laneEnds.length))
    result.push(...group)
    group = []
    laneEnds = []
  }

  for (const occ of [...items].sort((a, b) => a.start - b.start || b.end - a.end)) {
    if (occ.start >= groupEnd) flush()
    let lane = laneEnds.findIndex((end) => end <= occ.start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = occ.end
    groupEnd = Math.max(groupEnd, occ.end)
    group.push({ occ, lane, lanes: 1 })
  }
  flush()

  return result
}

// removes one-off tasks of the given days, repeating series stay
export const withoutDays = (tasks: Task[], dates: string[]) =>
  tasks.filter((t) => t.repeat || !t.slot || !dates.includes(t.slot.date))
