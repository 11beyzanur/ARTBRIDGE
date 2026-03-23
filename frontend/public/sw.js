self.addEventListener("install", (event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

// Lightweight network-first strategy for navigation requests
self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
})

