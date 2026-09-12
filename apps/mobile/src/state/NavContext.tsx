import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { ScreenName } from '../navigation/types'

interface NavContextValue {
  screen: ScreenName
  navigate: (screen: ScreenName) => void
  selectedItemId: string | null
  openItem: (id: string) => void
  closeItem: () => void
  selectedProjectId: string | null
  openProject: (id: string) => void
  closeProject: () => void
  captureFocusRequest: number
  requestCaptureFocus: () => void
  moreOpen: boolean
  setMoreOpen: (open: boolean) => void
}

const NavContext = createContext<NavContextValue | null>(null)

export function NavProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<ScreenName>('inbox')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [captureFocusRequest, setCaptureFocusRequest] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)

  const navigate = useCallback((next: ScreenName) => {
    setScreen(next)
    setMoreOpen(false)
  }, [])

  const openItem = useCallback((id: string) => setSelectedItemId(id), [])
  const closeItem = useCallback(() => setSelectedItemId(null), [])
  const openProject = useCallback((id: string) => setSelectedProjectId(id), [])
  const closeProject = useCallback(() => setSelectedProjectId(null), [])
  const requestCaptureFocus = useCallback(() => setCaptureFocusRequest((n) => n + 1), [])

  const value = useMemo(
    () => ({
      screen,
      navigate,
      selectedItemId,
      openItem,
      closeItem,
      selectedProjectId,
      openProject,
      closeProject,
      captureFocusRequest,
      requestCaptureFocus,
      moreOpen,
      setMoreOpen,
    }),
    [
      screen,
      navigate,
      selectedItemId,
      openItem,
      closeItem,
      selectedProjectId,
      openProject,
      closeProject,
      captureFocusRequest,
      requestCaptureFocus,
      moreOpen,
    ],
  )

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavProvider')
  return ctx
}
