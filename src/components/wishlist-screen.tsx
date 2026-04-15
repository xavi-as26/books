'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/store/app-store'
import { Heart, ExternalLink, ShoppingCart, ArrowRight, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

interface Book {
  id: string
  title: string
  author: string
  coverUrl: string | null
  coverBase64: string | null
  status: string
  purchaseLink: string | null
  price: number | null
  notes: { id: string; type: string; content: string }[]
}

export function WishlistScreen() {
  const { setSelectedBookId } = useAppStore()
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data: books = [] } = useQuery<Book[]>({
    queryKey: ['books', 'wishlist'],
    queryFn: async () => {
      const res = await fetch('/api/books?status=WISHLIST')
      return res.json()
    },
  })

  const moveToLibrary = useMutation({
    mutationFn: async (bookId: string) => {
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'OWNED' }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      toast.success('Libro movido a tu biblioteca')
    },
  })

  const filtered = books.filter(b =>
    search === '' ||
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.author.toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = books.reduce((sum, b) => sum + (b.price || 0), 0)

  return (
    <div className="tab-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-2 safe-top">
        <h1 className="ios-large-title text-foreground">Lista de Deseos</h1>
        <p className="text-muted-foreground mt-1 ios-body">
          {books.length} libro{books.length !== 1 ? 's' : ''} por comprar
          {totalValue > 0 && (
            <span className="text-ios-purple font-medium"> · ${totalValue.toFixed(2)}</span>
          )}
        </p>
      </div>

      {/* Search */}
      <div className="px-5 mt-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar en deseos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-ios-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ios-purple/30 dark:bg-[#1C1C1E]"
          />
        </div>
      </div>

      {/* Wishlist Items */}
      {filtered.length > 0 ? (
        <div className="px-5 mt-4 space-y-3">
          {filtered.map(book => (
            <div
              key={book.id}
              className="ios-card p-3.5 flex gap-3.5 group"
            >
              {/* Cover */}
              <button
                onClick={() => setSelectedBookId(book.id)}
                className="w-[56px] h-[80px] rounded-lg overflow-hidden flex-shrink-0 book-cover-shadow"
              >
                {book.coverUrl || book.coverBase64 ? (
                  <img
                    src={book.coverBase64 || book.coverUrl || ''}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ios-purple/20 to-ios-blue/20">
                    <Heart size={20} className="text-ios-purple/60" />
                  </div>
                )}
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <button onClick={() => setSelectedBookId(book.id)} className="text-left">
                  <h3 className="font-semibold text-foreground text-sm truncate">{book.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>
                </button>

                {/* Price */}
                {book.price && (
                  <p className="text-sm font-semibold text-ios-purple mt-1">
                    ${book.price.toFixed(2)}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-2">
                  {book.purchaseLink && (
                    <a
                      href={book.purchaseLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-ios-blue/10 text-ios-blue text-xs font-medium"
                    >
                      <ExternalLink size={11} />
                      Comprar
                    </a>
                  )}
                  <button
                    onClick={() => moveToLibrary.mutate(book.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-ios-green/10 text-ios-green text-xs font-medium"
                  >
                    <ShoppingCart size={11} />
                    Lo tengo
                  </button>
                </div>
              </div>

              <button
                onClick={() => setSelectedBookId(book.id)}
                className="self-center text-muted-foreground/40"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center mt-16 px-5 text-center">
          <div className="w-16 h-16 rounded-full bg-ios-purple/10 flex items-center justify-center mb-3">
            <Heart size={28} className="text-ios-purple" />
          </div>
          <p className="font-semibold text-foreground">
            {search ? 'Sin resultados' : 'Tu lista de deseos está vacía'}
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">
            {search
              ? 'Intenta con otros términos'
              : 'Añade libros que quieras comprar con el botón "+"'
            }
          </p>
        </div>
      )}

      <div className="h-24" />
    </div>
  )
}
