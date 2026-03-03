import React, { useState, useEffect, useCallback } from 'react'
import {
  X, Folder, FileText, ChevronRight, ArrowUpRight,
  RotateCcw, ArrowLeft, Copy, Check,
} from 'react-feather'
import axios from 'axios'
import { usePanelStore } from '../store/panelStore'

const API = 'http://localhost:8765'

interface ContentItem {
  type: 'file' | 'dir'
  name: string
  path: string
  sha: string
  size: number
  html_url: string
  download_url: string
  content?: string
  encoding?: string
}

const EXT_ICONS: Record<string, string> = {
  ts: '🟦', tsx: '⚛️', js: '🟨', jsx: '⚛️', go: '🐹', py: '🐍',
  rs: '🦀', java: '☕', rb: '💎', md: '📄', json: '📋', yaml: '⚙️',
  yml: '⚙️', sh: '📜', css: '🎨', html: '🌐', svg: '🖼️', png: '🖼️',
  jpg: '🖼️', gif: '🖼️', env: '🔒', gitignore: '👁️',
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return EXT_ICONS[ext] || '📄'
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function isTextFile(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  const textExts = ['ts', 'tsx', 'js', 'jsx', 'go', 'py', 'rs', 'java', 'rb', 'md',
    'json', 'yaml', 'yml', 'sh', 'css', 'html', 'txt', 'env', 'gitignore',
    'toml', 'ini', 'conf', 'cfg', 'lock', 'sum', 'mod']
  return textExts.includes(ext) || !name.includes('.')
}

export const FileBrowserPanel: React.FC = () => {
  const params = usePanelStore((s) => s.fileBrowser)
  const close = usePanelStore((s) => s.closeFileBrowser)
  const [items, setItems] = useState<ContentItem[]>([])
  const [currentPath, setCurrentPath] = useState('')
  const [breadcrumb, setBreadcrumb] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<ContentItem | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const token = localStorage.getItem('github_token')
  const headers = token ? { Authorization: `token ${token}` } : {}

  const loadDir = useCallback(async (path: string) => {
    if (!params) return
    const { owner, repo } = params
    setLoading(true)
    setSelectedFile(null)
    setFileContent('')
    try {
      const res = await axios.get(`${API}/api/github/repo/${owner}/${repo}/contents`, {
        headers,
        params: { path },
      })
      const data: ContentItem[] = Array.isArray(res.data) ? res.data : [res.data]
      const sorted = [...data].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      setItems(sorted)
      setCurrentPath(path)
      setBreadcrumb(path ? path.split('/') : [])
    } finally {
      setLoading(false)
    }
  }, [params])

  const loadFile = async (item: ContentItem) => {
    if (!params || item.type !== 'file') return
    setSelectedFile(item)
    setFileContent('')
    if (!isTextFile(item.name)) {
      setFileContent('[Binary file — cannot display]')
      return
    }
    setLoading(true)
    try {
      const res = await axios.get(`${API}/api/github/repo/${params.owner}/${params.repo}/contents`, {
        headers,
        params: { path: item.path },
      })
      const data: ContentItem = res.data
      if (data.encoding === 'base64' && data.content) {
        const decoded = atob(data.content.replace(/\n/g, ''))
        setFileContent(decoded)
      } else {
        setFileContent(data.content || '')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params) {
      setCurrentPath('')
      setBreadcrumb([])
      setSelectedFile(null)
      setFileContent('')
      loadDir('')
    }
  }, [params, loadDir])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedFile) setSelectedFile(null)
        else close()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close, selectedFile])

  const navigateUp = () => {
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    loadDir(parts.join('/'))
  }

  const copyContent = () => {
    navigator.clipboard.writeText(fileContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!params) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={close} />

      <div className="fixed right-0 top-0 h-full w-full max-w-3xl z-50 bg-github-900 border-l border-github-700 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-github-700 bg-github-800">
          <Folder size={18} className="text-yellow-400" />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-white text-sm">{params.owner}/{params.repo}</h2>
            <p className="text-github-500 text-[11px]">File Browser</p>
          </div>
          <a
            href={`https://github.com/${params.owner}/${params.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-github-700 rounded-lg text-github-400 hover:text-github-200 transition-colors"
            title="Open on GitHub"
          >
            <ArrowUpRight size={15} />
          </a>
          <button onClick={close} className="p-1.5 hover:bg-github-700 rounded-lg text-github-400 hover:text-github-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 px-5 py-2.5 border-b border-github-700/60 bg-github-800/60 text-xs font-mono overflow-x-auto">
          <button
            onClick={() => loadDir('')}
            className="text-blue-400 hover:text-blue-300 shrink-0"
          >
            {params.repo}
          </button>
          {breadcrumb.map((seg, i) => {
            const path = breadcrumb.slice(0, i + 1).join('/')
            return (
              <React.Fragment key={path}>
                <ChevronRight size={12} className="text-github-600 shrink-0" />
                <button
                  onClick={() => loadDir(path)}
                  className={`shrink-0 ${
                    i === breadcrumb.length - 1 && !selectedFile
                      ? 'text-white'
                      : 'text-blue-400 hover:text-blue-300'
                  }`}
                >
                  {seg}
                </button>
              </React.Fragment>
            )
          })}
          {selectedFile && (
            <>
              <ChevronRight size={12} className="text-github-600 shrink-0" />
              <span className="text-white shrink-0">{selectedFile.name}</span>
            </>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedFile ? (
            /* File viewer */
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-2.5 border-b border-github-700/60 bg-github-800/60">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-1 hover:bg-github-700 rounded text-github-400 hover:text-github-200 transition-colors"
                    title="Back to directory"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <span className="text-sm font-mono text-github-300">{selectedFile.name}</span>
                  <span className="text-[11px] text-github-600">{formatSize(selectedFile.size)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyContent}
                    className="flex items-center gap-1.5 px-3 py-1 bg-github-700 hover:bg-github-600 rounded-lg text-xs font-medium transition-colors"
                  >
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <a
                    href={selectedFile.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1 bg-github-700 hover:bg-github-600 rounded-lg text-xs font-medium transition-colors"
                  >
                    <ArrowUpRight size={12} /> GitHub
                  </a>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {loading ? (
                  <div className="text-center text-github-500 pt-8">Loading file…</div>
                ) : (
                  <pre className="text-xs font-mono text-github-300 leading-relaxed whitespace-pre-wrap">
                    {fileContent}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            /* Directory listing */
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 space-y-2">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-4 h-4 bg-github-700 rounded" />
                      <div className="h-4 bg-github-700 rounded flex-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-github-700/40">
                  {currentPath && (
                    <button
                      type="button"
                      onClick={navigateUp}
                      className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-github-800/60 text-github-400 text-sm transition-colors"
                    >
                      <ArrowLeft size={14} className="text-github-600" />
                      <span className="font-mono">..</span>
                    </button>
                  )}
                  {items.map((item) => (
                    <button
                      key={item.sha}
                      type="button"
                      onClick={() => item.type === 'dir' ? loadDir(item.path) : loadFile(item)}
                      className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-github-800/60 transition-colors text-left"
                    >
                      <span className="text-base shrink-0">
                        {item.type === 'dir' ? '📁' : fileIcon(item.name)}
                      </span>
                      <span className={`flex-1 text-sm font-mono truncate ${
                        item.type === 'dir' ? 'text-blue-300' : 'text-github-300'
                      }`}>
                        {item.name}
                      </span>
                      {item.type === 'file' && (
                        <span className="text-[11px] text-github-600 shrink-0">{formatSize(item.size)}</span>
                      )}
                      {item.type === 'dir' && (
                        <ChevronRight size={13} className="text-github-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-github-700/60 px-5 py-2 flex items-center gap-2 text-[11px] text-github-600">
          <RotateCcw size={10} />
          <span>Click folders to navigate · Click files to view · ESC to go back</span>
        </div>
      </div>
    </>
  )
}
