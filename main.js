// Registro del Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log(
          '✅ Service Worker registrado exitosamente:',
          registration.scope
        )
      })
      .catch((error) => {
        console.log('❌ Error al registrar el Service Worker:', error)
      })
  })
}

// Mensaje de instalación de PWA
let deferredPrompt

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  console.log('💡 La aplicación puede ser instalada')
})

// Confirmar instalación
window.addEventListener('appinstalled', () => {
  console.log('✅ PWA instalada exitosamente')
  deferredPrompt = null
})
