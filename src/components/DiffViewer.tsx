import React, { useState } from 'react'

interface DiffViewerProps {
  path?: string
  oldCode?: string
  newCode?: string
}

export function DiffViewer({ path, oldCode = '', newCode = '' }: DiffViewerProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-github-700">
        <h2 className="text-lg font-semibold text-white">Diff Viewer</h2>
        {path && <p className="text-sm text-github-400 mt-1">{path}</p>}
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Old Code */}
        <div className="flex-1 flex flex-col border-r border-github-700 overflow-hidden">
          <div className="bg-red-900 bg-opacity-20 px-4 py-2 border-b border-github-700">
            <p className="text-sm font-medium text-red-400">Original</p>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-sm font-mono text-github-300">
            {oldCode || '(no changes)'}
          </pre>
        </div>

        {/* New Code */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-green-900 bg-opacity-20 px-4 py-2 border-b border-github-700">
            <p className="text-sm font-medium text-green-400">Modified</p>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-sm font-mono text-github-300">
            {newCode || '(no changes)'}
          </pre>
        </div>
      </div>
    </div>
  )
}
