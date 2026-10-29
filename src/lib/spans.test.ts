import { describe, expect, it } from 'vitest'
import { createTask, withoutDays } from './schedule'
import { layoutSpans, shiftDate, spanDays } from './spans'

const WEEK = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']
const span = (title: string, from: string, to: string) => createTask({ title, span: { from, to } })

describe('layoutSpans', () => {
  it('clips spans to the week and marks cut edges', () => {
    const [p] = layoutSpans([span('Сессия', '2026-10-29', '2026-11-06')], WEEK)
    expect(p).toMatchObject({ start: 3, end: 6, cutLeft: false, cutRight: true })
  })

  it('puts overlapping spans on different rows and reuses free rows', () => {
    const placed = layoutSpans([span('a', '2026-10-26', '2026-10-28'), span('b', '2026-10-27', '2026-10-30'), span('c', '2026-10-30', '2026-11-01')], WEEK)
    expect(placed.map((p) => [p.task.title, p.row])).toEqual([['a', 0], ['b', 1], ['c', 0]])
  })

  it('ignores spans of other weeks and ordinary tasks', () => {
    const tasks = [span('old', '2026-10-01', '2026-10-03'), createTask({ title: 'timed', slot: { date: WEEK[0], start: 600, end: 660 } })]
    expect(layoutSpans(tasks, WEEK)).toEqual([])
  })
})

describe('span helpers', () => {
  it('counts days and shifts dates across months', () => {
    expect(spanDays({ from: '2026-10-30', to: '2026-11-01' })).toBe(3)
    expect(shiftDate('2026-10-31', 2)).toBe('2026-11-02')
  })

  it('clear week removes only spans fully inside the week', () => {
    const tasks = [span('inside', '2026-10-27', '2026-10-28'), span('longer', '2026-10-30', '2026-11-04')]
    expect(withoutDays(tasks, WEEK).map((t) => t.title)).toEqual(['longer'])
  })
})
