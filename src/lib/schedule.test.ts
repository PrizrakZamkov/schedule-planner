import { describe, expect, it } from 'vitest'
import { applyTemplate, autoPlan, copyTask, createTask, findFreeStart, hasConflict, layoutDay, occurrencesOn, overlaps } from './schedule'

const MON = '2026-10-19'
const TUE = '2026-10-20'
const h = (hours: number) => hours * 60

describe('overlaps', () => {
  it('detects intersection', () => {
    expect(overlaps({ start: h(10), end: h(11) }, { start: h(10.5), end: h(12) })).toBe(true)
  })

  it('allows tasks that only touch', () => {
    expect(overlaps({ start: h(10), end: h(11) }, { start: h(11), end: h(12) })).toBe(false)
  })
})

describe('repeating tasks', () => {
  const gym = createTask({ title: 'Gym', slot: { date: MON, start: h(7), end: h(8) }, repeat: [1] })

  it('shows up only on chosen weekdays', () => {
    expect(occurrencesOn([gym], MON)).toHaveLength(0)
    expect(occurrencesOn([gym], TUE)).toHaveLength(1)
  })

  it('takes part in conflict checks', () => {
    expect(hasConflict([gym], { date: TUE, start: h(7.5), end: h(9) })).toBe(true)
  })
})

describe('findFreeStart', () => {
  const busy = [{ start: h(9), end: h(10) }, { start: h(11), end: h(12) }]

  it('finds the first window that fits', () => {
    expect(findFreeStart(busy, 60, h(9), h(18))).toBe(h(10))
    expect(findFreeStart(busy, 90, h(9), h(18))).toBe(h(12))
  })

  it('returns null when nothing fits', () => {
    expect(findFreeStart(busy, 90, h(9), h(12))).toBeNull()
  })
})

describe('autoPlan', () => {
  const days = [MON, TUE].map((date) => ({ date, from: h(9) }))

  it('puts urgent tasks first', () => {
    const later = createTask({ title: 'Later', duration: 60, priority: 3 })
    const urgent = createTask({ title: 'Urgent', duration: 60, priority: 1, deadline: MON })
    const [a, b] = autoPlan([later, urgent], days, h(21))
    expect(b.slot).toEqual({ date: MON, start: h(9), end: h(10) })
    expect(a.slot?.start).toBe(h(10))
  })

  it('never plans after the deadline', () => {
    const big = createTask({ title: 'Big', duration: h(13), deadline: MON })
    expect(autoPlan([big], days, h(21))[0].slot).toBeNull()
  })
})

describe('applyTemplate', () => {
  it('skips items that would overlap', () => {
    const existing = createTask({ title: 'Busy', slot: { date: MON, start: h(10), end: h(11) } })
    const template = [
      { title: 'A', categoryId: null, priority: 2 as const, weekday: 0, start: h(10), end: h(11) },
      { title: 'B', categoryId: null, priority: 2 as const, weekday: 1, start: h(10), end: h(11) },
    ]
    const result = applyTemplate([existing], template, [MON, TUE])
    expect(result.skipped).toBe(1)
    expect(result.tasks).toHaveLength(2)
  })
})

describe('layoutDay', () => {
  const at = (start: number, end: number) => createTask({ title: 't', slot: { date: MON, start: h(start), end: h(end) } })

  it('puts overlapping tasks side by side', () => {
    const placed = layoutDay(occurrencesOn([at(9, 11), at(10, 12), at(13, 14)], MON))
    expect(placed.map((p) => [p.lane, p.lanes])).toEqual([[0, 2], [1, 2], [0, 1]])
  })

  it('reuses a free lane', () => {
    const placed = layoutDay(occurrencesOn([at(9, 12), at(9, 10), at(10, 11)], MON))
    expect(placed.map((p) => p.lane)).toEqual([0, 1, 1])
  })
})

describe('copyTask', () => {
  it('makes an independent single task', () => {
    const gym = createTask({ title: 'Gym', slot: { date: MON, start: h(7), end: h(8) }, repeat: [0], done: true })
    const copy = copyTask(gym, { date: TUE, start: h(18), end: h(19) })
    expect(copy.id).not.toBe(gym.id)
    expect(copy).toMatchObject({ title: 'Gym', repeat: null, done: false, slot: { date: TUE, start: h(18) } })
  })

  it('keeps the length when copied to the inbox', () => {
    const task = createTask({ title: 'Read', slot: { date: MON, start: h(9), end: h(10.5) } })
    expect(copyTask(task, null).duration).toBe(90)
  })
})
