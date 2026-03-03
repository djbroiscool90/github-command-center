import React, { useEffect, useRef, useState } from 'react'
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'react-feather'
import { useToastStore, Toast as ToastItem } from '../store/toastStore'

const ICONS: Record<string, React.ReactNode> = {
  success: <CheckCircle size={16} />,
  error: <AlertCircle size={16} />,
  info: <Info size={16} />,
  warning: <AlertTriangle size={16} />,
}

const STYLES: Record<string, string> = {
  success: 'bg-github-800 border-green-500/60 text-white',
  error:   'bg-github-800 border-red-500/60 text-white',
  info:    'bg-github-800 border-blue-500/60 text-white',
  warning: 'bg-github-800 border-yellow-500/60 text-white',
}

const ICON_STYLES: Record<string, string> = {
  success: 'text-green-400',
  error:   'text-red-400',
  info:    'text-blue-400',
  warning: 'text-yellow-400',
}

const BAR_STYLES: Record<string, string> = {
  success: 'bg-green-500',
  error:   'bg-red-500',
  info:    'bg-blue-500',
  warning: 'bg-yellow-500',
}

function ToastCard({ toast }: { toast: ToastItem }) {
  const { removeToast } = useToastStore()
  const [visible, setVisible] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const duration = toast.duration ?? 4000

  // Slide-in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  // Countdown progress bar — mutate DOM via ref to avoid inline style lint warning
  useEffect(() => {
    if (duration <= 0 || !barRef.current) return
    const bar = barRef.current
    const start = Date.now()
    let raf: number
    const tick = () => {
      const elapsed = Date.now() - start
      const pct = Math.max(0, 100 - (elapsed / duration) * 100)
      bar.style.width = `${pct}%`
      if (pct > 0) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [duration])

  const dismiss = () => {
    setVisible(false)
    setTimeout(() => removeToast(toast.id), 200)
  }

  return (
    <div
      className={`relative flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl overflow-hidden
        max-w-sm w-full transition-all duration-200
        ${STYLES[toast.type]}
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
      `}
    >
      {/* Progress bar — width set imperatively via ref */}
      {duration > 0 && (
        <div
          ref={barRef}
          className={`absolute bottom-0 left-0 h-0.5 w-full ${BAR_STYLES[toast.type]} opacity-60`}
        />
      )}

      <span className={`shrink-0 mt-0.5 ${ICON_STYLES[toast.type]}`}>
        {ICONS[toast.type]}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight text-white">{toast.title}</p>
        {toast.message && (
          <p className="text-xs mt-0.5 text-github-400 break-words">{toast.message}</p>
        )}
      </div>

      <button
        type="button"
        onClick={dismiss}
        title="Dismiss"
        aria-label="Dismiss notification"
        className="shrink-0 text-github-500 hover:text-github-200 transition-colors p-0.5 rounded mt-0.5"
      >
        <X size={13} />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { toasts } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard toast={t} />
        </div>
      ))}
    </div>
  )
}
