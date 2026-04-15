'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/store/app-store'
import { X, Camera, Link, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useState, useRef } from 'react'

interface AddBookProps {
  defaultStatus: 'WISHLIST' | 'OWNED'
}

export function AddBookModal({ defaultStatus }: AddBookProps) {
  const { setShowAddBook } = useAppStore()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [coverBase64, setCoverBase64] = useState('')
  const [status, setStatus] = useState(defaultStatus)
  const [purchaseLink, setPurchaseLink] = useState('')
  const [price, setPrice] = useState('')
  const [totalPages, setTotalPages] = useState('')

  const createBook = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          author,
          coverUrl: coverUrl || null,
          coverBase64: coverBase64 || null,
          status,
          purchaseLink: purchaseLink || null,
          price: price || null,
          totalPages: totalPages || null,
        }),
      })
      if (!res.ok) throw new Error('Error creating book')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      toast.success(status === 'WISHLIST' ? 'Añadido a deseos' : 'Añadido a biblioteca')
      setShowAddBook(false)
    },
    onError: () => {
      toast.error('Error al guardar el libro')
    },
  })

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setCoverBase64(reader.result as string)
      setCoverUrl('')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    if (!title.trim() || !author.trim()) {
      toast.error('El título y el autor son obligatorios')
      return
    }
    createBook.mutate()
  }

  const previewImage = coverBase64 || (coverUrl ? coverUrl : '')

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-3 safe-top border-b border-border/50">
        <button
          onClick={() => setShowAddBook(false)}
          className="text-ios-blue text-base font-medium"
        >
          Cancelar
        </button>
        <h2 className="text-base font-semibold text-foreground">Nuevo Libro</h2>
        <button
          onClick={handleSubmit}
          disabled={createBook.isPending}
          className="text-ios-blue text-base font-semibold disabled:opacity-50"
        >
          {createBook.isPending ? '...' : 'Guardar'}
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Cover Preview & Upload */}
        <div className="flex gap-4">
          <div className="relative">
            <div className="w-[80px] h-[115px] rounded-xl overflow-hidden bg-ios-gray/10 border-2 border-dashed border-border flex items-center justify-center">
              {previewImage ? (
                <img src={previewImage} alt="Portada" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={24} className="text-muted-foreground" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-ios-blue text-white flex items-center justify-center shadow-md"
            >
              <Camera size={14} />
            </button>
          </div>

          <div className="flex-1 space-y-2.5">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Título *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Nombre del libro"
                className="w-full px-3 py-2 rounded-xl bg-ios-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ios-blue/30 dark:bg-[#1C1C1E]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Autor *</label>
              <input
                type="text"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="Nombre del autor"
                className="w-full px-3 py-2 rounded-xl bg-ios-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ios-blue/30 dark:bg-[#1C1C1E]"
              />
            </div>
          </div>
        </div>

        {/* Cover URL */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
            <Link size={12} /> URL de portada
          </label>
          <input
            type="url"
            value={coverUrl}
            onChange={e => {
              setCoverUrl(e.target.value)
              if (e.target.value) setCoverBase64('')
            }}
            placeholder="https://ejemplo.com/portada.jpg"
            className="w-full px-3 py-2 rounded-xl bg-ios-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ios-blue/30 dark:bg-[#1C1C1E]"
          />
        </div>

        {/* Status selector */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Estado</label>
          <div className="flex gap-2">
            {(['OWNED', 'WISHLIST', 'READING'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  status === s
                    ? s === 'WISHLIST'
                      ? 'bg-ios-purple text-white'
                      : s === 'READING'
                        ? 'bg-ios-blue text-white'
                        : 'bg-ios-green text-white'
                    : 'bg-ios-card text-muted-foreground dark:bg-[#2C2C2E]'
                }`}
              >
                {s === 'OWNED' ? 'En biblioteca' : s === 'WISHLIST' ? 'Deseo' : 'Leyendo'}
              </button>
            ))}
          </div>
        </div>

        {/* Wishlist fields */}
        {status === 'WISHLIST' && (
          <div className="space-y-2.5">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Link de compra</label>
              <input
                type="url"
                value={purchaseLink}
                onChange={e => setPurchaseLink(e.target.value)}
                placeholder="https://amazon.com/..."
                className="w-full px-3 py-2 rounded-xl bg-ios-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ios-purple/30 dark:bg-[#1C1C1E]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Precio</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="19.99"
                className="w-full px-3 py-2 rounded-xl bg-ios-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ios-purple/30 dark:bg-[#1C1C1E]"
              />
            </div>
          </div>
        )}

        {/* Reading fields */}
        {(status === 'OWNED' || status === 'READING') && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Páginas totales</label>
            <input
              type="number"
              value={totalPages}
              onChange={e => setTotalPages(e.target.value)}
              placeholder="350"
              className="w-full px-3 py-2 rounded-xl bg-ios-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ios-blue/30 dark:bg-[#1C1C1E]"
            />
          </div>
        )}

        {/* Barcode API note */}
        <div className="ios-card p-3.5 flex items-start gap-2.5">
          <Camera size={18} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-foreground">Escaneo de código de barras</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Próximamente: escanea el ISBN de tus libros físicos para agregarlos automáticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
