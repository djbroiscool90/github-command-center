import { create } from 'zustand'

interface Repository {
  path: string
  name: string
  url?: string
}

export interface UserProfile {
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

interface RepositoryStore {
  currentRepo: Repository | null
  repositories: Repository[]
  userProfile: UserProfile | null
  setCurrentRepo: (repo: Repository | null) => void
  addRepository: (repo: Repository) => void
  removeRepository: (path: string) => void
  setUserProfile: (profile: UserProfile | null) => void
}

export const useRepositoryStore = create<RepositoryStore>((set) => ({
  currentRepo: null,
  repositories: [],
  userProfile: null,
  setCurrentRepo: (repo) => set({ currentRepo: repo }),
  addRepository: (repo) =>
    set((state) => ({
      repositories: [...state.repositories, repo],
    })),
  removeRepository: (path) =>
    set((state) => ({
      repositories: state.repositories.filter((r) => r.path !== path),
    })),
  setUserProfile: (profile) => set({ userProfile: profile }),
}))
