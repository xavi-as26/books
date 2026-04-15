'use client'

import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/store/app-store'
import { BookOpen, ChevronRight, Bookmark, Library } from 'lucide-react'

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
  notes: Note[]
  startDate: string | null
  finishDate: string | null
}

interface Note {
  id: string
  type: string
  content: string
}

export function HomeScreen() {
  const { setSelectedBookId, setActiveTab } = useAppStore()

  const { data: books = [] } = useQuery<Book[]>({
    queryKey: ['books'],
    queryFn: () => fetch('/api/books').then(r => r.json()),
  })

  const readingBook = books.find(b => b.status === 'READING')
  const ownedBooks = books.filter(b => b.status === 'OWNED' || b.status === 'READING' || b.status === 'FINISHED')
  const wishlistBooks = books.filter(b => b.status === 'WISHLIST')
  const finishedBooks = books.filter(b => b.status === 'FINISHED')

  const progress = readingBook && readingBook.totalPages
    ? Math.round((readingBook.currentPage / readingBook.totalPages) * 100)
    : 0

  return (
    <div className="tab-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-2 safe-top">
        <h1 className="ios-large-title text-foreground">Biblio</h1>
        <p className="text-muted-foreground mt-1 ios-body">Tu biblioteca personal</p>
      </div>

      {/* Currently Reading */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Lectura Actual</h2>
          {readingBook && (
            <button
              onClick={() => setSelectedBookId(readingBook.id)}
              className="text-ios-blue text-sm font-medium"
            >
              Ver detalle
            </button>
          )}
        </div>

        {readingBook ? (
          <div
            className="ios-card p-4 flex gap-4 cursor-pointer active:scale-[0.98] transition-transform duration-150"
            onClick={() => setSelectedBookId(readingBook.id)}
          >
            {/* Book Cover */}
            <div className="w-[72px] h-[104px] rounded-lg overflow-hidden flex-shrink-0 book-cover-shadow bg-ios-gray/10">
              {readingBook.coverUrl || readingBook.coverBase64 ? (
                <img
                  src={readingBook.coverBase64 || readingBook.coverUrl || ''}
                  alt={readingBook.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ios-blue/20 to-ios-purple/20">
                  <BookOpen size={28} className="text-ios-blue/60" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{readingBook.title}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{readingBook.author}</p>

              {/* Progress */}
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-muted-foreground">
                    Página {readingBook.currentPage} de {readingBook.totalPages || '?'}
                  </span>
                  <span className="text-xs font-medium text-ios-blue">{progress}%</span>
                </div>
                <div className="ios-progress">
                  <div className="ios-progress-bar" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* Quick notes count */}
              {readingBook.notes.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {readingBook.notes.length} nota{readingBook.notes.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <ChevronRight size={18} className="text-muted-foreground/50 self-center flex-shrink-0" />
          </div>
        ) : (
          <div className="ios-card p-8 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-ios-blue/10 flex items-center justify-center mb-3">
              <Bookmark size={24} className="text-ios-blue" />
            </div>
            <p className="text-foreground font-medium">Sin lectura activa</p>
            <p className="text-sm text-muted-foreground mt-1">
              Marca un libro como &quot;Leyendo&quot; para verlo aquí
            </p>
            <button
              onClick={() => setActiveTab('library')}
              className="mt-3 text-ios-blue text-sm font-medium"
            >
              Ir a Biblioteca
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="px-5 mt-6 grid grid-cols-3 gap-3">
        <div className="ios-card p-3.5 flex flex-col items-center">
          <span className="text-2xl font-bold text-ios-blue">{ownedBooks.length}</span>
          <span className="text-xs text-muted-foreground mt-0.5">En biblioteca</span>
        </div>
        <div className="ios-card p-3.5 flex flex-col items-center">
          <span className="text-2xl font-bold text-ios-purple">{wishlistBooks.length}</span>
          <span className="text-xs text-muted-foreground mt-0.5">En deseos</span>
        </div>
        <div className="ios-card p-3.5 flex flex-col items-center">
          <span className="text-2xl font-bold text-ios-green">{finishedBooks.length}</span>
          <span className="text-xs text-muted-foreground mt-0.5">Terminados</span>
        </div>
      </div>

      {/* Recent Books */}
      {ownedBooks.length > 0 && (
        <div className="px-5 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Recientes</h2>
            <button
              onClick={() => setActiveTab('library')}
              className="text-ios-blue text-sm font-medium"
            >
              Ver todos
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
            {ownedBooks.slice(0, 8).map((book) => (
              <button
                key={book.id}
                onClick={() => setSelectedBookId(book.id)}
                className="flex-shrink-0 w-[90px] group"
              >
                <div className="w-[90px] h-[130px] rounded-xl overflow-hidden book-cover-shadow bg-ios-gray/10 group-active:scale-95 transition-transform duration-150">
                  {book.coverUrl || book.coverBase64 ? (
                    <img
                      src={book.coverBase64 || book.coverUrl || ''}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ios-blue/20 to-ios-purple/20">
                      <Library size={24} className="text-ios-blue/60" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-foreground mt-1.5 truncate font-medium">{book.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{book.author}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {books.length === 0 && (
        <div className="px-5 mt-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-ios-blue/10 flex items-center justify-center mb-4">
            <Library size={36} className="text-ios-blue" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Tu biblioteca está vacía</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-[260px]">
            Comienza añadiendo tu primer libro con el botón &quot;+&quot; en la barra inferior
          </p>
        </div>
      )}

      {/* Bottom spacing for tab bar */}
      <div className="h-24" />
    </div>
  )
}
