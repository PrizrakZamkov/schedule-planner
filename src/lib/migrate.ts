import type { Category, PlannerState, Task, TemplateItem } from '../types'

export const PALETTE = [
  '#7b9cf5', '#4fc1bf', '#79c779', '#e2b55a', '#e58a6b', '#e07fa7', '#a993e8', '#8f99a8',
  '#5aaee0', '#a3c95c', '#efd36b', '#d9925a', '#e87878', '#c58ad8', '#6fb5a0', '#c9b79c',
]

// colors of the light redesign that was rolled back, mapped to the same hues
const OLD_PALETTE = [
  '#5b6cff', '#10a37f', '#43a047', '#f29a1a', '#f2555a', '#d6479a', '#8b5cf6', '#64748b',
  '#1e9bd7', '#6aa121', '#d4a106', '#e8702a', '#e0364a', '#b44fd6', '#129c8c', '#a1785c',
]

const list = <T>(value: unknown): T[] => (Array.isArray(value) ? value : [])

function fixTask(raw: Partial<Task>): Task {
  return {
    id: String(raw.id),
    title: raw.title ?? '',
    categoryId: raw.categoryId ?? null,
    priority: raw.priority ?? 2,
    duration: raw.duration ?? 60,
    deadline: raw.deadline ?? null,
    slot: raw.slot ?? null,
    repeat: raw.repeat ?? null,
    done: raw.done ?? false,
    doneDates: raw.doneDates ?? [],
    ...(raw.span ? { span: raw.span } : {}),
  }
}

function fixCategory(raw: Category): Category {
  const old = OLD_PALETTE.indexOf(raw.color)
  return { ...raw, color: old === -1 ? raw.color : PALETTE[old] }
}

// accepts any saved or imported data, fills missing fields, never drops tasks
export function normalizeState(raw: unknown): PlannerState | null {
  const data = raw as Partial<PlannerState> | null
  if (!data || !Array.isArray(data.tasks)) return null

  return {
    tasks: list<Partial<Task>>(data.tasks).filter((t) => t && t.id).map(fixTask),
    categories: list<Category>(data.categories).map(fixCategory),
    template: list<TemplateItem>(data.template),
  }
}
