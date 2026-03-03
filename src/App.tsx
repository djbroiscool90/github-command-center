import { useEffect } from 'react'
import axios from 'axios'
import './App.css'
import { MainLayout } from './components/MainLayout'
import { ToastContainer } from './components/Toast'
import { useRepositoryStore } from './store/repositoryStore'

const API = 'http://localhost:8765'

function App() {
  const setUserProfile = useRepositoryStore((s) => s.setUserProfile)

  useEffect(() => {
    const init = async () => {
      // Auto-configure from backend .env on first run (no token stored yet)
      if (!localStorage.getItem('github_token')) {
        try {
          const { data } = await axios.get(`${API}/api/config`)
          if (data.auto_configured && data.github_token) {
            localStorage.setItem('github_token', data.github_token)
            // Reload once so all components pick up the token from localStorage
            window.location.reload()
            return
          }
        } catch {
          // Backend not up yet — silent fail
        }
      }

      // Load user profile into global Zustand state
      const token = localStorage.getItem('github_token')
      if (token) {
        try {
          const { data } = await axios.get(`${API}/api/github/user`, {
            headers: { Authorization: `token ${token}` },
          })
          setUserProfile(data)
        } catch {
          // Token invalid or backend down
        }
      }
    }

    init()
  }, [setUserProfile])

  return (
    <div className="w-full h-screen bg-github-900 text-white flex flex-col">
      <MainLayout />
      <ToastContainer />
    </div>
  )
}

export default App
