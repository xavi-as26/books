'use client'

import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/store/app-store'
import { Search, Library, BookOpen } from 'lucide-react'
import { useState } from 'react'

interface Book {
  id: string
  title: string
  author: string
  coverUrl: string | null
  coverBase64: string | null
  status: string
  currentPage: number
  totalPages: number | null
  rating: number | null
  notes: { id: string; type: string; content: string }[]
}

const statusFilters = [
  { key: 'ALL', label: 'Todos' },
  { key: 'READING', label: 'Leyendo' },
  { key: 'OWNED', label: 'Poseídos' },
  { key: 'FINISHED', label: 'Terminados' },
]

export function LibraryScreen() {
  const { setSelectedBookId, setActiveTab } = useAppStore()
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const { data: books = [] } = useQuery<Book[]>({
    queryKey: ['books'],
    queryFn: () => fetch('/api/books').then(r => r.json()),
  })

  const libraryBooks = books.filter(b => b.status !== 'WISHLIST')

  const filtered = libraryBooks.filter(b => {
    const matchFilter = filter === 'ALL' || b.status === filter
    const matchSearch = search === '' ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div className="tab-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-2 safe-top">
        <h1 className="ios-large-title text-foreground">Mi Biblioteca</h1>
        <p className="text-muted-foreground mt-1 ios-body">
          {libraryBooks.length} libro{libraryBooks.length !== 1 ? 's' : ''} en tu colección
        </p>
      </div>

      {/* Search */}
      <div className="px-5 mt-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por título o autor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-ios-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ios-blue/30 dark:bg-[#1C1C1E]"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-5 mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {statusFilters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
              filter === f.key
                ? 'bg-ios-blue text-white'
                : 'bg-ios-card text-muted-foreground dark:bg-[#2C2C2E]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Books Grid */}
      {filtered.length > 0 ? (
        <div className="px-5 mt-4 grid grid-cols-3 gap-3">
          {filtered.map(book => {
            const progress = book.totalPages
              ? Math.round((book.currentPage / book.totalPages) * 100)
              : 0

            return (
              <button
                key={book.id}
                onClick={() => setSelectedBookId(book.id)}
                className="flex flex-col group"
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden book-cover-shadow bg-ios-gray/10 group-active:scale-95 transition-transform duration-150 relative">
                  {book.coverUrl || book.coverBase64 ? (
                    <img
                      src={book.coverBase64 || book.coverUrl || ''}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ios-blue/20 to-ios-purple/20">
                      <BookOpen size={28} className="text-ios-blue/60" />
                    </div>
                  )}
                  {/* Status badge */}
                  {book.status === 'READING' && (
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-ios-blue text-white text-[9px] font-semibold">
                      Leyendo
                    </span>
                  )}
                  {book.status === 'FINISHED' && (
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-ios-green text-white text-[9px] font-semibold">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground mt-1.5 truncate font-medium text-left">{book.title}</p>
                <p className="text-[10px] text-muted-foreground truncate text-left">{book.author}</p>
                {book.status === 'READING' && progress > 0 && (
                  <div className="mt-1 ios-progress !h-[3px]">
                    <div className="ios-progress-bar !h-full" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center mt-16 px-5 text-center">
          <div className="w-16 h-16 rounded-full bg-ios-blue/10 flex items-center justify-center mb-3">
            <Library size={28} className="text-ios-blue" />
          </div>
          <p className="font-semibold text-foreground">
            {search || filter !== 'ALL' ? 'Sin resultados' : 'Tu biblioteca está vacía'}
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">
            {search || filter !== 'ALL'
              ? 'Intenta con otros términos de búsqueda'
              : 'Añade tu primer libro con el botón "+" en la barra inferior'
            }
          </p>
          {!search && filter === 'ALL' && (
            <button
              onClick={() => setActiveTab('add')}
              className="mt-4 px-5 py-2 rounded-full bg-ios-blue text-white text-sm font-medium"
            >
              Añadir libro
            </button>
          )}
        </div>
      )}

      {/* Bottom spacing */}
      <div className="h-24" />
    </div>
  )
}
