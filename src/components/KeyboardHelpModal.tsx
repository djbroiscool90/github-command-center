import React, { useEffect } from 'react'
import { X, Command } from 'react-feather'

interface Props {
  onClose: () => void
}

const SHORTCUTS = [
  {
    category: 'Navigation',
    items: [
      { keys: ['Ctrl', '1'], desc: 'Dashboard' },
      { keys: ['Ctrl', '2'], desc: 'Activity Feed' },
      { keys: ['Ctrl', '3'], desc: 'Pull Requests' },
      { keys: ['Ctrl', '4'], desc: 'Issues' },
      { keys: ['Ctrl', '5'], desc: 'Notifications' },
      { keys: ['Ctrl', '6'], desc: 'Code Reviews' },
      { keys: ['Ctrl', '7'], desc: 'Workflows' },
      { keys: ['Ctrl', '8'], desc: 'Branch Protection' },
      { keys: ['Ctrl', '9'], desc: 'Analytics' },
      { keys: ['Ctrl', '0'], desc: 'Quick Actions' },
    ],
  },
  {
    category: 'Global',
    items: [
      { keys: ['Ctrl', 'K'], desc: 'Open command palette' },
      { keys: ['?'], desc: 'Show keyboard shortcuts' },
      { keys: ['Esc'], desc: 'Close panel / modal / palette' },
    ],
  },
  {
    category: 'Panels & Overlays',
    items: [
      { keys: ['Enter'], desc: 'Open selected item (command palette)' },
      { keys: ['↑', '↓'], desc: 'Navigate command palette results' },
      { keys: ['Esc'], desc: 'Go back in file browser' },
    ],
  },
  {
    category: 'Issues & PRs',
    items: [
      { keys: ['Click row'], desc: 'Open inline detail panel' },
      { keys: ['Esc'], desc: 'Close detail panel' },
    ],
  },
]

function Kbd({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center px-2 py-0.5 rounded-md border border-github-600 bg-github-900 text-[11px] font-mono text-github-300 shadow-sm">
      {label}
    </kbd>
  )
}

export const KeyboardHelpModal: React.FC<Props> = ({ onClose }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-github-800 border border-github-700 rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-github-700">
            <div className="flex items-center gap-2.5">
              <Command size={18} className="text-blue-400" />
              <h2 className="font-bold text-white text-base">Keyboard Shortcuts</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="p-1.5 hover:bg-github-700 rounded-lg text-github-400 hover:text-github-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="grid grid-cols-2 gap-0 divide-x divide-github-700/60 max-h-[70vh] overflow-y-auto">
            {SHORTCUTS.map((section) => (
              <div key={section.category} className="px-6 py-4">
                <p className="text-[10px] font-bold text-github-500 uppercase tracking-widest mb-3">
                  {section.category}
                </p>
                <div className="space-y-2.5">
                  {section.items.map((item) => (
                    <div key={item.desc} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-github-300 flex-1">{item.desc}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k, i) => (
                          <React.Fragment key={k}>
                            {i > 0 && <span className="text-[10px] text-github-600">+</span>}
                            <Kbd label={k} />
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-github-700 px-6 py-3 flex items-center justify-between text-[11px] text-github-600">
            <span>GitHub Command Center v2.0</span>
            <span>Press <Kbd label="?" /> or <Kbd label="Esc" /> to close</span>
          </div>
        </div>
      </div>
    </>
  )
}
