import { useEffect, useReducer, type Dispatch } from 'react'
import type { Category, PlannerState, Slot, Task, TemplateItem } from './types'

const STORAGE_KEY = 'schedule:v1'

export const PALETTE = ['#7b9cf5', '#4fc1bf', '#79c779', '#e2b55a', '#e58a6b', '#e07fa7', '#a993e8', '#8f99a8']

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'study', name: 'Учёба', color: PALETTE[0] },
  { id: 'work', name: 'Работа', color: PALETTE[1] },
  { id: 'health', name: 'Здоровье', color: PALETTE[2] },
  { id: 'rest', name: 'Отдых', color: PALETTE[3] },
  { id: 'personal', name: 'Личное', color: PALETTE[5] },
]

export type Action =
  | { type: 'saveTask'; task: Task }
  | { type: 'deleteTask'; id: string }
  | { type: 'moveTask'; id: string; slot: Slot | null }
  | { type: 'toggleDone'; id: string; date: string }
  | { type: 'setTasks'; tasks: Task[] }
  | { type: 'saveCategory'; category: Category }
  | { type: 'deleteCategory'; id: string }
  | { type: 'setTemplate'; template: TemplateItem[] }
  | { type: 'replace'; state: PlannerState }

export type PlannerDispatch = Dispatch<Action>

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]
}

function moveTo(task: Task, slot: Slot | null): Task {
  if (!slot) return { ...task, slot: null, repeat: null, duration: task.slot ? task.slot.end - task.slot.start : task.duration }
  // a repeating series keeps its first day, only the time changes
  const date = task.repeat && task.slot ? task.slot.date : slot.date
  return { ...task, slot: { ...slot, date }, duration: slot.end - slot.start }
}

function toggle(task: Task, date: string): Task {
  if (!task.repeat) return { ...task, done: !task.done }
  const doneDates = task.doneDates.includes(date)
    ? task.doneDates.filter((d) => d !== date)
    : [...task.doneDates, date]
  return { ...task, doneDates }
}

function reducer(state: PlannerState, action: Action): PlannerState {
  switch (action.type) {
    case 'saveTask':
      return { ...state, tasks: upsert(state.tasks, action.task) }
    case 'deleteTask':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) }
    case 'moveTask':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? moveTo(t, action.slot) : t)) }
    case 'toggleDone':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? toggle(t, action.date) : t)) }
    case 'setTasks':
      return { ...state, tasks: action.tasks }
    case 'saveCategory':
      return { ...state, categories: upsert(state.categories, action.category) }
    case 'deleteCategory':
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
        tasks: state.tasks.map((t) => (t.categoryId === action.id ? { ...t, categoryId: null } : t)),
      }
    case 'setTemplate':
      return { ...state, template: action.template }
    case 'replace':
      return action.state
  }
}

export const emptyState = (): PlannerState => ({ tasks: [], categories: DEFAULT_CATEGORIES, template: [] })

export function isPlannerState(value: unknown): value is PlannerState {
  const v = value as PlannerState
  return !!v && Array.isArray(v.tasks) && Array.isArray(v.categories) && Array.isArray(v.template)
}

function load(): PlannerState {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return isPlannerState(saved) ? saved : emptyState()
  } catch {
    return emptyState()
  }
}

export function usePlanner() {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage can be full or disabled, the app still works in memory
    }
  }, [state])

  return [state, dispatch] as const
}
