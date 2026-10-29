import { useState, type CSSProperties, type PointerEvent } from 'react'
import type { Category, Span, Task } from '../types'
import { cx } from '../lib/cx'
import { layoutSpans, shiftDate } from '../lib/spans'
import { formatShortDate } from '../lib/time'

interface Props {
  dates: string[]
  tasks: Task[]
  categories: Category[]
  onCreate: (span: Span, title: string) => void
  onChange: (task: Task, span: Span) => void
  onOpen: (task: Task) => void
  onToggle: (task: Task) => void
  onMenu: (task: Task, x: number, y: number) => void
}

type Mode = 'move' | 'left' | 'right'

export function SpanStrip({ dates, tasks, categories, onCreate, onChange, onOpen, onToggle, onMenu }: Props) {
  const [selection, setSelection] = useState<[number, number] | null>(null)
  const [draft, setDraft] = useState<[number, number] | null>(null)
  const [preview, setPreview] = useState<{ id: string; span: Span } | null>(null)

  const colorOf = (id: string | null) => categories.find((c) => c.id === id)?.color ?? 'var(--neutral)'

  // day column under the pointer, 0..6
  function columnAt(strip: HTMLElement, x: number) {
    const r = strip.getBoundingClientRect()
    const width = (r.width - 52) / dates.length
    return Math.min(Math.max(Math.floor((x - r.left - 52) / width), 0), dates.length - 1)
  }

  function track(e: PointerEvent, onMove: (col: number) => void, onUp: (moved: boolean) => void) {
    const strip = (e.currentTarget as HTMLElement).closest<HTMLElement>('.span-strip')!
    const startCol = columnAt(strip, e.clientX)
    let moved = false

    const move = (ev: globalThis.PointerEvent) => {
      const col = columnAt(strip, ev.clientX)
      if (col !== startCol) moved = true
      if (moved) onMove(col - startCol)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      onUp(moved)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return startCol
  }

  // drag over empty space to choose days for a new task
  function startSelect(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || e.target !== e.currentTarget) return
    let range: [number, number] = [0, 0]
    const start = track(
      e,
      (delta) => {
        range = delta < 0 ? [start + delta, start] : [start, start + delta]
        setSelection(range)
      },
      () => {
        setSelection(null)
        setDraft(range)
      },
    )
    range = [start, start]
    setDraft(null)
  }

  // move the whole task or one of its edges by whole days
  function startDrag(e: PointerEvent, task: Task, mode: Mode) {
    if (e.button !== 0) return
    e.stopPropagation()
    const span = task.span!
    let next = span

    track(
      e,
      (delta) => {
        if (mode === 'move') next = { from: shiftDate(span.from, delta), to: shiftDate(span.to, delta) }
        if (mode === 'left') next = { from: [shiftDate(span.from, delta), span.to].sort()[0], to: span.to }
        if (mode === 'right') next = { from: span.from, to: [shiftDate(span.to, delta), span.from].sort()[1] }
        setPreview({ id: task.id, span: next })
      },
      (moved) => {
        setPreview(null)
        if (!moved) return mode === 'move' && onOpen(task)
        onChange(task, next)
      },
    )
  }

  const shown = tasks.map((t) => (preview?.id === t.id ? { ...t, span: preview.span } : t))
  const placed = layoutSpans(shown, dates)
  const rows = Math.max(1, ...placed.map((p) => p.row + 1)) + (draft || selection ? 1 : 0)
  const freeRow = rows

  return (
    <div className="span-strip" style={{ gridTemplateRows: `repeat(${rows}, 24px)` }} onPointerDown={startSelect}>
      <div className="span-label">Весь день</div>

      {placed.map(({ task, start, end, row, cutLeft, cutRight }) => (
        <div
          key={task.id}
          data-task-id={task.id}
          className={cx('span', task.done && 'done', cutLeft && 'cut-l', cutRight && 'cut-r', preview?.id === task.id && 'dragging')}
          style={{ gridColumn: `${start + 2} / ${end + 3}`, gridRow: row + 1, '--c': colorOf(task.categoryId) } as CSSProperties}
          onPointerDown={(e) => startDrag(e, task, 'move')}
          onContextMenu={(e) => {
            e.preventDefault()
            onMenu(task, e.clientX, e.clientY)
          }}
        >
          {!cutLeft && <span className="edge left" onPointerDown={(e) => startDrag(e, task, 'left')} />}
          <span className="span-title">{task.title}</span>
          {cutLeft && <small>с {formatShortDate(task.span!.from)}</small>}
          {cutRight && <small>до {formatShortDate(task.span!.to)}</small>}
          <button
            className="check"
            aria-label={task.done ? 'Вернуть в работу' : 'Отметить выполненной'}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onToggle(task)}
          >
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2.5 6.2 5 8.5l4.5-5" />
            </svg>
          </button>
          {!cutRight && <span className="edge right" onPointerDown={(e) => startDrag(e, task, 'right')} />}
        </div>
      ))}

      {selection && (
        <div className="span-new" style={{ gridColumn: `${selection[0] + 2} / ${selection[1] + 3}`, gridRow: freeRow }}>
          {selection[1] - selection[0] + 1} дн.
        </div>
      )}

      {draft && (
        <input
          className="span-new span-input"
          style={{ gridColumn: `${draft[0] + 2} / ${draft[1] + 3}`, gridRow: freeRow }}
          autoFocus
          placeholder="Название"
          onPointerDown={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const title = e.target.value.trim()
            setDraft(null)
            if (title) onCreate({ from: dates[draft[0]], to: dates[draft[1]] }, title)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              e.currentTarget.value = ''
              e.currentTarget.blur()
            }
          }}
        />
      )}
    </div>
  )
}
