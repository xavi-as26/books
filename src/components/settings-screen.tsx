'use client'

import { Info, Moon, Sun, Database, Download, Upload } from 'lucide-react'
import { useSyncExternalStore, useCallback } from 'react'

function getThemeSnapshot() {
  if (typeof window === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

function getServerSnapshot() {
  return false
}

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

function applyInitialTheme() {
  if (typeof window === 'undefined') return
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const stored = localStorage.getItem('biblio-theme')
  if (stored === 'dark' || (!stored && prefersDark)) {
    document.documentElement.classList.add('dark')
  }
}

// Run once on module load
if (typeof window !== 'undefined') {
  applyInitialTheme()
}

export function SettingsScreen() {
  const isDark = useSyncExternalStore(subscribe, getThemeSnapshot, getServerSnapshot)

  const toggleTheme = useCallback(() => {
    if (isDark) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('biblio-theme', 'light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('biblio-theme', 'dark')
    }
  }, [isDark])

  const handleExport = async () => {
    try {
      const res = await fetch('/api/books')
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bibliopwa-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently fail
    }
  }

  return (
    <div className="tab-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-2 safe-top">
        <h1 className="ios-large-title text-foreground">Ajustes</h1>
      </div>

      <div className="px-5 mt-4 space-y-4">
        {/* Appearance */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">Apariencia</p>
          <div className="ios-card overflow-hidden">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                {isDark ? <Moon size={18} className="text-ios-blue" /> : <Sun size={18} className="text-ios-orange" />}
                <span className="text-sm font-medium text-foreground">Modo oscuro</span>
              </div>
              <div className={`w-12 h-7 rounded-full transition-colors duration-200 flex items-center ${isDark ? 'bg-ios-blue justify-end' : 'bg-border justify-start'}`}>
                <div className="rounded-full bg-white shadow-sm mx-0.5" style={{ width: 22, height: 22 }} />
              </div>
            </button>
          </div>
        </div>

        {/* Data */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">Datos</p>
          <div className="ios-card overflow-hidden">
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-3 p-4 border-b border-border/30"
            >
              <Download size={18} className="text-ios-green" />
              <div className="text-left flex-1">
                <span className="text-sm font-medium text-foreground block">Exportar datos</span>
                <span className="text-xs text-muted-foreground">Descargar respaldo JSON</span>
              </div>
            </button>
            <div className="flex items-center gap-3 p-4 border-b border-border/30">
              <Database size={18} className="text-ios-blue" />
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground block">Almacenamiento local</span>
                <span className="text-xs text-muted-foreground">Tus datos se guardan en este dispositivo</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <Upload size={18} className="text-ios-purple" />
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground block">Importar datos</span>
                <span className="text-xs text-muted-foreground">Restaurar desde respaldo JSON</span>
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">Acerca de</p>
          <div className="ios-card overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <Info size={18} className="text-ios-gray" />
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground block">BiblioPWA v1.0</span>
                <span className="text-xs text-muted-foreground">Biblioteca virtual para iPhone · PWA</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-24" />
    </div>
  )
}
