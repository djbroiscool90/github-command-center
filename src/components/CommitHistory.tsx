import React, { useState, useEffect } from 'react'
import axios from 'axios'

interface Commit {
  oid: string
  message: string
  author: string
  timestamp: number
}

interface CommitHistoryProps {
  repoPath: string
}

export function CommitHistory({ repoPath }: CommitHistoryProps) {
  const [commits, setCommits] = useState<Commit[]>([])
  const [branch, setBranch] = useState('main')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [repoPath, branch])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const response = await axios.get<Commit[]>(
        `http://localhost:8765/api/git/history/${encodeURIComponent(repoPath)}?branch=${encodeURIComponent(branch)}&count=50`
      )
      setCommits(response.data)
    } catch (err) {
      console.error('Failed to load commit history:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncateHash = (hash: string) => hash.substring(0, 7)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-github-700">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">Commit History</h2>
          <input
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="Branch name"
            className="bg-github-700 text-white px-3 py-2 rounded-lg placeholder-github-500 text-sm"
          />
          <button
            onClick={loadHistory}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
          >
            Load
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-github-500">Loading commits...</div>
        ) : commits.length === 0 ? (
          <div className="p-4 text-center text-github-500">No commits found</div>
        ) : (
          <div className="divide-y divide-github-700">
            {commits.map((commit) => (
              <div
                key={commit.oid}
                className="p-4 hover:bg-github-700 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-white group-hover:text-blue-400 transition-colors">
                      {commit.message.split('\n')[0]}
                    </p>
                    <p className="text-sm text-github-500 mt-1">
                      <span className="font-mono text-xs bg-github-800 px-2 py-1 rounded mr-2">
                        {truncateHash(commit.oid)}
                      </span>
                      by <strong>{commit.author}</strong>
                    </p>
                  </div>
                  <span className="text-xs text-github-500 whitespace-nowrap ml-2">
                    {formatDate(commit.timestamp)}
                  </span>
                </div>

                {commit.message.split('\n').length > 1 && (
                  <p className="text-sm text-github-400 pl-0 mt-2 text-gray-400">
                    {commit.message.split('\n').slice(1).join('\n').substring(0, 100)}...
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
