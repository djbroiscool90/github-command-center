import React, { useState, useEffect, useCallback } from 'react'
import {
  X, AlertCircle, MessageSquare, Clock, ArrowUpRight,
  Edit2, Check, XCircle, RotateCcw, User, Tag,
} from 'react-feather'
import axios from 'axios'
import { usePanelStore, IssuePanelParams } from '../store/panelStore'
import { toast } from '../store/toastStore'

const API = 'http://localhost:8765'

interface IssueDetail {
  number: number
  title: string
  body: string
  state: string
  html_url: string
  created_at: string
  updated_at: string
  closed_at: string
  user: { login: string; avatar_url: string }
  assignees: Array<{ login: string; avatar_url: string }>
  labels: Array<{ id: number; name: string; color: string }>
  comments: number
  milestone: { title: string } | null
}

interface Comment {
  id: number
  body: string
  user: { login: string; avatar_url: string }
  created_at: string
}

function timeAgo(d: string) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function LabelChip({ name, color }: { name: string; color: string }) {
  const hex = `#${color}`
  const luminance = parseInt(color, 16) > 0xffffff / 2
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: hex, color: luminance ? '#000' : '#fff' }}
    >
      {name}
    </span>
  )
}

function SimpleBody({ text }: { text: string }) {
  if (!text) return <p className="text-github-500 italic text-sm">No description provided.</p>
  return (
    <pre className="whitespace-pre-wrap text-sm text-github-300 leading-relaxed font-sans">
      {text}
    </pre>
  )
}

export const IssueDetailPanel: React.FC = () => {
  const params = usePanelStore((s) => s.issuePanel) as IssuePanelParams | null
  const close = usePanelStore((s) => s.closeIssuePanel)
  const [issue, setIssue] = useState<IssueDetail | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editingBody, setEditingBody] = useState(false)
  const [editBody, setEditBody] = useState('')
  const [updating, setUpdating] = useState(false)
  const token = localStorage.getItem('github_token')
  const headers = token ? { Authorization: `token ${token}` } : {}

  const load = useCallback(async () => {
    if (!params) return
    const { owner, repo, number } = params
    setLoading(true)
    try {
      const [issueRes, commentsRes] = await Promise.allSettled([
        axios.get(`${API}/api/github/issue/${owner}/${repo}/${number}`, { headers }),
        axios.get(`${API}/api/github/issue/${owner}/${repo}/${number}/comments`, { headers }),
      ])
      if (issueRes.status === 'fulfilled') setIssue(issueRes.value.data)
      if (commentsRes.status === 'fulfilled') setComments(commentsRes.value.data)
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    if (params) {
      setIssue(null); setComments([]); setEditingTitle(false); setEditingBody(false)
      load()
    }
  }, [params, load])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close])

  const toggleState = async () => {
    if (!params || !issue) return
    setUpdating(true)
    try {
      const newState = issue.state === 'open' ? 'closed' : 'open'
      await axios.patch(
        `${API}/api/github/issue/${params.owner}/${params.repo}/${params.number}`,
        { state: newState },
        { headers }
      )
      toast.success(newState === 'closed' ? 'Issue closed' : 'Issue reopened', `#${params.number}`)
      load()
    } catch {
      toast.error('Failed to update issue state')
    } finally {
      setUpdating(false)
    }
  }

  const saveTitle = async () => {
    if (!params || !editTitle.trim()) return
    setUpdating(true)
    try {
      await axios.patch(
        `${API}/api/github/issue/${params.owner}/${params.repo}/${params.number}`,
        { title: editTitle },
        { headers }
      )
      toast.success('Title updated')
      setEditingTitle(false)
      load()
    } catch {
      toast.error('Failed to update title')
    } finally {
      setUpdating(false)
    }
  }

  const saveBody = async () => {
    if (!params) return
    setUpdating(true)
    try {
      await axios.patch(
        `${API}/api/github/issue/${params.owner}/${params.repo}/${params.number}`,
        { body: editBody },
        { headers }
      )
      toast.success('Description updated')
      setEditingBody(false)
      load()
    } catch {
      toast.error('Failed to update description')
    } finally {
      setUpdating(false)
    }
  }

  const addComment = async () => {
    if (!params || !commentBody.trim()) return
    setSubmittingComment(true)
    try {
      await axios.post(
        `${API}/api/github/issue/${params.owner}/${params.repo}/${params.number}/comment`,
        { body: commentBody },
        { headers }
      )
      toast.success('Comment added')
      setCommentBody('')
      load()
    } catch {
      toast.error('Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  if (!params) return null

  const isOpen = issue?.state === 'open'
  const stateColor = isOpen
    ? 'bg-green-600/20 text-green-300 border-green-500/30'
    : 'bg-purple-600/20 text-purple-300 border-purple-500/30'

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={close} />

      <div className="fixed right-0 top-0 h-full w-full max-w-2xl z-50 bg-github-900 border-l border-github-700 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-github-700 bg-github-800">
          <AlertCircle size={18} className={`mt-0.5 shrink-0 ${isOpen ? 'text-green-400' : 'text-purple-400'}`} />
          <div className="flex-1 min-w-0">
            {loading && !issue ? (
              <div className="h-5 bg-github-700 rounded animate-pulse w-64" />
            ) : editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 bg-github-900 border border-blue-500 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
                  onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                />
                <button onClick={saveTitle} disabled={updating} className="p-1.5 bg-green-600 rounded-lg hover:bg-green-500 transition-colors">
                  <Check size={13} />
                </button>
                <button onClick={() => setEditingTitle(false)} className="p-1.5 bg-github-700 rounded-lg hover:bg-github-600 transition-colors">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-white text-base leading-snug">{issue?.title}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${stateColor}`}>
                      {issue?.state}
                    </span>
                  </div>
                  <p className="text-github-500 text-[11px] mt-0.5">
                    {params.repoFullName} #{params.number}
                    {issue && <span> · by @{issue.user.login}</span>}
                    {issue && <span> · {timeAgo(issue.created_at)}</span>}
                  </p>
                </div>
                <button
                  onClick={() => { setEditTitle(issue?.title || ''); setEditingTitle(true) }}
                  className="p-1 hover:bg-github-700 rounded text-github-500 hover:text-github-300 transition-colors shrink-0"
                  title="Edit title"
                >
                  <Edit2 size={13} />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {issue && (
              <a href={issue.html_url} target="_blank" rel="noopener noreferrer"
                className="p-1.5 hover:bg-github-700 rounded-lg text-github-400 hover:text-github-200 transition-colors" title="Open on GitHub">
                <ArrowUpRight size={15} />
              </a>
            )}
            <button type="button" onClick={close} className="p-1.5 hover:bg-github-700 rounded-lg text-github-400 hover:text-github-200 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Labels + Meta */}
          {issue && (issue.labels.length > 0 || issue.assignees.length > 0 || issue.milestone) && (
            <div className="flex flex-wrap gap-3">
              {issue.labels.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag size={11} className="text-github-500" />
                  {issue.labels.map((l) => <LabelChip key={l.id} name={l.name} color={l.color} />)}
                </div>
              )}
              {issue.assignees.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <User size={11} className="text-github-500" />
                  {issue.assignees.map((a) => (
                    <div key={a.login} className="flex items-center gap-1">
                      <img src={a.avatar_url} alt={a.login} className="w-5 h-5 rounded-full" />
                      <span className="text-[11px] text-github-400">@{a.login}</span>
                    </div>
                  ))}
                </div>
              )}
              {issue.milestone && (
                <span className="text-[11px] text-github-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  {issue.milestone.title}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          <div className="bg-github-800 rounded-xl border border-github-700/60">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-github-700/60">
              <div className="flex items-center gap-2">
                {issue && (
                  <img src={issue.user.avatar_url} alt={issue.user.login} className="w-5 h-5 rounded-full" />
                )}
                <span className="text-xs font-semibold text-github-300">@{issue?.user.login}</span>
                <span className="text-[11px] text-github-500">opened {timeAgo(issue?.created_at || '')}</span>
              </div>
              {!editingBody && (
                <button
                  onClick={() => { setEditBody(issue?.body || ''); setEditingBody(true) }}
                  className="p-1 hover:bg-github-700 rounded text-github-500 hover:text-github-300 transition-colors"
                  title="Edit description"
                >
                  <Edit2 size={12} />
                </button>
              )}
            </div>
            <div className="p-4">
              {editingBody ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={8}
                    className="w-full bg-github-900 border border-blue-500 rounded-lg p-3 text-sm text-white focus:outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveBody} disabled={updating} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors">
                      <Check size={12} /> Save
                    </button>
                    <button onClick={() => setEditingBody(false)} className="flex items-center gap-1.5 px-3 py-1.5 bg-github-700 hover:bg-github-600 rounded-lg text-xs font-medium transition-colors">
                      <X size={12} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <SimpleBody text={issue?.body || ''} />
              )}
            </div>
          </div>

          {/* Open/Close toggle */}
          {issue && (
            <button
              type="button"
              onClick={toggleState}
              disabled={updating}
              className={`w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                isOpen
                  ? 'bg-red-700/20 hover:bg-red-700/40 text-red-300 border border-red-700/40'
                  : 'bg-green-700/20 hover:bg-green-700/40 text-green-300 border border-green-700/40'
              }`}
            >
              {updating ? <RotateCcw size={14} className="animate-spin" /> : isOpen ? <XCircle size={14} /> : <Check size={14} />}
              {isOpen ? 'Close Issue' : 'Reopen Issue'}
            </button>
          )}

          {/* Comments */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-github-500 uppercase tracking-wide flex items-center gap-2">
              <MessageSquare size={12} /> Comments ({comments.length})
            </h3>
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <img src={c.user.avatar_url} alt={c.user.login} className="w-7 h-7 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 bg-github-800 rounded-xl p-3 border border-github-700/60">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-white">@{c.user.login}</span>
                    <span className="text-[10px] text-github-500 flex items-center gap-1">
                      <Clock size={9} /> {timeAgo(c.created_at)}
                    </span>
                  </div>
                  <SimpleBody text={c.body} />
                </div>
              </div>
            ))}
          </div>

          {/* Add comment */}
          <div className="border-t border-github-700 pt-4 space-y-2">
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Leave a comment…"
              rows={3}
              className="w-full bg-github-800 border border-github-700 rounded-lg p-3 text-sm text-white placeholder-github-600 resize-none focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="button"
              onClick={addComment}
              disabled={submittingComment || !commentBody.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              {submittingComment ? <RotateCcw size={13} className="animate-spin" /> : <User size={13} />}
              {submittingComment ? 'Posting…' : 'Comment'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
