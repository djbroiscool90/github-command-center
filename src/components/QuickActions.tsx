import React, { useState } from 'react'
import { Zap, Plus, GitBranch, Trash2, RotateCcw, AlertCircle, CheckCircle, Scissors } from 'react-feather'
import axios from 'axios'

interface Output {
  title: string
  message: string
  type: 'success' | 'error' | 'info'
  timestamp: Date
}

const API = 'http://localhost:8765'

export const QuickActions: React.FC = () => {
  const [repoPath, setRepoPath] = useState('')
  const [output, setOutput] = useState<Output[]>([])
  const [isExecuting, setIsExecuting] = useState(false)

  const addOutput = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setOutput((prev) => [{ title, message, type, timestamp: new Date() }, ...prev])
  }

  const executeGitAction = async (
    path: string,
    method: 'GET' | 'POST',
    body?: Record<string, string>
  ): Promise<{ message: string }> => {
    const response = await axios({ method, url: `${API}${path}`, data: body })
    return response.data
  }

  const withExecution = async (label: string, fn: () => Promise<void>) => {
    if (!repoPath.trim()) {
      addOutput('Error', 'Please enter a repository path first', 'error')
      return
    }
    setIsExecuting(true)
    try {
      await fn()
    } catch (err: any) {
      const msg = err.response?.data || err.message || 'Action failed'
      addOutput(label, typeof msg === 'string' ? msg : JSON.stringify(msg), 'error')
    } finally {
      setIsExecuting(false)
    }
  }

  const handleQuickSync = () =>
    withExecution('Quick Sync', async () => {
      const data = await executeGitAction(
        `/api/git/sync/${encodeURIComponent(repoPath)}`,
        'POST'
      )
      addOutput('Quick Sync', data.message, 'success')
    })

  const handleCleanBranch = () =>
    withExecution('Clean Branch', async () => {
      const data = await executeGitAction(
        `/api/git/clean/${encodeURIComponent(repoPath)}`,
        'POST'
      )
      addOutput('Clean Branch', data.message, 'success')
    })

  const handleStageAll = () =>
    withExecution('Stage All Files', async () => {
      const data = await executeGitAction(
        `/api/git/stage/${encodeURIComponent(repoPath)}`,
        'POST',
        { filePath: '.' }
      )
      addOutput('Stage All Files', data.message, 'success')
    })

  const handleCreateBranch = () =>
    withExecution('Create Branch', async () => {
      const branchName = prompt('Enter branch name (e.g. feature/my-feature):')
      if (!branchName?.trim()) return
      const data = await executeGitAction(
        `/api/git/branch/${encodeURIComponent(repoPath)}`,
        'POST',
        { branchName: branchName.trim() }
      )
      addOutput('Create Branch', data.message, 'success')
    })

  const actions = [
    {
      id: 'sync',
      name: 'Quick Sync',
      description: 'Fetch all remotes and pull with rebase',
      icon: <RotateCcw size={26} />,
      color: 'from-blue-600 to-blue-800 border-blue-500',
      onClick: handleQuickSync,
    },
    {
      id: 'clean',
      name: 'Clean Branches',
      description: 'Delete local branches already merged into main',
      icon: <Scissors size={26} />,
      color: 'from-red-600 to-red-800 border-red-500',
      onClick: handleCleanBranch,
    },
    {
      id: 'stage-all',
      name: 'Stage All Files',
      description: 'Stage all modified and untracked files',
      icon: <Plus size={26} />,
      color: 'from-green-600 to-green-800 border-green-500',
      onClick: handleStageAll,
    },
    {
      id: 'new-branch',
      name: 'New Branch',
      description: 'Create and checkout a new branch',
      icon: <GitBranch size={26} />,
      color: 'from-purple-600 to-purple-800 border-purple-500',
      onClick: handleCreateBranch,
    },
  ]

  return (
    <div className="w-full h-screen bg-github-900 text-white overflow-y-auto">
      {/* Header */}
      <div className="bg-github-800 border-b border-github-700 p-6 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <Zap size={28} className="text-yellow-400" />
          <div>
            <h1 className="text-3xl font-bold">Quick Actions</h1>
            <p className="text-sm text-github-400">Common git operations in one click</p>
          </div>
        </div>
        <input
          type="text"
          placeholder="Enter repository path (e.g. /home/user/my-repo)"
          value={repoPath}
          onChange={(e) => setRepoPath(e.target.value)}
          className="w-full px-4 py-2.5 bg-github-900 border border-github-700 rounded-lg text-white placeholder-github-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Action buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              disabled={!repoPath.trim() || isExecuting}
              className={`p-5 rounded-xl border bg-gradient-to-br ${action.color} hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left group`}
            >
              <div className="text-white mb-3 opacity-70 group-hover:opacity-100 transition-opacity">
                {action.icon}
              </div>
              <p className="font-semibold text-sm">{action.name}</p>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">{action.description}</p>
            </button>
          ))}
        </div>

        {/* Output log */}
        {output.length > 0 && (
          <div className="bg-github-800 border border-github-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-github-700 bg-github-750">
              <h2 className="font-semibold text-sm text-github-200">Action Log</h2>
              <button
                type="button"
                onClick={() => setOutput([])}
                className="px-3 py-1 bg-github-700 hover:bg-github-600 rounded text-xs transition-colors"
              >
                <Trash2 size={12} className="inline mr-1" />
                Clear
              </button>
            </div>
            <div className="divide-y divide-github-700/50 max-h-80 overflow-y-auto">
              {output.map((item, idx) => (
                <div
                  key={idx}
                  className={`px-5 py-3 flex items-start gap-3 ${
                    item.type === 'success'
                      ? 'bg-green-950/30'
                      : item.type === 'error'
                      ? 'bg-red-950/30'
                      : 'bg-blue-950/20'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.type === 'success' ? (
                      <CheckCircle size={16} className="text-green-400" />
                    ) : item.type === 'error' ? (
                      <AlertCircle size={16} className="text-red-400" />
                    ) : (
                      <AlertCircle size={16} className="text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-sm text-github-300 mt-0.5 break-words">{item.message}</p>
                  </div>
                  <span className="text-xs text-github-500 shrink-0">
                    {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage tips */}
        {output.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-github-800 border border-github-700 rounded-xl p-5">
              <h3 className="font-semibold mb-3 text-github-200">Tips</h3>
              <ul className="space-y-2 text-sm text-github-400">
                <li className="flex gap-2"><span className="text-blue-400">•</span> Enter your full repo path before clicking an action</li>
                <li className="flex gap-2"><span className="text-blue-400">•</span> Quick Sync fetches all remotes then pulls with rebase</li>
                <li className="flex gap-2"><span className="text-blue-400">•</span> Clean Branches removes local branches merged into main</li>
                <li className="flex gap-2"><span className="text-blue-400">•</span> Stage All adds all changes to the index ready to commit</li>
              </ul>
            </div>
            <div className="bg-github-800 border border-github-700 rounded-xl p-5">
              <h3 className="font-semibold mb-3 text-github-200">Keyboard Shortcuts</h3>
              <ul className="space-y-2 text-sm text-github-400">
                <li className="flex justify-between"><span>Switch to this tab</span><kbd className="bg-github-700 px-2 py-0.5 rounded text-xs">Ctrl+9</kbd></li>
                <li className="flex justify-between"><span>Dashboard</span><kbd className="bg-github-700 px-2 py-0.5 rounded text-xs">Ctrl+1</kbd></li>
                <li className="flex justify-between"><span>Pull Requests</span><kbd className="bg-github-700 px-2 py-0.5 rounded text-xs">Ctrl+3</kbd></li>
                <li className="flex justify-between"><span>Issues</span><kbd className="bg-github-700 px-2 py-0.5 rounded text-xs">Ctrl+4</kbd></li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
