export type Priority = 1 | 2 | 3

export interface Slot {
  date: string // yyyy-mm-dd
  start: number // minutes from midnight
  end: number
}

export interface Task {
  id: string
  title: string
  categoryId: string | null
  priority: Priority
  duration: number
  deadline: string | null
  slot: Slot | null
  repeat: number[] | null // weekdays 0 = Mon, slot.date is the first day
  done: boolean
  doneDates: string[]
}

export interface Category {
  id: string
  name: string
  color: string
}

export interface TemplateItem {
  title: string
  categoryId: string | null
  priority: Priority
  weekday: number
  start: number
  end: number
}

export interface PlannerState {
  tasks: Task[]
  categories: Category[]
  template: TemplateItem[]
}

export interface Occurrence {
  task: Task
  date: string
  start: number
  end: number
  done: boolean
}
