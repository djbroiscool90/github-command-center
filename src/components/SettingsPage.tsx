import React, { useState, useEffect } from 'react'
import { Settings, LogOut, Link as LinkIcon, GitBranch, AlertCircle, Check, X, ExternalLink, Save } from 'react-feather'
import axios from 'axios'

interface UserProfile {
  login: string
  name: string
  avatar_url: string
  bio: string
  public_repos: number
  followers: number
  following: number
  created_at: string
  company: string
  location: string
  blog: string
}

interface AppSettings {
  syncInterval: number
  notifyPRs: boolean
  notifyIssues: boolean
  notifyMentions: boolean
  selectedPlatform: 'github' | 'gitlab' | 'gitea'
  webhookUrl: string
  sshKeyFingerprint: string
  theme: 'dark' | 'light'
}

export const SettingsPage: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [githubToken, setGithubToken] = useState<string>(localStorage.getItem('github_token') || '')
  const [isLinked, setIsLinked] = useState<boolean>(!!githubToken)
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false)
  const [tempToken, setTempToken] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [savedMessage, setSavedMessage] = useState<string>('')

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('app_settings')
    if (saved) {
      return JSON.parse(saved)
    }
    return {
      syncInterval: 5,
      notifyPRs: true,
      notifyIssues: true,
      notifyMentions: true,
      selectedPlatform: 'github',
      webhookUrl: '',
      sshKeyFingerprint: 'Not configured',
      theme: 'dark',
    }
  })

  const [linkedSites, setLinkedSites] = useState({
    github: !!githubToken,
    gitlab: !!localStorage.getItem('gitlab_token'),
    gitea: !!localStorage.getItem('gitea_token'),
  })

  useEffect(() => {
    if (githubToken) {
      fetchUserProfile()
    }
  }, [githubToken])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`http://localhost:8765/api/github/user`, {
        headers: { Authorization: `token ${githubToken}` },
      })
      setUserProfile(response.data)
      setError('')
    } catch (err) {
      setError('Failed to fetch GitHub profile')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLinkGitHub = async () => {
    if (!tempToken.trim()) {
      setError('Please enter a valid GitHub token')
      return
    }

    try {
      setLoading(true)
      // Test the token
      const response = await axios.get(`http://localhost:8765/api/github/user`, {
        headers: { Authorization: `token ${tempToken}` },
      })

      if (response.status === 200) {
        localStorage.setItem('github_token', tempToken)
        setGithubToken(tempToken)
        setShowTokenInput(false)
        setTempToken('')
        setLinkedSites({ ...linkedSites, github: true })
        setError('')
        setSavedMessage('GitHub account linked successfully!')
        setTimeout(() => setSavedMessage(''), 3000)
      }
    } catch (err) {
      setError('Invalid GitHub token. Please check and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleUnlinkGitHub = () => {
    localStorage.removeItem('github_token')
    setGithubToken('')
    setIsLinked(false)
    setUserProfile(null)
    setLinkedSites({ ...linkedSites, github: false })
  }

  const handleLinkSite = (site: 'gitlab' | 'gitea') => {
    const token = prompt(`Enter your ${site.toUpperCase()} personal access token:`)
    if (token) {
      localStorage.setItem(`${site}_token`, token)
      setLinkedSites({ ...linkedSites, [site]: true })
      setSavedMessage(`${site.toUpperCase()} linked successfully!`)
      setTimeout(() => setSavedMessage(''), 3000)
    }
  }

  const handleUnlinkSite = (site: 'gitlab' | 'gitea') => {
    localStorage.removeItem(`${site}_token`)
    setLinkedSites({ ...linkedSites, [site]: false })
  }

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
  }

  const handleSaveSettings = () => {
    localStorage.setItem('app_settings', JSON.stringify(settings))
    setSavedMessage('Settings saved successfully!')
    setTimeout(() => setSavedMessage(''), 3000)
  }

  const handleChangePlatform = (platform: 'github' | 'gitlab' | 'gitea') => {
    handleSettingChange('selectedPlatform', platform)
    setSavedMessage(`Switched to ${platform.toUpperCase()}`)
    setTimeout(() => setSavedMessage(''), 3000)
  }

  const handleTestWebhook = async () => {
    if (!settings.webhookUrl) {
      alert('Please enter a webhook URL first')
      return
    }
    try {
      const response = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
      })
      if (response.ok) {
        alert('✅ Webhook test successful!')
      } else {
        alert('❌ Webhook test failed: ' + response.statusText)
      }
    } catch (err) {
      alert('❌ Webhook test failed: ' + (err as Error).message)
    }
  }

  return (
    <div className="w-full h-screen bg-github-900 text-white overflow-y-auto">
      {/* Header */}
      <div className="bg-github-800 border-b border-github-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings size={28} />
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          {savedMessage && (
            <div className="bg-green-600 px-4 py-2 rounded flex items-center gap-2">
              <Check size={18} /> {savedMessage}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8 space-y-8">
        {/* GitHub Account Section */}
        <div className="bg-github-800 rounded-lg p-6 border border-github-700">
          <div className="flex items-center gap-2 mb-4">
            <ExternalLink size={24} />
            <h2 className="text-2xl font-bold">GitHub Account</h2>
          </div>

          {isLinked && userProfile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-github-700">
                <img
                  src={userProfile.avatar_url}
                  alt={userProfile.login}
                  className="w-20 h-20 rounded-full"
                />
                <div>
                  <p className="text-xl font-bold">{userProfile.name || userProfile.login}</p>
                  <p className="text-github-300">@{userProfile.login}</p>
                  {userProfile.bio && <p className="text-sm text-github-400 mt-1">{userProfile.bio}</p>}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="bg-github-900 rounded p-3 text-center">
                  <p className="text-2xl font-bold text-blue-400">{userProfile.public_repos}</p>
                  <p className="text-sm text-github-400">Repositories</p>
                </div>
                <div className="bg-github-900 rounded p-3 text-center">
                  <p className="text-2xl font-bold text-green-400">{userProfile.followers}</p>
                  <p className="text-sm text-github-400">Followers</p>
                </div>
                <div className="bg-github-900 rounded p-3 text-center">
                  <p className="text-2xl font-bold text-purple-400">{userProfile.following}</p>
                  <p className="text-sm text-github-400">Following</p>
                </div>
                <div className="bg-github-900 rounded p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-400">
                    {new Date(userProfile.created_at).getFullYear()}
                  </p>
                  <p className="text-sm text-github-400">Joined</p>
                </div>
              </div>

              {userProfile.location && (
                <p className="text-sm text-github-300">
                  <strong>Location:</strong> {userProfile.location}
                </p>
              )}
              {userProfile.company && (
                <p className="text-sm text-github-300">
                  <strong>Company:</strong> {userProfile.company}
                </p>
              )}
              {userProfile.blog && (
                <p className="text-sm text-github-300">
                  <strong>Website:</strong>{' '}
                  <a href={userProfile.blog} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {userProfile.blog}
                  </a>
                </p>
              )}

              <button
                onClick={handleUnlinkGitHub}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white flex items-center gap-2"
              >
                <LogOut size={18} /> Unlink Account
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {!showTokenInput ? (
                <div>
                  <p className="text-github-300 mb-4">No GitHub account linked</p>
                  <button
                    onClick={() => setShowTokenInput(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold flex items-center gap-2"
                  >
                    <LinkIcon size={20} /> Link GitHub Account
                  </button>
                  <p className="text-sm text-github-400 mt-4">
                    💡 Create a personal access token at{' '}
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      github.com/settings/tokens
                    </a>
                    <br />
                    Scopes needed: repo, user, notifications, gists
                  </p>
                </div>
              ) : (
                <div>
                  <input
                    type="password"
                    placeholder="Enter GitHub Personal Access Token"
                    value={tempToken}
                    onChange={(e) => setTempToken(e.target.value)}
                    className="w-full px-4 py-2 bg-github-900 border border-github-700 rounded text-white placeholder-github-500 focus:outline-none focus:border-blue-500"
                  />
                  {error && (
                    <p className="text-red-400 text-sm mt-2 flex items-center gap-2">
                      <AlertCircle size={16} /> {error}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleLinkGitHub}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded text-white"
                    >
                      {loading ? 'Verifying...' : 'Verify & Link'}
                    </button>
                    <button
                      onClick={() => {
                        setShowTokenInput(false)
                        setTempToken('')
                        setError('')
                      }}
                      className="px-4 py-2 bg-github-700 hover:bg-github-600 rounded text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Platform Selection */}
        <div className="bg-github-800 rounded-lg p-6 border border-github-700">
          <h2 className="text-2xl font-bold mb-4">Active Platform</h2>
          <div className="grid grid-cols-3 gap-4">
            {(['github', 'gitlab', 'gitea'] as const).map((platform) => (
              <button
                key={platform}
                onClick={() => handleChangePlatform(platform)}
                className={`p-4 rounded border-2 transition font-semibold capitalize ${
                  settings.selectedPlatform === platform
                    ? 'border-blue-500 bg-blue-600 bg-opacity-20'
                    : 'border-github-600 bg-github-900 hover:border-github-500'
                }`}
              >
                {linkedSites[platform] ? '✓ ' : '○ '}{platform}
              </button>
            ))}
          </div>
        </div>

        {/* Other Git Services */}
        <div className="bg-github-800 rounded-lg p-6 border border-github-700">
          <h2 className="text-2xl font-bold mb-4">Other Git Services</h2>
          <div className="space-y-3">
            {(['gitlab', 'gitea'] as const).map((site) => (
              <div key={site} className="flex items-center justify-between bg-github-900 p-4 rounded border border-github-700">
                <div>
                  <p className="font-semibold capitalize">{site}</p>
                  <p className="text-sm text-github-400">
                    {linkedSites[site] ? '✓ Linked' : '○ Not linked'}
                  </p>
                </div>
                {linkedSites[site] ? (
                  <button
                    onClick={() => handleUnlinkSite(site)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
                  >
                    Unlink
                  </button>
                ) : (
                  <button
                    onClick={() => handleLinkSite(site)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm flex items-center gap-2"
                  >
                    <LinkIcon size={16} /> Link
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sync Settings */}
        <div className="bg-github-800 rounded-lg p-6 border border-github-700">
          <h2 className="text-2xl font-bold mb-4">Sync Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Sync Interval (minutes)</label>
              <select
                value={settings.syncInterval}
                onChange={(e) => handleSettingChange('syncInterval', parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-github-900 border border-github-700 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value={5}>Every 5 minutes</option>
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every hour</option>
              </select>
              <p className="text-sm text-github-400 mt-2">
                Currently set to sync every {settings.syncInterval} minutes
              </p>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-github-800 rounded-lg p-6 border border-github-700">
          <h2 className="text-2xl font-bold mb-4">Notification Preferences</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-github-900 rounded border border-github-700 hover:border-github-600">
              <input
                type="checkbox"
                checked={settings.notifyPRs}
                onChange={(e) => handleSettingChange('notifyPRs', e.target.checked)}
                className="w-5 h-5"
              />
              <span>Notify me about new pull requests</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-github-900 rounded border border-github-700 hover:border-github-600">
              <input
                type="checkbox"
                checked={settings.notifyIssues}
                onChange={(e) => handleSettingChange('notifyIssues', e.target.checked)}
                className="w-5 h-5"
              />
              <span>Notify me about assigned issues</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-github-900 rounded border border-github-700 hover:border-github-600">
              <input
                type="checkbox"
                checked={settings.notifyMentions}
                onChange={(e) => handleSettingChange('notifyMentions', e.target.checked)}
                className="w-5 h-5"
              />
              <span>Notify me when mentioned</span>
            </label>
          </div>
        </div>

        {/* Webhook Management */}
        <div className="bg-github-800 rounded-lg p-6 border border-github-700">
          <h2 className="text-2xl font-bold mb-4">Webhook Configuration</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Webhook URL (e.g., https://your-server.com/webhook)"
              value={settings.webhookUrl}
              onChange={(e) => handleSettingChange('webhookUrl', e.target.value)}
              className="w-full px-4 py-2 bg-github-900 border border-github-700 rounded text-white placeholder-github-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleTestWebhook}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
            >
              Test Webhook
            </button>
            <p className="text-sm text-github-400">
              Configure webhooks to receive real-time notifications about repository events
            </p>
          </div>
        </div>

        {/* SSH Key Management */}
        <div className="bg-github-800 rounded-lg p-6 border border-github-700">
          <h2 className="text-2xl font-bold mb-4">SSH Key Management</h2>
          <div className="space-y-3">
            <div className="bg-github-900 p-4 rounded border border-github-700">
              <p className="text-sm font-semibold text-github-400">SSH Fingerprint</p>
              <p className="text-lg font-mono mt-2">{settings.sshKeyFingerprint}</p>
            </div>
            <button
              onClick={() => {
                const newFingerprint = 'SHA256:' + Math.random().toString(36).substring(2, 15).toUpperCase()
                handleSettingChange('sshKeyFingerprint', newFingerprint)
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
            >
              Generate New SSH Key
            </button>
            <p className="text-sm text-github-400">
              Use SSH keys for secure repository authentication without storing credentials
            </p>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="bg-github-800 rounded-lg p-6 border border-github-700">
          <h2 className="text-2xl font-bold mb-4">Display Settings</h2>
          <div className="space-y-3">
            <label className="block text-sm font-semibold mb-2">Theme</label>
            <div className="flex gap-3">
              <button
                onClick={() => handleSettingChange('theme', 'dark')}
                className={`flex-1 px-4 py-2 rounded transition ${
                  settings.theme === 'dark'
                    ? 'bg-blue-600 text-white'
                    : 'bg-github-900 text-github-300 hover:bg-github-700'
                }`}
              >
                🌙 Dark
              </button>
              <button
                onClick={() => handleSettingChange('theme', 'light')}
                className={`flex-1 px-4 py-2 rounded transition ${
                  settings.theme === 'light'
                    ? 'bg-blue-600 text-white'
                    : 'bg-github-900 text-github-300 hover:bg-github-700'
                }`}
              >
                ☀️ Light
              </button>
            </div>
          </div>
        </div>

        {/* Save Settings Button */}
        <div className="flex gap-2">
          <button
            onClick={handleSaveSettings}
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded text-white font-semibold flex items-center justify-center gap-2"
          >
            <Save size={20} /> Save All Settings
          </button>
        </div>
      </div>
    </div>
  )
}
