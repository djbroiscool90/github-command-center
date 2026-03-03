import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, ArrowRight, Copy, GitMerge, RefreshCw } from 'react-feather'

interface Branch {
  name: string
  is_current: boolean
  is_remote: boolean
}

interface BranchPanelProps {
  repoPath: string
}

const API = 'http://localhost:8765'

export function BranchPanel({ repoPath }: BranchPanelProps) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [newBranchName, setNewBranchName] = useState('')
  const [showNewBranch, setShowNewBranch] = useState(false)
  const [draggedBranch, setDraggedBranch] = useState<Branch | null>(null)
  const [dragOverBranch, setDragOverBranch] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    loadBranches()
  }, [repoPath])

  const showMsg = (text: string, type: 'success' | 'error') => {
    setActionMsg({ text, type })
    setTimeout(() => setActionMsg(null), 3500)
  }

  const loadBranches = async () => {
    try {
      setLoading(true)
      const response = await axios.get<Branch[]>(
        `${API}/api/git/branches/${encodeURIComponent(repoPath)}`
      )
      setBranches(response.data || [])
    } catch (err) {
      console.error('Failed to load branches:', err)
      showMsg('Failed to load branches', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return
    try {
      await axios.post(`${API}/api/git/branch/${encodeURIComponent(repoPath)}`, {
        branchName: newBranchName.trim(),
      })
      setNewBranchName('')
      setShowNewBranch(false)
      showMsg(`Branch "${newBranchName.trim()}" created`, 'success')
      await loadBranches()
    } catch (err: any) {
      showMsg(err.response?.data || 'Failed to create branch', 'error')
    }
  }

  const handleCheckoutBranch = async (branch: Branch) => {
    if (branch.is_current) return
    try {
      await axios.post(`${API}/api/git/checkout/${encodeURIComponent(repoPath)}`, {
        branchName: branch.name,
      })
      showMsg(`Switched to "${branch.name}"`, 'success')
      await loadBranches()
    } catch (err: any) {
      showMsg(err.response?.data || 'Failed to checkout branch', 'error')
    }
  }

  const handleDeleteBranch = async (branch: Branch) => {
    if (!window.confirm(`Delete branch "${branch.name}"?`)) return
    try {
      await axios.delete(`${API}/api/git/branches/${encodeURIComponent(repoPath)}`, {
        data: { branchName: branch.name },
      })
      showMsg(`Branch "${branch.name}" deleted`, 'success')
      await loadBranches()
    } catch (err: any) {
      showMsg(err.response?.data || 'Failed to delete branch', 'error')
    }
  }

  const handleMergeBranch = async (sourceBranch: Branch) => {
    const currentBranch = branches.find(b => b.is_current)
    if (!currentBranch) return
    if (!window.confirm(`Merge "${sourceBranch.name}" into "${currentBranch.name}"?`)) return
    try {
      await axios.post(`${API}/api/git/merge/${encodeURIComponent(repoPath)}`, {
        branchName: sourceBranch.name,
      })
      showMsg(`Merged "${sourceBranch.name}" into "${currentBranch.name}"`, 'success')
      await loadBranches()
    } catch (err: any) {
      showMsg(err.response?.data || 'Merge failed — conflicts may need resolution', 'error')
    }
  }

  const handleDragStart = (e: React.DragEvent, branch: Branch) => {
    setDraggedBranch(branch)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, branch: Branch) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverBranch(branch.name)
  }

  const handleDragLeave = () => {
    setDragOverBranch(null)
  }

  const handleDrop = async (e: React.DragEvent, targetBranch: Branch) => {
    e.preventDefault()
    setDragOverBranch(null)

    if (!draggedBranch || draggedBranch.name === targetBranch.name) {
      setDraggedBranch(null)
      return
    }

    // Checkout target, then merge dragged branch into it
    const confirmMsg = `Merge "${draggedBranch.name}" into "${targetBranch.name}"?`
    if (!window.confirm(confirmMsg)) {
      setDraggedBranch(null)
      return
    }

    try {
      await axios.post(`${API}/api/git/checkout/${encodeURIComponent(repoPath)}`, {
        branchName: targetBranch.name,
      })
      await axios.post(`${API}/api/git/merge/${encodeURIComponent(repoPath)}`, {
        branchName: draggedBranch.name,
      })
      showMsg(`Merged "${draggedBranch.name}" into "${targetBranch.name}"`, 'success')
      await loadBranches()
    } catch (err: any) {
      showMsg(err.response?.data || 'Drag-merge failed', 'error')
    } finally {
      setDraggedBranch(null)
    }
  }

  const handleDragEnd = () => {
    setDraggedBranch(null)
    setDragOverBranch(null)
  }

  const currentBranch = branches.find(b => b.is_current)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-github-700 bg-github-800">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Branches</h2>
            {currentBranch && (
              <p className="text-xs text-github-400 mt-0.5">
                Current: <span className="text-blue-400 font-medium">{currentBranch.name}</span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadBranches}
              className="p-2 bg-github-700 hover:bg-github-600 text-white rounded-lg transition-colors"
              title="Refresh branches"
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              onClick={() => setShowNewBranch(!showNewBranch)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm transition-colors"
            >
              <Plus size={15} />
              New Branch
            </button>
          </div>
        </div>

        {showNewBranch && (
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="branch-name"
              className="flex-1 bg-github-700 text-white px-3 py-2 rounded-lg placeholder-github-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
              autoFocus
            />
            <button
              type="button"
              onClick={handleCreateBranch}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => { setShowNewBranch(false); setNewBranchName('') }}
              className="bg-github-700 hover:bg-github-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {actionMsg && (
          <div className={`mt-2 px-3 py-2 rounded text-sm font-medium ${
            actionMsg.type === 'success'
              ? 'bg-green-900/60 text-green-300 border border-green-700'
              : 'bg-red-900/60 text-red-300 border border-red-700'
          }`}>
            {actionMsg.text}
          </div>
        )}
      </div>

      {/* Branch list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {draggedBranch && (
          <div className="mb-3 px-3 py-2 bg-yellow-900/40 border border-yellow-600 rounded-lg text-sm text-yellow-300 flex items-center gap-2">
            <GitMerge size={14} />
            Drop <strong>{draggedBranch.name}</strong> onto a branch to merge into it
          </div>
        )}

        {loading ? (
          <div className="text-center text-github-500 py-8">Loading branches...</div>
        ) : branches.length === 0 ? (
          <div className="text-center text-github-500 py-8">No branches found</div>
        ) : (
          branches.map((branch) => (
            <div
              key={branch.name}
              draggable
              onDragStart={(e) => handleDragStart(e, branch)}
              onDragOver={(e) => handleDragOver(e, branch)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, branch)}
              onDragEnd={handleDragEnd}
              onClick={() => handleCheckoutBranch(branch)}
              className={`p-3 rounded-lg transition-colors group select-none ${
                branch.is_current
                  ? 'bg-blue-600/30 border border-blue-500 cursor-default'
                  : dragOverBranch === branch.name
                  ? 'bg-yellow-600/30 border border-yellow-500 cursor-copy'
                  : draggedBranch?.name === branch.name
                  ? 'bg-github-600 border border-github-500 opacity-60 cursor-grabbing'
                  : 'bg-github-700 border border-transparent hover:bg-github-600 cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{branch.name}</span>
                  {branch.is_current && (
                    <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full">current</span>
                  )}
                </div>
              </div>

              {!branch.is_current && (
                <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleMergeBranch(branch) }}
                    className="flex-1 bg-green-700/80 hover:bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <ArrowRight size={12} />
                    Merge into current
                  </button>
                  <button
                    type="button"
                    title={`Delete branch ${branch.name}`}
                    onClick={(e) => { e.stopPropagation(); handleDeleteBranch(branch) }}
                    className="bg-red-700/80 hover:bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <Trash2 size={12} />
                    <span className="sr-only">Delete {branch.name}</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Drag hint */}
      <div className="p-3 border-t border-github-700 text-xs text-github-500 text-center">
        <Copy size={12} className="inline mr-1" />
        Drag a branch onto another to merge
      </div>
    </div>
  )
}
