import React, { useState, useEffect, useCallback, useRef } from 'react'
import { FileText, Save, X, GitBranch, GitCommit, Upload, Copy, AlertCircle, Check, Trash2, Plus, ChevronDown, Search, Download, Moon, Sun, Clock, Hash } from 'react-feather'
import axios from 'axios'

interface EditorFile {
  name: string
  content: string
  modified: boolean
  staged: boolean
}

interface CommitDialogData {
  files: string[]
  message: string
  branch: string
}

interface PushDialogData {
  commits: Array<{ hash: string; message: string; author: string; date: string }>
  branch: string
}

interface RepoInfo {
  name: string
  url: string
  branch: string
  lastSync: string
  commitCount: number
}

export function InlineEditor({ repoPath }: { repoPath: string }) {
  const [files, setFiles] = useState<Map<string, EditorFile>>(new Map())
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [newFileName, setNewFileName] = useState('')
  const [showNewFile, setShowNewFile] = useState(false)
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null)
  const [commitMessage, setCommitMessage] = useState('')
  const [showCommitDialog, setShowCommitDialog] = useState(false)
  const [showPushDialog, setShowPushDialog] = useState(false)
  const [showCloneDialog, setShowCloneDialog] = useState(false)
  const [cloneUrl, setCloneUrl] = useState('')
  const [clonePath, setClonePath] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set())
  const [pushedCommits, setPushedCommits] = useState<PushDialogData['commits']>([])
  const [draggedFile, setDraggedFile] = useState<string | null>(null)
  const [dragOverFile, setDragOverFile] = useState<string | null>(null)
  const [fileOrder, setFileOrder] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [recentFiles, setRecentFiles] = useState<string[]>([])
  const [darkTheme, setDarkTheme] = useState(true)
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (repoPath) {
      loadRepoInfo()
      loadFiles()
    }
  }, [repoPath])

  const loadRepoInfo = async () => {
    try {
      // Simulate fetching repo info
      setRepoInfo({
        name: repoPath.split('/').pop() || 'Repository',
        url: `https://github.com/user/${repoPath.split('/').pop()}`,
        branch: 'main',
        lastSync: new Date().toLocaleString(),
        commitCount: 42,
      })
    } catch (err) {
      console.error('Failed to load repo info:', err)
    }
  }

  const loadFiles = async () => {
    try {
      // Simulate loading files from repo
      const mockFiles = new Map<string, EditorFile>()
      mockFiles.set('README.md', {
        name: 'README.md',
        content: '# Project\n\nA great project',
        modified: false,
        staged: false,
      })
      mockFiles.set('package.json', {
        name: 'package.json',
        content: '{\n  "name": "project",\n  "version": "1.0.0"\n}',
        modified: false,
        staged: false,
      })
      setFiles(mockFiles)
      setFileOrder(Array.from(mockFiles.keys()))
    } catch (err) {
      console.error('Failed to load files:', err)
    }
  }

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      const newMap = new Map(files)
      newMap.set(newFileName, {
        name: newFileName,
        content: '',
        modified: true,
        staged: false,
      })
      setFiles(newMap)
      setFileOrder([...fileOrder, newFileName])
      setActiveFile(newFileName)
      setNewFileName('')
      setShowNewFile(false)
    }
  }

  const handleUpdateFile = (content: string) => {
    if (activeFile) {
      const newMap = new Map(files)
      const file = newMap.get(activeFile)
      if (file) {
        newMap.set(activeFile, { ...file, content, modified: true })
        setFiles(newMap)
        
        // Auto-save with debouncing
        if (autoSaveEnabled) {
          if (autoSaveTimer.current) {
            clearTimeout(autoSaveTimer.current)
          }
          autoSaveTimer.current = setTimeout(() => {
            handleSaveFile()
          }, 2000) // Auto-save after 2 seconds of inactivity
        }
      }
    }
  }

  const handleSaveFile = async () => {
    if (activeFile) {
      const content = files.get(activeFile)?.content || ''
      setLoading(true)
      try {
        // Simulate saving file
        const newMap = new Map(files)
        const file = newMap.get(activeFile)
        if (file) {
          newMap.set(activeFile, { ...file, modified: false })
          setFiles(newMap)
        }
        setSuccess(`✓ ${activeFile} saved successfully`)
        setTimeout(() => setSuccess(''), 3000)
      } catch (err) {
        setError(`Failed to save ${activeFile}`)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleStageFile = (fileName: string) => {
    const newStaged = new Set(stagedFiles)
    if (newStaged.has(fileName)) {
      newStaged.delete(fileName)
    } else {
      newStaged.add(fileName)
    }
    setStagedFiles(newStaged)
  }

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      setError('Please enter a commit message')
      return
    }

    if (stagedFiles.size === 0) {
      setError('No files staged for commit')
      return
    }

    setLoading(true)
    try {
      // Simulate commit
      const commitData = {
        message: commitMessage,
        files: Array.from(stagedFiles),
        timestamp: new Date().toISOString(),
        author: 'You',
      }
      console.log('Commit:', commitData)
      setSuccess(`✓ Committed ${stagedFiles.size} files`)
      setStagedFiles(new Set())
      setCommitMessage('')
      setShowCommitDialog(false)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to commit changes')
    } finally {
      setLoading(false)
    }
  }

  const handlePush = async () => {
    setLoading(true)
    try {
      // Simulate push
      const mockCommits = [
        {
          hash: 'a1b2c3d',
          message: 'Fix: Update dependencies',
          author: 'You',
          date: new Date().toISOString(),
        },
        {
          hash: 'e4f5g6h',
          message: 'Feature: Add new functionality',
          author: 'You',
          date: new Date(Date.now() - 3600000).toISOString(),
        },
      ]
      setPushedCommits(mockCommits)
      setShowPushDialog(true)
      setSuccess('✓ Push prepared')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to prepare push')
    } finally {
      setLoading(false)
    }
  }

  const confirmPush = async () => {
    setLoading(true)
    try {
      // Simulate actual push to remote
      console.log('Pushing commits:', pushedCommits)
      setSuccess(`✓ Pushed ${pushedCommits.length} commits to remote`)
      setShowPushDialog(false)
      setPushedCommits([])
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to push to remote')
    } finally {
      setLoading(false)
    }
  }

  const handleCloneRepository = async () => {
    if (!cloneUrl.trim()) {
      setError('Please enter a repository URL')
      return
    }

    setLoading(true)
    try {
      // Simulate clone
      console.log('Cloning:', cloneUrl, 'to', clonePath || 'default path')
      setSuccess(`✓ Repository cloned successfully`)
      setShowCloneDialog(false)
      setCloneUrl('')
      setClonePath('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to clone repository')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteFile = (fileName: string) => {
    const newMap = new Map(files)
    newMap.delete(fileName)
    setFiles(newMap)
    setFileOrder(fileOrder.filter(f => f !== fileName))
    setRecentFiles(recentFiles.filter(f => f !== fileName))
    if (activeFile === fileName) {
      setActiveFile(Array.from(newMap.keys())[0] || null)
    }
  }

  const handleDragStart = (e: React.DragEvent, fileName: string) => {
    setDraggedFile(fileName)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, fileName: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverFile(fileName)
  }

  const handleDragLeave = () => {
    setDragOverFile(null)
  }

  const handleDrop = (e: React.DragEvent, targetFileName: string) => {
    e.preventDefault()
    setDragOverFile(null)

    if (!draggedFile || draggedFile === targetFileName) {
      setDraggedFile(null)
      return
    }

    // Reorder files
    const newOrder = [...fileOrder]
    const draggedIndex = newOrder.indexOf(draggedFile)
    const targetIndex = newOrder.indexOf(targetFileName)

    if (draggedIndex !== -1 && targetIndex !== -1) {
      newOrder.splice(draggedIndex, 1)
      newOrder.splice(targetIndex, 0, draggedFile)
      setFileOrder(newOrder)
    }

    setDraggedFile(null)
  }

  const handleDragEnd = () => {
    setDraggedFile(null)
    setDragOverFile(null)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveFile()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        setShowNewFile(true)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        document.getElementById('file-search')?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeFile])

  // Track recent files
  useEffect(() => {
    if (activeFile && !recentFiles.includes(activeFile)) {
      setRecentFiles([activeFile, ...recentFiles.slice(0, 4)])
    }
  }, [activeFile])

  // Download/Export file
  const handleDownloadFile = () => {
    if (activeFile) {
      const content = files.get(activeFile)?.content || ''
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = activeFile
      a.click()
      URL.revokeObjectURL(url)
      setSuccess(`✓ ${activeFile} downloaded`)
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  // Render line numbers
  const renderLineNumbers = (content: string) => {
    const lines = content.split('\n')
    return (
      <div className="bg-github-800 text-github-500 text-right pr-3 py-6 font-mono text-sm select-none border-r border-github-700 min-w-[3rem]">
        {lines.map((_, i) => (
          <div key={i} className="leading-6">
            {i + 1}
          </div>
        ))}
      </div>
    )
  }

  if (!repoPath) {
    return (
      <div className="w-full h-screen bg-github-900 text-white flex items-center justify-center">
        <div className="text-center">
          <GitBranch size={48} className="mx-auto mb-4 text-blue-500" />
          <p className="text-github-400">Enter a repository path to edit files</p>
        </div>
      </div>
    )
  }

  const modifiedFiles = Array.from(files.values()).filter((f) => f.modified)
  const allFiles = fileOrder.length > 0 ? fileOrder : Array.from(files.keys())
  const filteredFiles = searchQuery
    ? allFiles.filter(f => f.toLowerCase().includes(searchQuery.toLowerCase()))
    : allFiles

  return (
    <div className="flex h-full overflow-hidden bg-github-900">
      {/* File List Sidebar */}
      <div className="w-56 bg-github-800 border-r border-github-700 flex flex-col overflow-hidden">
        {/* Repo Info */}
        {repoInfo && (
          <div className="p-4 border-b border-github-700 bg-github-900 text-sm">
            <p className="font-semibold text-blue-400 truncate">{repoInfo.name}</p>
            <p className="text-xs text-github-400">Branch: {repoInfo.branch}</p>
            <p className="text-xs text-github-500">{repoInfo.commitCount} commits</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-3 border-b border-github-700 space-y-2">
          <button
            onClick={() => setShowNewFile(!showNewFile)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition"
          >
            <Plus size={16} /> New File
          </button>
          <button
            onClick={() => setShowCloneDialog(true)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition"
          >
            <Copy size={16} /> Clone Repo
          </button>
        </div>

        {showNewFile && (
          <div className="p-3 border-b border-github-700 space-y-2 bg-github-900">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="File name"
              className="w-full bg-github-700 text-white px-3 py-2 rounded text-sm placeholder-github-500 focus:outline-none focus:border-blue-400"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFile()}
            />
            <button
              onClick={handleCreateFile}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition"
            >
              Create
            </button>
          </div>
        )}

        {/* File Search */}
        <div className="p-3 border-b border-github-700">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-github-500" />
            <input
              id="file-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files (Ctrl+F)"
              className="w-full bg-github-700 text-white pl-9 pr-3 py-2 rounded text-sm placeholder-github-500 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto">
          {recentFiles.length > 0 && !searchQuery && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-github-400 bg-github-900 sticky top-0 flex items-center gap-2">
                <Clock size={12} /> RECENT
              </div>
              {recentFiles.slice(0, 3).map((fileName) => {
                const file = files.get(fileName)
                if (!file) return null
                return (
                  <div
                    key={`recent-${fileName}`}
                    className="px-3 py-1.5 text-github-400 hover:bg-github-700 cursor-pointer text-sm border-l-2 border-transparent"
                    onClick={() => setActiveFile(fileName)}
                  >
                    <Clock size={12} className="inline mr-2" />
                    {fileName}
                  </div>
                )
              })}
            </>
          )}
          {filteredFiles.length === 0 ? (
            <p className="text-center text-github-500 text-sm py-4">
              {searchQuery ? 'No matching files' : 'No files'}
            </p>
          ) : (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-github-400 bg-github-900 sticky top-0">
                FILES ({filteredFiles.length})
              </div>
              {filteredFiles.map((fileName) => {
                const file = files.get(fileName)
                const isStaged = stagedFiles.has(fileName)
                const isDragging = draggedFile === fileName
                const isDragOver = dragOverFile === fileName
                return (
                  <div
                    key={fileName}
                    draggable
                    onDragStart={(e) => handleDragStart(e, fileName)}
                    onDragOver={(e) => handleDragOver(e, fileName)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, fileName)}
                    onDragEnd={handleDragEnd}
                    className={`px-3 py-2 border-l-2 cursor-move transition ${
                      activeFile === fileName
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'text-github-300 hover:bg-github-700 border-transparent'
                    } ${file?.modified ? 'font-semibold' : ''} ${
                      isDragging ? 'opacity-50' : ''
                    } ${
                      isDragOver ? 'border-t-2 border-t-blue-400' : ''
                    }`}
                    onClick={() => setActiveFile(fileName)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate">
                        {file?.modified ? '● ' : '○ '}
                        {fileName}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteFile(fileName)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {file?.modified && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStageFile(fileName)
                        }}
                        className={`mt-1 text-xs px-2 py-1 rounded w-full transition ${
                          isStaged
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-github-700 hover:bg-github-600'
                        }`}
                      >
                        {isStaged ? '✓ Staged' : 'Stage'}
                      </button>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with Commit/Push Buttons */}
        <div className="bg-github-800 border-b border-github-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {activeFile && <h3 className="text-white font-medium text-lg">{activeFile}</h3>}
            {success && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Check size={16} /> {success}
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={16} /> {error}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkTheme(!darkTheme)}
              className="bg-github-700 hover:bg-github-600 text-white px-3 py-2 rounded flex items-center gap-2 text-sm transition"
              title="Toggle theme"
            >
              {darkTheme ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            
            {/* Line Numbers Toggle */}
            <button
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className={`px-3 py-2 rounded flex items-center gap-2 text-sm transition ${
                showLineNumbers ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-github-700 hover:bg-github-600 text-white'
              }`}
              title="Toggle line numbers"
            >
              <Hash size={16} />
            </button>
            
            {/* Auto-save Toggle */}
            <button
              onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
              className={`px-3 py-2 rounded flex items-center gap-2 text-sm transition ${
                autoSaveEnabled ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-github-700 hover:bg-github-600 text-white'
              }`}
              title={autoSaveEnabled ? 'Auto-save ON' : 'Auto-save OFF'}
            >
              <Save size={16} /> {autoSaveEnabled ? 'Auto' : 'Manual'}
            </button>

            {activeFile && (
              <>
                <button
                  onClick={handleDownloadFile}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm transition"
                  title="Download file"
                >
                  <Download size={16} /> Export
                </button>
                <button
                  onClick={handleSaveFile}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded flex items-center gap-2 text-sm transition"
                >
                  <Save size={16} /> Save
                </button>
              </>
            )}
            {modifiedFiles.length > 0 && (
              <>
                <button
                  onClick={() => setShowCommitDialog(true)}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded flex items-center gap-2 text-sm transition"
                >
                  <GitCommit size={16} /> Commit
                </button>
                <button
                  onClick={handlePush}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded flex items-center gap-2 text-sm transition"
                >
                  <Upload size={16} /> Push
                </button>
              </>
            )}
          </div>
        </div>

        {/* Editor Content */}
        {activeFile ? (
          <div className="flex-1 flex overflow-hidden">
            {showLineNumbers && renderLineNumbers(files.get(activeFile)?.content || '')}
            <textarea
              value={files.get(activeFile)?.content || ''}
              onChange={(e) => handleUpdateFile(e.target.value)}
              className="flex-1 bg-github-900 text-github-200 p-6 font-mono text-sm resize-none border-none focus:outline-none leading-6"
              placeholder="Enter code here..."
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-4 text-github-500" />
              <p className="text-github-500">Select or create a file to edit</p>
              <p className="text-github-600 text-sm mt-2">Keyboard shortcuts: Ctrl+S (Save), Ctrl+N (New), Ctrl+F (Search)</p>
            </div>
          </div>
        )}
      </div>

      {/* Commit Dialog */}
      {showCommitDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-github-800 rounded-lg p-6 w-96 border border-github-700 max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-white">Commit Changes</h2>

            <div className="mb-4">
              <p className="text-sm text-github-400 mb-3">Files to commit:</p>
              <div className="bg-github-900 rounded p-3 space-y-2 max-h-40 overflow-y-auto">
                {Array.from(stagedFiles).map((file) => (
                  <div key={file} className="flex items-center gap-2 text-sm text-github-300">
                    <Check size={14} className="text-green-500" /> {file}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-github-300 mb-2">Commit Message</label>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Describe your changes..."
                className="w-full bg-github-900 text-white border border-github-700 rounded p-3 text-sm focus:outline-none focus:border-blue-500 h-24"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCommit}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded font-semibold transition"
              >
                {loading ? 'Committing...' : 'Commit'}
              </button>
              <button
                onClick={() => setShowCommitDialog(false)}
                className="flex-1 bg-github-700 hover:bg-github-600 text-white px-4 py-2 rounded transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Push Dialog */}
      {showPushDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-github-800 rounded-lg p-6 w-96 border border-github-700 max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-white">Confirm Push</h2>

            <p className="text-sm text-github-400 mb-3">Commits to push ({pushedCommits.length}):</p>
            <div className="bg-github-900 rounded p-3 space-y-3 max-h-40 overflow-y-auto mb-4">
              {pushedCommits.map((commit) => (
                <div key={commit.hash} className="border-l-2 border-blue-500 pl-3">
                  <p className="text-sm font-mono text-github-300">{commit.hash.substring(0, 7)}</p>
                  <p className="text-sm text-github-400">{commit.message}</p>
                  <p className="text-xs text-github-500">{commit.author}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmPush}
                disabled={loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded font-semibold transition"
              >
                {loading ? 'Pushing...' : 'Confirm & Push'}
              </button>
              <button
                onClick={() => setShowPushDialog(false)}
                className="flex-1 bg-github-700 hover:bg-github-600 text-white px-4 py-2 rounded transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clone Dialog */}
      {showCloneDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-github-800 rounded-lg p-6 w-96 border border-github-700">
            <h2 className="text-xl font-bold mb-4 text-white">Clone Repository</h2>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-github-300 mb-2">Repository URL</label>
                <input
                  type="text"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                  className="w-full bg-github-900 text-white border border-github-700 rounded p-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-github-300 mb-2">Clone Path (optional)</label>
                <input
                  type="text"
                  value={clonePath}
                  onChange={(e) => setClonePath(e.target.value)}
                  placeholder="/path/to/clone"
                  className="w-full bg-github-900 text-white border border-github-700 rounded p-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCloneRepository}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded font-semibold transition"
              >
                {loading ? 'Cloning...' : 'Clone'}
              </button>
              <button
                onClick={() => {
                  setShowCloneDialog(false)
                  setCloneUrl('')
                  setClonePath('')
                }}
                className="flex-1 bg-github-700 hover:bg-github-600 text-white px-4 py-2 rounded transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
