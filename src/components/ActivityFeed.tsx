import React, { useState, useEffect, useCallback } from 'react'
import {
  Activity, GitCommit, GitPullRequest, AlertCircle, Star,
  GitBranch, Trash2, RefreshCw, ExternalLink, Filter,
} from 'react-feather'
import axios from 'axios'

const API = 'http://localhost:8765'

interface GitHubEvent {
  id: string
  type: string
  created_at: string
  actor: { login: string; avatar_url: string; display_login: string }
  repo: { name: string; url: string }
  payload: any
}

interface EventDisplay {
  icon: React.ReactNode
  color: string
  label: string
  detail: string
  repoUrl: string
}

const EVENT_TYPES = [
  'All',
  'PushEvent',
  'PullRequestEvent',
  'IssuesEvent',
  'WatchEvent',
  'CreateEvent',
  'DeleteEvent',
  'ForkEvent',
  'IssueCommentEvent',
]

function parseEvent(evt: GitHubEvent): EventDisplay {
  const repoUrl = `https://github.com/${evt.repo.name}`
  const p = evt.payload || {}

  switch (evt.type) {
    case 'PushEvent': {
      const count = p.commits?.length ?? 0
      const branch = (p.ref || '').replace('refs/heads/', '')
      const msg = p.commits?.[0]?.message?.split('\n')[0] || ''
      return {
        icon: <GitCommit size={16} />,
        color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        label: `Pushed ${count} commit${count !== 1 ? 's' : ''} to ${branch}`,
        detail: msg,
        repoUrl,
      }
    }
    case 'PullRequestEvent': {
      const action = p.action || 'opened'
      const title = p.pull_request?.title || ''
      const num = p.number || p.pull_request?.number || ''
      return {
        icon: <GitPullRequest size={16} />,
        color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        label: `${action.charAt(0).toUpperCase() + action.slice(1)} PR #${num}`,
        detail: title,
        repoUrl: p.pull_request?.html_url || repoUrl,
      }
    }
    case 'IssuesEvent': {
      const action = p.action || 'opened'
      const title = p.issue?.title || ''
      const num = p.issue?.number || ''
      return {
        icon: <AlertCircle size={16} />,
        color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
        label: `${action.charAt(0).toUpperCase() + action.slice(1)} issue #${num}`,
        detail: title,
        repoUrl: p.issue?.html_url || repoUrl,
      }
    }
    case 'WatchEvent':
      return {
        icon: <Star size={16} />,
        color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        label: 'Starred repository',
        detail: evt.repo.name,
        repoUrl,
      }
    case 'CreateEvent': {
      const refType = p.ref_type || 'repository'
      const ref = p.ref || ''
      return {
        icon: <GitBranch size={16} />,
        color: 'text-green-400 bg-green-500/10 border-green-500/20',
        label: `Created ${refType}${ref ? ` "${ref}"` : ''}`,
        detail: evt.repo.name,
        repoUrl,
      }
    }
    case 'DeleteEvent': {
      const refType = p.ref_type || 'branch'
      const ref = p.ref || ''
      return {
        icon: <Trash2 size={16} />,
        color: 'text-red-400 bg-red-500/10 border-red-500/20',
        label: `Deleted ${refType} "${ref}"`,
        detail: evt.repo.name,
        repoUrl,
      }
    }
    case 'ForkEvent':
      return {
        icon: <GitBranch size={16} />,
        color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        label: 'Forked repository',
        detail: p.forkee?.full_name || evt.repo.name,
        repoUrl: p.forkee?.html_url || repoUrl,
      }
    case 'IssueCommentEvent': {
      const body = p.comment?.body?.split('\n')[0]?.slice(0, 80) || ''
      return {
        icon: <AlertCircle size={16} />,
        color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
        label: `Commented on issue #${p.issue?.number || ''}`,
        detail: body,
        repoUrl: p.comment?.html_url || repoUrl,
      }
    }
    default:
      return {
        icon: <Activity size={16} />,
        color: 'text-github-400 bg-github-700/30 border-github-600',
        label: evt.type.replace('Event', ''),
        detail: evt.repo.name,
        repoUrl,
      }
  }
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

export const ActivityFeed: React.FC = () => {
  const [events, setEvents] = useState<GitHubEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('All')
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const githubToken = localStorage.getItem('github_token')

  const fetchEvents = useCallback(async () => {
    if (!githubToken) return
    try {
      setLoading(true)
      setError(null)
      const res = await axios.get(`${API}/api/github/events`, {
        headers: { Authorization: `token ${githubToken}` },
      })
      setEvents(res.data || [])
      setLastFetched(new Date())
    } catch (err: any) {
      setError(err.response?.data || 'Failed to load activity. Check your GitHub token.')
    } finally {
      setLoading(false)
    }
  }, [githubToken])

  useEffect(() => {
    fetchEvents()
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchEvents, 120000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  const filteredEvents = typeFilter === 'All'
    ? events
    : events.filter((e) => e.type === typeFilter)

  // Group events by date
  const grouped: Record<string, GitHubEvent[]> = {}
  for (const evt of filteredEvents) {
    const day = new Date(evt.created_at).toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric',
    })
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(evt)
  }

  const presentTypes = Array.from(new Set(events.map((e) => e.type)))
  const shownTypes = EVENT_TYPES.filter((t) => t === 'All' || presentTypes.includes(t))

  if (!githubToken) {
    return (
      <div className="w-full h-screen bg-github-900 text-white flex items-center justify-center">
        <div className="text-center max-w-sm">
          <Activity size={48} className="mx-auto mb-4 text-blue-500" />
          <h2 className="text-2xl font-bold mb-2">Activity Feed</h2>
          <p className="text-github-400">Connect your GitHub account to see your live activity feed</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-github-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-github-800 border-b border-github-700 p-5 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Activity size={26} className="text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold">Activity Feed</h1>
              <p className="text-xs text-github-400 mt-0.5">
                {lastFetched
                  ? `Updated ${timeAgo(lastFetched.toISOString())}`
                  : 'Loading your GitHub activity…'}
                {filteredEvents.length > 0 && ` · ${filteredEvents.length} events`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchEvents}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Type filter chips */}
        {shownTypes.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-github-500" />
            {shownTypes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  typeFilter === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-github-700 text-github-400 hover:bg-github-600'
                }`}
              >
                {t === 'All' ? 'All events' : t.replace('Event', '')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {loading && events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-github-500">
            <RefreshCw size={32} className="animate-spin mb-3 text-blue-500" />
            <p>Loading activity…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <AlertCircle size={40} className="mb-3 text-red-400" />
            <p className="text-red-300 font-medium">Failed to load activity</p>
            <p className="text-github-500 text-sm mt-1">{error}</p>
            <button
              type="button"
              onClick={fetchEvents}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-github-500">
            <Activity size={40} className="mb-3 opacity-30" />
            <p>No activity found</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-5 space-y-6">
            {Object.entries(grouped).map(([day, dayEvents]) => (
              <div key={day}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold text-github-500 uppercase tracking-wider">{day}</span>
                  <div className="flex-1 h-px bg-github-700" />
                  <span className="text-xs text-github-600">{dayEvents.length} events</span>
                </div>

                <div className="space-y-2">
                  {dayEvents.map((evt) => {
                    const display = parseEvent(evt)
                    return (
                      <div
                        key={evt.id}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors hover:bg-github-800/60 ${display.color}`}
                      >
                        {/* Icon */}
                        <div className="shrink-0 mt-0.5">{display.icon}</div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-medium text-sm">{display.label}</span>
                            <span className="text-xs text-github-500">in</span>
                            <a
                              href={`https://github.com/${evt.repo.name}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline font-medium truncate max-w-xs"
                            >
                              {evt.repo.name}
                            </a>
                          </div>
                          {display.detail && (
                            <p className="text-xs text-github-400 mt-0.5 truncate">{display.detail}</p>
                          )}
                        </div>

                        {/* Time + link */}
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-xs text-github-600 whitespace-nowrap">
                            {timeAgo(evt.created_at)}
                          </span>
                          <a
                            href={display.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open on GitHub"
                            className="text-github-600 hover:text-github-300 transition-colors"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            <p className="text-center text-xs text-github-600 pb-4">
              Showing last {filteredEvents.length} events · GitHub keeps 90 days of public activity
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
