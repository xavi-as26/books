import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

const globalForGemini = globalThis as unknown as { geminiInstance: GenerativeModel }

export interface BookMetadataExtraction {
  title: string
  author: string
  coverImage: string
  price: number | null
  isbn: string
  description: string
}

function initGemini(): GenerativeModel {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not set')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
}

export function getGeminiModel(): GenerativeModel {
  if (!globalForGemini.geminiInstance) {
    globalForGemini.geminiInstance = initGemini()
  }
  return globalForGemini.geminiInstance
}

export async function extractBookMetadataWithGemini(
  context: string,
  url: string,
  siteName: string
): Promise<BookMetadataExtraction | null> {
  try {
    const model = getGeminiModel()

    const prompt = `Eres un asistente especializado en extraer metadatos de libros desde paginas web y resultados de busqueda.

REGLAS CRITICAS PARA PRECIOS (PESOS CHILENOS - CLP):
- Los precios estan en Pesos Chilenos, NO hay decimales.
- Los puntos y comas son SEPARADORES DE MILES: "$3.990" = 3990, "$15.990" = 15990
- Devuelve el precio como NUMERO ENTERO: 3990, NO "3.990" ni "3990.00"
- Si hay varios precios, elige el mas relevante (nuevo, no usado).
- Un libro en Chile cuesta entre $1.000 y $150.000 CLP.
- NUNCA devuelvas precios mayores a 150000 o menores a 1000.
- Si no encuentras un precio claro, devuelve null.

REGLAS PARA AUTOR:
- Extrae SOLO el nombre del autor del libro.
- Si hay multiples autores, separalos con coma.
- NO pongas nombres de tiendas como autor.

REGLAS PARA PORTADA:
- Busca la URL de la portada en og:image, json-ld "image", o tags <img>.
- Prefiere URLs con "cover", "product", "large", "front".
- Si no encuentras URL valida, devuelve "" (vacio).

REGLAS PARA TITULO:
- Limpia el titulo: elimina "Libro " al inicio y sufijos de tiendas.
- Si dice "Amazon.com: Atomic Habits" → devuelve "Atomic Habits"

REGLAS PARA ISBN:
- Busca en la URL o contenido. Ej: "_pwp-9788408109734" → 9788408109734
- Si no lo encuentras, devuelve "".

Responde SOLO con JSON valido, sin markdown:
{"title":"","author":"","coverImage":"","price":null,"isbn":"","description":""}

URL original: ${url}
Sitio: ${siteName}

${context}`

    const response = await Promise.race([
      model.generateContent(prompt),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 30000))
    ])

    if (!response) {
      console.error('[gemini] Timeout waiting for Gemini response')
      return null
    }

    const text = response.response?.text()
    if (!text) {
      console.error('[gemini] No text in Gemini response')
      return null
    }

    console.log('[gemini] Raw response:', text.substring(0, 500))

    const jsonStr = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    const parsed = JSON.parse(jsonStr)

    if (parsed && typeof parsed === 'object') {
      const result: BookMetadataExtraction = {
        title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
        author: typeof parsed.author === 'string' ? parsed.author.trim() : '',
        coverImage: typeof parsed.coverImage === 'string' ? parsed.coverImage.trim() : '',
        price: parsePrice(parsed.price),
        isbn: typeof parsed.isbn === 'string' ? parsed.isbn.trim().replace(/-/g, '') : '',
        description: typeof parsed.description === 'string' ? parsed.description.trim() : '',
      }
      console.log('[gemini] Extracted result:', JSON.stringify(result))
      return result
    }

    return null
  } catch (error) {
    console.error(
      '[gemini] Extraction failed:',
      error instanceof Error ? error.message : String(error)
    )
    return null
  }
}

function validateBookPrice(price: number): number | null {
  if (price === null || price === undefined || isNaN(price)) return null
  if (price < 1000 || price > 150000) return null
  return price
}

function parsePrice(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null

  if (typeof raw === 'number') {
    const validated = validateBookPrice(raw)
    if (validated !== null) return validated
    if (raw > 150000) {
      for (const divisor of [10, 100, 1000]) {
        const divided = Math.round(raw / divisor)
        if (validateBookPrice(divided) !== null) return divided
      }
    }
    return null
  }

  if (typeof raw === 'string') {
    const cleaned = raw.replace(/[$€£CLPclp\s]/g, '').trim()
    if (!cleaned || !/[\d]/.test(cleaned)) return null
    const noSeparators = cleaned.replace(/[.,]/g, '')
    const num = parseInt(noSeparators, 10)
    if (isNaN(num) || num <= 0) return null
    return validateBookPrice(num)
  }

  return null
}
