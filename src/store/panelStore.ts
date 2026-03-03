import { create } from 'zustand'

export interface PRPanelParams {
  owner: string
  repo: string
  number: number
  repoFullName: string
}

export interface IssuePanelParams {
  owner: string
  repo: string
  number: number
  repoFullName: string
}

export interface FileBrowserParams {
  owner: string
  repo: string
}

interface PanelStore {
  prPanel: PRPanelParams | null
  issuePanel: IssuePanelParams | null
  fileBrowser: FileBrowserParams | null
  commandPalette: boolean
  openPRPanel: (params: PRPanelParams) => void
  closePRPanel: () => void
  openIssuePanel: (params: IssuePanelParams) => void
  closeIssuePanel: () => void
  openFileBrowser: (params: FileBrowserParams) => void
  closeFileBrowser: () => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
}

export const usePanelStore = create<PanelStore>((set) => ({
  prPanel: null,
  issuePanel: null,
  fileBrowser: null,
  commandPalette: false,
  openPRPanel: (params) => set({ prPanel: params }),
  closePRPanel: () => set({ prPanel: null }),
  openIssuePanel: (params) => set({ issuePanel: params }),
  closeIssuePanel: () => set({ issuePanel: null }),
  openFileBrowser: (params) => set({ fileBrowser: params }),
  closeFileBrowser: () => set({ fileBrowser: null }),
  openCommandPalette: () => set({ commandPalette: true }),
  closeCommandPalette: () => set({ commandPalette: false }),
}))

/** Parse a GitHub HTML URL into panel params */
export function parseGitHubUrl(
  url: string
): { owner: string; repo: string; number: number; repoFullName: string } | null {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)\/(pull|issues)\/(\d+)/)
  if (!m) return null
  return { owner: m[1], repo: m[2], number: parseInt(m[4]), repoFullName: `${m[1]}/${m[2]}` }
}
