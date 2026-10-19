import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import type { Occurrence, PlannerState, Slot, Task } from './types'
import { isPlannerState, usePlanner } from './store'
import { slotAtPoint, useTaskDrag } from './hooks/useTaskDrag'
import { applyTemplate, autoPlan, copyTask, createTask, weekToTemplate, withoutDays } from './lib/schedule'
import { addDays, ceilStep, clamp, DAY_END, DAY_START, fromKey, nowMinutes, PLAN_FROM, PLAN_TO, startOfWeek, toKey, weekKeys } from './lib/time'
import { Header } from './components/Header'
import { WeekGrid } from './components/WeekGrid'
import { Inbox } from './components/Inbox'
import { Categories } from './components/Categories'
import { TaskModal } from './components/TaskModal'
import { Toast, type ToastData } from './components/Toast'
import { ContextMenu } from './components/ContextMenu'

export default function App() {
  const [state, dispatch] = usePlanner()
  const [monday, setMonday] = useState(() => startOfWeek(new Date()))
  const [editing, setEditing] = useState<{ task: Task; isNew: boolean } | null>(null)
  const [toast, setToast] = useState<ToastData | null>(null)
  const [clipboard, setClipboard] = useState<Task | null>(null)
  const [menu, setMenu] = useState<{ task: Task; x: number; y: number } | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  const openMenu = (task: Task, x: number, y: number) => setMenu({ task, x, y })
  const pointer = useRef({ x: 0, y: 0 })
  const dates = useMemo(() => weekKeys(monday), [monday])

  const closeToast = useCallback(() => setToast(null), [])
  const notify = (text: string, undo?: () => void, duration?: number) => setToast({ id: Date.now(), text, undo, duration })

  // apply a change and offer to roll it back
  function withUndo(text: string, change: () => void, duration?: number) {
    const previous: PlannerState = state
    change()
    notify(text, () => dispatch({ type: 'replace', state: previous }), duration)
  }

  const move = (task: Task, slot: Slot | null) => dispatch({ type: 'moveTask', id: task.id, slot })
  const inboxCount = state.tasks.filter((t) => !t.slot && !t.done).length

  function copyTo(task: Task, slot: Slot | null) {
    withUndo(slot ? 'Копия добавлена' : 'Копия добавлена в задачи', () =>
      dispatch({ type: 'saveTask', task: copyTask(task, slot) }),
    )
  }

  function copyToClipboard(task: Task) {
    setClipboard(task)
    setEditing(null)
    notify('Скопировано. Наведите курсор на нужное время и нажмите Ctrl+V')
  }

  function duplicate(task: Task) {
    setEditing(null)
    const slot = task.slot && !task.repeat ? task.slot : null
    const length = slot ? slot.end - slot.start : 0
    copyTo(task, slot && slot.end + length <= DAY_END ? { ...slot, start: slot.end, end: slot.end + length } : null)
  }

  // ctrl+c copies the task under the cursor, ctrl+v pastes it where the cursor is
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => (pointer.current = { x: e.clientX, y: e.clientY })

    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || editing) return
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      const { x, y } = pointer.current
      const key = e.code === 'KeyC' ? 'c' : e.code === 'KeyV' ? 'v' : null

      if (key === 'c') {
        const el = document.activeElement?.closest<HTMLElement>('[data-task-id]') ?? document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-task-id]')
        const task = state.tasks.find((t) => t.id === el?.dataset.taskId)
        if (task) copyToClipboard(task)
      } else if (key === 'v' && clipboard) {
        const length = clipboard.slot ? clipboard.slot.end - clipboard.slot.start : clipboard.duration
        copyTo(clipboard, slotAtPoint(x, y, length))
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('keydown', onKeyDown)
    }
  })

  const { drag, start: startDrag } = useTaskDrag({
    onDrop: (task, slot, copy) => (copy ? copyTo(task, slot) : move(task, slot)),
    onTap: (task) => setEditing({ task, isNew: false }),
  })

  function nudge(occ: Occurrence, minutes: number, days: number) {
    if (occ.task.repeat && days) return
    const length = occ.end - occ.start
    const start = clamp(occ.start + minutes, DAY_START, DAY_END - length)
    move(occ.task, { date: toKey(addDays(fromKey(occ.date), days)), start, end: start + length })
  }

  function deleteTask(task: Task) {
    setEditing(null)
    withUndo('Задача удалена', () => dispatch({ type: 'deleteTask', id: task.id }))
  }

  function planWeek() {
    const today = toKey(new Date())
    const days = dates
      .filter((date) => date >= today)
      .map((date) => ({ date, from: date === today ? Math.max(PLAN_FROM, ceilStep(nowMinutes())) : PLAN_FROM }))

    const tasks = autoPlan(state.tasks, days, PLAN_TO)
    const placed = tasks.filter((t, i) => t.slot && !state.tasks[i].slot).length
    if (!placed) return notify('Свободного времени до дедлайнов на этой неделе не нашлось')

    withUndo(`Запланировано задач: ${placed}`, () => dispatch({ type: 'setTasks', tasks }))
  }

  function saveTemplate() {
    const template = weekToTemplate(state.tasks, dates)
    if (!template.length) return notify('На этой неделе пока нет дел')
    dispatch({ type: 'setTemplate', template })
    notify(`Шаблон создан, дел: ${template.length}`)
  }

  function applyWeekTemplate() {
    const { tasks, skipped } = applyTemplate(state.tasks, state.template, dates)
    const note = skipped ? `, пропущено из-за пересечений: ${skipped}` : ''
    withUndo(`Шаблон применён${note}`, () => dispatch({ type: 'setTasks', tasks }))
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `tempo-${toKey(new Date())}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  async function importData(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!isPlannerState(data)) throw new Error('wrong format')
      withUndo('Данные загружены', () => dispatch({ type: 'replace', state: data }))
    } catch {
      notify('Не удалось прочитать файл')
    }
  }

  const ghostColor = state.categories.find((c) => c.id === drag?.task.categoryId)?.color

  return (
    <div className="app">
      <Header monday={monday} inboxCount={inboxCount} onWeek={setMonday} onPlan={planWeek} onAdd={() => setEditing({ task: createTask({ title: '' }), isNew: true })} />

      <main className="layout">
        <WeekGrid
          dates={dates}
          tasks={state.tasks}
          categories={state.categories}
          drag={drag}
          onCreate={(slot, title) => dispatch({ type: 'saveTask', task: createTask({ title, slot }) })}
          onOpenNew={(slot, title) => setEditing({ task: createTask({ title, slot }), isNew: true })}
          onDragStart={startDrag}
          onOpen={(task) => setEditing({ task, isNew: false })}
          onToggle={(occ) => dispatch({ type: 'toggleDone', id: occ.task.id, date: occ.date })}
          onDelete={deleteTask}
          onNudge={nudge}
          onMenu={openMenu}
        />

        <aside className="sidebar">
          <Inbox
            tasks={state.tasks}
            categories={state.categories}
            highlight={drag?.target === 'inbox'}
            onAdd={() => setEditing({ task: createTask({ title: '' }), isNew: true })}
            onDragStart={(e, task) => startDrag(e, task, 'move')}
            onMenu={openMenu}
          />

          <Categories categories={state.categories} dispatch={dispatch} />

          <section className="panel">
            <h2>Шаблон недели</h2>
            <p className="hint">
              Создание шаблона недели на основе текущей
              {state.template.length > 0 && <span className="hint-line">В шаблоне дел: {state.template.length}</span>}
            </p>
            <div className="btn-col">
              <button className="btn" onClick={saveTemplate}>
                Создать шаблон
              </button>
              <button className="btn" disabled={!state.template.length} onClick={applyWeekTemplate}>
                Использовать шаблон
              </button>
            </div>

            <h2>Данные</h2>
            <p className="hint">Всё хранится только в этом браузере. Сохраните копию, чтобы перенести на другое устройство</p>
            <div className="btn-row">
              <button className="btn" onClick={exportData}>
                Сохранить файл
              </button>
              <label className="btn">
                Открыть файл
                <input type="file" accept="application/json" hidden onChange={importData} />
              </label>
            </div>
            <button
              className="btn ghost danger clear-btn"
              disabled={withoutDays(state.tasks, dates).length === state.tasks.length}
              onClick={() => withUndo('Неделя очищена', () => dispatch({ type: 'setTasks', tasks: withoutDays(state.tasks, dates) }), 10_000)}
            >
              Очистить неделю
            </button>
          </section>
        </aside>
      </main>

      {editing && (
        <TaskModal
          key={editing.task.id}
          task={editing.task}
          isNew={editing.isNew}
          categories={state.categories}
          onSave={(task) => {
            dispatch({ type: 'saveTask', task })
            setEditing(null)
          }}
          onDelete={deleteTask}
          onCopy={copyToClipboard}
          onDuplicate={duplicate}
          onClose={() => setEditing(null)}
        />
      )}

      {drag && drag.mode === 'move' && (drag.target === null || drag.target === 'inbox') && (
        <div
          className="drag-ghost"
          style={{ transform: `translate(${drag.x + 14}px, ${drag.y + 14}px)`, '--c': ghostColor ?? 'var(--neutral)' } as CSSProperties}
        >
          {drag.task.title}
        </div>
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={closeMenu}
          items={[
            { label: 'Копировать', onClick: () => copyToClipboard(menu.task) },
            { label: 'Дублировать', onClick: () => duplicate(menu.task) },
            { label: menu.task.repeat ? 'Удалить серию' : 'Удалить', danger: true, onClick: () => deleteTask(menu.task) },
          ]}
        />
      )}

      <Toast toast={toast} onClose={closeToast} />
    </div>
  )
}
