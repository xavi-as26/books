import { NextRequest, NextResponse } from 'next/server'
import { extractBookMetadataWithGemini } from '@/lib/gemini'

// ═══════════════════════════════════════════════════════════
// AI-POWERED BOOK METADATA EXTRACTION - v5
// Strategy: page_reader + web_search + Open Library API + Gemini AI
// ═══════════════════════════════════════════════════════════

interface SearchResult {
  url: string
  name: string
  snippet: string
  host_name: string
}

interface BookMetadata {
  title: string
  author: string
  coverImage: string
  price: number | null
  isbn: string
  description: string
}

// ─── Helper functions ────────────────────────────────────

function chileanPriceToInt(raw: string): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[$€£CLPclp\s]/g, '').trim()
  if (!cleaned || !/[\d]/.test(cleaned)) return null
  const noSeparators = cleaned.replace(/[.,]/g, '')
  const num = parseInt(noSeparators, 10)
  return isNaN(num) || num <= 0 ? null : num
}

/** Validate that a price makes sense for a book in Chilean Pesos */
function validateBookPrice(price: number): number | null {
  if (price === null || price === undefined || isNaN(price)) return null
  // A book price in CLP should be between 1,000 and 150,000
  if (price < 1000 || price > 150000) return null
  return price
}



function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-–|·:]\s*(Amazon|Goodreads|Book Depository|Casa del Libro|Buscalibre|Librería|Gandhi|Penguin|Planeta|FNAC|Apple Books|Google Play|MercadoLibre|Feria Chilena|Antártica)[^]*$/i, '')
    .replace(/\s*[-–|·:]\s*(?:com|es|mx|co|cl|io)\s*$/i, '')
    .replace(/\s*[-–|·]\s*Books?\s*$/i, '')
    .replace(/\s*:\s*$/, '')
    .replace(/^Libro\s+/i, '')
    .trim()
}

function detectSiteName(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase()
  const sites: Record<string, string> = {
    amazon: 'Amazon', goodreads: 'Goodreads', bookdepository: 'Book Depository',
    casadellibro: 'Casa del Libro', buscalibre: 'Buscalibre', gandhi: 'Gandhi',
    planeta: 'Planeta', penguin: 'Penguin', fnac: 'FNAC',
    apple: 'Apple Books', google: 'Google Books', casaandino: 'Casa Andino',
    librerianacional: 'Librería Nacional', mercadolibre: 'MercadoLibre',
    feriachilenadellibro: 'Feria Chilena del Libro', trayectobookstore: 'Trayecto Bookstore',
  }
  for (const [key, name] of Object.entries(sites)) {
    if (hostname.includes(key)) return name
  }
  return hostname.replace('www.', '').split('.')[0]
}

function extractRelevantHtml(html: string): string {
  const parts: string[] = []
  const MAX_HTML_SIZE = 500_000 // 500KB limit for regex safety

  const limitedHtml = html.length > MAX_HTML_SIZE ? html.substring(0, MAX_HTML_SIZE) : html

  // Extract head section (meta tags, title)
  const headMatch = limitedHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  if (headMatch) {
    parts.push('<head>' + headMatch[1].substring(0, 6000) + '</head>')
  }

  // Extract JSON-LD structured data
  const jsonLdMatches = Array.from(limitedHtml.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
  for (const match of jsonLdMatches) {
    const content = match[1].trim()
    if (content.length < 8000 && (
      content.includes('"Book"') || content.includes('"Product"') ||
      content.includes('"author"') || content.includes('"isbn"') ||
      content.includes('"price"') || content.includes('"name"') ||
      content.includes('"image"') || content.includes('"offers"')
    )) {
      parts.push('<json-ld>' + content.substring(0, 4000) + '</json-ld>')
    }
  }

  // Extract Open Graph and meta tags
  const ogMatches = Array.from(limitedHtml.matchAll(/<meta\s+(?:property|name)=["'](og:|twitter:)?(image|title|description|price:amount|product:price:amount)["']\s+content=["']([^"']+)["']/gi))
  const ogData = ogMatches.map(m => ({ tag: (m[1] || '') + m[2], content: m[3] }))
  if (ogData.length > 0) {
    parts.push('<og-meta>\n' + ogData.map(o => `${o.tag}: ${o.content}`).join('\n') + '\n</og-meta>')
  }

  // Extract price-specific meta tags
  const priceMetaMatches = Array.from(limitedHtml.matchAll(/<meta\s+(?:property|itemprop|name)=["'](?:product:price:amount|price|priceCurrency|offers:salePrice)["']\s+(?:content|value)=["']([^"']+)["']/gi))
  if (priceMetaMatches.length > 0) {
    parts.push('<price-meta>\n' + priceMetaMatches.map(m => m[1]).join('\n') + '\n</price-meta>')
  }

  // Extract image URLs that look like book covers
  const imgMatches = Array.from(limitedHtml.matchAll(/<img[^>]+src=["']([^"']+)["']/gi))
  const coverImgUrls = imgMatches
    .map(m => m[1])
    .filter(src => {
      const s = src.toLowerCase()
      return (
        !s.includes('sprite') && !s.includes('icon') && !s.includes('logo') &&
        !s.includes('pixel') && !s.includes('1x1') && !s.includes('tracking') &&
        !s.includes('avatar') && !s.includes('banner') && !s.includes('nav-') &&
        !s.includes('button') && !s.includes('arrow') && !s.includes('chevron') &&
        (s.includes('cover') || s.includes('product') || s.includes('book') ||
         s.includes('/p/') || s.includes('media') || s.includes('catalog') ||
         s.includes('large') || s.includes('front') || s.includes('main')) &&
        s.length > 15
      )
    })
    .slice(0, 10)
  if (coverImgUrls.length > 0) {
    parts.push('<cover-images>\n' + coverImgUrls.join('\n') + '\n</cover-images>')
  }

  // Fallback: any decent images
  if (coverImgUrls.length === 0) {
    const anyImgs = imgMatches
      .map(m => m[1])
      .filter(src => {
        const s = src.toLowerCase()
        return !s.includes('sprite') && !s.includes('icon') && !s.includes('logo') &&
               !s.includes('pixel') && !s.includes('1x1') && !s.includes('tracking') &&
               !s.includes('avatar') && !s.includes('banner') && s.length > 25
      })
      .slice(0, 5)
    if (anyImgs.length > 0) {
      parts.push('<images>\n' + anyImgs.join('\n') + '\n</images>')
    }
  }

  // Extract body text (limited)
  const bodyMatch = limitedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) {
    const cleanBody = bodyMatch[1]
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-zA-Z]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    parts.push('<body-text>' + cleanBody.substring(0, 3000) + '</body-text>')
  }

  const combined = parts.join('\n\n')
  return combined.substring(0, 12000)
}

function extractPriceFromSnippet(snippet: string): number | null {
  // Must have $ or CLP prefix to be considered a price
  const patterns = [
    /\$\s*([\d.,]+)/,
    /CLP\s*([\d.,]+)/i,
    /(?:precio|price)\s*:\s*\$\s*([\d.,]+)/i,
    /(\d{1,3}(?:\.\d{3})+)\s*(?:pesos|CLP)/i,
  ]
  for (const pattern of patterns) {
    const match = snippet.match(pattern)
    if (match?.[1]) {
      const price = chileanPriceToInt(match[1])
      if (price !== null) {
        const validated = validateBookPrice(price)
        if (validated !== null) return validated
      }
    }
  }
  return null
}

/** Fetch cover image from Open Library API by ISBN */
async function getOpenLibraryCover(isbn: string): Promise<string> {
  if (!isbn || isbn.length < 10) return ''
  try {
    const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return ''
    const data = await res.json()
    const key = `ISBN:${isbn}`
    const book = data[key]
    if (book?.cover?.large) return book.cover.large
    if (book?.cover?.medium) return book.cover.medium
    if (book?.cover?.small) return book.cover.small
    // Try the cover URL pattern directly
    return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  } catch {
    // Fallback to direct cover URL
    try {
      return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
    } catch {
      return ''
    }
  }
}

/** Fetch metadata from Google Books API */
async function getGoogleBooksData(isbn: string, title: string): Promise<{ coverImage: string; description: string; author: string; publishedDate: string } | null> {
  try {
    const query = isbn ? `isbn:${isbn}` : `intitle:${encodeURIComponent(title)}`
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const item = data.items?.[0]
    if (!item) return null
    const info = item.volumeInfo
    return {
      coverImage: info.imageLinks?.large || info.imageLinks?.medium || info.imageLinks?.thumbnail?.replace('http://', 'https://') || '',
      description: info.description || '',
      author: info.authors?.join(', ') || '',
      publishedDate: info.publishedDate || '',
    }
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════

const globalForZai = globalThis as unknown as { zaiInstance: any }

async function getZai() {
  if (!globalForZai.zaiInstance) {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    globalForZai.zaiInstance = await ZAI.create()
  }
  return globalForZai.zaiInstance
}

export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const zai = await getZai()
    const siteName = detectSiteName(url)

    // ─── Data collectors ────────────────────────────────
    let htmlContent: string | null = null
    let pageTitle = ''
    let searchResults: SearchResult[] = []
    let isbnFromUrl = ''

    // Extract ISBN from URL early for cover API lookups
    const isbnMatch = url.match(/(?:pwp-|isbn\/?|[\/-])(\d{10,13})/i)
    if (isbnMatch) isbnFromUrl = isbnMatch[1]

    // ─── Layer 1: Page Reader (safe, skip known heavy sites) ────
    // Amazon and other large e-commerce sites return 2MB+ pages that cause OOM
    const SKIP_PAGE_READER_HOSTS = ['amazon', 'mercadolibre', 'ebay', 'walmart']
    const shouldSkipPageReader = SKIP_PAGE_READER_HOSTS.some(h => new URL(url).hostname.includes(h))

    if (!shouldSkipPageReader) {
      try {
        console.log('[extract-metadata] Reading page:', url)
        const pageResult = await Promise.race([
          zai.functions.invoke('page_reader', { url }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000))
        ])

        if (pageResult && pageResult.data?.html) {
          let rawHtml = pageResult.data.html as string
          const htmlSize = rawHtml.length
          console.log('[extract-metadata] Page reader returned:', htmlSize, 'chars')

          // Truncate huge HTML before any regex processing to avoid OOM
          const MAX_RAW_HTML = 300_000 // 300KB max for regex safety
          if (htmlSize > MAX_RAW_HTML) {
            console.log('[extract-metadata] Truncating large HTML from', htmlSize, 'to', MAX_RAW_HTML)
            rawHtml = rawHtml.substring(0, MAX_RAW_HTML)
          }

          if (htmlSize > 500) {
            const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
            if (titleMatch) pageTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim()

            htmlContent = extractRelevantHtml(rawHtml)
            console.log('[extract-metadata] Page read OK, extracted:', htmlContent.length, 'chars')
          } else {
            console.log('[extract-metadata] Page too small, likely blocked:', htmlSize)
          }
        }
      } catch (pageError) {
        console.error('[extract-metadata] Page reader failed:', pageError instanceof Error ? pageError.message : String(pageError))
      }
    } else {
      console.log('[extract-metadata] Skipping page_reader for large site:', siteName)
    }

    // ─── Layer 2: Web Search ────────────────────────────
    try {
      const urlObj = new URL(url)
      const pathSegments = urlObj.pathname
        .split('/')
        .filter(s => s.length > 3 && !s.match(/^(product|libro|book|dp|p|item|catalog)$/i))
        .map(s => s.replace(/[-_]/g, ' ').replace(/_pwp.*/, '').trim())
        .filter(s => s.length > 3)

      const searchQuery = pathSegments.length > 0
        ? pathSegments.join(' ') + ' libro precio chile'
        : urlObj.hostname.replace('www.', '') + ' libro'

      console.log('[extract-metadata] Searching for:', searchQuery)

      const searchResult = await zai.functions.invoke('web_search', { query: searchQuery, num: 8 })

      if (Array.isArray(searchResult) && searchResult.length > 0) {
        searchResults = searchResult as SearchResult[]
        console.log('[extract-metadata] Found', searchResults.length, 'search results')
      }
    } catch (searchError) {
      console.error('[extract-metadata] Web search failed:', searchError instanceof Error ? searchError.message : String(searchError))
    }

    // ─── Layer 3: AI extraction with Gemini ──────────────────────────
    let aiResult: BookMetadata | null = null

    try {
      let aiContext = ''

      if (htmlContent) {
        aiContext += '=== CONTENIDO DE LA PAGINA ===\n'
        aiContext += htmlContent + '\n\n'
      }

      if (searchResults.length > 0) {
        aiContext += '=== RESULTADOS DE BUSQUEDA WEB ===\n'
        for (const result of searchResults.slice(0, 6)) {
          aiContext += `URL: ${result.url}\n`
          aiContext += `Titulo: ${result.name}\n`
          aiContext += `Snippet: ${result.snippet}\n`
          aiContext += '---\n'
        }
      }

      if (!aiContext.trim()) {
        return NextResponse.json(
          { error: 'No se pudo obtener informacion de esta URL. Intenta con otra pagina.' },
          { status: 422 }
        )
      }

      const geminiResult = await extractBookMetadataWithGemini(aiContext, url, siteName)
      if (geminiResult) {
        aiResult = geminiResult
      }
    } catch (aiError) {
      console.error('[extract-metadata] AI failed:', aiError instanceof Error ? aiError.message : String(aiError))
    }

    // ─── Layer 4: External APIs for covers & metadata ───
    let isbn = aiResult?.isbn || isbnFromUrl || ''
    let title = aiResult?.title || ''
    let author = aiResult?.author || ''
    let coverImage = aiResult?.coverImage || ''
    let price = aiResult?.price ?? null
    const description = aiResult?.description || ''

    // Try Open Library and Google Books for cover (in parallel)
    if (!coverImage && isbn) {
      console.log('[extract-metadata] Fetching cover from Open Library & Google Books for ISBN:', isbn)
      const [olCover, gbData] = await Promise.allSettled([
        getOpenLibraryCover(isbn),
        getGoogleBooksData(isbn, title),
      ])

      if (olCover.status === 'fulfilled' && olCover.value) {
        coverImage = olCover.value
        console.log('[extract-metadata] Got cover from Open Library')
      }

      if (gbData.status === 'fulfilled' && gbData.value) {
        // Use Google Books data as fallback for missing fields
        if (!coverImage && gbData.value.coverImage) {
          coverImage = gbData.value.coverImage
          console.log('[extract-metadata] Got cover from Google Books')
        }
        if (!author && gbData.value.author) {
          author = gbData.value.author
        }
      }
    } else if (!coverImage && title) {
      // No ISBN but have title - try Google Books
      console.log('[extract-metadata] No ISBN, trying Google Books with title:', title)
      const gbData = await getGoogleBooksData('', title)
      if (gbData) {
        if (gbData.coverImage) coverImage = gbData.coverImage
        if (!author) author = gbData.author
      }
    }

    // ─── Final assembly with fallbacks ──────────────────
    if (!title && searchResults.length > 0) {
      title = cleanTitle(searchResults[0].name)
    }
    if (!title && pageTitle) {
      title = cleanTitle(pageTitle)
    }

    if (!author && searchResults.length > 0) {
      for (const result of searchResults) {
        const authorPatterns = [
          /(?:de|by|por)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4})/i,
          /-\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4})\s*[-|]/,
        ]
        for (const pattern of authorPatterns) {
          const match = result.name.match(pattern)
          if (match?.[1] && match[1].length > 3 && match[1].length < 80) {
            author = match[1].trim()
            break
          }
        }
        if (author) break
      }
    }

    // Price fallback from search snippets
    if (price === null && searchResults.length > 0) {
      for (const result of searchResults) {
        const snippetPrice = extractPriceFromSnippet(result.snippet)
        if (snippetPrice !== null) {
          price = snippetPrice
          break
        }
      }
    }

    // Filter bad author names
    const badAuthorPatterns = /amazon|goodreads|book ?depository|casa ?del ?libro|buscalibre|fnac|apple|google|librería|mercado/i
    if (badAuthorPatterns.test(author)) author = ''

    // Fix relative cover image URLs
    if (coverImage && !coverImage.startsWith('http')) {
      try { coverImage = new URL(coverImage, url).href } catch { coverImage = '' }
    }
    // Filter out bad cover images
    if (coverImage && /pixel|tracking|1x1|blank|spacer|transparent|favicon/i.test(coverImage)) {
      coverImage = ''
    }

    const response = {
      title,
      author,
      coverImage,
      price,
      isbn,
      url,
      siteName,
      extractedWith: aiResult ? 'gemini' : (searchResults.length > 0 ? 'search' : 'regex'),
      description,
    }

    console.log('[extract-metadata] Final:', JSON.stringify(response))
    return NextResponse.json(response)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[extract-metadata] Fatal error:', errorMessage)
    return NextResponse.json(
      { 
        error: 'Error extracting metadata from URL',
        details: errorMessage 
      },
      { status: 500 }
    )
  }
}
