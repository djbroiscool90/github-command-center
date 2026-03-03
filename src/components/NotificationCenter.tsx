import React, { useState, useEffect, useCallback } from 'react'
import {
  Bell, RotateCcw, CheckCircle, AlertCircle, MessageSquare,
  GitPullRequest, GitMerge, GitCommit, ArrowUpRight, Check,
} from 'react-feather'
import axios from 'axios'
import { usePanelStore } from '../store/panelStore'
import { toast } from '../store/toastStore'

const API = 'http://localhost:8765'

interface GitHubNotification {
  id: string
  unread: boolean
  reason: string
  updated_at: string
  subject: {
    title: string
    url: string
    type: 'PullRequest' | 'Issue' | 'Commit' | 'Release' | 'Discussion' | string
    latest_comment_url: string
  }
  repository: {
    full_name: string
    name: string
    html_url: string
    owner: { login: string; avatar_url: string }
  }
  url: string
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function reasonLabel(reason: string) {
  const map: Record<string, string> = {
    assign: 'Assigned',
    author: 'Author',
    comment: 'Comment',
    invitation: 'Invitation',
    manual: 'Subscribed',
    mention: 'Mentioned',
    review_requested: 'Review requested',
    security_alert: 'Security alert',
    state_change: 'State changed',
    subscribed: 'Watching',
    team_mention: 'Team mentioned',
    ci_activity: 'CI activity',
  }
  return map[reason] || reason
}

function TypeIcon({ type, reason }: { type: string; reason: string }) {
  if (type === 'PullRequest') {
    if (reason === 'review_requested') return <MessageSquare size={15} className="text-blue-400" />
    return <GitPullRequest size={15} className="text-purple-400" />
  }
  if (type === 'Issue') return <AlertCircle size={15} className="text-green-400" />
  if (type === 'Commit') return <GitCommit size={15} className="text-orange-400" />
  if (type === 'Release') return <GitMerge size={15} className="text-pink-400" />
  return <Bell size={15} className="text-github-400" />
}

function typeColor(type: string, reason: string) {
  if (type === 'PullRequest') {
    if (reason === 'review_requested') return 'bg-blue-600/20 text-blue-300 border-blue-500/30'
    return 'bg-purple-600/20 text-purple-300 border-purple-500/30'
  }
  if (type === 'Issue') return 'bg-green-600/20 text-green-300 border-green-500/30'
  if (type === 'Commit') return 'bg-orange-600/20 text-orange-300 border-orange-500/30'
  if (type === 'Release') return 'bg-pink-600/20 text-pink-300 border-pink-500/30'
  return 'bg-github-700 text-github-400 border-github-600'
}

// Extract PR/Issue number from GitHub API URL
function extractNumber(apiUrl: string): number | null {
  const match = apiUrl?.match(/\/(\d+)$/)
  return match ? parseInt(match[1]) : null
}

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<GitHubNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'PullRequest' | 'Issue'>('all')
  const [markingAll, setMarkingAll] = useState(false)
  const token = localStorage.getItem('github_token')
  const headers = token ? { Authorization: `token ${token}` } : {}
  const openPRPanel = usePanelStore((s) => s.openPRPanel)
  const openIssuePanel = usePanelStore((s) => s.openIssuePanel)

  const fetchNotifications = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await axios.get(`${API}/api/github/notifications`, { headers })
      setNotifications(res.data || [])
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 120_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markAsRead = async (id: string, silent = false) => {
    try {
      await axios.patch(`${API}/api/github/notifications/${id}/read`, {}, { headers })
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, unread: false } : n))
      if (!silent) toast.success('Marked as read')
    } catch {
      if (!silent) toast.error('Failed to mark as read')
    }
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      // Mark all in parallel
      const unread = notifications.filter((n) => n.unread)
      await Promise.allSettled(
        unread.map((n) => axios.patch(`${API}/api/github/notifications/${n.id}/read`, {}, { headers }))
      )
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
      toast.success(`Marked ${unread.length} notifications as read`)
    } catch {
      toast.error('Some notifications could not be marked as read')
    } finally {
      setMarkingAll(false)
    }
  }

  const openInline = async (notif: GitHubNotification) => {
    // Mark as read silently when opening
    if (notif.unread) await markAsRead(notif.id, true)

    const { type, url } = notif.subject
    const repoFullName = notif.repository.full_name
    const [owner, repo] = repoFullName.split('/')
    const number = extractNumber(url)

    if (type === 'PullRequest' && number) {
      openPRPanel({ owner, repo, number, repoFullName })
    } else if (type === 'Issue' && number) {
      openIssuePanel({ owner, repo, number, repoFullName })
    } else {
      // Fallback: open on GitHub
      window.open(notif.repository.html_url, '_blank')
    }
  }

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return n.unread
    if (filter === 'PullRequest') return n.subject.type === 'PullRequest'
    if (filter === 'Issue') return n.subject.type === 'Issue'
    return true
  })

  const unreadCount = notifications.filter((n) => n.unread).length

  if (!token) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-github-400">
        <div className="text-center">
          <Bell size={48} className="mx-auto mb-4 opacity-50" />
          <p>Please link your GitHub account to view notifications</p>
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
            <Bell size={20} className="text-yellow-400" />
            <h1 className="text-xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchNotifications}
              disabled={loading}
              title="Refresh"
              className="p-2 hover:bg-github-700 rounded-lg text-github-400 hover:text-github-200 transition-colors disabled:opacity-50"
            >
              <RotateCcw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                disabled={markingAll}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {markingAll
                  ? <RotateCcw size={13} className="animate-spin" />
                  : <Check size={13} />
                }
                Mark all read
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          {([
            { value: 'all', label: 'All' },
            { value: 'unread', label: `Unread (${unreadCount})` },
            { value: 'PullRequest', label: 'Pull Requests' },
            { value: 'Issue', label: 'Issues' },
          ] as const).map((f) => (
            <button
              type="button"
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/30'
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
        {loading && notifications.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-github-800 rounded-xl p-4 border border-github-700/60 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-github-700 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-github-700 rounded w-3/4" />
                    <div className="h-3 bg-github-700 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={40} className="mx-auto mb-4 text-github-600" />
            <p className="text-github-400 mb-2">
              {filter === 'unread' ? 'All caught up!' : 'No notifications'}
            </p>
            {filter === 'unread' && (
              <p className="text-github-600 text-sm">You have read all your notifications</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((notif) => {
              const canOpen = notif.subject.type === 'PullRequest' || notif.subject.type === 'Issue'
              return (
                <div
                  key={notif.id}
                  className={`group bg-github-800 border rounded-xl p-4 transition-all ${
                    notif.unread
                      ? 'border-blue-500/40 ring-1 ring-blue-500/10'
                      : 'border-github-700/60'
                  } ${canOpen ? 'hover:border-yellow-500/40 hover:bg-github-800/80 cursor-pointer' : ''}`}
                  onClick={() => canOpen && openInline(notif)}
                >
                  <div className="flex items-start gap-3">
                    {/* Unread dot */}
                    <div className="shrink-0 mt-2">
                      {notif.unread
                        ? <div className="w-2 h-2 rounded-full bg-blue-400" />
                        : <div className="w-2 h-2 rounded-full bg-transparent" />
                      }
                    </div>

                    {/* Repo avatar */}
                    <img
                      src={notif.repository.owner.avatar_url}
                      alt={notif.repository.owner.login}
                      className="w-7 h-7 rounded-full shrink-0 mt-0.5"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${typeColor(notif.subject.type, notif.reason)}`}>
                          <TypeIcon type={notif.subject.type} reason={notif.reason} />
                          {notif.subject.type}
                        </span>
                        <span className="text-[10px] text-github-600 bg-github-700/60 px-1.5 py-0.5 rounded-full">
                          {reasonLabel(notif.reason)}
                        </span>
                      </div>
                      <p className={`text-sm font-semibold leading-snug mb-1 ${
                        canOpen ? 'group-hover:text-yellow-300 transition-colors' : ''
                      } ${notif.unread ? 'text-white' : 'text-github-300'}`}>
                        {notif.subject.title}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-github-500">
                        <span>{notif.repository.full_name}</span>
                        <span>{timeAgo(notif.updated_at)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {notif.unread && (
                        <button
                          type="button"
                          title="Mark as read"
                          onClick={(e) => { e.stopPropagation(); markAsRead(notif.id) }}
                          className="p-1.5 hover:bg-github-700 rounded-lg text-github-400 hover:text-green-400 transition-colors"
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}
                      <a
                        href={notif.repository.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open repo on GitHub"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 hover:bg-github-700 rounded-lg text-github-400 hover:text-github-200 transition-colors"
                      >
                        <ArrowUpRight size={14} />
                      </a>
                    </div>

                    {/* Inline view hint */}
                    {canOpen && (
                      <span className="text-[10px] text-yellow-400 bg-yellow-600/10 border border-yellow-500/20 px-2 py-1 rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition-opacity font-medium whitespace-nowrap">
                        View inline →
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
