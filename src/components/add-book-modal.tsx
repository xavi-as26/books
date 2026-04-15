'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/store/app-store'
import { X, Camera, Link, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useState, useRef, useEffect } from 'react'

interface AddBookProps {
  defaultStatus: 'WISHLIST' | 'OWNED'
}

export function AddBookModal({ defaultStatus }: AddBookProps) {
  const { setShowAddBook, sharedUrl, setSharedUrl } = useAppStore()
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
  const [urlInput, setUrlInput] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedWith, setExtractedWith] = useState<string>('')

  // Auto-fill URL from shared link (Share Target)
  useEffect(() => {
    if (sharedUrl) {
      setUrlInput(sharedUrl)
      handleExtractFromUrl(sharedUrl)
      setSharedUrl('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedUrl])

  const handleExtractFromUrl = async (url?: string) => {
    const targetUrl = url || urlInput
    if (!targetUrl.trim()) {
      toast.error('Ingresa una URL primero')
      return
    }

    setIsExtracting(true)
    setExtractedWith('')

    try {
      const res = await fetch(`/api/extract-metadata?url=${encodeURIComponent(targetUrl.trim())}`)
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'No se pudieron extraer los datos de esta URL')
        return
      }

      // Fill form with extracted data
      if (data.title) setTitle(data.title)
      if (data.author) setAuthor(data.author)
      if (data.coverImage) setCoverUrl(data.coverImage)
      if (data.price !== null && data.price !== undefined) setPrice(String(data.price))
      if (data.isbn && !data.coverImage) {
        // If we have ISBN but no cover, try Open Library
        setCoverUrl(`https://covers.openlibrary.org/b/isbn/${data.isbn}-L.jpg`)
      }
      if (data.description) {
        // Store description for potential future use
      }
      if (status === 'WISHLIST' && !purchaseLink) {
        setPurchaseLink(targetUrl.trim())
      }

      setExtractedWith(data.extractedWith || 'ai')
      toast.success(`Datos extraídos${data.extractedWith === 'ai' ? ' con IA' : ''}`)
    } catch (err) {
      console.error('Extraction error:', err)
      toast.error('Error al extraer datos de la URL')
    } finally {
      setIsExtracting(false)
    }
  }

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
        {/* URL Extraction Section */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
            <Sparkles size={12} className="text-ios-blue" />
            Extraer datos desde URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="Pega el link del libro..."
              className="flex-1 px-3 py-2 rounded-xl bg-ios-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ios-blue/30 dark:bg-[#1C1C1E]"
              onKeyDown={e => {
                if (e.key === 'Enter') handleExtractFromUrl()
              }}
            />
            <button
              onClick={() => handleExtractFromUrl()}
              disabled={isExtracting || !urlInput.trim()}
              className="px-3 py-2 rounded-xl bg-ios-blue text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
            >
              {isExtracting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {isExtracting ? '...' : 'Extraer'}
            </button>
          </div>
          {extractedWith && (
            <p className="text-[11px] text-ios-blue mt-1">
              Datos extraídos {extractedWith === 'ai' ? 'con IA' : extractedWith === 'search' ? 'por búsqueda' : 'automáticamente'}
            </p>
          )}
        </div>

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
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Precio (CLP)</label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="15990"
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
      </div>
    </div>
  )
}
