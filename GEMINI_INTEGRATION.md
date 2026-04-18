# Integración Google Gemini - Extracción de Metadatos de Libros

## Resumen de Cambios

Se ha integrado **Google Gemini API** para mejorar la extracción de metadatos de libros desde URLs de tiendas en línea. El sistema mantiene sus 4 capas de extracción, reemplazando la capa 3 (AI) con Gemini en lugar del SDK genérico anterior.

### Archivos Modificados

1. **`src/lib/gemini.ts`** (NUEVO)
   - Utility module con funciones para inicializar y usar Gemini
   - Manejo de tipos y validación de precios (CLP)
   - Función principal `extractBookMetadataWithGemini()`

2. **`src/app/api/extract-metadata/route.ts`**
   - Reemplazado AI provider del SDK genérico por Gemini
   - Actualizado comentario de versión (v4 → v5)
   - Removido método `fixPrice()` (ahora en gemini.ts como `parsePrice()`)
   - Actualizado campo `extractedWith` de 'ai' a 'gemini' en respuestas

## Configuración

### 1. Obtener API Key de Google Gemini

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. Haz clic en "Create API Key"
3. Copia la clave generada

### 2. Configurar Variable de Ambiente

Agrega a tu archivo `.env.local`:

```bash
GOOGLE_GEMINI_API_KEY=tu_api_key_aqui
```

### 3. Verificar Instalación de Dependencias

```bash
npm install @google/generative-ai
```

## Flujo de Extracción

El proceso mantiene 4 capas de extracción de metadatos:

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Page Reader (ZAI SDK)                      │
│ - Obtiene HTML de la página (skip para Amazon, etc) │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│ Layer 2: Web Search (ZAI SDK)                       │
│ - Busca info del libro en web                       │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│ Layer 3: AI Extraction (GEMINI)                     │
│ - Extrae title, author, isbn, price, image, desc   │
│ - Retorna JSON estructurado                         │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│ Layer 4: External APIs (Open Library, Google Books) │
│ - Obtiene portada por ISBN                          │
│ - Rellena campos faltantes                          │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
          Response JSON con metadata
```

## Reglas de Precios (CLP)

Gemini sigue estas reglas para extraer precios en Pesos Chilenos:

- ✅ Los puntos y comas son **separadores de miles**: "$3.990" = 3990
- ✅ Retorna precio como **número entero**: `3990` (no "3.990" ni "3990.00")
- ✅ Rango válido: **$1.000 - $150.000 CLP**
- ✅ Si hay múltiples precios, elige el más relevante (nuevo, no usado)
- ❌ NUNCA retorna precios fuera del rango
- ❌ Si no hay precio claro, retorna `null`

## Ejemplo de Uso

```bash
# Extraer metadata de una URL
curl "http://localhost:3000/api/extract-metadata?url=https://www.buscalibre.cl/libro-ejemplo"
```

Respuesta esperada:

```json
{
  "title": "Atomic Habits",
  "author": "James Clear",
  "isbn": "9788408173549",
  "price": 22900,
  "coverImage": "https://covers.openlibrary.org/...",
  "description": "Un libro sobre hábitos atómicos...",
  "url": "https://www.buscalibre.cl/...",
  "siteName": "Buscalibre",
  "extractedWith": "gemini"
}
```

## Ventajas de Gemini

- 🚀 **Más rápido**: gemini-1.5-flash es muy eficiente
- 💰 **Económico**: Pricing competitivo para API calls
- 🎯 **Preciso**: Excelente en parsing y extracción estructurada
- 🔒 **Seguro**: Hosted en Google Infrastructure
- 📝 **Flexible**: Soporta multimodal (texto + imágenes en futuras versiones)

## Manejo de Errores

Si Gemini falla:
1. Logs en consola con prefijo `[gemini]`
2. Fallback a extracción por web search
3. Fallback a regex parsing en búsqueda
4. Response con datos parciales si es posible
5. Error 422 si no hay contexto disponible
6. Error 500 para fallos críticos

## Testing

```bash
# En desarrollo
npm run dev

# En producción
npm run build
npm start

# Ver logs
# Busca líneas con prefijo [gemini] o [extract-metadata]
```

## Límites

- Timeout: 30 segundos por request a Gemini
- Máximo tokens: 600 (para respuesta JSON)
- Temperature: 0.05 (muy determinístico para consistencia)

## Troubleshooting

Si encuentras errores, consulta **TROUBLESHOOTING.md** en la raíz del proyecto.

Los casos más comunes:
1. **API key no configurada** → Lee Troubleshooting #1
2. **URL no soportada** → Lee Troubleshooting #2
3. **Sitio bloqueado** → Lee Troubleshooting #3

## Migración Futura

Si necesitas cambiar Gemini por otro provider:
1. Crea `src/lib/otra-ia.ts` similar a `src/lib/gemini.ts`
2. Actualiza import en `route.ts`
3. Mantén la interfaz `BookMetadataExtraction` igual
4. Listo!

---

**Versión**: 1.0 (Integración Inicial)
**Fecha**: 2026-04-18
**Modelo Gemini**: gemini-1.5-flash
