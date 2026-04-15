'use client'

import { useAppStore } from '@/store/app-store'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TabBar } from '@/components/tab-bar'
import { HomeScreen } from '@/components/home-screen'
import { LibraryScreen } from '@/components/library-screen'
import { WishlistScreen } from '@/components/wishlist-screen'
import { SettingsScreen } from '@/components/settings-screen'
import { AddBookModal } from '@/components/add-book-modal'
import { BookDetailScreen } from '@/components/book-detail-screen'
import { useState } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
    },
  },
})

export default function Home() {
  const { activeTab, selectedBookId, showAddBook, addBookDefaultStatus } = useAppStore()

  return (
    <QueryClientProvider client={queryClient}>
      <div className="max-w-lg mx-auto min-h-screen bg-background relative">
        {/* Main Content */}
        <main className="relative">
          {activeTab === 'home' && <HomeScreen />}
          {activeTab === 'library' && <LibraryScreen />}
          {activeTab === 'wishlist' && <WishlistScreen />}
          {activeTab === 'settings' && <SettingsScreen />}
        </main>

        {/* Tab Bar */}
        <TabBar />

        {/* Book Detail Overlay */}
        {selectedBookId && <BookDetailScreen />}

        {/* Add Book Modal */}
        {showAddBook && <AddBookModal defaultStatus={addBookDefaultStatus} />}
      </div>
    </QueryClientProvider>
  )
}
