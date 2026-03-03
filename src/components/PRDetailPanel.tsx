import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  X, GitMerge, GitPullRequest, MessageSquare, FileText,
  Check, AlertCircle, Clock, ArrowUpRight, ChevronDown, ChevronRight,
  Plus, Minus, RotateCcw, User, Search, Folder,
} from 'react-feather'
import axios from 'axios'
import { usePanelStore, PRPanelParams } from '../store/panelStore'
import { toast } from '../store/toastStore'

const API = 'http://localhost:8765'

interface PRDetail {
  number: number
  title: string
  state: string
  body: string
  draft: boolean
  merged: boolean
  mergeable: boolean | null
  html_url: string
  created_at: string
  updated_at: string
  merged_at: string
  user: { login: string; avatar_url: string }
  head: { ref: string; sha: string; repo: { full_name: string } }
  base: { ref: string }
  additions: number
  deletions: number
  changed_files: number
  comments: number
  review_comments: number
}

interface PRFile {
  filename: string
  status: string
  additions: number
  deletions: number
  changes: number
  patch: string
}

interface Comment {
  id: number
  body: string
  user: { login: string; avatar_url: string }
  created_at: string
}

type TabId = 'overview' | 'files' | 'comments'

function timeAgo(d: string) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function SimpleBody({ text }: { text: string }) {
  if (!text) return <p className="text-github-500 italic text-sm">No description provided.</p>
  return (
    <pre className="whitespace-pre-wrap text-sm text-github-300 leading-relaxed font-sans">
      {text}
    </pre>
  )
}

/** Parse a unified diff patch into annotated lines with line numbers */
function parsePatch(patch: string) {
  let oldLine = 0
  let newLine = 0
  return patch.split('\n').map((raw) => {
    const hunkMatch = raw.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (hunkMatch) {
      oldLine = parseInt(hunkMatch[1]) - 1
      newLine = parseInt(hunkMatch[2]) - 1
      return { raw, type: 'hunk' as const, oldNo: null, newNo: null }
    }
    if (raw.startsWith('+') && !raw.startsWith('+++')) {
      newLine++
      return { raw, type: 'add' as const, oldNo: null, newNo: newLine }
    }
    if (raw.startsWith('-') && !raw.startsWith('---')) {
      oldLine++
      return { raw, type: 'del' as const, oldNo: oldLine, newNo: null }
    }
    if (!raw.startsWith('\\')) {
      oldLine++; newLine++
      return { raw, type: 'ctx' as const, oldNo: oldLine, newNo: newLine }
    }
    return { raw, type: 'ctx' as const, oldNo: null, newNo: null }
  })
}

function DiffPatch({ patch, filename }: { patch: string; filename: string }) {
  if (!patch) return (
    <div className="px-4 py-3 text-github-600 text-xs italic">Binary file or no diff available</div>
  )
  const lines = parsePatch(patch)
  return (
    <div className="font-mono text-xs overflow-x-auto">
      {lines.map((line, i) => {
        const { type, raw, oldNo, newNo } = line
        const bg =
          type === 'add' ? 'bg-green-950/60 border-l-2 border-green-600' :
          type === 'del' ? 'bg-red-950/60 border-l-2 border-red-600' :
          type === 'hunk' ? 'bg-blue-950/40' : ''
        const color =
          type === 'add' ? 'text-green-300' :
          type === 'del' ? 'text-red-300' :
          type === 'hunk' ? 'text-blue-400' : 'text-github-400'
        return (
          <div key={i} className={`flex group hover:bg-white/[0.02] ${bg}`}>
            <span className="w-10 shrink-0 text-right pr-2 py-0.5 text-github-700 border-r border-github-800 select-none text-[10px] leading-5">
              {oldNo ?? ''}
            </span>
            <span className="w-10 shrink-0 text-right pr-2 py-0.5 text-github-700 border-r border-github-800 select-none text-[10px] leading-5">
              {newNo ?? ''}
            </span>
            <span className={`pl-3 py-0.5 ${color} whitespace-pre leading-5 flex-1`}>{raw}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Build a simple directory tree from flat file list */
function buildTree(files: PRFile[]) {
  const dirs: Record<string, PRFile[]> = {}
  const roots: PRFile[] = []
  for (const f of files) {
    const idx = f.filename.lastIndexOf('/')
    if (idx === -1) {
      roots.push(f)
    } else {
      const dir = f.filename.slice(0, idx)
      if (!dirs[dir]) dirs[dir] = []
      dirs[dir].push(f)
    }
  }
  return { dirs, roots }
}

export const PRDetailPanel: React.FC = () => {
  const params = usePanelStore((s) => s.prPanel) as PRPanelParams | null
  const close = usePanelStore((s) => s.closePRPanel)
  const [pr, setPR] = useState<PRDetail | null>(null)
  const [files, setFiles] = useState<PRFile[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [tab, setTab] = useState<TabId>('overview')
  const [loading, setLoading] = useState(false)
  const [reviewBody, setReviewBody] = useState('')
  const [commentBody, setCommentBody] = useState('')
  const [mergeMethod, setMergeMethod] = useState<'merge' | 'squash' | 'rebase'>('merge')
  const [merging, setMerging] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileSearch, setFileSearch] = useState('')
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const diffPaneRef = useRef<HTMLDivElement>(null)
  const token = localStorage.getItem('github_token')
  const headers = token ? { Authorization: `token ${token}` } : {}

  const filteredFiles = useMemo(() => {
    const q = fileSearch.trim().toLowerCase()
    return q ? files.filter((f) => f.filename.toLowerCase().includes(q)) : files
  }, [files, fileSearch])

  const { dirs, roots } = useMemo(() => buildTree(filteredFiles), [filteredFiles])

  const toggleDir = (dir: string) =>
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      next.has(dir) ? next.delete(dir) : next.add(dir)
      return next
    })

  const scrollToFile = (filename: string) => {
    setSelectedFile(filename)
    const el = diffPaneRef.current?.querySelector(`[data-file="${CSS.escape(filename)}"]`) as HTMLElement | null
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const fileStatusColor = (status: string) =>
    status === 'added' ? 'text-green-400' :
    status === 'removed' ? 'text-red-400' :
    status === 'renamed' ? 'text-yellow-400' : 'text-blue-400'

  const load = useCallback(async () => {
    if (!params) return
    const { owner, repo, number } = params
    setLoading(true)
    try {
      const [prRes, filesRes, commentsRes] = await Promise.allSettled([
        axios.get(`${API}/api/github/pr/${owner}/${repo}/${number}`, { headers }),
        axios.get(`${API}/api/github/pr/${owner}/${repo}/${number}/files`, { headers }),
        axios.get(`${API}/api/github/pr/${owner}/${repo}/${number}/comments`, { headers }),
      ])
      if (prRes.status === 'fulfilled') setPR(prRes.value.data)
      if (filesRes.status === 'fulfilled') setFiles(filesRes.value.data)
      if (commentsRes.status === 'fulfilled') setComments(commentsRes.value.data)
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    if (params) {
      setPR(null); setFiles([]); setComments([]); setTab('overview')
      setSelectedFile(null); setFileSearch('')
      load()
    }
  }, [params, load])

  // Auto-expand all directories when files load
  useEffect(() => {
    const allDirs = new Set<string>()
    for (const f of files) {
      const idx = f.filename.lastIndexOf('/')
      if (idx !== -1) allDirs.add(f.filename.slice(0, idx))
    }
    setExpandedDirs(allDirs)
  }, [files])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close])

  const submitReview = async (event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT') => {
    if (!params || !reviewBody.trim() && event !== 'APPROVE') return
    setSubmittingReview(true)
    try {
      await axios.post(
        `${API}/api/github/pr/${params.owner}/${params.repo}/${params.number}/review`,
        { body: reviewBody, event },
        { headers }
      )
      toast.success(
        event === 'APPROVE' ? 'Approved!' : event === 'REQUEST_CHANGES' ? 'Changes requested' : 'Review submitted',
        `PR #${params.number}`
      )
      setReviewBody('')
      load()
    } catch {
      toast.error('Review failed', 'Check your permissions for this repo')
    } finally {
      setSubmittingReview(false)
    }
  }

  const mergePR = async () => {
    if (!params || !pr) return
    setMerging(true)
    try {
      await axios.put(
        `${API}/api/github/pr/${params.owner}/${params.repo}/${params.number}/merge`,
        { merge_method: mergeMethod },
        { headers }
      )
      toast.success('PR Merged!', `${params.repoFullName} #${params.number}`)
      load()
    } catch (err: any) {
      toast.error('Merge failed', err?.response?.data?.message || 'Check merge requirements')
    } finally {
      setMerging(false)
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
      toast.error('Comment failed')
    } finally {
      setSubmittingComment(false)
    }
  }

  if (!params) return null

  const stateColor = pr?.merged
    ? 'bg-purple-600/20 text-purple-300 border-purple-500/30'
    : pr?.state === 'open'
    ? 'bg-green-600/20 text-green-300 border-green-500/30'
    : 'bg-red-600/20 text-red-300 border-red-500/30'

  const stateLabel = pr?.merged ? 'Merged' : pr?.state === 'open' ? 'Open' : 'Closed'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={close} />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-3xl z-50 bg-github-900 border-l border-github-700 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-github-700 bg-github-800">
          <GitPullRequest size={18} className="text-blue-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            {loading && !pr ? (
              <div className="h-5 bg-github-700 rounded animate-pulse w-64" />
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-white text-base leading-snug">{pr?.title}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${stateColor}`}>
                    {stateLabel}
                  </span>
                  {pr?.draft && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-github-700 text-github-400 border border-github-600">
                      Draft
                    </span>
                  )}
                </div>
                <p className="text-github-500 text-[11px] mt-0.5">
                  {params.repoFullName} #{params.number}
                  {pr && <span> · {pr.head.ref} → {pr.base.ref}</span>}
                  {pr && <span> · by @{pr.user.login}</span>}
                  {pr && <span> · {timeAgo(pr.created_at)}</span>}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {pr && (
              <a
                href={pr.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-github-700 rounded-lg text-github-400 hover:text-github-200 transition-colors"
                title="Open on GitHub"
              >
                <ArrowUpRight size={15} />
              </a>
            )}
            <button
              type="button"
              onClick={close}
              className="p-1.5 hover:bg-github-700 rounded-lg text-github-400 hover:text-github-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-github-700 bg-github-800">
          {([
            { id: 'overview', label: 'Overview', icon: <FileText size={13} /> },
            { id: 'files', label: `Files (${files.length})`, icon: <Plus size={13} /> },
            { id: 'comments', label: `Comments (${comments.length})`, icon: <MessageSquare size={13} /> },
          ] as { id: TabId; label: string; icon: React.ReactNode }[]).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? 'border-blue-400 text-white'
                  : 'border-transparent text-github-400 hover:text-github-200'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className={`flex-1 ${tab === 'files' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {tab === 'overview' && (
            <div className="p-5 space-y-5">
              {/* Stats */}
              {pr && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-github-800 rounded-xl p-3 text-center border border-github-700/60">
                    <p className="text-[10px] text-github-500 uppercase tracking-wide">Changed Files</p>
                    <p className="text-xl font-bold mt-1">{pr.changed_files}</p>
                  </div>
                  <div className="bg-github-800 rounded-xl p-3 text-center border border-github-700/60">
                    <p className="text-[10px] text-green-500 uppercase tracking-wide">Additions</p>
                    <p className="text-xl font-bold text-green-400 mt-1">+{pr.additions}</p>
                  </div>
                  <div className="bg-github-800 rounded-xl p-3 text-center border border-github-700/60">
                    <p className="text-[10px] text-red-500 uppercase tracking-wide">Deletions</p>
                    <p className="text-xl font-bold text-red-400 mt-1">-{pr.deletions}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="bg-github-800 rounded-xl p-4 border border-github-700/60">
                <h3 className="text-xs font-bold text-github-500 uppercase tracking-wide mb-3">Description</h3>
                <SimpleBody text={pr?.body || ''} />
              </div>

              {/* Merge section */}
              {pr && pr.state === 'open' && !pr.merged && (
                <div className="bg-github-800 rounded-xl p-4 border border-github-700/60 space-y-3">
                  <h3 className="text-xs font-bold text-github-500 uppercase tracking-wide">Merge Pull Request</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(['merge', 'squash', 'rebase'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMergeMethod(m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                          mergeMethod === m
                            ? 'bg-blue-600 text-white'
                            : 'bg-github-700 text-github-400 hover:bg-github-600'
                        }`}
                      >
                        {m} commit
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={mergePR}
                    disabled={merging || pr.mergeable === false}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    {merging ? <RotateCcw size={14} className="animate-spin" /> : <GitMerge size={14} />}
                    {merging ? 'Merging…' : `Merge with ${mergeMethod}`}
                  </button>
                  {pr.mergeable === false && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle size={12} /> This PR has conflicts and cannot be merged automatically
                    </p>
                  )}
                </div>
              )}

              {/* Review section */}
              {pr && pr.state === 'open' && !pr.merged && (
                <div className="bg-github-800 rounded-xl p-4 border border-github-700/60 space-y-3">
                  <h3 className="text-xs font-bold text-github-500 uppercase tracking-wide">Submit Review</h3>
                  <textarea
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                    placeholder="Leave a review comment…"
                    rows={4}
                    className="w-full bg-github-900 border border-github-700 rounded-lg p-3 text-sm text-white placeholder-github-600 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => submitReview('APPROVE')}
                      disabled={submittingReview}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-700/80 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <Check size={13} /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => submitReview('REQUEST_CHANGES')}
                      disabled={submittingReview || !reviewBody.trim()}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-700/80 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <Minus size={13} /> Request Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => submitReview('COMMENT')}
                      disabled={submittingReview || !reviewBody.trim()}
                      className="flex items-center gap-1.5 px-3 py-2 bg-github-700 hover:bg-github-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <MessageSquare size={13} /> Comment
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'files' && (
            <div className="flex h-full overflow-hidden">
              {/* File tree sidebar */}
              <div className="w-56 shrink-0 border-r border-github-700/60 bg-github-800/40 flex flex-col overflow-hidden">
                <div className="px-3 py-2 border-b border-github-700/60">
                  <div className="relative">
                    <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-github-600 pointer-events-none" />
                    <input
                      type="text"
                      value={fileSearch}
                      onChange={(e) => setFileSearch(e.target.value)}
                      placeholder="Filter files…"
                      className="w-full pl-7 pr-2 py-1 bg-github-900 border border-github-700 rounded text-[11px] text-white placeholder-github-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto py-1 text-[11px] font-mono">
                  {loading && files.length === 0 ? (
                    <p className="text-github-600 px-3 py-2">Loading…</p>
                  ) : (
                    <>
                      {/* Directory groups */}
                      {Object.entries(dirs).sort(([a], [b]) => a.localeCompare(b)).map(([dir, dirFiles]) => (
                        <div key={dir}>
                          <button
                            type="button"
                            onClick={() => toggleDir(dir)}
                            className="w-full flex items-center gap-1 px-3 py-1 hover:bg-github-700/40 text-github-500 transition-colors"
                          >
                            {expandedDirs.has(dir) ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                            <Folder size={10} className="text-yellow-600 shrink-0" />
                            <span className="truncate">{dir.split('/').pop()}</span>
                          </button>
                          {expandedDirs.has(dir) && dirFiles.map((f) => {
                            const name = f.filename.split('/').pop()!
                            return (
                              <button
                                key={f.filename}
                                type="button"
                                onClick={() => scrollToFile(f.filename)}
                                className={`w-full flex items-center gap-1 pl-7 pr-3 py-1 hover:bg-github-700/40 transition-colors truncate ${
                                  selectedFile === f.filename ? 'bg-blue-600/20 text-blue-300' : 'text-github-400'
                                }`}
                              >
                                <span className={`shrink-0 text-[9px] font-bold ${fileStatusColor(f.status)}`}>
                                  {f.status === 'added' ? 'A' : f.status === 'removed' ? 'D' : 'M'}
                                </span>
                                <span className="truncate">{name}</span>
                              </button>
                            )
                          })}
                        </div>
                      ))}
                      {/* Root files (no parent dir) */}
                      {roots.map((f) => (
                        <button
                          key={f.filename}
                          type="button"
                          onClick={() => scrollToFile(f.filename)}
                          className={`w-full flex items-center gap-1.5 px-3 py-1 hover:bg-github-700/40 transition-colors truncate ${
                            selectedFile === f.filename ? 'bg-blue-600/20 text-blue-300' : 'text-github-400'
                          }`}
                        >
                          <span className={`shrink-0 text-[9px] font-bold ${fileStatusColor(f.status)}`}>
                            {f.status === 'added' ? 'A' : f.status === 'removed' ? 'D' : 'M'}
                          </span>
                          <span className="truncate">{f.filename}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
                {/* Summary footer */}
                <div className="border-t border-github-700/60 px-3 py-1.5 text-[10px] text-github-600 flex items-center gap-2">
                  <span className="text-green-500">+{pr?.additions ?? 0}</span>
                  <span className="text-red-500">-{pr?.deletions ?? 0}</span>
                  <span className="ml-auto">{files.length} files</span>
                </div>
              </div>

              {/* Diff pane */}
              <div ref={diffPaneRef} className="flex-1 overflow-y-auto overflow-x-auto">
                {loading && files.length === 0 ? (
                  <div className="p-6 text-center text-github-500">Loading diffs…</div>
                ) : filteredFiles.length === 0 ? (
                  <div className="p-6 text-center text-github-500">No files match filter</div>
                ) : (
                  filteredFiles.map((f) => (
                    <div key={f.filename} data-file={f.filename} className="border-b border-github-700/60">
                      {/* File header */}
                      <div className="flex items-center justify-between px-4 py-2 bg-github-800/80 sticky top-0 z-10 border-b border-github-700/40">
                        <span className="text-xs font-mono text-github-300 truncate">{f.filename}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className={`text-[10px] font-bold ${fileStatusColor(f.status)}`}>{f.status.toUpperCase()}</span>
                          <span className="text-green-400 text-xs">+{f.additions}</span>
                          <span className="text-red-400 text-xs">-{f.deletions}</span>
                        </div>
                      </div>
                      <DiffPatch patch={f.patch} filename={f.filename} />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'comments' && (
            <div className="p-5 space-y-4">
              {loading && comments.length === 0 ? (
                <div className="text-center text-github-500">Loading comments…</div>
              ) : comments.length === 0 ? (
                <div className="text-center text-github-500 py-4">No comments yet</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <img src={c.user.avatar_url} alt={c.user.login} className="w-8 h-8 rounded-full shrink-0 mt-0.5" />
                    <div className="flex-1 bg-github-800 rounded-xl p-3 border border-github-700/60">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-white">@{c.user.login}</span>
                        <span className="text-[11px] text-github-500 flex items-center gap-1">
                          <Clock size={10} /> {timeAgo(c.created_at)}
                        </span>
                      </div>
                      <SimpleBody text={c.body} />
                    </div>
                  </div>
                ))
              )}

              {/* Add comment */}
              <div className="border-t border-github-700 pt-4 space-y-2">
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Add a comment…"
                  rows={3}
                  className="w-full bg-github-800 border border-github-700 rounded-lg p-3 text-sm text-white placeholder-github-600 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={addComment}
                  disabled={submittingComment || !commentBody.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                >
                  <User size={13} /> {submittingComment ? 'Posting…' : 'Comment'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
