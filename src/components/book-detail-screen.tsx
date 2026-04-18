'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/store/app-store'
import {
  ChevronLeft, BookOpen, Heart, ShoppingCart, CheckCircle2,
  Trash2, Edit3, MessageSquare, Star, ExternalLink
} from 'lucide-react'
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
  currentPage: number
  totalPages: number | null
  rating: number | null
  startDate: string | null
  finishDate: string | null
  notes: Note[]
}

interface Note {
  id: string
  type: string
  content: string
  page: number | null
  createdAt: string
}

const statusOptions = [
  { key: 'WISHLIST', label: 'Deseo', color: 'bg-ios-purple', icon: Heart },
  { key: 'OWNED', label: 'Poseído', color: 'bg-ios-green', icon: ShoppingCart },
  { key: 'READING', label: 'Leyendo', color: 'bg-ios-blue', icon: BookOpen },
  { key: 'FINISHED', label: 'Terminado', color: 'bg-ios-orange', icon: CheckCircle2 },
]

export function BookDetailScreen() {
  const { selectedBookId, setSelectedBookId } = useAppStore()
  const queryClient = useQueryClient()
  const [showNotes, setShowNotes] = useState(false)
  const [editingProgress, setEditingProgress] = useState(false)
  const [newPage, setNewPage] = useState('')

  const { data: book } = useQuery<Book>({
    queryKey: ['book', selectedBookId],
    queryFn: () => fetch(`/api/books/${selectedBookId}`).then(r => r.json()),
    enabled: !!selectedBookId,
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status }
      if (status === 'READING' && !book?.startDate) updates.startDate = new Date().toISOString()
      if (status === 'FINISHED') updates.finishDate = new Date().toISOString()
      const res = await fetch(`/api/books/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['book', selectedBookId] })
      toast.success('Estado actualizado')
    },
  })

  const updateProgress = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/books/${selectedBookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPage: parseInt(newPage) }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['book', selectedBookId] })
      setEditingProgress(false)
      toast.success('Progreso actualizado')
    },
  })

  const deleteBook = useMutation({
    mutationFn: async () => {
      await fetch(`/api/books/${selectedBookId}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      setSelectedBookId(null)
      toast.success('Libro eliminado')
    },
  })

  if (!book) return null

  const progress = book.totalPages ? Math.round((book.currentPage / book.totalPages) * 100) : 0

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-3 safe-top border-b border-border/50">
        <button
          onClick={() => {
            setSelectedBookId(null)
            setShowNotes(false)
          }}
          className="flex items-center gap-0.5 text-ios-blue text-base font-medium"
        >
          <ChevronLeft size={22} />
          Volver
        </button>
        <h2 className="text-base font-semibold text-foreground truncate max-w-[180px]">
          {showNotes ? 'Notas' : book.title}
        </h2>
        <button
          onClick={() => {
            if (confirm('¿Eliminar este libro?')) deleteBook.mutate()
          }}
          className="text-ios-red"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {showNotes ? (
        <NotesView bookId={book.id} notes={book.notes} onBack={() => setShowNotes(false)} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Hero Section */}
          <div className="flex flex-col items-center pt-6 pb-4 px-5">
            <div className="w-[140px] h-[200px] rounded-2xl overflow-hidden book-cover-shadow bg-ios-gray/10">
              {book.coverUrl || book.coverBase64 ? (
                <img
                  src={book.coverBase64 || book.coverUrl || ''}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ios-blue/20 to-ios-purple/20">
                  <BookOpen size={48} className="text-ios-blue/60" />
                </div>
              )}
            </div>
            <h1 className="text-xl font-bold text-foreground mt-4 text-center">{book.title}</h1>
            <p className="text-base text-muted-foreground mt-1">{book.author}</p>

            {/* Rating */}
            {book.rating && (
              <div className="flex gap-0.5 mt-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star
                    key={s}
                    size={16}
                    className={s <= book.rating! ? 'star-filled fill-current' : 'star-empty'}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Status Selector */}
          <div className="px-5 mt-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Estado</p>
            <div className="flex gap-2">
              {statusOptions.map(opt => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.key}
                    onClick={() => updateStatus.mutate({ id: book.id, status: opt.key })}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                      book.status === opt.key
                        ? `${opt.color} text-white shadow-sm`
                        : 'bg-ios-card text-muted-foreground dark:bg-[#2C2C2E]'
                    }`}
                  >
                    <Icon size={16} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Progress Section */}
          {(book.status === 'READING' || book.status === 'OWNED') && book.totalPages && (
            <div className="px-5 mt-5">
              <div className="ios-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-foreground">Progreso de lectura</p>
                  <span className="text-sm font-semibold text-ios-blue">{progress}%</span>
                </div>
                <div className="ios-progress">
                  <div className="ios-progress-bar" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex items-center justify-between mt-2.5">
                  {editingProgress ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="number"
                        value={newPage}
                        onChange={e => setNewPage(e.target.value)}
                        placeholder={String(book.currentPage)}
                        className="w-20 px-2 py-1 rounded-lg bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                        min={0}
                        max={book.totalPages}
                      />
                      <span className="text-xs text-muted-foreground">de {book.totalPages}</span>
                      <button
                        onClick={() => updateProgress.mutate()}
                        className="ml-auto px-3 py-1 rounded-lg bg-ios-blue text-white text-xs font-medium"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingProgress(false)}
                        className="px-2 py-1 text-xs text-muted-foreground"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setNewPage(String(book.currentPage))
                        setEditingProgress(true)
                      }}
                      className="text-xs text-ios-blue font-medium flex items-center gap-1"
                    >
                      <Edit3 size={11} />
                      Página {book.currentPage} de {book.totalPages}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Purchase Link (Wishlist) */}
          {book.status === 'WISHLIST' && book.purchaseLink && (
            <div className="px-5 mt-4">
              <a
                href={book.purchaseLink}
                target="_blank"
                rel="noopener noreferrer"
                className="ios-card p-4 flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <ExternalLink size={16} className="text-ios-blue" />
                  <span className="text-sm font-medium text-ios-blue">Ir a comprar</span>
                </div>
                {book.price && (
                  <span className="text-sm font-semibold text-ios-purple">${Math.round(book.price).toLocaleString('es-ES')}</span>
                )}
              </a>
            </div>
          )}

          {/* Notes Entry */}
          <div className="px-5 mt-5">
            <button
              onClick={() => setShowNotes(true)}
              className="ios-card p-4 w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare size={18} className="text-ios-blue" />
                <span className="text-sm font-medium text-foreground">Notas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {book.notes.length}
                </span>
                <ChevronLeft size={16} className="text-muted-foreground rotate-180" />
              </div>
            </button>
          </div>

          <div className="h-8" />
        </div>
      )}
    </div>
  )
}

/* ========= NOTES VIEW ========= */
function NotesView({ bookId, notes, onBack }: { bookId: string; notes: Note[]; onBack: () => void }) {
  const queryClient = useQueryClient()
  const [noteType, setNoteType] = useState('THOUGHT')
  const [noteContent, setNoteContent] = useState('')
  const [notePage, setNotePage] = useState('')

  const noteTypes = [
    { key: 'THOUGHT', label: 'Pensamiento', emoji: '💭' },
    { key: 'QUOTE', label: 'Cita', emoji: '❝' },
    { key: 'SUMMARY', label: 'Resumen', emoji: '📝' },
  ]

  const createNote = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          type: noteType,
          content: noteContent,
          page: notePage || null,
        }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['book', bookId] })
      setNoteContent('')
      setNotePage('')
      toast.success('Nota añadida')
    },
  })

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      await fetch(`/api/notes/${noteId}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['book', bookId] })
      toast.success('Nota eliminada')
    },
  })

  return (
    <div className="flex-1 flex flex-col">
      {/* Add Note Form */}
      <div className="px-5 pt-4 pb-3 border-b border-border/30">
        <div className="flex gap-2 mb-3">
          {noteTypes.map(t => (
            <button
              key={t.key}
              onClick={() => setNoteType(t.key)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors duration-150 ${
                noteType === t.key
                  ? 'bg-ios-blue text-white'
                  : 'bg-ios-card text-muted-foreground dark:bg-[#2C2C2E]'
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <textarea
          value={noteContent}
          onChange={e => setNoteContent(e.target.value)}
          placeholder={
            noteType === 'THOUGHT' ? '¿Qué piensas de este libro?' :
            noteType === 'QUOTE' ? 'Escribe la cita textual...' :
            'Resume esta sección...'
          }
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-ios-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ios-blue/30 resize-none dark:bg-[#1C1C1E]"
        />

        <div className="flex items-center gap-2 mt-2">
          <input
            type="number"
            value={notePage}
            onChange={e => setNotePage(e.target.value)}
            placeholder="Página (opcional)"
            className="w-32 px-2.5 py-1.5 rounded-lg bg-ios-card text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ios-blue/30 dark:bg-[#1C1C1E]"
          />
          <button
            onClick={() => {
              if (!noteContent.trim()) {
                toast.error('Escribe algo en la nota')
                return
              }
              createNote.mutate()
            }}
            disabled={createNote.isPending}
            className="ml-auto px-4 py-1.5 rounded-full bg-ios-blue text-white text-xs font-semibold disabled:opacity-50"
          >
            {createNote.isPending ? '...' : 'Añadir nota'}
          </button>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <MessageSquare size={32} className="text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Sin notas todavía</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">Escribe tu primera nota arriba</p>
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="ios-card p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">
                    {note.type === 'THOUGHT' ? '💭' : note.type === 'QUOTE' ? '❝' : '📝'}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {note.type === 'THOUGHT' ? 'Pensamiento' : note.type === 'QUOTE' ? 'Cita' : 'Resumen'}
                  </span>
                  {note.page && (
                    <span className="text-[10px] text-ios-blue bg-ios-blue/10 px-1.5 py-0.5 rounded">
                      p. {note.page}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (confirm('¿Eliminar esta nota?')) deleteNote.mutate(note.id)
                  }}
                  className="text-muted-foreground/40 hover:text-ios-red transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{note.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
