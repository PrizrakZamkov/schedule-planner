import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { Slot, Task } from '../types'
import { clamp, DAY_END, DAY_START, PX_PER_MIN, snap, STEP } from '../lib/time'

export type DragMode = 'move' | 'resize'
export type DropTarget = Slot | 'inbox' | null

export interface DragState {
  task: Task
  mode: DragMode
  x: number
  y: number
  target: DropTarget
  copy: boolean
  date?: string
  dx: number // how far the card moved from where it was grabbed
  dy: number
}

const EDGE = 56
const MAX_SPEED = 18

interface Options {
  onDrop: (task: Task, slot: Slot | null, copy: boolean) => void
  onTap: (task: Task) => void
}

function columnAtX(x: number): HTMLElement | null {
  const columns = Array.from(document.querySelectorAll<HTMLElement>('[data-date]'))
  return columns.find((c) => {
    const r = c.getBoundingClientRect()
    return x >= r.left && x < r.right
  }) ?? null
}

// the time slot under a screen point, `grab` is how many minutes below the task top it was grabbed
export function slotAtPoint(x: number, y: number, length: number, grab = 0, column?: HTMLElement | null): Slot | null {
  const el = document.elementFromPoint(x, y)
  // over the day headers or the grid edge the column is picked by x, the time is clamped
  const col = column ?? el?.closest<HTMLElement>('[data-date]') ?? (el?.closest('[data-scroll]') ? columnAtX(x) : null)
  if (!col) return null
  const minutes = DAY_START + (y - col.getBoundingClientRect().top) / PX_PER_MIN
  const start = clamp(snap(minutes - grab), DAY_START, DAY_END - length)
  return { date: col.dataset.date!, start, end: start + length }
}

// mouse and touch drag on pointer events, alt makes a copy
export function useTaskDrag({ onDrop, onTap }: Options) {
  const [drag, setDrag] = useState<DragState | null>(null)

  function start(e: ReactPointerEvent, task: Task, mode: DragMode, date?: string) {
    if (e.button !== 0) return

    const origin = { x: e.clientX, y: e.clientY }
    const scroller = document.querySelector<HTMLElement>('[data-scroll]')
    const startScroll = scroller?.scrollTop ?? 0
    const pointer = { x: e.clientX, y: e.clientY, alt: false }
    let dirty = false
    let frame = 0
    const length = task.slot ? task.slot.end - task.slot.start : task.duration
    const grab = task.slot ? (e.clientY - e.currentTarget.getBoundingClientRect().top) / PX_PER_MIN : 0
    let current: DragState | null = null

    function findTarget(x: number, y: number, copy: boolean): DropTarget {
      const el = document.elementFromPoint(x, y)
      if (el?.closest('[data-inbox]')) return task.repeat && !copy ? null : 'inbox'

      // a repeating series only moves in time, its copy can go anywhere
      const sameDay = document.querySelector<HTMLElement>(`[data-date="${date}"]`)

      if (mode === 'resize' && task.slot && sameDay) {
        const minutes = DAY_START + (y - sameDay.getBoundingClientRect().top) / PX_PER_MIN
        const end = clamp(snap(minutes), task.slot.start + STEP, DAY_END)
        return { date: date!, start: task.slot.start, end }
      }

      return slotAtPoint(x, y, length, grab, task.repeat && !copy ? sameDay : undefined)
    }

    // scroll the grid when the cursor is near its top or bottom edge, faster closer to the edge
    function autoScroll(): boolean {
      if (!scroller) return false
      const r = scroller.getBoundingClientRect()
      if (pointer.x < r.left || pointer.x > r.right) return false
      const top = r.top + EDGE + 40
      const bottom = r.bottom - EDGE
      const depth = pointer.y < top ? pointer.y - top : pointer.y > bottom ? pointer.y - bottom : 0
      if (!depth) return false
      const before = scroller.scrollTop
      scroller.scrollTop += clamp(depth / 3, -MAX_SPEED, MAX_SPEED)
      return scroller.scrollTop !== before
    }

    // one update per screen frame, however often the mouse fires
    function tick() {
      frame = requestAnimationFrame(tick)
      const scrolled = autoScroll()
      if (!dirty && !scrolled) return
      dirty = false
      const copy = mode === 'move' && pointer.alt
      current = {
        task,
        mode,
        copy,
        date,
        x: pointer.x,
        y: pointer.y,
        dx: pointer.x - origin.x,
        dy: pointer.y - origin.y + (scroller?.scrollTop ?? 0) - startScroll,
        target: findTarget(pointer.x, pointer.y, copy),
      }
      setDrag(current)
    }

    function onMove(ev: PointerEvent) {
      Object.assign(pointer, { x: ev.clientX, y: ev.clientY, alt: ev.altKey })
      dirty = true
      if (frame || Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < 5) return
      document.body.classList.add('dragging')
      tick()
    }

    function finish(ev: PointerEvent) {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      document.body.classList.remove('dragging')
      setDrag(null)

      if (!current) {
        if (mode === 'move' && ev.type === 'pointerup') onTap(task)
        return
      }
      // the click after a drag must not open the "new task" dialog
      const swallow = (click: Event) => click.stopPropagation()
      window.addEventListener('click', swallow, true)
      setTimeout(() => window.removeEventListener('click', swallow, true))

      const { target, copy } = current
      if (target && ev.type === 'pointerup') onDrop(task, target === 'inbox' ? null : target, copy)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }

  return { drag, start }
}
