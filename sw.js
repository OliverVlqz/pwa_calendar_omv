// Nombre de las cachés
const CACHE_NAME = 'pwa-calendar-v1'
const DYNAMIC_CACHE = 'dynamic-cache-v1'

// Recursos para el App Shell (Only Cache)
const APP_SHELL = [
  './',
  './index.html',
  './calendar.html',
  './form.html',
  './main.css',
  './main.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
]

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...')

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando App Shell')
        return cache.addAll(APP_SHELL)
      })
      .then(() => {
        console.log('[SW] App Shell cacheado exitosamente')
        return self.skipWaiting()
      })
  )
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...')

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE) {
              console.log('[SW] Eliminando caché antigua:', cache)
              return caches.delete(cache)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Service Worker activado')
        return self.clients.claim()
      })
  )
})

// Estrategia de Fetch
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url)

  // 1. ESTRATEGIA CACHE ONLY para App Shell
  if (
    APP_SHELL.some(
      (resource) =>
        requestUrl.pathname === resource ||
        requestUrl.pathname.endsWith(resource)
    )
  ) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          console.log(
            `[Cache Only] Devolviendo desde caché: ${event.request.url}`
          )
          return response
        }
        console.log(`[Cache Only] No encontrado en caché: ${event.request.url}`)
        return fetch(event.request)
      })
    )
    return
  }

  // 2. ESTRATEGIA DYNAMIC CACHE para librerías externas (CDN)
  // FullCalendar, Select2, jQuery
  if (
    requestUrl.hostname === 'cdn.jsdelivr.net' ||
    requestUrl.hostname === 'code.jquery.com' ||
    event.request.url.includes('fullcalendar') ||
    event.request.url.includes('select2') ||
    event.request.url.includes('jquery')
  ) {
    event.respondWith(
      // 1. INTENTAR: Buscar el recurso en TODAS las cachés
      caches.match(event.request).then((response) => {
        // 2. ÉXITO: Si se encuentra en caché, lo devolvemos inmediatamente
        if (response) {
          console.log(
            `[Dynamic Cache] Devolviendo desde caché: ${event.request.url}`
          )
          return response
        }

        // 3. FALLA (Cache Miss): Si no está en caché, vamos a la red
        console.log(`[Dynamic Cache] Buscando en la red: ${event.request.url}`)
        return fetch(event.request)
          .then((networkResponse) => {
            // 4. ÉXITO DE RED: Clonamos la respuesta (porque solo se puede leer una vez)
            const responseToCache = networkResponse.clone()

            // 5. CACHEO: Abrimos la caché dinámica y guardamos la nueva respuesta
            caches.open(DYNAMIC_CACHE).then((cache) => {
              console.log(
                `[Dynamic Cache] Guardando en caché: ${event.request.url}`
              )
              cache.put(event.request, responseToCache)
            })

            // 6. DEVOLVER: Devolvemos la respuesta de la red al navegador
            return networkResponse
          })
          .catch((error) => {
            // 7. FALLA TOTAL: Tanto caché como red fallaron
            console.error(
              `[Dynamic Cache] Error total para: ${event.request.url}`,
              error
            )
            // Opcional: Devolver un recurso de fallback genérico
          })
      })
    )
    return
  }

  // 3. ESTRATEGIA NETWORK FIRST para otras peticiones
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response
      })
      .catch(() => {
        return caches.match(event.request)
      })
  )
})
