// Service Worker for Fix My Barangay PWA
// Simplified version to avoid conflicts with authentication

const CACHE_NAME = 'fix-my-barangay-v2';
const STATIC_CACHE = 'static-v2';

// Files to cache for offline functionality (minimal for MVP)
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json',
];

// Install event - cache only essential offline assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching offline assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Offline assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.skipWaiting())
      .then(() => self.clients.claim())
  );
});

// Fetch event - minimal handling to avoid auth conflicts
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip authentication-related requests to avoid conflicts with Clerk
  if (url.pathname.includes('/admin') || 
      url.pathname.includes('/sign-in') || 
      url.pathname.includes('/sign-up') ||
      url.pathname.includes('/api/auth') ||
      url.pathname.includes('clerk')) {
    return;
  }

  // Only handle GET requests for static assets and offline fallback
  if (request.method === 'GET') {
    event.respondWith(handleRequest(request));
  }
});

// Simple request handler with offline fallback
async function handleRequest(request) {
  try {
    // Always try network first for dynamic content
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.log('[SW] Network failed, checking for offline fallback');
    
    // Only provide offline fallback for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    // Re-throw error if no offline fallback available
    throw error;
  }
}

// Handle messages from the main thread for PWA features
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker loaded');