import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Check, X, Plus } from 'react-feather'

interface FileStatus {
  path: string
  status: string
}

interface RepositoryViewProps {
  repoPath: string
}

export function RepositoryView({ repoPath }: RepositoryViewProps) {
  const [files, setFiles] = useState<FileStatus[]>([])
  const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set())
  const [commitMessage, setCommitMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStatus()
  }, [repoPath])

  const loadStatus = async () => {
    try {
      setLoading(true)
      const response = await axios.get<FileStatus[]>(
        `http://localhost:8765/api/git/status/${encodeURIComponent(repoPath)}`
      )
      setFiles(response.data)
    } catch (err) {
      console.error('Failed to get status:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleStage = async (path: string) => {
    const newStaged = new Set(stagedFiles)
    if (newStaged.has(path)) {
      newStaged.delete(path)
      try {
        await axios.post(`http://localhost:8765/api/git/unstage/${encodeURIComponent(repoPath)}`, { filePath: path })
      } catch (err) {
        console.error('Failed to unstage file:', err)
      }
    } else {
      newStaged.add(path)
      try {
        await axios.post(`http://localhost:8765/api/git/stage/${encodeURIComponent(repoPath)}`, { filePath: path })
      } catch (err) {
        console.error('Failed to stage file:', err)
      }
    }
    setStagedFiles(newStaged)
  }

  const handleCommit = async () => {
    if (commitMessage.trim() && stagedFiles.size > 0) {
      try {
        await axios.post(`http://localhost:8765/api/git/commit/${encodeURIComponent(repoPath)}`, {
          message: commitMessage,
        })
        setCommitMessage('')
        setStagedFiles(new Set())
        await loadStatus()
      } catch (err) {
        console.error('Failed to commit:', err)
        alert('Failed to commit changes')
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added':
        return 'text-green-500'
      case 'deleted':
        return 'text-red-500'
      case 'modified':
        return 'text-blue-500'
      case 'untracked':
        return 'text-yellow-500'
      default:
        return 'text-github-400'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'added':
        return 'A'
      case 'deleted':
        return 'D'
      case 'modified':
        return 'M'
      case 'untracked':
        return '?'
      default:
        return 'U'
    }
  }

  return (
    <div className="flex h-full">
      {/* File List */}
      <div className="flex-1 flex flex-col border-r border-github-700 overflow-hidden">
        <div className="p-4 border-b border-github-700">
          <h2 className="text-lg font-semibold text-white mb-2">Changes</h2>
          <p className="text-sm text-github-400">{files.length} changed files</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-github-500">Loading...</div>
          ) : files.length === 0 ? (
            <div className="p-4 text-center text-github-500">No changes</div>
          ) : (
            <div>
              {files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => toggleStage(file.path)}
                  className="w-full px-4 py-2 hover:bg-github-700 flex items-center gap-3 text-left transition-colors group"
                >
                  <input
                    type="checkbox"
                    checked={stagedFiles.has(file.path)}
                    onChange={() => {}}
                    className="accent-blue-500 cursor-pointer"
                  />
                  <span className={`text-xs font-bold w-8 px-2 py-1 rounded ${getStatusColor(file.status)} bg-github-800`}>
                    {getStatusBadge(file.status)}
                  </span>
                  <span className="flex-1 text-github-200 truncate">{file.path}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Commit Area */}
      <div className="w-80 flex flex-col border-l border-github-700 bg-github-800">
        <div className="p-4 border-b border-github-700">
          <h3 className="text-lg font-semibold text-white mb-3">Commit Changes</h3>
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Describe your changes..."
            className="w-full bg-github-700 text-white px-3 py-2 rounded-lg placeholder-github-500 text-sm resize-none h-24"
          />
        </div>

        <div className="p-4 flex gap-2">
          <button
            onClick={handleCommit}
            disabled={stagedFiles.size === 0 || !commitMessage.trim()}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-github-700 disabled:text-github-500 text-white py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Check size={18} />
            Commit
          </button>
          <button
            onClick={() => setStagedFiles(new Set())}
            className="flex-1 bg-github-700 hover:bg-github-600 text-white py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <X size={18} />
            Discard
          </button>
        </div>

        <div className="p-4 border-t border-github-700">
          <p className="text-sm text-github-400 mb-3">Staged files: {stagedFiles.size}</p>
          <div className="space-y-1">
            {Array.from(stagedFiles).map((file) => (
              <div
                key={file}
                className="text-xs text-github-300 px-2 py-1 bg-github-700 rounded truncate"
              >
                {file}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
