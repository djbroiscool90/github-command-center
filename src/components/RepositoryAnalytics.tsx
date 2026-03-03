import React, { useState, useEffect } from 'react'
import { TrendingUp, Star, Clock, X, RefreshCw, Lock, Globe } from 'react-feather'
import axios from 'axios'

interface RepoStats {
  name: string
  full_name: string
  stars: number
  forks: number
  watchers: number
  open_issues: number
  language: string
  description: string
  updated_at: string
  pushed_at: string
  contributors: number
  branches: number
  tags: number
  commits_count: number
  page_visits: number
  private: boolean
}

interface StatModal {
  visible: boolean
  metric: string
  value: string | number
  description: string
  details: Record<string, string | number>
}

const API = 'http://localhost:8765'

const LANG_COLORS: Record<string, string> = {
  TypeScript: 'bg-blue-500',
  JavaScript: 'bg-yellow-400',
  Python: 'bg-green-500',
  Go: 'bg-cyan-400',
  Rust: 'bg-orange-500',
  Java: 'bg-red-500',
  'C++': 'bg-pink-500',
  C: 'bg-gray-400',
  Ruby: 'bg-red-600',
  Swift: 'bg-orange-400',
  Kotlin: 'bg-purple-500',
  PHP: 'bg-indigo-400',
  Shell: 'bg-green-700',
}

export const RepositoryAnalytics: React.FC = () => {
  const [repos, setRepos] = useState<RepoStats[]>([])
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState<'stars' | 'forks' | 'recent' | 'issues'>('stars')
  const [filterLang, setFilterLang] = useState<string>('all')
  const [modal, setModal] = useState<StatModal>({
    visible: false, metric: '', value: '', description: '', details: {},
  })
  const githubToken = localStorage.getItem('github_token')

  useEffect(() => {
    if (githubToken) {
      fetchRepositories()
    } else {
      loadMockRepositories()
    }
  }, [githubToken, sortBy])

  const loadMockRepositories = () => {
    const mockRepos: RepoStats[] = [
      {
        name: 'github-command-center',
        full_name: 'user/github-command-center',
        stars: 245, forks: 42, watchers: 68, open_issues: 5,
        language: 'TypeScript', description: 'A powerful GitHub Desktop alternative',
        updated_at: new Date().toISOString(), pushed_at: new Date().toISOString(),
        contributors: 12, branches: 8, tags: 15, commits_count: 342, page_visits: 2847,
        private: false,
      },
      {
        name: 'awesome-project',
        full_name: 'user/awesome-project',
        stars: 1250, forks: 156, watchers: 203, open_issues: 12,
        language: 'Python', description: 'An awesome open-source project',
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        pushed_at: new Date(Date.now() - 86400000).toISOString(),
        contributors: 45, branches: 12, tags: 32, commits_count: 1245, page_visits: 12456,
        private: false,
      },
      {
        name: 'react-components',
        full_name: 'user/react-components',
        stars: 567, forks: 89, watchers: 134, open_issues: 8,
        language: 'TypeScript', description: 'Reusable React component library',
        updated_at: new Date(Date.now() - 259200000).toISOString(),
        pushed_at: new Date(Date.now() - 259200000).toISOString(),
        contributors: 28, branches: 10, tags: 24, commits_count: 856, page_visits: 5623,
        private: false,
      },
      {
        name: 'private-tools',
        full_name: 'user/private-tools',
        stars: 0, forks: 0, watchers: 2, open_issues: 3,
        language: 'Go', description: 'Internal tooling',
        updated_at: new Date(Date.now() - 604800000).toISOString(),
        pushed_at: new Date(Date.now() - 604800000).toISOString(),
        contributors: 3, branches: 4, tags: 6, commits_count: 134, page_visits: 0,
        private: true,
      },
    ]
    setRepos(sortRepos(mockRepos, sortBy))
  }

  const sortRepos = (list: RepoStats[], by: string) =>
    [...list].sort((a, b) => {
      if (by === 'stars') return b.stars - a.stars
      if (by === 'forks') return b.forks - a.forks
      if (by === 'issues') return b.open_issues - a.open_issues
      return new Date(b.pushed_at || b.updated_at).getTime() - new Date(a.pushed_at || a.updated_at).getTime()
    })

  const fetchRepositories = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API}/api/github/repos?sort=${sortBy}`, {
        headers: { Authorization: `token ${githubToken}` },
      })
      // Backend already maps to our normalized field names
      const mapped: RepoStats[] = (response.data || []).map((r: any) => ({
        name: r.name,
        full_name: r.full_name,
        stars: r.stars ?? 0,
        forks: r.forks ?? 0,
        watchers: r.watchers ?? 0,
        open_issues: r.open_issues ?? 0,
        language: r.language || '',
        description: r.description || '',
        updated_at: r.updated_at || '',
        pushed_at: r.pushed_at || r.updated_at || '',
        contributors: r.contributors ?? 0,
        branches: r.branches ?? 0,
        tags: r.tags ?? 0,
        commits_count: r.commits_count ?? 0,
        page_visits: r.page_visits ?? 0,
        private: r.private ?? false,
      }))
      setRepos(sortRepos(mapped, sortBy))
    } catch (err) {
      console.error('Failed to fetch repos:', err)
      loadMockRepositories()
    } finally {
      setLoading(false)
    }
  }

  const openModal = (
    metric: string,
    value: string | number,
    description: string,
    details: Record<string, string | number> = {}
  ) => {
    setModal({ visible: true, metric, value, description, details })
  }

  const closeModal = () => setModal({ visible: false, metric: '', value: '', description: '', details: {} })

  // Language filter options from loaded repos
  const languages = ['all', ...Array.from(new Set(repos.map(r => r.language).filter(Boolean)))]

  const filteredRepos = filterLang === 'all' ? repos : repos.filter(r => r.language === filterLang)

  // Summary stats
  const totalStars = repos.reduce((s, r) => s + r.stars, 0)
  const totalForks = repos.reduce((s, r) => s + r.forks, 0)
  const totalIssues = repos.reduce((s, r) => s + r.open_issues, 0)

  return (
    <div className="w-full h-screen bg-github-900 text-white overflow-y-auto">
      {/* Header */}
      <div className="bg-github-800 border-b border-github-700 p-5 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp size={26} className="text-green-400" />
            <div>
              <h1 className="text-2xl font-bold">Repository Analytics</h1>
              <p className="text-xs text-github-400 mt-0.5">
                {repos.length} repositories · {totalStars.toLocaleString()} total stars
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchRepositories}
            disabled={loading || !githubToken}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Sort + Filter */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 bg-github-900 p-1 rounded-lg">
            {(['stars', 'forks', 'recent', 'issues'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSortBy(s)}
                className={`px-3 py-1 rounded-md text-sm capitalize transition-colors ${
                  sortBy === s ? 'bg-blue-600 text-white' : 'text-github-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {languages.length > 1 && (
            <div className="flex gap-1 flex-wrap">
              {languages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setFilterLang(lang)}
                  className={`px-3 py-1 rounded-md text-xs transition-colors ${
                    filterLang === lang
                      ? 'bg-purple-600 text-white'
                      : 'bg-github-700 text-github-400 hover:bg-github-600'
                  }`}
                >
                  {lang === 'all' ? 'All languages' : lang}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="bg-github-800/60 border-b border-github-700 px-6 py-3 flex gap-8">
        <div className="text-center">
          <p className="text-xl font-bold text-yellow-400">{totalStars.toLocaleString()}</p>
          <p className="text-xs text-github-500">Total Stars</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-blue-400">{totalForks.toLocaleString()}</p>
          <p className="text-xs text-github-500">Total Forks</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-orange-400">{totalIssues.toLocaleString()}</p>
          <p className="text-xs text-github-500">Open Issues</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-green-400">{filteredRepos.length}</p>
          <p className="text-xs text-github-500">Showing</p>
        </div>
      </div>

      {/* Repo grid */}
      <div className="max-w-7xl mx-auto p-5">
        {loading ? (
          <div className="text-center text-github-400 py-16">
            <RefreshCw size={32} className="animate-spin mx-auto mb-3 text-blue-500" />
            <p>Loading repositories…</p>
          </div>
        ) : filteredRepos.length === 0 ? (
          <p className="text-center text-github-400 py-16">No repositories found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRepos.map((repo) => {
              const langColor = LANG_COLORS[repo.language] || 'bg-github-500'
              const updatedAgo = repo.updated_at
                ? Math.round((Date.now() - new Date(repo.updated_at).getTime()) / 86400000)
                : null

              return (
                <div
                  key={repo.name}
                  className="bg-github-800 border border-github-700 rounded-xl p-5 hover:border-github-500 transition-all flex flex-col gap-4"
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {repo.private
                          ? <Lock size={12} className="text-github-500 shrink-0" />
                          : <Globe size={12} className="text-github-500 shrink-0" />}
                        <h3 className="font-bold text-sm truncate">{repo.full_name || repo.name}</h3>
                      </div>
                      {repo.description && (
                        <p className="text-xs text-github-400 mt-1 line-clamp-2">{repo.description}</p>
                      )}
                    </div>
                    {repo.language && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`w-2.5 h-2.5 rounded-full ${langColor}`} />
                        <span className="text-xs text-github-400">{repo.language}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openModal('Stars', repo.stars, repo.full_name || repo.name, {})}
                      className="bg-github-900 rounded-lg p-3 hover:bg-github-700 transition-colors text-left"
                    >
                      <p className="text-xs text-github-500">⭐ Stars</p>
                      <p className="text-lg font-bold text-yellow-400">{repo.stars.toLocaleString()}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('Forks', repo.forks, repo.full_name || repo.name, {})}
                      className="bg-github-900 rounded-lg p-3 hover:bg-github-700 transition-colors text-left"
                    >
                      <p className="text-xs text-github-500">🔀 Forks</p>
                      <p className="text-lg font-bold text-blue-400">{repo.forks.toLocaleString()}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('Open Issues', repo.open_issues, repo.full_name || repo.name, {})}
                      className="bg-github-900 rounded-lg p-3 hover:bg-github-700 transition-colors text-left"
                    >
                      <p className="text-xs text-github-500">⚠️ Issues</p>
                      <p className="text-lg font-bold text-orange-400">{repo.open_issues}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('Watchers', repo.watchers, repo.full_name || repo.name, {})}
                      className="bg-github-900 rounded-lg p-3 hover:bg-github-700 transition-colors text-left"
                    >
                      <p className="text-xs text-github-500">👁 Watchers</p>
                      <p className="text-lg font-bold text-green-400">{repo.watchers}</p>
                    </button>
                  </div>

                  {/* Activity bar */}
                  {totalStars > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-github-500 mb-1">
                        <span>Star share</span>
                        <span>{totalStars > 0 ? Math.round((repo.stars / totalStars) * 100) : 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-github-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500 rounded-full transition-all"
                          style={{ width: `${totalStars > 0 ? (repo.stars / totalStars) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  {updatedAgo !== null && (
                    <div className="flex items-center gap-1 text-xs text-github-500 border-t border-github-700 pt-3">
                      <Clock size={11} />
                      Updated {updatedAgo === 0 ? 'today' : `${updatedAgo}d ago`}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Stat modal */}
      {modal.visible && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-github-800 border border-github-700 rounded-xl max-w-sm w-full shadow-2xl">
            <div className="border-b border-github-700 p-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{modal.metric}</h2>
                <p className="text-sm text-github-400 mt-0.5">{modal.description}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                title="Close"
                aria-label="Close"
                className="p-1 hover:bg-github-700 rounded transition-colors"
              >
                <X size={18} className="text-github-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-github-900 rounded-lg p-5 text-center">
                <p className="text-xs text-github-500 mb-2">Value</p>
                <p className="text-4xl font-bold text-blue-400">
                  {typeof modal.value === 'number' ? modal.value.toLocaleString() : modal.value}
                </p>
              </div>
              {Object.entries(modal.details).length > 0 && (
                <div className="bg-github-900 rounded-lg p-4 space-y-2">
                  {Object.entries(modal.details).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-github-400 capitalize">{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={closeModal}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
