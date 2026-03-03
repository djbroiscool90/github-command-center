import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, Activity, Zap, GitPullRequest, AlertCircle, Bell, Eye,
  GitMerge, Lock, TrendingUp, Settings, FileText, GitBranch,
  Archive, Edit3, Command, ArrowRight, X,
} from 'react-feather'
import axios from 'axios'
import { usePanelStore } from '../store/panelStore'

const API = 'http://localhost:8765'

interface PaletteItem {
  id: string
  label: string
  sublabel?: string
  icon: React.ReactNode
  action: () => void
  category: string
  keywords?: string[]
}

interface Props {
  onNavigate: (tab: string) => void
}

export const CommandPalette: React.FC<Props> = ({ onNavigate }) => {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [repos, setRepos] = useState<Array<{ full_name: string; name: string; html_url: string }>>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const isOpen = usePanelStore((s) => s.commandPalette)
  const close = usePanelStore((s) => s.closeCommandPalette)

  useEffect(() => {
    if (!isOpen) return
    const token = localStorage.getItem('github_token')
    if (!token) return
    axios.get(`${API}/api/github/repos?sort=updated`, {
      headers: { Authorization: `token ${token}` },
    }).then((res) => setRepos(res.data || [])).catch(() => {})
  }, [isOpen])

  if (!isOpen) return null

  const NAV_ITEMS: PaletteItem[] = [
    { id: 'dashboard',     label: 'Dashboard',       icon: <Activity size={15} />,       category: 'Navigate', action: () => { onNavigate('dashboard'); close() },     keywords: ['home'] },
    { id: 'activity',      label: 'Activity Feed',   icon: <Zap size={15} />,            category: 'Navigate', action: () => { onNavigate('activity'); close() } },
    { id: 'pulls',         label: 'Pull Requests',   icon: <GitPullRequest size={15} />, category: 'Navigate', action: () => { onNavigate('pulls'); close() },          keywords: ['pr', 'prs'] },
    { id: 'issues',        label: 'Issues',          icon: <AlertCircle size={15} />,    category: 'Navigate', action: () => { onNavigate('issues'); close() } },
    { id: 'notifications', label: 'Notifications',   icon: <Bell size={15} />,           category: 'Navigate', action: () => { onNavigate('notifications'); close() } },
    { id: 'reviews',       label: 'Code Reviews',    icon: <Eye size={15} />,            category: 'Navigate', action: () => { onNavigate('reviews'); close() } },
    { id: 'workflows',     label: 'Workflows',       icon: <GitMerge size={15} />,       category: 'Navigate', action: () => { onNavigate('workflows'); close() },       keywords: ['actions', 'ci', 'cd'] },
    { id: 'protection',    label: 'Branch Protection', icon: <Lock size={15} />,          category: 'Navigate', action: () => { onNavigate('protection'); close() } },
    { id: 'analytics',     label: 'Analytics',       icon: <TrendingUp size={15} />,     category: 'Navigate', action: () => { onNavigate('analytics'); close() } },
    { id: 'quick',         label: 'Quick Actions',   icon: <Zap size={15} />,            category: 'Navigate', action: () => { onNavigate('quick'); close() } },
    { id: 'settings',      label: 'Settings',        icon: <Settings size={15} />,       category: 'Navigate', action: () => { onNavigate('settings'); close() } },
    { id: 'changes',       label: 'Changes',         icon: <FileText size={15} />,       category: 'Local Git', action: () => { onNavigate('changes'); close() } },
    { id: 'branches',      label: 'Branches',        icon: <GitBranch size={15} />,      category: 'Local Git', action: () => { onNavigate('branches'); close() } },
    { id: 'stashes',       label: 'Stashes',         icon: <Archive size={15} />,        category: 'Local Git', action: () => { onNavigate('stashes'); close() } },
    { id: 'history',       label: 'Commit History',  icon: <GitMerge size={15} />,       category: 'Local Git', action: () => { onNavigate('history'); close() } },
    { id: 'editor',        label: 'Inline Editor',   icon: <Edit3 size={15} />,          category: 'Local Git', action: () => { onNavigate('editor'); close() } },
  ]

  const REPO_ITEMS: PaletteItem[] = repos.slice(0, 8).map((r) => ({
    id: `repo-${r.full_name}`,
    label: r.name,
    sublabel: r.full_name,
    icon: <GitBranch size={15} />,
    category: 'Repositories',
    action: () => { window.open(r.html_url, '_blank'); close() },
  }))

  const ALL_ITEMS = [...NAV_ITEMS, ...REPO_ITEMS]

  const filtered = query.trim()
    ? ALL_ITEMS.filter((item) => {
        const q = query.toLowerCase()
        return (
          item.label.toLowerCase().includes(q) ||
          item.sublabel?.toLowerCase().includes(q) ||
          item.keywords?.some((k) => k.toLowerCase().includes(q))
        )
      })
    : ALL_ITEMS

  // Group by category
  const grouped: Record<string, PaletteItem[]> = {}
  for (const item of filtered) {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  }

  const flatFiltered = Object.values(grouped).flat()

  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const runActive = useCallback(() => {
    flatFiltered[activeIdx]?.action()
  }, [flatFiltered, activeIdx])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, flatFiltered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        runActive()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close, flatFiltered, runActive])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  let flatIdx = 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />

      {/* Palette */}
      <div className="relative w-full max-w-2xl bg-github-800 border border-github-600 rounded-2xl shadow-2xl overflow-hidden">
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-github-700">
          <Search size={18} className="text-github-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tabs, repositories, actions…"
            className="flex-1 bg-transparent text-white placeholder-github-500 outline-none text-base"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:bg-github-700 rounded">
              <X size={14} className="text-github-400" />
            </button>
          )}
          <kbd className="text-[10px] text-github-600 border border-github-700 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto max-h-[60vh] py-2">
          {flatFiltered.length === 0 ? (
            <p className="text-center text-github-500 text-sm py-8">No results for "{query}"</p>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <p className="text-[10px] font-bold text-github-600 uppercase tracking-widest px-4 py-2">
                  {category}
                </p>
                {items.map((item) => {
                  const idx = flatIdx++
                  const isActive = idx === activeIdx
                  return (
                    <button
                      key={item.id}
                      data-idx={idx}
                      type="button"
                      onClick={item.action}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                        isActive ? 'bg-blue-600/20 text-white' : 'text-github-300 hover:bg-github-700/60'
                      }`}
                    >
                      <span className={isActive ? 'text-blue-400' : 'text-github-500'}>
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{item.label}</span>
                        {item.sublabel && (
                          <span className="text-[11px] text-github-500 ml-2">{item.sublabel}</span>
                        )}
                      </div>
                      {isActive && <ArrowRight size={13} className="text-blue-400 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-github-700 px-4 py-2 flex items-center gap-4 text-[11px] text-github-600">
          <span className="flex items-center gap-1"><Command size={11} /> GCC Command Palette</span>
          <span className="ml-auto flex items-center gap-3">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc close</span>
          </span>
        </div>
      </div>
    </div>
  )
}
