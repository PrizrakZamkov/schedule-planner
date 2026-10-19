import { useEffect, useState } from 'react'
import type { Category } from '../types'
import { PALETTE, type PlannerDispatch } from '../store'
import { uid } from '../lib/schedule'
import { cx } from '../lib/cx'

export function Categories({ categories, dispatch }: { categories: Category[]; dispatch: PlannerDispatch }) {
  const [picking, setPicking] = useState<string | null>(null)
  const save = (category: Category) => dispatch({ type: 'saveCategory', category })
  const freeColor = PALETTE.find((color) => !categories.some((c) => c.color === color)) ?? PALETTE[0]

  useEffect(() => {
    if (!picking) return
    const close = (e: PointerEvent) => !(e.target as HTMLElement).closest('.swatch-wrap') && setPicking(null)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [picking])

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Категории</h2>
        <button
          className="icon-btn"
          aria-label="Новая категория"
          onClick={() => save({ id: uid(), name: 'Новая', color: freeColor })}
        >
          +
        </button>
      </header>

      <ul className="cat-list">
        {categories.map((c) => (
          <li key={c.id} className="cat">
            <div className="swatch-wrap">
              <button
                className="swatch"
                style={{ background: c.color }}
                aria-label="Выбрать цвет"
                aria-expanded={picking === c.id}
                onClick={() => setPicking(picking === c.id ? null : c.id)}
              />
              {picking === c.id && (
                <div className="palette">
                  {PALETTE.map((color) => (
                    <button
                      key={color}
                      className={cx('swatch', color === c.color && 'on')}
                      style={{ background: color }}
                      aria-label={`Цвет ${color}`}
                      onClick={() => {
                        save({ ...c, color })
                        setPicking(null)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <input value={c.name} aria-label="Название категории" onChange={(e) => save({ ...c, name: e.target.value })} />
            <button className="icon-btn remove" aria-label="Удалить категорию" onClick={() => dispatch({ type: 'deleteCategory', id: c.id })}>
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
