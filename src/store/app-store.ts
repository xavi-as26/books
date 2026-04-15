import { create } from 'zustand'

export type TabId = 'home' | 'library' | 'add' | 'wishlist' | 'settings'

interface AppState {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  selectedBookId: string | null
  setSelectedBookId: (id: string | null) => void
  showAddBook: boolean
  setShowAddBook: (show: boolean) => void
  addBookDefaultStatus: 'WISHLIST' | 'OWNED'
  setAddBookDefaultStatus: (status: 'WISHLIST' | 'OWNED') => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  sharedUrl: string
  setSharedUrl: (url: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectedBookId: null,
  setSelectedBookId: (id) => set({ selectedBookId: id }),
  showAddBook: false,
  setShowAddBook: (show) => set({ showAddBook: show }),
  addBookDefaultStatus: 'OWNED',
  setAddBookDefaultStatus: (status) => set({ addBookDefaultStatus: status }),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  sharedUrl: '',
  setSharedUrl: (url) => set({ sharedUrl: url }),
}))
