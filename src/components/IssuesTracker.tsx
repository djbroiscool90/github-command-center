import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { AlertCircle, RotateCcw, Plus, MessageSquare, Clock, Search, X } from 'react-feather'
import axios from 'axios'
import { usePanelStore, parseGitHubUrl } from '../store/panelStore'
import { CreateIssueModal } from './CreateIssueModal'

const API = 'http://localhost:8765'

interface Issue {
  number: number
  title: string
  state: string
  labels: Array<{ name: string; color: string }>
  created_at: string
  updated_at: string
  user: { login: string; avatar_url: string }
  repository: { name: string; full_name: string }
  html_url: string
  comments: number
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function LabelChip({ name, color }: { name: string; color: string }) {
  const dark = parseInt(color, 16) > 0xffffff / 2
  return (
    <span
      className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: `#${color}`, color: dark ? '#000' : '#fff' }}
    >
      {name}
    </span>
  )
}

export const IssuesTracker: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'assigned' | 'created' | 'mentioned'>('assigned')
  const [search, setSearch] = useState('')
  const [showCreateIssue, setShowCreateIssue] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return issues
    return issues.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.repository?.full_name.toLowerCase().includes(q) ||
        i.user.login.toLowerCase().includes(q) ||
        String(i.number).includes(q) ||
        i.labels.some((l) => l.name.toLowerCase().includes(q))
    )
  }, [issues, search])
  const githubToken = localStorage.getItem('github_token')
  const openIssuePanel = usePanelStore((s) => s.openIssuePanel)

  const fetchIssues = useCallback(async () => {
    if (!githubToken) return
    setLoading(true)
    try {
      const res = await axios.get(`${API}/api/github/issues?filter=${filter}`, {
        headers: { Authorization: `token ${githubToken}` },
      })
      setIssues(res.data)
    } catch (err) {
      console.error('Failed to fetch issues:', err)
    } finally {
      setLoading(false)
    }
  }, [githubToken, filter])

  useEffect(() => { fetchIssues() }, [fetchIssues])

  if (!githubToken) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-github-400">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
          <p>Please link your GitHub account to view issues</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-github-900 text-white overflow-y-auto">
      {/* Header */}
      <div className="bg-github-800/95 backdrop-blur border-b border-github-700/80 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={20} className="text-green-400" />
            <h1 className="text-xl font-bold">Issues</h1>
            <span className="text-xs bg-github-700 px-2 py-0.5 rounded-full text-github-400">
              {search ? `${filtered.length} of ${issues.length}` : issues.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchIssues}
              disabled={loading}
              className="p-2 hover:bg-github-700 rounded-lg text-github-400 hover:text-github-200 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RotateCcw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowCreateIssue(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={14} /> New Issue
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-github-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search issues by title, repo, label…"
            className="w-full pl-8 pr-8 py-2 bg-github-900 border border-github-700 rounded-lg text-sm text-white placeholder-github-600 focus:outline-none focus:border-green-500/60 transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              title="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-github-500 hover:text-github-300 transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex gap-1">
          {([
            { value: 'assigned', label: 'Assigned to me' },
            { value: 'created', label: 'Created by me' },
            { value: 'mentioned', label: 'Mentioned' },
          ] as const).map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-green-600/20 text-green-300 border border-green-500/30'
                  : 'text-github-400 hover:bg-github-700 border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="max-w-4xl mx-auto p-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-github-800 rounded-xl p-4 border border-github-700/60 animate-pulse">
                <div className="h-4 bg-github-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-github-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle size={40} className="mx-auto mb-4 text-github-600" />
            {search ? (
              <>
                <p className="text-github-400 mb-2">No results for "{search}"</p>
                <button type="button" onClick={() => setSearch('')} className="text-sm text-green-400 hover:text-green-300 transition-colors">
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p className="text-github-400 mb-4">No issues found</p>
                <button
                  type="button"
                  onClick={() => setShowCreateIssue(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors"
                >
                  Create an issue
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((issue) => {
              const parsed = parseGitHubUrl(issue.html_url)
              return (
                <button
                  key={`${issue.repository?.full_name}-${issue.number}`}
                  type="button"
                  onClick={() => {
                    if (parsed) openIssuePanel({ ...parsed })
                  }}
                  className="w-full bg-github-800 border border-github-700/60 rounded-xl p-4 hover:border-green-500/40 hover:bg-github-800/80 transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={issue.user.avatar_url}
                      alt={issue.user.login}
                      className="w-8 h-8 rounded-full shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-600/20 text-green-300 border border-green-500/30">
                          {issue.state.toUpperCase()}
                        </span>
                        <span className="text-github-500 text-xs">#{issue.number}</span>
                        {issue.labels.slice(0, 3).map((l) => (
                          <LabelChip key={l.name} name={l.name} color={l.color} />
                        ))}
                        {issue.labels.length > 3 && (
                          <span className="text-[10px] text-github-500">+{issue.labels.length - 3}</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-white group-hover:text-green-300 transition-colors leading-snug mb-1">
                        {issue.title}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-github-500 flex-wrap">
                        <span>{issue.repository?.full_name}</span>
                        <span>@{issue.user.login}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {timeAgo(issue.updated_at)}
                        </span>
                        {issue.comments > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare size={10} /> {issue.comments}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-green-400 bg-green-600/10 border border-green-500/20 px-2 py-1 rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition-opacity font-medium whitespace-nowrap">
                      View inline →
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {showCreateIssue && (
        <CreateIssueModal onClose={() => { setShowCreateIssue(false); fetchIssues() }} />
      )}
    </div>
  )
}
