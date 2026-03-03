import React, { useState, useEffect } from 'react'
import { X, AlertCircle, RotateCcw, ChevronDown, Tag } from 'react-feather'
import axios from 'axios'
import { toast } from '../store/toastStore'

const API = 'http://localhost:8765'

interface Props {
  onClose: () => void
  defaultRepo?: string
}

interface Repo { full_name: string; name: string }
interface Label { id: number; name: string; color: string }

export const CreateIssueModal: React.FC<Props> = ({ onClose, defaultRepo }) => {
  const [repos, setRepos] = useState<Repo[]>([])
  const [selectedRepo, setSelectedRepo] = useState(defaultRepo || '')
  const [labels, setLabels] = useState<Label[]>([])
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const token = localStorage.getItem('github_token')
  const headers = token ? { Authorization: `token ${token}` } : {}

  useEffect(() => {
    axios.get(`${API}/api/github/repos/select`, { headers })
      .then((r) => setRepos(r.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedRepo) return
    const [owner, repo] = selectedRepo.split('/')
    if (!owner || !repo) return
    axios.get(`${API}/api/github/repo/${owner}/${repo}/labels`, { headers })
      .then((r) => setLabels(r.data))
      .catch(() => setLabels([]))
  }, [selectedRepo])

  const toggleLabel = (name: string) => {
    setSelectedLabels((prev) =>
      prev.includes(name) ? prev.filter((l) => l !== name) : [...prev, name]
    )
  }

  const submit = async () => {
    if (!selectedRepo || !title.trim()) {
      toast.error('Missing fields', 'Repo and title are required')
      return
    }
    const [owner, repo] = selectedRepo.split('/')
    setLoading(true)
    try {
      const res = await axios.post(
        `${API}/api/github/repo/${owner}/${repo}/issues`,
        { title, body, labels: selectedLabels },
        { headers }
      )
      toast.success('Issue Created!', `#${res.data.number} — ${title}`)
      onClose()
    } catch (err: any) {
      toast.error('Failed to create issue', err?.response?.data?.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-github-800 border border-github-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-github-700">
          <AlertCircle size={18} className="text-green-400" />
          <h2 className="font-bold text-white text-base flex-1">Create Issue</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-github-700 rounded-lg text-github-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Repo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-github-500 uppercase tracking-wide">Repository</label>
            <div className="relative">
              <select
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                className="w-full bg-github-900 border border-github-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none transition-colors"
              >
                <option value="">Select repository…</option>
                {repos.map((r) => <option key={r.full_name} value={r.full_name}>{r.full_name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-github-500 pointer-events-none" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-github-500 uppercase tracking-wide">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title…"
              className="w-full bg-github-900 border border-github-700 rounded-lg px-3 py-2 text-sm text-white placeholder-github-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-github-500 uppercase tracking-wide">Description</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe the issue…"
              rows={5}
              className="w-full bg-github-900 border border-github-700 rounded-lg px-3 py-2 text-sm text-white placeholder-github-600 resize-none focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Labels */}
          {labels.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-github-500 uppercase tracking-wide flex items-center gap-1.5">
                <Tag size={11} /> Labels
              </label>
              <div className="flex flex-wrap gap-2">
                {labels.map((l) => {
                  const selected = selectedLabels.includes(l.name)
                  const hex = `#${l.color}`
                  const dark = parseInt(l.color, 16) > 0xffffff / 2
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleLabel(l.name)}
                      className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        selected ? 'ring-2 ring-white/40' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: hex, color: dark ? '#000' : '#fff' }}
                    >
                      {l.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-github-700 px-5 py-4 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-github-700 hover:bg-github-600 rounded-lg text-sm font-medium transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading || !title.trim() || !selectedRepo}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? <RotateCcw size={13} className="animate-spin" /> : <AlertCircle size={13} />}
            {loading ? 'Creating…' : 'Create Issue'}
          </button>
        </div>
      </div>
    </div>
  )
}
