import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { GitPullRequest, AlertCircle, RotateCcw, Plus, GitMerge, Clock, Search, X } from 'react-feather'
import axios from 'axios'
import { usePanelStore, parseGitHubUrl } from '../store/panelStore'
import { CreatePRModal } from './CreatePRModal'

const API = 'http://localhost:8765'

interface PR {
  number: number
  title: string
  state: string
  created_at: string
  updated_at: string
  user: { login: string; avatar_url: string }
  repository: { name: string; full_name: string }
  html_url: string
  draft: boolean
  additions: number
  deletions: number
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

export const PullRequestsViewer: React.FC = () => {
  const [prs, setPRs] = useState<PR[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'open' | 'closed' | 'all'>('open')
  const [search, setSearch] = useState('')
  const [showCreatePR, setShowCreatePR] = useState(false)
  const githubToken = localStorage.getItem('github_token')
  const openPRPanel = usePanelStore((s) => s.openPRPanel)

  const fetchPRs = useCallback(async () => {
    if (!githubToken) return
    setLoading(true)
    try {
      const res = await axios.get(`${API}/api/github/pulls?state=${filter}`, {
        headers: { Authorization: `token ${githubToken}` },
      })
      setPRs(res.data)
    } catch (err) {
      console.error('Failed to fetch PRs:', err)
    } finally {
      setLoading(false)
    }
  }, [githubToken, filter])

  useEffect(() => { fetchPRs() }, [fetchPRs])

  if (!githubToken) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-github-400">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
          <p>Please link your GitHub account to view pull requests</p>
        </div>
      </div>
    )
  }

  const openCount = prs.filter((p) => p.state === 'open').length
  const closedCount = prs.filter((p) => p.state !== 'open').length

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return prs
    return prs.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.repository.full_name.toLowerCase().includes(q) ||
        p.user.login.toLowerCase().includes(q) ||
        String(p.number).includes(q)
    )
  }, [prs, search])

  return (
    <div className="w-full h-screen bg-github-900 text-white overflow-y-auto">
      {/* Header */}
      <div className="bg-github-800/95 backdrop-blur border-b border-github-700/80 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <GitPullRequest size={20} className="text-blue-400" />
            <h1 className="text-xl font-bold">Pull Requests</h1>
            <span className="text-xs bg-github-700 px-2 py-0.5 rounded-full text-github-400">
              {search ? `${filtered.length} of ${prs.length}` : prs.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPRs}
              disabled={loading}
              className="p-2 hover:bg-github-700 rounded-lg text-github-400 hover:text-github-200 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RotateCcw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowCreatePR(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={14} /> New PR
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
            placeholder="Search pull requests…"
            className="w-full pl-8 pr-8 py-2 bg-github-900 border border-github-700 rounded-lg text-sm text-white placeholder-github-600 focus:outline-none focus:border-blue-500/60 transition-colors"
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
            { value: 'open', label: 'Open', count: openCount },
            { value: 'closed', label: 'Closed', count: closedCount },
            { value: 'all', label: 'All', count: null },
          ] as const).map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-github-400 hover:bg-github-700 border border-transparent'
              }`}
            >
              {f.label}
              {f.count !== null && f.count > 0 && (
                <span className="ml-1.5 text-[10px] bg-github-700 px-1.5 py-0.5 rounded-full">{f.count}</span>
              )}
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
            <GitPullRequest size={40} className="mx-auto mb-4 text-github-600" />
            {search ? (
              <>
                <p className="text-github-400 mb-2">No results for "{search}"</p>
                <button type="button" onClick={() => setSearch('')} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p className="text-github-400 mb-4">No {filter === 'all' ? '' : filter} pull requests</p>
                <button
                  type="button"
                  onClick={() => setShowCreatePR(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
                >
                  Create your first PR
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((pr) => {
              const parsed = parseGitHubUrl(pr.html_url)
              return (
                <button
                  key={`${pr.repository.full_name}-${pr.number}`}
                  type="button"
                  onClick={() => {
                    if (parsed) openPRPanel({ ...parsed })
                  }}
                  className="w-full bg-github-800 border border-github-700/60 rounded-xl p-4 hover:border-blue-500/40 hover:bg-github-800/80 transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={pr.user.avatar_url}
                      alt={pr.user.login}
                      className="w-8 h-8 rounded-full shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          pr.state === 'open'
                            ? 'bg-green-600/20 text-green-300 border-green-500/30'
                            : 'bg-github-700 text-github-400 border-github-600'
                        }`}>
                          {pr.state.toUpperCase()}
                        </span>
                        {pr.draft && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-github-700 text-github-500 border border-github-600">
                            DRAFT
                          </span>
                        )}
                        <span className="text-github-500 text-xs">#{pr.number}</span>
                      </div>
                      <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors leading-snug mb-1">
                        {pr.title}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-github-500 flex-wrap">
                        <span>{pr.repository.full_name}</span>
                        <span>@{pr.user.login}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {timeAgo(pr.updated_at)}
                        </span>
                        {pr.additions > 0 && <span className="text-green-400">+{pr.additions}</span>}
                        {pr.deletions > 0 && <span className="text-red-400">-{pr.deletions}</span>}
                        {pr.comments > 0 && (
                          <span className="flex items-center gap-1">
                            <GitMerge size={10} /> {pr.comments}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-blue-400 bg-blue-600/10 border border-blue-500/20 px-2 py-1 rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition-opacity font-medium whitespace-nowrap">
                      View inline →
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {showCreatePR && (
        <CreatePRModal onClose={() => { setShowCreatePR(false); fetchPRs() }} />
      )}
    </div>
  )
}
