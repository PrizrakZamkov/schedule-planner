import { describe, expect, it } from 'vitest'
import { normalizeState, PALETTE } from './migrate'

// a real save from the previous version
const OLD_SAVE = {
  tasks: [
    { id: 'a1', title: 'Лекция', categoryId: 'study', priority: 2, duration: 90, deadline: null, slot: { date: '2026-10-20', start: 600, end: 690 }, repeat: null, done: true, doneDates: [] },
    { id: 'a2', title: 'Зарядка', categoryId: 'health', priority: 2, duration: 30, deadline: null, slot: { date: '2026-10-19', start: 420, end: 450 }, repeat: [0, 2], done: false, doneDates: ['2026-10-21'] },
    { id: 'a3', title: 'Резюме', categoryId: 'work', priority: 3, duration: 60, deadline: '2026-10-30', slot: null, repeat: null, done: false, doneDates: [] },
  ],
  categories: [
    { id: 'study', name: 'Учёба', color: '#5b6cff' },
    { id: 'mine', name: 'Своя', color: '#123456' },
  ],
  template: [{ title: 'Лекция', categoryId: 'study', priority: 2, weekday: 1, start: 600, end: 690 }],
}

describe('normalizeState', () => {
  it('keeps every task of an old save unchanged', () => {
    const state = normalizeState(JSON.parse(JSON.stringify(OLD_SAVE)))!
    expect(state.tasks).toEqual(OLD_SAVE.tasks)
    expect(state.template).toEqual(OLD_SAVE.template)
  })

  it('brings colors of the rolled back light design back to the palette and keeps custom ones', () => {
    const [study, mine] = normalizeState(OLD_SAVE)!.categories
    expect(study.color).toBe(PALETTE[0])
    expect(mine.color).toBe('#123456')
  })

  it('fills fields missing in very old data', () => {
    const state = normalizeState({ tasks: [{ id: 'x', title: 'Old' }] })!
    expect(state.tasks[0]).toMatchObject({ done: false, doneDates: [], repeat: null, slot: null, priority: 2 })
    expect(state.categories).toEqual([])
  })

  it('rejects files that are not planner data', () => {
    expect(normalizeState({ foo: 1 })).toBeNull()
    expect(normalizeState(null)).toBeNull()
  })
})

describe('multi-day tasks in saves', () => {
  it('keeps span when present and adds nothing to old tasks', () => {
    const state = normalizeState({ tasks: [{ id: 's', title: 'Trip', span: { from: '2026-10-30', to: '2026-11-01' } }, OLD_SAVE.tasks[0]] })!
    expect(state.tasks[0].span).toEqual({ from: '2026-10-30', to: '2026-11-01' })
    expect('span' in state.tasks[1]).toBe(false)
  })
})
