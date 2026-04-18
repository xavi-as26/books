# Troubleshooting - Integración Gemini

## Error: "Error extracting metadata from URL"

### 1. **GOOGLE_GEMINI_API_KEY no configurada** ⚠️ MÁS COMÚN

**Síntoma:**
```json
{
  "error": "Error extracting metadata from URL",
  "geminiAvailable": false
}
```

**Solución:**

#### En desarrollo local (.env.local):
```bash
GOOGLE_GEMINI_API_KEY=tu_clave_aqui
```

#### En Vercel:
1. Ve a https://vercel.com/projects
2. Selecciona tu proyecto "books"
3. Settings → Environment Variables
4. Agrega nueva variable:
   - **Name:** `GOOGLE_GEMINI_API_KEY`
   - **Value:** [tu API key de Google]
5. Redeploy (o el deploy actual incluirá el fix automáticamente)

**Obtener API key:**
1. Ve a https://aistudio.google.com/app/apikeys
2. Haz clic en "Create API Key"
3. Selecciona tu proyecto (o crea uno)
4. Copia la clave generada

---

## 2. **URL inválida o no soportada**

**Síntoma:**
```json
{
  "error": "Invalid URL format"
}
```

**Solución:**
- Verifica que la URL comience con `http://` o `https://`
- Ejemplo válido: `https://www.buscalibre.cl/libro-ejemplo`
- Ejemplo inválido: `buscalibre.cl/libro-ejemplo` ❌

---

## 3. **Sitio web bloqueado o no accesible**

**Síntoma:**
```json
{
  "error": "No se pudo obtener informacion de esta URL. Intenta con otra pagina.",
  "extractedWith": "regex"
}
```

**Causas:**
- El sitio rechaza scraping (Cloudflare, robots.txt)
- Sitio requiere login
- El servidor web está caído

**Solución:**
- Intenta con otra URL
- Usa sitios públicos como Buscalibre, Amazon, Gandhi
- Para Amazon/MercadoLibre: El sistema salta page_reader automáticamente (por performance)

---

## 4. **Timeout (demora excesiva)**

**Síntoma:**
```
[extract-metadata] Timeout waiting for Gemini response
```

**Causa:**
- Gemini API tardó más de 30 segundos
- Conexión lenta

**Solución:**
- Intenta de nuevo (puede ser temporal)
- Verifica tu conexión a internet
- El sistema usa fallback a web_search automáticamente

---

## 5. **JSON parsing error en respuesta de Gemini**

**Síntoma:**
```
[gemini] Extraction failed: Unexpected token...
```

**Causa:**
- Gemini no retornó JSON válido
- Respuesta malformada

**Solución:**
- El sistema intenta parse con limpieza de markdown
- Si falla, usa fallback a web search
- Intenta de nuevo en el próximo request

---

## 6. **Precio incorrecto o null**

**Síntoma:**
```json
{
  "price": null,
  "title": "El Quijote",
  "author": "Cervantes"
}
```

**Causas:**
- El precio no estaba en la página
- Formato de precio no reconocido (ej: "precio bajo consulta")
- Precio fuera del rango válido ($1.000-$150.000 CLP)

**Solución:**
- Normal si el libro no tiene precio listado
- El sistema busca precios en:
  1. HTML/JSON-LD estructurado
  2. Meta tags (og:price, product:price)
  3. Snippets de búsqueda web
- Si persiste, verifica que el sitio muestre el precio públicamente

---

## 7. **Portada (coverImage) vacía**

**Síntoma:**
```json
{
  "coverImage": "",
  "title": "Atomic Habits"
}
```

**Causas:**
- No encontró ISBN
- Portada no está en Open Library o Google Books
- Imagen de portada no tiene URL válida

**Solución:**
- Normal si el libro es muy nuevo o no está en las librerías públicas
- El sistema intenta 3 fuentes:
  1. HTML del sitio original
  2. Open Library API (requiere ISBN)
  3. Google Books API (requiere ISBN o título)

---

## 8. **Author incorrecto**

**Síntoma:**
```json
{
  "author": "Buscalibre",
  "title": "Atomic Habits"
}
```

**Causa:**
- Gemini extrajo nombre de tienda como autor

**Solución:**
- El sistema filtra patrones conocidos (Amazon, Goodreads, etc)
- Si ve "author" conteniendo nombres de tiendas: vacía el campo
- Intenta con otra URL si el autor sigue siendo incorrecto

---

## 9. **Response con geminiAvailable: false**

**Síntoma:**
```json
{
  "geminiAvailable": false,
  "extractedWith": "search"
}
```

**Significado:**
- Gemini API key no está configurada
- Sistema cayó a fallback (web_search)
- Los datos aún son válidos, solo sin procesamiento de Gemini

**Solución:**
- Configura la API key para mejorar precisión
- Mientras tanto, el sistema sigue extrayendo desde búsqueda web

---

## 10. **Error 422 - Sin contexto disponible**

**Síntoma:**
```json
{
  "error": "No se pudo obtener informacion de esta URL. Intenta con otra pagina.",
  "status": 422
}
```

**Causa:**
- page_reader no obtuvo HTML
- web_search no retornó resultados
- URL no tiene contenido accesible

**Solución:**
- Prueba con otra URL
- Verifica que la URL sea pública y sin paywall
- Algunos sitios requieren cookies/sesión

---

## 11. **Error 500 - Fallo crítico**

**Síntoma:**
```json
{
  "error": "Error extracting metadata from URL",
  "details": "..."
}
```

**Solución:**
1. Revisa los logs en Vercel
2. Verifica que GOOGLE_GEMINI_API_KEY esté configurada
3. Intenta con una URL diferente
4. Si persiste, contáctame con los detalles del error

---

## Debug Logs

Para ver qué está pasando, revisa los logs en:

**Vercel Logs:**
```
https://vercel.com/projects/[tu-proyecto]/deployments
→ Selecciona el deployment
→ Function Logs
```

**Busca estos prefijos:**
- `[extract-metadata]` - General
- `[gemini]` - Específico de Gemini
- `[gemini] Raw response` - Respuesta de Gemini (antes de parse)
- `[gemini] Extracted result` - Resultado parseado

---

## Checklist de Configuración

- [ ] API key obtenida de Google AI Studio
- [ ] API key configurada en `.env.local` (desarrollo)
- [ ] API key configurada en Vercel Environment Variables (producción)
- [ ] Servidor/Vercel reiniciado después de agregar API key
- [ ] URL siendo testeada es válida y públicamente accesible
- [ ] No hay rate limiting en el sitio destino

---

## Contacto & Mejoras

Si encuentras un error no listado aquí:

1. Nota el error exacto
2. La URL que intentaste
3. Timestamp del error
4. Logs disponibles

Esto me ayudará a mejorar el sistema.

---

**Última actualización:** 2026-04-18
