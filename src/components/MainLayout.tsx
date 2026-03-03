import React, { useState, useEffect, useCallback } from 'react'
import {
  Settings, GitBranch, GitPullRequest, AlertCircle,
  Zap, TrendingUp, Menu, X, FileText, Activity, Eye,
  Lock, Bell, GitMerge, Archive, Edit3, ChevronRight, Search,
} from 'react-feather'
import axios from 'axios'

const API = 'http://localhost:8765'
import { RepositoryView } from './RepositoryView'
import { BranchPanel } from './BranchPanel'
import { StashPanel } from './StashPanel'
import { CommitHistory } from './CommitHistory'
import { InlineEditor } from './InlineEditor'
import { SettingsPage } from './SettingsPage'
import { UserProfilePopup } from './UserProfilePopup'
import { PullRequestsViewer } from './PullRequestsViewer'
import { IssuesTracker } from './IssuesTracker'
import { QuickActions } from './QuickActions'
import { RepositoryAnalytics } from './RepositoryAnalytics'
import { Dashboard } from './Dashboard'
import { WorkflowAutomation } from './WorkflowAutomation'
import { CodeReviewAnalytics } from './CodeReviewAnalytics'
import { NotificationCenter } from './NotificationCenter'
import { BranchProtectionManager } from './BranchProtectionManager'
import { ActivityFeed } from './ActivityFeed'
import { CommandPalette } from './CommandPalette'
import { PRDetailPanel } from './PRDetailPanel'
import { IssueDetailPanel } from './IssueDetailPanel'
import { FileBrowserPanel } from './FileBrowserPanel'
import { KeyboardHelpModal } from './KeyboardHelpModal'
import { useRepositoryStore } from '../store/repositoryStore'
import { usePanelStore } from '../store/panelStore'

type TabType =
  | 'dashboard' | 'activity' | 'pulls' | 'issues' | 'notifications'
  | 'reviews' | 'workflows' | 'protection' | 'analytics' | 'quick' | 'settings'
  | 'changes' | 'branches' | 'stashes' | 'history' | 'editor'

interface NavItem {
  id: TabType
  label: string
  icon: React.ReactNode
  category: 'github' | 'git'
  shortcut?: string
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',     label: 'Dashboard',     icon: <Activity size={16} />,       category: 'github', shortcut: '1' },
  { id: 'activity',      label: 'Activity Feed',  icon: <Zap size={16} />,            category: 'github', shortcut: '2' },
  { id: 'pulls',         label: 'Pull Requests',  icon: <GitPullRequest size={16} />, category: 'github', shortcut: '3' },
  { id: 'issues',        label: 'Issues',         icon: <AlertCircle size={16} />,    category: 'github', shortcut: '4' },
  { id: 'notifications', label: 'Notifications',  icon: <Bell size={16} />,           category: 'github', shortcut: '5' },
  { id: 'reviews',       label: 'Code Reviews',   icon: <Eye size={16} />,            category: 'github', shortcut: '6' },
  { id: 'workflows',     label: 'Workflows',      icon: <GitMerge size={16} />,       category: 'github', shortcut: '7' },
  { id: 'protection',    label: 'Protection',     icon: <Lock size={16} />,           category: 'github', shortcut: '8' },
  { id: 'analytics',     label: 'Analytics',      icon: <TrendingUp size={16} />,     category: 'github', shortcut: '9' },
  { id: 'quick',         label: 'Quick Actions',  icon: <Zap size={16} />,            category: 'github', shortcut: '0' },
  { id: 'settings',      label: 'Settings',       icon: <Settings size={16} />,       category: 'github' },
  { id: 'changes',  label: 'Changes',  icon: <FileText size={16} />,  category: 'git' },
  { id: 'branches', label: 'Branches', icon: <GitBranch size={16} />, category: 'git' },
  { id: 'stashes',  label: 'Stashes',  icon: <Archive size={16} />,   category: 'git' },
  { id: 'history',  label: 'History',  icon: <GitMerge size={16} />,  category: 'git' },
  { id: 'editor',   label: 'Editor',   icon: <Edit3 size={16} />,     category: 'git' },
]

const GITHUB_TABS = NAV_ITEMS.filter((n) => n.category === 'github')
const GIT_TABS    = NAV_ITEMS.filter((n) => n.category === 'git')

export const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [showProfilePopup, setShowProfilePopup] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [repoPath, setRepoPath] = useState<string>('')
  const [unreadCount, setUnreadCount] = useState(0)
  const githubToken = localStorage.getItem('github_token')
  const userProfile = useRepositoryStore((s) => s.userProfile)
  const openCommandPalette = usePanelStore((s) => s.openCommandPalette)

  // Fetch unread notification count for sidebar badge
  const fetchUnreadCount = useCallback(async () => {
    if (!githubToken) return
    try {
      const res = await axios.get(`${API}/api/github/notifications`, {
        headers: { Authorization: `token ${githubToken}` },
      })
      const unread = (res.data || []).filter((n: { unread: boolean }) => n.unread).length
      setUnreadCount(unread)
    } catch { /* silent */ }
  }, [githubToken])

  useEffect(() => { fetchUnreadCount() }, [fetchUnreadCount])
  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 120_000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Keyboard shortcuts: Ctrl+1…0, Ctrl+K, ? for help
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ? key — only when not in an input/textarea
      const tag = (e.target as HTMLElement).tagName
      if (e.key === '?' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        setShowHelp((v) => !v)
        return
      }
      if (!e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'k') {
        e.preventDefault()
        openCommandPalette()
        return
      }
      const item = NAV_ITEMS.find((n) => n.shortcut === e.key)
      if (item) {
        e.preventDefault()
        setActiveTab(item.id)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openCommandPalette])

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':     return <Dashboard />
      case 'activity':      return <ActivityFeed />
      case 'pulls':         return <PullRequestsViewer />
      case 'issues':        return <IssuesTracker />
      case 'notifications': return <NotificationCenter />
      case 'reviews':       return <CodeReviewAnalytics />
      case 'workflows':     return <WorkflowAutomation />
      case 'protection':    return <BranchProtectionManager />
      case 'analytics':     return <RepositoryAnalytics />
      case 'quick':         return <QuickActions />
      case 'settings':      return <SettingsPage />
    }

    if (!repoPath.trim()) {
      return (
        <div className="w-full h-screen bg-github-900 text-white flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-github-800 border border-github-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <GitBranch size={32} className="text-github-500" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-white">No Repository Selected</h2>
            <p className="text-github-500 mb-6 text-sm">Enter a local repository path in the sidebar to use git features</p>
            <input
              type="text"
              placeholder="/path/to/your/repo"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              className="w-full px-4 py-2.5 bg-github-800 border border-github-600 rounded-lg text-white placeholder-github-500 focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
          </div>
        </div>
      )
    }

    switch (activeTab) {
      case 'changes':  return <RepositoryView repoPath={repoPath} />
      case 'branches': return <BranchPanel repoPath={repoPath} />
      case 'stashes':  return <StashPanel repoPath={repoPath} />
      case 'history':  return <CommitHistory repoPath={repoPath} />
      case 'editor':   return <InlineEditor repoPath={repoPath} />
    }
  }

  const NavButton = ({ item }: { item: NavItem }) => {
    const isActive = activeTab === item.id
    // Use live unread count for notifications, else static badge
    const badge = item.id === 'notifications' ? unreadCount : (item.badge ?? 0)
    return (
      <button
        type="button"
        onClick={() => setActiveTab(item.id)}
        title={!sidebarOpen ? `${item.label}${item.shortcut ? ` (Ctrl+${item.shortcut})` : ''}` : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-sm relative group ${
          isActive
            ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
            : 'text-github-400 hover:bg-github-700/60 hover:text-github-100 border border-transparent'
        }`}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-400 rounded-full" />
        )}
        <span className={`shrink-0 transition-colors ${isActive ? 'text-blue-400' : ''}`}>
          {item.icon}
        </span>
        {sidebarOpen && (
          <span className="flex-1 text-left truncate font-medium text-[13px]">{item.label}</span>
        )}
        {badge > 0 && (
          <span className={`shrink-0 text-[10px] font-bold rounded-full min-w-[18px] text-center ${
            sidebarOpen ? 'px-1.5 py-0.5' : 'absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center'
          } bg-blue-500 text-white`}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {sidebarOpen && item.shortcut && !isActive && badge === 0 && (
          <kbd className="text-[10px] text-github-600 bg-github-900/60 px-1.5 py-0.5 rounded font-mono shrink-0 hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity">
            ^{item.shortcut}
          </kbd>
        )}
      </button>
    )
  }

  const displayName = userProfile?.name?.split(' ')[0] || userProfile?.login || 'paulmmoore3416'
  const avatarUrl = userProfile?.avatar_url

  return (
    <div className="flex h-screen bg-github-900 text-white overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`bg-github-800 border-r border-github-700/80 flex flex-col transition-all duration-200 shrink-0 ${
          sidebarOpen ? 'w-60' : 'w-14'
        }`}
      >
        {/* Logo + toggle */}
        <div className="flex items-center justify-between px-3 py-3.5 border-b border-github-700/80">
          {sidebarOpen && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/40">
                <GitBranch size={14} className="text-white" />
              </div>
              <div className="leading-tight">
                <span className="font-bold text-sm text-white tracking-wide">GCC</span>
                <span className="text-[10px] text-github-500 ml-1.5">v2.0</span>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className={`p-1.5 hover:bg-github-700 rounded-lg transition-colors text-github-400 hover:text-github-200 ${!sidebarOpen ? 'mx-auto' : ''}`}
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin">
          <div>
            {sidebarOpen && (
              <p className="text-[10px] font-bold text-github-600 uppercase tracking-widest px-2 mb-2">
                GitHub
              </p>
            )}
            <div className="space-y-0.5">
              {GITHUB_TABS.map((item) => <NavButton key={item.id} item={item} />)}
            </div>
          </div>

          <div>
            {sidebarOpen && (
              <p className="text-[10px] font-bold text-github-600 uppercase tracking-widest px-2 mb-2">
                Local Git
              </p>
            )}
            <div className="space-y-0.5">
              {GIT_TABS.map((item) => <NavButton key={item.id} item={item} />)}
            </div>
          </div>

          {/* Ctrl+K command palette pill */}
          <div className="pt-2">
            <button
              type="button"
              onClick={openCommandPalette}
              title="Open command palette (Ctrl+K)"
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-github-700/60 hover:border-github-600 bg-github-900/40 hover:bg-github-900/80 transition-all text-github-500 hover:text-github-300 group ${
                !sidebarOpen ? 'justify-center' : ''
              }`}
            >
              <Search size={13} className="shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left text-[12px]">Search everything…</span>
                  <kbd className="text-[10px] bg-github-800 border border-github-700 px-1.5 py-0.5 rounded font-mono shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    ^K
                  </kbd>
                </>
              )}
            </button>
          </div>
        </nav>

        {/* Repo path input */}
        {sidebarOpen && (
          <div className="border-t border-github-700/80 px-3 py-2">
            <label className="text-[10px] font-bold text-github-600 uppercase tracking-widest block mb-1.5 px-1">
              Repo Path
            </label>
            <div className="relative">
              <GitBranch size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-github-600" />
              <input
                type="text"
                placeholder="/path/to/repo"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                title="Local git repository path"
                className="w-full pl-7 pr-3 py-1.5 bg-github-900 border border-github-700 rounded-lg text-xs text-white placeholder-github-600 focus:outline-none focus:border-blue-500/60 transition-colors"
              />
            </div>
          </div>
        )}

        {/* User profile section */}
        <div className="border-t border-github-700/80 p-2">
          <button
            type="button"
            onClick={() => setShowProfilePopup(!showProfilePopup)}
            title="View profile"
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-github-700/60 transition-colors group ${
              !sidebarOpen ? 'justify-center' : ''
            }`}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-7 h-7 rounded-full shrink-0 ring-2 ring-github-600 group-hover:ring-blue-500/50 transition-all"
              />
            ) : (
              <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white">
                {displayName[0]?.toUpperCase() ?? 'P'}
              </div>
            )}
            {sidebarOpen && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-semibold text-github-200 truncate leading-tight">
                  {userProfile?.name || displayName}
                </p>
                <p className="text-[10px] text-github-500 truncate">@{userProfile?.login || 'paulmmoore3416'}</p>
              </div>
            )}
            {sidebarOpen && (
              <ChevronRight size={13} className="text-github-600 shrink-0 group-hover:text-github-400 transition-colors" />
            )}
          </button>
        </div>

        {/* Connection status bar */}
        {sidebarOpen && (
          <div className="border-t border-github-700/80 px-3 py-2 flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${githubToken ? 'bg-green-400 shadow-sm shadow-green-400' : 'bg-github-600'}`} />
            <span className="text-[10px] text-github-500 truncate flex-1">
              {githubToken ? 'GitHub connected' : 'No token — Settings'}
            </span>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>

      {/* Profile popup */}
      {showProfilePopup && (
        <UserProfilePopup
          isOpen={showProfilePopup}
          onClose={() => setShowProfilePopup(false)}
          onSettingsClick={() => {
            setActiveTab('settings')
            setShowProfilePopup(false)
          }}
        />
      )}

      {/* Global overlay panels */}
      <CommandPalette onNavigate={(tab) => setActiveTab(tab as TabType)} />
      <PRDetailPanel />
      <IssueDetailPanel />
      <FileBrowserPanel />
      {showHelp && <KeyboardHelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}
