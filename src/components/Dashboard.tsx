import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Activity,
  GitPullRequest,
  AlertCircle,
  Code,
  Users,
  Clock,
  ChevronRight,
  RotateCcw,
  Lock,
  Moon,
  RotateCw,
  Folder,
  Star,
  Share2,
  ArrowUpRight,
  X,
  TrendingUp,
  GitBranch,
  ExternalLink,
} from 'react-feather'
import axios from 'axios'
import { useRepositoryStore } from '../store/repositoryStore'

const API = 'http://localhost:8765'

interface ContextMenu {
  visible: boolean
  x: number
  y: number
}

interface MetricModal {
  visible: boolean
  type: 'prs' | 'issues' | 'repos' | 'followers' | null
  data: any
}

interface GitHubStats {
  totalPRs: number
  openPRs: number
  totalIssues: number
  openIssues: number
  repos: number
  followers: number
  following: number
  login: string
}

interface Repository {
  name: string
  full_name: string
  html_url: string
  description: string
  language: string
  stars: number
  forks: number
  open_issues: number
  updated_at: string
  private: boolean
}

interface RateLimit {
  core: { limit: number; remaining: number; reset: number }
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Go: '#00ADD8',
  Rust: '#dea584',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  Ruby: '#701516',
  Swift: '#fa7343',
  Kotlin: '#A97BFF',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  default: '#6e7681',
}

function getLangColor(lang: string) {
  return LANGUAGE_COLORS[lang] ?? LANGUAGE_COLORS.default
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export const Dashboard: React.FC = () => {
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ visible: false, x: 0, y: 0 })
  const [metricModal, setMetricModal] = useState<MetricModal>({ visible: false, type: null, data: null })
  const [stats, setStats] = useState<GitHubStats>({
    totalPRs: 0, openPRs: 0, totalIssues: 0, openIssues: 0,
    repos: 0, followers: 0, following: 0, login: '',
  })
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [expandRepos, setExpandRepos] = useState(true)
  const [rateLimit, setRateLimit] = useState<RateLimit | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const githubToken = localStorage.getItem('github_token')
  const userProfile = useRepositoryStore((s) => s.userProfile)

  const headers = githubToken ? { Authorization: `token ${githubToken}` } : {}

  const fetchDashboardData = useCallback(async () => {
    if (!githubToken) return
    try {
      setLoading(true)
      const [userRes, pullsRes, issuesRes, reposRes, rateLimitRes] = await Promise.allSettled([
        axios.get(`${API}/api/github/user`, { headers }),
        axios.get(`${API}/api/github/pulls?state=open`, { headers }),
        axios.get(`${API}/api/github/issues?filter=assigned`, { headers }),
        axios.get(`${API}/api/github/repos?sort=updated`, { headers }),
        axios.get(`${API}/api/github/ratelimit`, { headers }),
      ])

      const user = userRes.status === 'fulfilled' ? userRes.value.data : null
      const pulls = pullsRes.status === 'fulfilled' ? pullsRes.value.data : []
      const issues = issuesRes.status === 'fulfilled' ? issuesRes.value.data : []
      const repos = reposRes.status === 'fulfilled' ? reposRes.value.data : []

      setStats({
        totalPRs: pulls?.length ?? 0,
        openPRs: pulls?.filter((pr: any) => pr.state === 'open').length ?? 0,
        totalIssues: issues?.length ?? 0,
        openIssues: issues?.filter((i: any) => i.state === 'open').length ?? 0,
        repos: user?.public_repos ?? 0,
        followers: user?.followers ?? 0,
        following: user?.following ?? 0,
        login: user?.login ?? '',
      })

      setRepositories((repos || []).slice(0, 12).map((r: any) => ({
        name: r.name,
        full_name: r.full_name,
        html_url: r.html_url,
        description: r.description || '',
        language: r.language || '',
        stars: r.stars ?? 0,
        forks: r.forks ?? 0,
        open_issues: r.open_issues ?? 0,
        updated_at: r.updated_at,
        private: r.private ?? false,
      })))

      if (rateLimitRes.status === 'fulfilled') {
        setRateLimit({
          core: rateLimitRes.value.data?.resources?.core ?? { limit: 0, remaining: 0, reset: 0 },
        })
      }

      setLastRefreshed(new Date())
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [githubToken])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu({ visible: false, x: 0, y: 0 })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY })
  }

  const handleAdminAction = (action: string) => {
    setContextMenu({ visible: false, x: 0, y: 0 })
    switch (action) {
      case 'refresh':
        fetchDashboardData()
        break
      case 'export': {
        const dataStr = JSON.stringify({ stats, repositories, rateLimit }, null, 2)
        const blob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `gcc-dashboard-${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
        break
      }
      case 'rate-limits':
        if (rateLimit) {
          const resetTime = new Date(rateLimit.core.reset * 1000).toLocaleTimeString()
          alert(
            `GitHub API Rate Limits\n\nCore API:\n  Limit: ${rateLimit.core.limit}/hour\n  Remaining: ${rateLimit.core.remaining}\n  Resets at: ${resetTime}`
          )
        } else {
          alert('Rate limit data not loaded yet.')
        }
        break
      case 'lock':
        localStorage.setItem('session_locked', 'true')
        alert('Session locked.')
        break
      case 'debug': {
        const on = localStorage.getItem('debug_mode') === 'true'
        localStorage.setItem('debug_mode', on ? 'false' : 'true')
        alert(`Debug mode ${!on ? 'enabled' : 'disabled'}`)
        break
      }
      case 'reset':
        if (window.confirm('Reset all settings? This will clear your GitHub token.')) {
          localStorage.clear()
          window.location.reload()
        }
        break
      case 'theme': {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
        document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark')
        localStorage.setItem('theme', isDark ? 'light' : 'dark')
        break
      }
    }
  }

  const openMetricModal = (type: 'prs' | 'issues' | 'repos' | 'followers') => {
    const data: Record<string, any> = {
      prs: {
        title: 'Pull Requests',
        open: stats.openPRs,
        total: stats.totalPRs,
        subtitle: `${stats.openPRs} open · ${stats.totalPRs} total`,
      },
      issues: {
        title: 'Issues Assigned',
        open: stats.openIssues,
        total: stats.totalIssues,
        subtitle: `${stats.openIssues} open · ${stats.totalIssues} total`,
      },
      repos: {
        title: 'Repositories',
        count: stats.repos,
        subtitle: `${stats.repos} public repositories`,
        items: repositories.slice(0, 5),
      },
      followers: {
        title: 'Network',
        count: stats.followers,
        subtitle: `${stats.followers} followers · ${stats.following} following`,
        githubUrl: `https://github.com/${stats.login}`,
      },
    }
    setMetricModal({ visible: true, type, data: data[type] })
  }

  const closeMetricModal = () => setMetricModal({ visible: false, type: null, data: null })

  const adminTools = [
    { id: 'refresh',     label: 'Refresh Data',      icon: <RotateCcw size={14} />, color: 'text-blue-400' },
    { id: 'export',      label: 'Export Stats JSON',  icon: <Code size={14} />,      color: 'text-green-400' },
    { id: 'rate-limits', label: 'API Rate Limits',    icon: <Activity size={14} />,  color: 'text-purple-400' },
    { id: 'lock',        label: 'Lock Session',       icon: <Lock size={14} />,      color: 'text-yellow-400' },
    { id: 'debug',       label: 'Toggle Debug Mode',  icon: <AlertCircle size={14} />, color: 'text-orange-400' },
    { id: 'theme',       label: 'Toggle Theme',       icon: <Moon size={14} />,      color: 'text-indigo-400' },
    { id: 'reset',       label: 'Reset to Defaults',  icon: <RotateCw size={14} />,  color: 'text-red-400' },
  ]

  const rateLimitPct = rateLimit
    ? Math.round((rateLimit.core.remaining / rateLimit.core.limit) * 100)
    : null

  if (!githubToken) {
    return (
      <div className="w-full h-screen bg-github-900 text-white flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Activity size={32} className="text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
          <p className="text-github-400 mb-4">Connect your GitHub account to view live metrics</p>
          <p className="text-sm text-github-500">Go to <span className="text-blue-400">Settings</span> to add your GitHub token</p>
        </div>
      </div>
    )
  }

  const displayName = userProfile?.name?.split(' ')[0] || userProfile?.login || 'there'
  const avatarUrl = userProfile?.avatar_url

  return (
    <div className="w-full h-screen bg-github-900 text-white overflow-y-auto" onContextMenu={handleContextMenu}>
      {/* Sticky header */}
      <div className="bg-github-800/95 backdrop-blur border-b border-github-700/80 px-6 py-3.5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-9 h-9 rounded-full ring-2 ring-github-600" />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                {displayName[0]?.toUpperCase() ?? 'P'}
              </div>
            )}
            <div>
              <h1 className="text-base font-bold text-white leading-tight">
                Welcome back, {displayName}
              </h1>
              <p className="text-github-500 text-[11px] leading-tight">
                {lastRefreshed
                  ? `Updated ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Loading data…'}
                {stats.login && <span className="text-github-600"> · @{stats.login}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {rateLimitPct !== null && (
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-github-600 uppercase tracking-wider">API quota</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-20 h-1 bg-github-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        rateLimitPct > 50 ? 'bg-green-400' : rateLimitPct > 20 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${rateLimitPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-github-400 tabular-nums">{rateLimit?.core.remaining ?? 0}</span>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => fetchDashboardData()}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-3.5 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-lg shadow-blue-900/30"
            >
              <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-6xl mx-auto">

        {/* Profile quick-view strip */}
        {userProfile && (
          <div className="bg-gradient-to-r from-blue-600/10 via-github-800 to-github-800 border border-github-700/60 rounded-xl p-4 flex items-center gap-4">
            {avatarUrl && (
              <img src={avatarUrl} alt={displayName} className="w-12 h-12 rounded-full ring-2 ring-blue-500/40 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm">{userProfile.name || userProfile.login}</p>
              <p className="text-github-500 text-xs">@{userProfile.login}{userProfile.bio ? ` · ${userProfile.bio}` : ''}</p>
            </div>
            <a
              href={`https://github.com/${userProfile.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-all shrink-0"
            >
              <ExternalLink size={12} />
              View Profile
            </a>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              type: 'prs' as const,
              label: 'Pull Requests',
              value: loading ? null : stats.openPRs,
              sub: `${stats.totalPRs} total`,
              icon: <GitPullRequest size={18} />,
              color: 'blue',
              borderHover: 'hover:border-blue-500/60',
              iconColor: 'text-blue-400',
              bgAccent: 'from-blue-600/10',
            },
            {
              type: 'issues' as const,
              label: 'Issues',
              value: loading ? null : stats.openIssues,
              sub: `${stats.totalIssues} total`,
              icon: <AlertCircle size={18} />,
              color: 'orange',
              borderHover: 'hover:border-orange-500/60',
              iconColor: 'text-orange-400',
              bgAccent: 'from-orange-600/10',
            },
            {
              type: 'repos' as const,
              label: 'Repositories',
              value: loading ? null : stats.repos,
              sub: 'public repos',
              icon: <Folder size={18} />,
              color: 'purple',
              borderHover: 'hover:border-purple-500/60',
              iconColor: 'text-purple-400',
              bgAccent: 'from-purple-600/10',
            },
            {
              type: 'followers' as const,
              label: 'Network',
              value: loading ? null : stats.followers,
              sub: `${stats.following} following`,
              icon: <Users size={18} />,
              color: 'green',
              borderHover: 'hover:border-green-500/60',
              iconColor: 'text-green-400',
              bgAccent: 'from-green-600/10',
            },
          ].map((card) => (
            <button
              key={card.type}
              type="button"
              onClick={() => openMetricModal(card.type)}
              className={`bg-gradient-to-br ${card.bgAccent} to-github-800 rounded-xl p-5 border border-github-700/60 ${card.borderHover} transition-all duration-200 text-left group hover:shadow-lg hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-github-500 text-[10px] font-bold uppercase tracking-widest">{card.label}</p>
                <span className={`${card.iconColor} opacity-70 group-hover:opacity-100 transition-opacity`}>
                  {card.icon}
                </span>
              </div>
              {card.value === null ? (
                <div className="h-9 flex items-center">
                  <div className="w-16 h-7 bg-github-700 rounded animate-pulse" />
                </div>
              ) : (
                <p className="text-3xl font-bold tabular-nums">{card.value}</p>
              )}
              <p className="text-[11px] text-github-600 mt-1">{card.sub}</p>
            </button>
          ))}
        </div>

        {/* Repository list */}
        <div className="bg-github-800 rounded-xl border border-github-700/60 overflow-hidden">
          <button
            type="button"
            className="w-full px-5 py-3.5 hover:bg-github-700/40 transition-colors flex items-center justify-between border-b border-github-700/60"
            onClick={() => setExpandRepos(!expandRepos)}
          >
            <div className="flex items-center gap-3">
              <GitBranch size={16} className="text-blue-400" />
              <h2 className="font-bold text-sm">Recent Repositories</h2>
              {repositories.length > 0 && (
                <span className="text-[11px] bg-github-700 px-2 py-0.5 rounded-full text-github-400 font-medium">
                  {repositories.length}
                </span>
              )}
            </div>
            <ChevronRight
              size={16}
              className={`transition-transform text-github-500 ${expandRepos ? 'rotate-90' : ''}`}
            />
          </button>

          {expandRepos && (
            <div className="divide-y divide-github-700/60">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[1,2,3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="h-4 bg-github-700 rounded w-48" />
                      <div className="h-4 bg-github-700 rounded w-64 opacity-60" />
                    </div>
                  ))}
                </div>
              ) : repositories.length === 0 ? (
                <div className="p-8 text-center text-github-500 text-sm">No repositories found</div>
              ) : (
                repositories.map((repo) => (
                  <div key={repo.name} className="px-5 py-3.5 hover:bg-github-700/30 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <a
                              href={repo.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 font-semibold text-sm flex items-center gap-1 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {repo.full_name || repo.name}
                              <ArrowUpRight size={12} className="opacity-60" />
                            </a>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              repo.private
                                ? 'bg-github-700 text-github-500'
                                : 'bg-green-900/40 text-green-400'
                            }`}>
                              {repo.private ? 'private' : 'public'}
                            </span>
                          </div>
                          {repo.description && (
                            <p className="text-[11px] text-github-500 truncate max-w-sm">{repo.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-github-500 shrink-0">
                        {repo.language && (
                          <span className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: getLangColor(repo.language) }}
                            />
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1 tabular-nums">
                          <Star size={11} />{repo.stars}
                        </span>
                        <span className="flex items-center gap-1 tabular-nums">
                          <Share2 size={11} />{repo.forks}
                        </span>
                        <span className="flex items-center gap-1 tabular-nums hidden md:flex">
                          <AlertCircle size={11} />{repo.open_issues}
                        </span>
                        <span className="flex items-center gap-1 text-github-600 hidden lg:flex">
                          <Clock size={11} />
                          {timeAgo(repo.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right-click hint */}
        <p className="text-[11px] text-github-700 text-center pb-2">Right-click anywhere for admin tools</p>
      </div>

      {/* Context menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed bg-github-800 border border-github-700 rounded-xl shadow-2xl z-50 py-2 min-w-52"
        >
          <p className="text-[10px] text-github-500 px-4 py-1.5 font-bold uppercase tracking-widest">Admin Tools</p>
          {adminTools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => handleAdminAction(tool.id)}
              className="w-full text-left px-4 py-2 hover:bg-github-700 transition-colors flex items-center gap-3 text-sm"
            >
              <span className={tool.color}>{tool.icon}</span>
              <span className="text-github-200">{tool.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Metric modal */}
      {metricModal.visible && metricModal.data && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-github-800 border border-github-700 rounded-xl max-w-lg w-full shadow-2xl">
            <div className="border-b border-github-700 p-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{metricModal.data.title}</h2>
                <p className="text-sm text-github-400 mt-0.5">{metricModal.data.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={closeMetricModal}
                aria-label="Close"
                className="p-1.5 hover:bg-github-700 rounded-lg transition-colors"
              >
                <X size={16} className="text-github-400" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
              {(metricModal.type === 'prs' || metricModal.type === 'issues') && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-github-900 rounded-xl p-4 text-center border border-github-700">
                    <p className="text-[11px] text-github-500 mb-1 uppercase tracking-wide">Open</p>
                    <p className="text-3xl font-bold text-green-400 tabular-nums">{metricModal.data.open}</p>
                  </div>
                  <div className="bg-github-900 rounded-xl p-4 text-center border border-github-700">
                    <p className="text-[11px] text-github-500 mb-1 uppercase tracking-wide">Total</p>
                    <p className="text-3xl font-bold text-blue-400 tabular-nums">{metricModal.data.total}</p>
                  </div>
                </div>
              )}

              {metricModal.type === 'repos' && metricModal.data.items?.map((repo: any) => (
                <div key={repo.name} className="bg-github-900 rounded-xl p-3 flex items-center justify-between border border-github-700/60">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{repo.full_name || repo.name}</p>
                    {repo.description && <p className="text-[11px] text-github-400 truncate max-w-xs">{repo.description}</p>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-github-500 ml-3 shrink-0">
                    <span className="flex items-center gap-1"><Star size={11} /> {repo.stars}</span>
                    <span className="flex items-center gap-1"><Share2 size={11} /> {repo.forks}</span>
                  </div>
                </div>
              ))}

              {metricModal.type === 'followers' && (
                <div className="text-center py-4">
                  <TrendingUp size={36} className="mx-auto mb-3 text-green-400" />
                  <p className="text-3xl font-bold tabular-nums">{metricModal.data.count}</p>
                  <p className="text-github-400 text-sm mt-1">Followers</p>
                  {metricModal.data.githubUrl && (
                    <a
                      href={metricModal.data.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 px-4 py-2 rounded-lg transition-all"
                    >
                      View on GitHub <ArrowUpRight size={13} />
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-github-700 p-4">
              <button
                type="button"
                onClick={closeMetricModal}
                className="w-full px-4 py-2 bg-github-700 hover:bg-github-600 rounded-lg text-sm font-medium transition-colors"
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
