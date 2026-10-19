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
}

interface Options {
  onDrop: (task: Task, slot: Slot | null, copy: boolean) => void
  onTap: (task: Task) => void
}

// the time slot under a screen point, `grab` is how many minutes below the task top it was grabbed
export function slotAtPoint(x: number, y: number, length: number, grab = 0, column?: HTMLElement | null): Slot | null {
  const col = column ?? document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-date]')
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

    function onMove(ev: PointerEvent) {
      if (!current && Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < 5) return
      document.body.classList.add('dragging')
      const copy = mode === 'move' && ev.altKey
      current = { task, mode, copy, x: ev.clientX, y: ev.clientY, target: findTarget(ev.clientX, ev.clientY, copy) }
      setDrag(current)
    }

    function finish(ev: PointerEvent) {
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
