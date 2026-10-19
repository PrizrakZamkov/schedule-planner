import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { Category, Occurrence, Slot, Task } from '../types'
import type { DragMode, DragState } from '../hooks/useTaskDrag'
import { TaskBlock } from './TaskBlock'
import { DraftBlock } from './DraftBlock'
import { cx } from '../lib/cx'
import { layoutDay, occurrencesOn } from '../lib/schedule'
import { blockPosition, ceilStep, clamp, DAY_END, DAY_START, formatTime, fromKey, HOUR_PX, nowMinutes, PX_PER_MIN, STEP, toKey, WEEKDAYS } from '../lib/time'

interface Props {
  dates: string[]
  tasks: Task[]
  categories: Category[]
  drag: DragState | null
  onCreate: (slot: Slot, title: string) => void
  onOpenNew: (slot: Slot, title: string) => void
  onDragStart: (e: PointerEvent, task: Task, mode: DragMode, date: string) => void
  onOpen: (task: Task) => void
  onToggle: (occ: Occurrence) => void
  onDelete: (task: Task) => void
  onNudge: (occ: Occurrence, minutes: number, days: number) => void
}

const HOURS = Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => DAY_START / 60 + i)

export function WeekGrid({ dates, tasks, categories, drag, onCreate, onOpenNew, onDragStart, ...actions }: Props) {
  const today = toKey(new Date())
  const [now, setNow] = useState(nowMinutes)
  const [selection, setSelection] = useState<Slot | null>(null)
  const [draft, setDraft] = useState<Slot | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(nowMinutes()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: (8 * 60 - DAY_START) * PX_PER_MIN })
  }, [])

  const colorOf = (id: string | null) => categories.find((c) => c.id === id)?.color ?? 'var(--neutral)'
  const preview = drag && drag.target && drag.target !== 'inbox' ? (drag.target as Slot) : null
  const isDragged = (occ: Occurrence, date: string) => drag?.task.id === occ.task.id && drag.date === date

  // the card being resized shows its new end right away
  const shown = (occ: Occurrence, date: string) =>
    preview && drag?.mode === 'resize' && isDragged(occ, date) ? { ...occ, end: preview.end } : occ

  // drag over an empty part of a day to select a time range, a plain click gives one hour
  function startSelection(e: PointerEvent<HTMLDivElement>, date: string) {
    if (e.button !== 0 || e.target !== e.currentTarget) return

    const column = e.currentTarget
    const minutesAt = (y: number) => clamp(DAY_START + (y - column.getBoundingClientRect().top) / PX_PER_MIN, DAY_START, DAY_END)
    const anchor = Math.min(Math.floor(minutesAt(e.clientY) / STEP) * STEP, DAY_END - STEP)
    const originY = e.clientY
    let moved = false

    const rangeTo = (y: number): Slot => {
      const m = minutesAt(y)
      return m >= anchor
        ? { date, start: anchor, end: Math.max(anchor + STEP, ceilStep(m)) }
        : { date, start: Math.floor(m / STEP) * STEP, end: anchor + STEP }
    }

    const onMove = (ev: globalThis.PointerEvent) => {
      if (!moved && Math.abs(ev.clientY - originY) < 6) return
      moved = true
      setSelection(rangeTo(ev.clientY))
    }

    const finish = (ev: globalThis.PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      setSelection(null)
      if (ev.type === 'pointercancel') return
      setDraft(moved ? rangeTo(ev.clientY) : { date, start: anchor, end: Math.min(anchor + 60, DAY_END) })
    }

    setDraft(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }

  return (
    <section className="grid" data-scroll ref={scrollRef} style={{ '--hour': `${HOUR_PX}px` } as CSSProperties}>
      <div className="grid-head">
        <span />
        {dates.map((date, i) => (
          <div key={date} className={cx('day-head', date === today && 'today')}>
            <span>{WEEKDAYS[i]}</span>
            <b>{fromKey(date).getDate()}</b>
          </div>
        ))}
      </div>

      <div className="grid-body" key={dates[0]} style={{ height: (DAY_END - DAY_START) * PX_PER_MIN }}>
        <div className="hours">
          {HOURS.map((h) => (
            <span key={h}>{formatTime(h * 60)}</span>
          ))}
        </div>

        {dates.map((date) => (
          <div
            key={date}
            data-date={date}
            className={cx('day', date === today && 'today')}
            onPointerDown={(e) => startSelection(e, date)}
          >
            {layoutDay(occurrencesOn(tasks, date)).map(({ occ, lane, lanes }) => (
              <TaskBlock
                key={occ.task.id}
                occ={shown(occ, date)}
                lane={lane}
                lanes={lanes}
                color={colorOf(occ.task.categoryId)}
                lift={drag?.mode === 'move' && !drag.copy && preview && isDragged(occ, date) ? drag : null}
                onDragStart={(e, mode) => onDragStart(e, occ.task, mode, date)}
                onOpen={() => actions.onOpen(occ.task)}
                onToggle={() => actions.onToggle(occ)}
                onDelete={() => actions.onDelete(occ.task)}
                onNudge={(minutes, days) => actions.onNudge(occ, minutes, days)}
              />
            ))}

            {date === today && now >= DAY_START && (
              <div className="now" style={{ top: (now - DAY_START) * PX_PER_MIN }} />
            )}

            {selection?.date === date && (
              <div className="selection" style={blockPosition(selection.start, selection.end)}>
                {formatTime(selection.start)}–{formatTime(selection.end)}
              </div>
            )}

            {draft?.date === date && (
              <DraftBlock
                slot={draft}
                onDone={(title) => {
                  setDraft(null)
                  if (title) onCreate(draft, title)
                }}
                onMore={(title) => {
                  setDraft(null)
                  onOpenNew(draft, title)
                }}
              />
            )}

            {preview?.date === date && drag?.mode === 'move' && (
              <div className="preview" style={blockPosition(preview.start, preview.end)}>
                {formatTime(preview.start)}–{formatTime(preview.end)}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
