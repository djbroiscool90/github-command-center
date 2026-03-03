import React, { useState } from 'react'
import { Lock, Trash2, Plus, Check, AlertCircle, Users } from 'react-feather'

interface ProtectedBranch {
  id: string
  name: string
  requireReviews: number
  requireStatusChecks: boolean
  dismissStaleReviews: boolean
  requireCodeOwnerReviews: boolean
  restrictionLevel: 'none' | 'admins' | 'users'
}

export const BranchProtectionManager: React.FC = () => {
  const [branches, setBranches] = useState<ProtectedBranch[]>([
    {
      id: '1',
      name: 'main',
      requireReviews: 2,
      requireStatusChecks: true,
      dismissStaleReviews: false,
      requireCodeOwnerReviews: true,
      restrictionLevel: 'none',
    },
    {
      id: '2',
      name: 'develop',
      requireReviews: 1,
      requireStatusChecks: true,
      dismissStaleReviews: true,
      requireCodeOwnerReviews: false,
      restrictionLevel: 'admins',
    },
    {
      id: '3',
      name: 'staging',
      requireReviews: 1,
      requireStatusChecks: true,
      dismissStaleReviews: false,
      requireCodeOwnerReviews: false,
      restrictionLevel: 'none',
    },
  ])

  const [newBranch, setNewBranch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const addProtectedBranch = () => {
    if (newBranch.trim()) {
      setBranches([
        ...branches,
        {
          id: Date.now().toString(),
          name: newBranch,
          requireReviews: 1,
          requireStatusChecks: true,
          dismissStaleReviews: false,
          requireCodeOwnerReviews: false,
          restrictionLevel: 'none',
        },
      ])
      setNewBranch('')
      setShowForm(false)
    }
  }

  const removeBranch = (id: string) => {
    setBranches(branches.filter((b) => b.id !== id))
  }

  const toggleBranchSetting = (id: string, setting: keyof ProtectedBranch) => {
    setBranches(
      branches.map((b) =>
        b.id === id ? { ...b, [setting]: !b[setting] } : b
      )
    )
  }

  return (
    <div className="w-full h-screen bg-github-900 text-white overflow-y-auto">
      <div className="bg-github-800 border-b border-github-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock size={28} />
            <div>
              <h1 className="text-3xl font-bold">Branch Protection</h1>
              <p className="text-sm text-github-400">
                Enforce rules for branch management
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition"
          >
            <Plus size={18} />
            Protect Branch
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Add New Protected Branch Form */}
        {showForm && (
          <div className="bg-github-800 border border-github-700 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4">Add Protected Branch</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Branch Name</label>
                <input
                  type="text"
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  placeholder="e.g., main, develop, release/*"
                  className="w-full px-4 py-2 bg-github-900 border border-github-700 rounded text-white placeholder-github-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addProtectedBranch}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition"
                >
                  Create Protection
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-github-700 hover:bg-github-600 rounded transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Protected Branches List */}
        <div className="space-y-4">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-github-800 border border-github-700 rounded-lg overflow-hidden"
            >
              <div className="p-6 border-b border-github-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Lock size={20} className="text-green-400" />
                    <h3 className="text-xl font-bold">{branch.name}</h3>
                  </div>
                  <button
                    onClick={() => removeBranch(branch.id)}
                    className="p-2 hover:bg-red-600/20 rounded transition"
                  >
                    <Trash2 size={18} className="text-red-400" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Required Reviews */}
                  <div className="bg-github-900 rounded p-4">
                    <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
                      <Users size={16} />
                      Required Pull Request Reviews
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={branch.requireReviews}
                        min="0"
                        max="6"
                        onChange={(e) => {
                          const newBranches = branches.map((b) =>
                            b.id === branch.id
                              ? { ...b, requireReviews: parseInt(e.target.value) || 0 }
                              : b
                          )
                          setBranches(newBranches)
                        }}
                        className="w-20 px-3 py-2 bg-github-800 border border-github-700 rounded text-white focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-sm text-github-400">reviewers required</span>
                    </div>
                  </div>

                  {/* Restriction Level */}
                  <div className="bg-github-900 rounded p-4">
                    <label className="block text-sm font-semibold mb-3">
                      Restriction Level
                    </label>
                    <select
                      value={branch.restrictionLevel}
                      onChange={(e) => {
                        const newBranches = branches.map((b) =>
                          b.id === branch.id
                            ? { ...b, restrictionLevel: e.target.value as any }
                            : b
                        )
                        setBranches(newBranches)
                      }}
                      className="w-full px-3 py-2 bg-github-800 border border-github-700 rounded text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="none">No restriction</option>
                      <option value="admins">Admins only</option>
                      <option value="users">Select users</option>
                    </select>
                  </div>

                  {/* Checkboxes */}
                  <div className="bg-github-900 rounded p-4 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer hover:text-blue-400 transition">
                      <input
                        type="checkbox"
                        checked={branch.requireStatusChecks}
                        onChange={() =>
                          toggleBranchSetting(branch.id, 'requireStatusChecks')
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Require status checks to pass</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer hover:text-blue-400 transition">
                      <input
                        type="checkbox"
                        checked={branch.dismissStaleReviews}
                        onChange={() =>
                          toggleBranchSetting(branch.id, 'dismissStaleReviews')
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Dismiss stale pull request reviews</span>
                    </label>
                  </div>

                  <div className="bg-github-900 rounded p-4">
                    <label className="flex items-center gap-3 cursor-pointer hover:text-blue-400 transition">
                      <input
                        type="checkbox"
                        checked={branch.requireCodeOwnerReviews}
                        onChange={() =>
                          toggleBranchSetting(branch.id, 'requireCodeOwnerReviews')
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Require code owner reviews</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Protection Status */}
              <div className="bg-github-900 px-6 py-3 flex items-center gap-2 text-sm">
                <Check size={16} className="text-green-400" />
                <span className="text-green-400">Branch protection active</span>
              </div>
            </div>
          ))}
        </div>

        {/* Protection Rules Info */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <div className="flex gap-3">
            <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-400 mb-2">Protection Rules</h3>
              <ul className="text-sm text-blue-300/80 space-y-1">
                <li>• All protected branches require pull requests before merging</li>
                <li>• Direct pushes to protected branches are blocked</li>
                <li>• Status checks ensure code quality before merge</li>
                <li>• Code owner reviews provide domain expertise oversight</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
