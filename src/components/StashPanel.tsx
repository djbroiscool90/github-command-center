import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, Download } from 'react-feather'

interface Stash {
  id: string
  name: string
  message: string
  timestamp: number
}

interface StashPanelProps {
  repoPath: string
}

export function StashPanel({ repoPath }: StashPanelProps) {
  const [stashes, setStashes] = useState<Stash[]>([])
  const [newStashName, setNewStashName] = useState('')
  const [newStashMessage, setNewStashMessage] = useState('')
  const [showNewStash, setShowNewStash] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStashes()
  }, [repoPath])

  const loadStashes = async () => {
    try {
      setLoading(true)
      const response = await axios.get<Stash[]>(
        `http://localhost:8765/api/git/stashes/${encodeURIComponent(repoPath)}`
      )
      setStashes(response.data)
    } catch (err) {
      console.error('Failed to load stashes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStash = async () => {
    if (newStashName.trim()) {
      try {
        await axios.post(`http://localhost:8765/api/git/stash/${encodeURIComponent(repoPath)}`, {
          name: newStashName,
          message: newStashMessage,
        })
        setNewStashName('')
        setNewStashMessage('')
        setShowNewStash(false)
        await loadStashes()
      } catch (err) {
        console.error('Failed to create stash:', err)
        alert('Failed to create stash')
      }
    }
  }

  const handleApplyStash = async (stash: Stash) => {
    try {
      await axios.post(`http://localhost:8765/api/git/apply-stash/${encodeURIComponent(repoPath)}`, {
        stashIndex: parseInt(stash.id),
      })
      await loadStashes()
    } catch (err) {
      console.error('Failed to apply stash:', err)
      alert('Failed to apply stash')
    }
  }

  const handleDeleteStash = async (stash: Stash) => {
    if (window.confirm(`Delete stash "${stash.name}"?`)) {
      try {
        await axios.delete(`http://localhost:8765/api/git/stash/${encodeURIComponent(repoPath)}`, {
          data: { stashIndex: parseInt(stash.id) },
        })
        await loadStashes()
      } catch (err) {
        console.error('Failed to delete stash:', err)
        alert('Failed to delete stash')
      }
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-github-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Stashes</h2>
          <button
            onClick={() => setShowNewStash(!showNewStash)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg flex items-center gap-2 text-sm transition-colors"
          >
            <Plus size={16} />
            New Stash
          </button>
        </div>

        {showNewStash && (
          <div className="space-y-2">
            <input
              type="text"
              value={newStashName}
              onChange={(e) => setNewStashName(e.target.value)}
              placeholder="Stash name"
              className="w-full bg-github-700 text-white px-3 py-2 rounded-lg placeholder-github-500 text-sm"
            />
            <textarea
              value={newStashMessage}
              onChange={(e) => setNewStashMessage(e.target.value)}
              placeholder="Description (optional)"
              className="w-full bg-github-700 text-white px-3 py-2 rounded-lg placeholder-github-500 text-sm resize-none h-20"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateStash}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setShowNewStash(false)}
                className="flex-1 bg-github-700 hover:bg-github-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="text-center text-github-500">Loading stashes...</div>
        ) : stashes.length === 0 ? (
          <div className="text-center text-github-500">No stashes yet</div>
        ) : (
          stashes.map((stash) => (
            <div
              key={stash.id}
              className="bg-github-700 rounded-lg p-3 hover:bg-github-600 transition-colors group"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="font-medium text-white">{stash.name}</p>
                  {stash.message && (
                    <p className="text-sm text-github-400 mt-1">{stash.message}</p>
                  )}
                  <p className="text-xs text-github-500 mt-2">
                    {formatDate(stash.timestamp)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleApplyStash(stash)}
                  className="flex-1 bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <Download size={14} />
                  Apply
                </button>
                <button
                  onClick={() => handleDeleteStash(stash)}
                  className="flex-1 bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
