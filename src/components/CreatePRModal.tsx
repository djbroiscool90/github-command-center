import React, { useState, useEffect } from 'react'
import { X, GitPullRequest, RotateCcw, ChevronDown } from 'react-feather'
import axios from 'axios'
import { toast } from '../store/toastStore'

const API = 'http://localhost:8765'

interface Props {
  onClose: () => void
  defaultRepo?: string // "owner/repo"
}

interface Branch { name: string }
interface Repo { full_name: string; name: string }

export const CreatePRModal: React.FC<Props> = ({ onClose, defaultRepo }) => {
  const [repos, setRepos] = useState<Repo[]>([])
  const [selectedRepo, setSelectedRepo] = useState(defaultRepo || '')
  const [branches, setBranches] = useState<Branch[]>([])
  const [head, setHead] = useState('')
  const [base, setBase] = useState('main')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [draft, setDraft] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingBranches, setLoadingBranches] = useState(false)
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
    setLoadingBranches(true)
    axios.get(`${API}/api/github/repo/${owner}/${repo}/branches`, { headers })
      .then((r) => {
        setBranches(r.data)
        const defBranch = r.data.find((b: Branch) => b.name === 'main' || b.name === 'master')
        if (defBranch) setBase(defBranch.name)
      })
      .catch(() => setBranches([]))
      .finally(() => setLoadingBranches(false))
  }, [selectedRepo])

  const submit = async () => {
    if (!selectedRepo || !title.trim() || !head || !base) {
      toast.error('Missing fields', 'Repo, title, head and base branches are required')
      return
    }
    const [owner, repo] = selectedRepo.split('/')
    setLoading(true)
    try {
      const res = await axios.post(
        `${API}/api/github/repo/${owner}/${repo}/pulls`,
        { title, body, head, base, draft, maintainer_can_modify: true },
        { headers }
      )
      toast.success('PR Created!', `#${res.data.number} — ${title}`)
      onClose()
    } catch (err: any) {
      toast.error('Failed to create PR', err?.response?.data?.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-github-800 border border-github-700 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-github-700">
            <GitPullRequest size={18} className="text-blue-400" />
            <h2 className="font-bold text-white text-base flex-1">Create Pull Request</h2>
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
                  {repos.map((r) => (
                    <option key={r.full_name} value={r.full_name}>{r.full_name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-github-500 pointer-events-none" />
              </div>
            </div>

            {/* Branches */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-github-500 uppercase tracking-wide">Head Branch</label>
                <div className="relative">
                  <select
                    value={head}
                    onChange={(e) => setHead(e.target.value)}
                    disabled={loadingBranches || !selectedRepo}
                    className="w-full bg-github-900 border border-github-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none disabled:opacity-50 transition-colors"
                  >
                    <option value="">Select branch…</option>
                    {branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-github-500 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-github-500 uppercase tracking-wide">Base Branch</label>
                <div className="relative">
                  <select
                    value={base}
                    onChange={(e) => setBase(e.target.value)}
                    disabled={loadingBranches || !selectedRepo}
                    className="w-full bg-github-900 border border-github-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none disabled:opacity-50 transition-colors"
                  >
                    <option value="">Select branch…</option>
                    {branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-github-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-github-500 uppercase tracking-wide">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="PR title…"
                className="w-full bg-github-900 border border-github-700 rounded-lg px-3 py-2 text-sm text-white placeholder-github-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-github-500 uppercase tracking-wide">Description</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe your changes…"
                rows={5}
                className="w-full bg-github-900 border border-github-700 rounded-lg px-3 py-2 text-sm text-white placeholder-github-600 resize-none focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Draft toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setDraft(!draft)}
                className={`w-10 h-5 rounded-full transition-colors relative ${draft ? 'bg-blue-600' : 'bg-github-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${draft ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm text-github-300">Create as draft</span>
            </label>
          </div>

          {/* Footer */}
          <div className="border-t border-github-700 px-5 py-4 flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-github-700 hover:bg-github-600 rounded-lg text-sm font-medium transition-colors">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={loading || !title.trim() || !selectedRepo || !head || !base}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? <RotateCcw size={13} className="animate-spin" /> : <GitPullRequest size={13} />}
              {loading ? 'Creating…' : draft ? 'Create Draft PR' : 'Create PR'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
