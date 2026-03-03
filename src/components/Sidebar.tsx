import React, { useState } from 'react'
import { Folder, Plus, Settings, GitBranch } from 'react-feather'
import axios from 'axios'

interface SidebarProps {
  selectedRepo: string | null
  onSelectRepo: (repo: string) => void
}

export function Sidebar({ selectedRepo, onSelectRepo }: SidebarProps) {
  const [repos, setRepos] = useState<string[]>([])
  const [showRepoPath, setShowRepoPath] = useState(false)
  const [repoPath, setRepoPath] = useState('')

  const handleAddRepo = async () => {
    if (repoPath.trim()) {
      try {
        await axios.post('http://localhost:8765/api/git/add', { path: repoPath })
        setRepos([...repos, repoPath])
        onSelectRepo(repoPath)
        setRepoPath('')
        setShowRepoPath(false)
      } catch (err) {
        console.error('Failed to add repository:', err)
        alert('Failed to add repository')
      }
    }
  }

  const handleCloneRepo = async () => {
    const url = prompt('Repository URL:')
    const path = prompt('Clone to path:')
    if (url && path) {
      try {
        await axios.post('http://localhost:8765/api/git/clone', { url, path })
        setRepos([...repos, path])
        onSelectRepo(path)
      } catch (err) {
        console.error('Failed to clone repository:', err)
        alert('Failed to clone repository')
      }
    }
  }

  return (
    <div className="w-64 bg-github-800 border-r border-github-700 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-github-700">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <GitBranch size={24} />
          Command Center
        </h1>
      </div>

      {/* Action Buttons */}
      <div className="p-4 space-y-2">
        <button
          onClick={handleCloneRepo}
          className="w-full bg-github-700 hover:bg-github-600 text-white py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Clone Repository
        </button>
        <button
          onClick={() => setShowRepoPath(!showRepoPath)}
          className="w-full bg-github-700 hover:bg-github-600 text-white py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Folder size={18} />
          Add Repository
        </button>
      </div>

      {/* Add Repository Input */}
      {showRepoPath && (
        <div className="p-4 border-t border-github-700">
          <input
            type="text"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="Enter repository path"
            className="w-full bg-github-700 text-white px-3 py-2 rounded-lg mb-2 placeholder-github-500 text-sm"
          />
          <button
            onClick={handleAddRepo}
            className="w-full bg-github-600 hover:bg-github-500 text-white py-1 px-2 rounded text-sm transition-colors"
          >
            Add
          </button>
        </div>
      )}

      {/* Repository List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {repos.length === 0 ? (
          <p className="text-github-500 text-sm py-4 text-center">No repositories added</p>
        ) : (
          repos.map((repo) => (
            <button
              key={repo}
              onClick={() => onSelectRepo(repo)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedRepo === repo
                  ? 'bg-github-600 text-white'
                  : 'text-github-300 hover:bg-github-700'
              }`}
            >
              {repo.split('/').pop()}
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-github-700">
        <button className="w-full flex items-center justify-center gap-2 text-github-400 hover:text-github-300 py-2 transition-colors">
          <Settings size={18} />
          Settings
        </button>
      </div>
    </div>
  )
}
