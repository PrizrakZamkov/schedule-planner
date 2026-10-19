import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import type { Category, Priority, Task } from '../types'
import { cx } from '../lib/cx'
import { DAY_END, DAY_START, formatTime, parseTime, toKey, WEEKDAYS } from '../lib/time'

interface Props {
  task: Task
  isNew: boolean
  categories: Category[]
  onSave: (task: Task) => void
  onDelete: (task: Task) => void
  onCopy: (task: Task) => void
  onDuplicate: (task: Task) => void
  onClose: () => void
}

const PRIORITIES: [Priority, string][] = [
  [1, 'Низкий'],
  [2, 'Средний'],
  [3, 'Высокий'],
]
const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240]
const toInput = (min: number) => formatTime(min % DAY_END)

export function TaskModal({ task, isNew, categories, onSave, onDelete, onCopy, onDuplicate, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState(task.title)
  const [categoryId, setCategoryId] = useState(task.categoryId)
  const [priority, setPriority] = useState(task.priority)
  const [deadline, setDeadline] = useState(task.deadline ?? '')
  const [scheduled, setScheduled] = useState(!!task.slot)
  const [date, setDate] = useState(task.slot?.date ?? toKey(new Date()))
  const [start, setStart] = useState(toInput(task.slot?.start ?? 9 * 60))
  const [end, setEnd] = useState(toInput(task.slot?.end ?? 10 * 60))
  const [duration, setDuration] = useState(task.duration)
  const [repeat, setRepeat] = useState(task.repeat ?? [])
  const [done, setDone] = useState(task.done)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal()
  }, [])

  function toggleDay(day: number) {
    setRepeat((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort()))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('Введите название')

    const base = { ...task, title: title.trim(), categoryId, priority, done, deadline: deadline || null }
    if (!scheduled) return onSave({ ...base, slot: null, repeat: null, duration })

    const slot = { date, start: parseTime(start), end: parseTime(end) || DAY_END }
    if (slot.start < DAY_START) return setError('День в планере начинается в 06:00')
    if (slot.end <= slot.start) return setError('Конец должен быть позже начала')

    onSave({ ...base, slot, repeat: repeat.length ? repeat : null, duration: slot.end - slot.start })
  }

  return (
    <dialog ref={ref} className="modal" onCancel={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <form className="form" onSubmit={submit}>
        <input
          className="title-input"
          placeholder="Что нужно сделать?"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="field">
          <label>Категория</label>
          <div className="chips">
            {categories.map((c) => (
              <button
                type="button"
                key={c.id}
                className={cx('chip', categoryId === c.id && 'on')}
                style={{ '--c': c.color } as CSSProperties}
                onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Приоритет</label>
          <div className="segmented">
            {PRIORITIES.map(([value, label]) => (
              <button type="button" key={value} className={cx(priority === value && 'on')} onClick={() => setPriority(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="switch-row">
          <input type="checkbox" className="switch" checked={scheduled} onChange={(e) => setScheduled(e.target.checked)} />
          Поставить в расписание
        </label>

        {scheduled ? (
          <div className="reveal" key="slot">
            <div className="row">
              <div className="field">
                <label htmlFor="date">{repeat.length ? 'Начиная с' : 'Дата'}</label>
                <input id="date" className="input" type="date" value={date} required onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="start">Начало</label>
                <input id="start" className="input" type="time" step={900} value={start} required onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="end">Конец</label>
                <input id="end" className="input" type="time" step={900} value={end} required onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Повторять</label>
              <div className="chips">
                {WEEKDAYS.map((name, day) => (
                  <button type="button" key={name} className={cx('chip day-chip', repeat.includes(day) && 'on')} onClick={() => toggleDay(day)}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="row reveal" key="inbox">
            <div className="field">
              <label htmlFor="duration">Длительность</label>
              <select id="duration" className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d < 60 ? `${d} мин` : `${d / 60} ч`}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="deadline">Дедлайн</label>
              <input id="deadline" className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
        )}

        {!isNew && !task.repeat && (
          <label className="switch-row">
            <input type="checkbox" className="switch" checked={done} onChange={(e) => setDone(e.target.checked)} />
            Сделано
          </label>
        )}

        {error && <p className="error">{error}</p>}

        <footer className="modal-foot">
          {!isNew && (
            <div className="foot-left">
              <button type="button" className="btn ghost danger" onClick={() => onDelete(task)}>
                Удалить
              </button>
              <button type="button" className="btn ghost" title="Потом Ctrl+V в нужном месте" onClick={() => onCopy(task)}>
                Копировать
              </button>
              <button type="button" className="btn ghost" title="Копия сразу после этой задачи" onClick={() => onDuplicate(task)}>
                Дублировать
              </button>
            </div>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn primary">
            {isNew ? 'Создать' : 'Сохранить'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
