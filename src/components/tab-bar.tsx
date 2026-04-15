'use client'

import { useAppStore, TabId } from '@/store/app-store'
import { Home, BookOpen, Plus, Heart, Settings } from 'lucide-react'

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Inicio', icon: <Home size={24} /> },
  { id: 'library', label: 'Biblioteca', icon: <BookOpen size={24} /> },
  { id: 'add', label: 'Añadir', icon: <Plus size={24} /> },
  { id: 'wishlist', label: 'Deseos', icon: <Heart size={24} /> },
  { id: 'settings', label: 'Ajustes', icon: <Settings size={24} /> },
]

export function TabBar() {
  const { activeTab, setActiveTab, setShowAddBook, setAddBookDefaultStatus } = useAppStore()

  const handleTabPress = (tabId: TabId) => {
    if (tabId === 'add') {
      setAddBookDefaultStatus(activeTab === 'wishlist' ? 'WISHLIST' : 'OWNED')
      setShowAddBook(true)
      return
    }
    setActiveTab(tabId)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 ios-blur-light safe-bottom border-t border-[#C6C6C8]/30 dark:border-[#38383A]/50">
      <div className="flex items-center justify-around px-2 pt-1.5 pb-1 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const isAddButton = tab.id === 'add'

          return (
            <button
              key={tab.id}
              onClick={() => handleTabPress(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 transition-colors duration-150 ${
                isAddButton
                  ? 'text-ios-blue'
                  : isActive
                    ? 'text-ios-blue'
                    : 'text-ios-gray'
              }`}
            >
              {isAddButton ? (
                <div className="w-10 h-10 rounded-full bg-ios-blue flex items-center justify-center text-white shadow-md">
                  <Plus size={22} strokeWidth={2.5} />
                </div>
              ) : (
                <span className={`${isActive ? 'text-ios-blue' : 'text-ios-gray'} transition-colors duration-150`}>
                  {tab.icon}
                </span>
              )}
              {!isAddButton && (
                <span className={`ios-tab-item ${isActive ? 'text-ios-blue' : 'text-ios-gray'}`}>
                  {tab.label}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
