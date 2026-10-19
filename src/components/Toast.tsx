import { useEffect } from 'react'

export interface ToastData {
  id: number
  text: string
  undo?: () => void
}

export function Toast({ toast, onClose }: { toast: ToastData | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [toast, onClose])

  if (!toast) return null

  return (
    <div className="toast" key={toast.id} role="status">
      {toast.text}
      {toast.undo && (
        <button
          onClick={() => {
            toast.undo!()
            onClose()
          }}
        >
          Отменить
        </button>
      )}
    </div>
  )
}
