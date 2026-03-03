import React, { useEffect, useState } from 'react'
import { X, LogOut, Settings as SettingsIcon, Copy, Check, ExternalLink } from 'react-feather'
import axios from 'axios'

interface UserProfile {
  login: string
  name: string
  avatar_url: string
  bio: string
  public_repos: number
  followers: number
  following: number
  company: string
  location: string
  blog: string
  html_url: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSettingsClick: () => void
}

export const UserProfilePopup: React.FC<Props> = ({ isOpen, onClose, onSettingsClick }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const githubToken = localStorage.getItem('github_token')

  useEffect(() => {
    if (isOpen && githubToken) {
      fetchProfile()
    }
  }, [isOpen, githubToken])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`http://localhost:8765/api/github/user`, {
        headers: { Authorization: `token ${githubToken}` },
      })
      setProfile(response.data)
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = () => {
    localStorage.removeItem('github_token')
    window.location.reload()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="fixed top-16 right-4 w-96 bg-github-800 border border-github-700 rounded-lg shadow-2xl z-50">
        <div className="flex items-center justify-between p-4 border-b border-github-700">
          <h3 className="text-lg font-bold text-white">GitHub Profile</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-github-700 rounded transition"
          >
            <X size={20} className="text-github-400" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <p className="text-github-400">Loading profile...</p>
          </div>
        ) : profile ? (
          <div className="p-6 space-y-4">
            {/* User Info */}
            <div className="flex items-center gap-4">
              <img
                src={profile.avatar_url}
                alt={profile.login}
                className="w-16 h-16 rounded-full border-2 border-github-700"
              />
              <div className="flex-1">
                <p className="font-bold text-white">{profile.name || profile.login}</p>
                <p className="text-sm text-github-400">@{profile.login}</p>
                {profile.bio && (
                  <p className="text-xs text-github-400 mt-1">{profile.bio}</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-github-900 rounded p-2 text-center">
                <p className="text-lg font-bold text-blue-400">{profile.public_repos}</p>
                <p className="text-xs text-github-400">Repos</p>
              </div>
              <div className="bg-github-900 rounded p-2 text-center">
                <p className="text-lg font-bold text-green-400">{profile.followers}</p>
                <p className="text-xs text-github-400">Followers</p>
              </div>
              <div className="bg-github-900 rounded p-2 text-center">
                <p className="text-lg font-bold text-purple-400">{profile.following}</p>
                <p className="text-xs text-github-400">Following</p>
              </div>
            </div>

            {/* Details */}
            {profile.location && (
              <p className="text-sm text-github-300">📍 {profile.location}</p>
            )}
            {profile.company && (
              <p className="text-sm text-github-300">💼 {profile.company}</p>
            )}
            {profile.blog && (
              <p className="text-sm text-github-300">
                🌐{' '}
                <a
                  href={profile.blog}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {profile.blog}
                </a>
              </p>
            )}

            {/* Username Copy Button */}
            <button
              onClick={() => copyToClipboard(`@${profile.login}`)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-github-900 hover:bg-github-700 rounded text-sm transition"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-green-400" /> Copied!
                </>
              ) : (
                <>
                  <Copy size={16} /> Copy Username
                </>
              )}
            </button>

            {/* View Profile Button */}
            <a
              href={profile.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm transition"
            >
              <ExternalLink size={16} /> View on GitHub
            </a>

            {/* Divider */}
            <div className="border-t border-github-700" />

            {/* Action Buttons */}
            <button
              onClick={() => {
                onSettingsClick()
                onClose()
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-github-900 hover:bg-github-700 rounded text-github-300 text-sm transition"
            >
              <SettingsIcon size={16} /> Settings
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-900 hover:bg-red-800 rounded text-red-300 text-sm transition"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-github-400 mb-4">Not connected to GitHub</p>
            <button
              onClick={() => {
                onSettingsClick()
                onClose()
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
            >
              Connect Account
            </button>
          </div>
        )}
      </div>
    </>
  )
}
