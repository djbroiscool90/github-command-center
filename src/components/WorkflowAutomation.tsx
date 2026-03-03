import React, { useState, useEffect, useCallback } from 'react'
import {
  GitMerge, Play, Check, AlertCircle, RotateCcw, ChevronDown,
  ChevronRight, Clock, X, ExternalLink, Folder,
} from 'react-feather'
import axios from 'axios'
import { usePanelStore } from '../store/panelStore'
import { toast } from '../store/toastStore'

const API = 'http://localhost:8765'

interface Workflow {
  id: number
  name: string
  state: string
  path: string
  html_url: string
  badge_url: string
}

interface WorkflowRun {
  id: number
  name: string
  status: string
  conclusion: string
  event: string
  head_branch: string
  head_sha: string
  run_number: number
  workflow_id: number
  created_at: string
  updated_at: string
  html_url: string
  triggering_actor: { login: string; avatar_url: string }
}

interface Job {
  id: number
  name: string
  status: string
  conclusion: string
  started_at: string
  completed_at: string
  steps: Array<{ name: string; status: string; conclusion: string; number: number }>
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

function StatusBadge({ status, conclusion }: { status: string; conclusion: string }) {
  let color = 'bg-github-700 text-github-400'
  let label = status
  if (status === 'completed') {
    if (conclusion === 'success') { color = 'bg-green-900/60 text-green-300'; label = 'success' }
    else if (conclusion === 'failure') { color = 'bg-red-900/60 text-red-300'; label = 'failed' }
    else if (conclusion === 'cancelled') { color = 'bg-github-700 text-github-400'; label = 'cancelled' }
    else if (conclusion === 'skipped') { color = 'bg-github-700 text-github-400'; label = 'skipped' }
    else { color = 'bg-yellow-900/60 text-yellow-300'; label = conclusion || status }
  } else if (status === 'in_progress') {
    color = 'bg-blue-900/60 text-blue-300'; label = 'running'
  } else if (status === 'queued') {
    color = 'bg-yellow-900/60 text-yellow-300'; label = 'queued'
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${color}`}>
      {label}
    </span>
  )
}

export const WorkflowAutomation: React.FC = () => {
  const [selectedRepo, setSelectedRepo] = useState('')
  const [repos, setRepos] = useState<Array<{ full_name: string }>>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [expandedJob, setExpandedJob] = useState<number | null>(null)
  const [loadingRuns, setLoadingRuns] = useState(false)
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [triggering, setTriggering] = useState<number | null>(null)
  const openFileBrowser = usePanelStore((s) => s.openFileBrowser)
  const token = localStorage.getItem('github_token')
  const headers = token ? { Authorization: `token ${token}` } : {}

  useEffect(() => {
    axios.get(`${API}/api/github/repos/select`, { headers })
      .then((r) => setRepos(r.data))
      .catch(() => {})
  }, [])

  const loadWorkflowsAndRuns = useCallback(async () => {
    if (!selectedRepo) return
    const [owner, repo] = selectedRepo.split('/')
    setLoadingRuns(true)
    try {
      const [wfRes, runsRes] = await Promise.allSettled([
        axios.get(`${API}/api/github/workflows/${owner}/${repo}`, { headers }),
        axios.get(`${API}/api/github/workflows/${owner}/${repo}/runs`, { headers }),
      ])
      if (wfRes.status === 'fulfilled') setWorkflows(wfRes.value.data.workflows || [])
      if (runsRes.status === 'fulfilled') setRuns(runsRes.value.data.workflow_runs || [])
    } finally {
      setLoadingRuns(false)
    }
  }, [selectedRepo])

  useEffect(() => {
    setSelectedRun(null)
    setJobs([])
    setWorkflows([])
    setRuns([])
    if (selectedRepo) loadWorkflowsAndRuns()
  }, [selectedRepo, loadWorkflowsAndRuns])

  const loadJobs = async (run: WorkflowRun) => {
    if (!selectedRepo) return
    const [owner, repo] = selectedRepo.split('/')
    setSelectedRun(run)
    setLoadingJobs(true)
    setJobs([])
    setExpandedJob(null)
    try {
      const res = await axios.get(`${API}/api/github/runs/${owner}/${repo}/${run.id}/jobs`, { headers })
      setJobs(res.data.jobs || [])
    } finally {
      setLoadingJobs(false)
    }
  }

  const triggerWorkflow = async (wf: Workflow) => {
    if (!selectedRepo) return
    const [owner, repo] = selectedRepo.split('/')
    setTriggering(wf.id)
    try {
      await axios.post(
        `${API}/api/github/workflows/${owner}/${repo}/${wf.id}/dispatch`,
        { ref: 'main' },
        { headers }
      )
      toast.success('Workflow triggered!', wf.name)
      setTimeout(() => loadWorkflowsAndRuns(), 2000)
    } catch (err: any) {
      toast.error('Trigger failed', err?.response?.data?.message || 'Check workflow permissions')
    } finally {
      setTriggering(null)
    }
  }

  const activeWorkflows = workflows.filter((w) => w.state === 'active')
  const successRate = runs.length > 0
    ? Math.round((runs.filter((r) => r.conclusion === 'success').length / runs.filter((r) => r.status === 'completed').length || 0) * 100)
    : 0

  return (
    <div className="w-full h-screen bg-github-900 text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-github-800/95 backdrop-blur border-b border-github-700/80 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GitMerge size={20} className="text-purple-400" />
            <h1 className="text-xl font-bold">Workflows</h1>
            <span className="text-xs text-github-500">GitHub Actions</span>
          </div>
          <div className="flex items-center gap-3">
            {selectedRepo && (
              <button
                type="button"
                onClick={() => {
                  const [owner, repo] = selectedRepo.split('/')
                  openFileBrowser({ owner, repo })
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-github-700 hover:bg-github-600 rounded-lg text-xs font-medium transition-colors"
              >
                <Folder size={13} /> Browse Files
              </button>
            )}
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              title="Select repository"
              aria-label="Select repository"
              className="bg-github-900 border border-github-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Select repository…</option>
              {repos.map((r) => (
                <option key={r.full_name} value={r.full_name}>{r.full_name}</option>
              ))}
            </select>
            {selectedRepo && (
              <button
                type="button"
                onClick={loadWorkflowsAndRuns}
                disabled={loadingRuns}
                title="Refresh runs"
                className="p-2 hover:bg-github-700 rounded-lg text-github-400 hover:text-github-200 transition-colors disabled:opacity-50"
              >
                <RotateCcw size={15} className={loadingRuns ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
        </div>
      </div>

      {!selectedRepo ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <GitMerge size={48} className="mx-auto mb-4 text-github-600" />
            <p className="text-github-400 text-lg font-medium">Select a repository</p>
            <p className="text-github-600 text-sm mt-1">Choose a repo above to view its GitHub Actions workflows</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Workflows + Runs */}
          <div className={`flex flex-col overflow-hidden border-r border-github-700/60 ${selectedRun ? 'w-1/2' : 'flex-1'}`}>
            {/* Stats bar */}
            {!loadingRuns && runs.length > 0 && (
              <div className="grid grid-cols-3 gap-3 p-4 border-b border-github-700/60 shrink-0">
                <div className="bg-github-800 rounded-xl p-3 text-center border border-github-700/60">
                  <p className="text-[10px] text-github-500 uppercase tracking-wide">Active</p>
                  <p className="text-xl font-bold text-green-400 mt-1">{activeWorkflows.length}</p>
                </div>
                <div className="bg-github-800 rounded-xl p-3 text-center border border-github-700/60">
                  <p className="text-[10px] text-github-500 uppercase tracking-wide">Runs</p>
                  <p className="text-xl font-bold text-blue-400 mt-1">{runs.length}</p>
                </div>
                <div className="bg-github-800 rounded-xl p-3 text-center border border-github-700/60">
                  <p className="text-[10px] text-github-500 uppercase tracking-wide">Success</p>
                  <p className="text-xl font-bold text-green-400 mt-1">{successRate}%</p>
                </div>
              </div>
            )}

            {/* Workflows */}
            {activeWorkflows.length > 0 && (
              <div className="px-4 py-3 border-b border-github-700/60 shrink-0">
                <p className="text-[10px] font-bold text-github-600 uppercase tracking-widest mb-2">Workflows</p>
                <div className="flex flex-wrap gap-2">
                  {activeWorkflows.map((wf) => (
                    <div key={wf.id} className="flex items-center gap-1.5 bg-github-800 border border-github-700/60 rounded-lg px-3 py-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                      <span className="text-xs text-github-300">{wf.name}</span>
                      <button
                        type="button"
                        onClick={() => triggerWorkflow(wf)}
                        disabled={triggering === wf.id}
                        className="ml-1 p-0.5 hover:bg-github-700 rounded text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                        title="Trigger workflow"
                      >
                        {triggering === wf.id
                          ? <RotateCcw size={11} className="animate-spin" />
                          : <Play size={11} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Run list */}
            <div className="flex-1 overflow-y-auto">
              <p className="text-[10px] font-bold text-github-600 uppercase tracking-widest px-4 py-2.5 sticky top-0 bg-github-900/95 backdrop-blur">
                Recent Runs
              </p>
              {loadingRuns ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-github-800 rounded-xl p-3 border border-github-700/60 animate-pulse">
                      <div className="h-3 bg-github-700 rounded w-2/3 mb-2" />
                      <div className="h-2 bg-github-700 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : runs.length === 0 ? (
                <div className="text-center py-8 text-github-500 text-sm">No workflow runs found</div>
              ) : (
                <div className="px-4 pb-4 space-y-2">
                  {runs.map((run) => (
                    <button
                      key={run.id}
                      type="button"
                      onClick={() => loadJobs(run)}
                      className={`w-full text-left rounded-xl p-3 border transition-all ${
                        selectedRun?.id === run.id
                          ? 'bg-blue-600/10 border-blue-500/30'
                          : 'bg-github-800 border-github-700/60 hover:border-github-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {run.triggering_actor?.avatar_url && (
                            <img
                              src={run.triggering_actor.avatar_url}
                              alt={run.triggering_actor.login}
                              className="w-5 h-5 rounded-full shrink-0"
                            />
                          )}
                          <span className="text-sm font-medium text-white truncate">{run.name || 'Workflow Run'}</span>
                        </div>
                        <StatusBadge status={run.status} conclusion={run.conclusion} />
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-github-500">
                        <span>#{run.run_number}</span>
                        <span className="flex items-center gap-1"><GitMerge size={9} />{run.head_branch}</span>
                        <span className="capitalize">{run.event}</span>
                        <span className="flex items-center gap-1 ml-auto"><Clock size={9} />{timeAgo(run.created_at)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Job detail panel */}
          {selectedRun && (
            <div className="w-1/2 flex flex-col overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-github-700/60 bg-github-800/60 shrink-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{selectedRun.name} #{selectedRun.run_number}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StatusBadge status={selectedRun.status} conclusion={selectedRun.conclusion} />
                    <span className="text-[10px] text-github-500">{timeAgo(selectedRun.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={selectedRun.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-github-700 rounded-lg text-github-400 hover:text-github-200 transition-colors"
                    title="Open on GitHub"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <button
                    type="button"
                    onClick={() => { setSelectedRun(null); setJobs([]) }}
                    title="Close run detail"
                    className="p-1.5 hover:bg-github-700 rounded-lg text-github-400 hover:text-github-200 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingJobs ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="bg-github-800 rounded-xl p-3 border border-github-700/60 animate-pulse h-16" />
                    ))}
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="text-center py-8 text-github-500 text-sm">No jobs found for this run</div>
                ) : (
                  jobs.map((job) => (
                    <div key={job.id} className="bg-github-800 border border-github-700/60 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-github-700/40 transition-colors text-left"
                      >
                        {expandedJob === job.id
                          ? <ChevronDown size={14} className="text-github-400 shrink-0" />
                          : <ChevronRight size={14} className="text-github-400 shrink-0" />}
                        <span className="flex-1 text-sm font-medium text-white truncate">{job.name}</span>
                        <StatusBadge status={job.status} conclusion={job.conclusion} />
                      </button>
                      {expandedJob === job.id && job.steps && (
                        <div className="border-t border-github-700/60 divide-y divide-github-700/40 font-mono text-xs">
                          {job.steps.map((step) => (
                            <div key={step.number} className={`flex items-center gap-2.5 px-4 py-2 ${
                              step.conclusion === 'failure' ? 'bg-red-900/10' : ''
                            }`}>
                              <span className="shrink-0 w-4 text-right text-github-600">{step.number}</span>
                              {step.status === 'completed' ? (
                                step.conclusion === 'success'
                                  ? <Check size={11} className="text-green-400 shrink-0" />
                                  : step.conclusion === 'failure'
                                  ? <X size={11} className="text-red-400 shrink-0" />
                                  : <AlertCircle size={11} className="text-github-500 shrink-0" />
                              ) : (
                                <RotateCcw size={11} className="text-blue-400 shrink-0 animate-spin" />
                              )}
                              <span className={`flex-1 truncate ${
                                step.conclusion === 'failure' ? 'text-red-300' :
                                step.conclusion === 'success' ? 'text-github-300' : 'text-github-500'
                              }`}>{step.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
