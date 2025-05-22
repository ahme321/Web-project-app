const CACHE_NAME = 'spotify-clone-cache-v1';
const OFFLINE_SONGS_CACHE = 'offline-songs-cache-v1';

// Files to cache on install
const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/liked-songs.html',
    '/CSS/styles.css',
    '/js/musicPlayer.js',
    '/js/liked-songs.js',
    '/js/config.js',
    '/js/common.js'
];

// Install event - cache the app shell
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching app shell files...');
                return cache.addAll(FILES_TO_CACHE);
            })
            .then(() => {
                console.log('App shell files cached successfully');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Error caching app shell files:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_SONGS_CACHE) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker activated and old caches cleaned up');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
    // Handle OPTIONS requests for CORS preflight
    if (event.request.method === 'OPTIONS') {
        event.respondWith(
            new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Range'
                }
            })
        );
        return;
    }

    // Skip caching for non-GET requests
    if (event.request.method !== 'GET') {
        event.respondWith(fetch(event.request));
        return;
    }

    // Handle cross-origin requests to the backend
    if (event.request.url.startsWith('http://localhost:3001')) {
        event.respondWith(
            (async () => {
                try {
                    // Try to get from cache first
                    const cachedResponse = await caches.match(event.request);
                    if (cachedResponse) {
                        console.log('Serving from cache:', event.request.url);
                        return cachedResponse;
                    }

                    // If not in cache, try to fetch from network
                    console.log('Fetching from network:', event.request.url);
                    const response = await fetch(event.request, {
                        mode: 'cors',
                        credentials: 'omit',
                        headers: {
                            'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8'
                        }
                    });
                    
                    if (!response || response.status !== 200) {
                        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
                    }

                    // Cache the response
                    const responseToCache = response.clone();
                    const cache = await caches.open(OFFLINE_SONGS_CACHE);
                    await cache.put(event.request, responseToCache);
                    
                    return response;
                } catch (error) {
                    console.error('Fetch failed:', error);
                    // Try to get from cache as fallback
                    const cachedResponse = await caches.match(event.request);
                    if (cachedResponse) {
                        console.log('Serving from cache after fetch failure:', event.request.url);
                        return cachedResponse;
                    }
                    // If we have a cached response in the offline songs cache, use that
                    const offlineCache = await caches.open(OFFLINE_SONGS_CACHE);
                    const offlineResponse = await offlineCache.match(event.request);
                    if (offlineResponse) {
                        console.log('Serving from offline cache:', event.request.url);
                        return offlineResponse;
                    }
                    throw error;
                }
            })()
        );
        return;
    }

    // Handle same-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        (async () => {
            try {
                // Try to get from cache first
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                    console.log('Serving from cache:', event.request.url);
                    return cachedResponse;
                }

                // If not in cache, try to fetch from network
                console.log('Fetching from network:', event.request.url);
                const response = await fetch(event.request);
                
                if (!response || response.status !== 200) {
                    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
                }

                // Cache the response
                const responseToCache = response.clone();
                const cache = await caches.open(CACHE_NAME);
                await cache.put(event.request, responseToCache);
                
                return response;
            } catch (error) {
                console.error('Fetch failed:', error);
                // Try to get from cache as fallback
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                    console.log('Serving from cache after fetch failure:', event.request.url);
                    return cachedResponse;
                }
                throw error;
            }
        })()
    );
});

// Message event - handle caching songs
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CACHE_SONG') {
        console.log('Received message to cache song:', event.data.songData.title);
        event.waitUntil(
            (async () => {
                try {
                    // Open the offline songs cache
                    const cache = await caches.open(OFFLINE_SONGS_CACHE);
                    console.log('Caching song data for:', event.data.songData.title);
                    
                    // Cache the song data
                    await cache.put(
                        `/song-data/${event.data.songData.id}`,
                        new Response(JSON.stringify(event.data.songData))
                    );
                    
                    // Cache the audio file
                    const audioUrl = event.data.songUrl;
                    console.log('Caching audio file:', audioUrl);
                    
                    try {
                        const audioResponse = await fetch(audioUrl);
                        if (!audioResponse.ok) {
                            throw new Error(`Failed to fetch audio file: ${audioResponse.status} ${audioResponse.statusText}`);
                        }
                        await cache.put(audioUrl, audioResponse);
                        console.log('Successfully cached audio file for:', event.data.songData.title);
                    } catch (error) {
                        console.error('Error caching audio file:', error);
                        // Don't throw the error, just log it
                        // This allows the song data to be cached even if the audio file fails
                    }
                    
                    // Cache the cover image if it exists
                    if (event.data.songData.cover_url) {
                        try {
                            const coverUrl = event.data.songData.cover_url;
                            console.log('Caching cover image:', coverUrl);
                            const coverResponse = await fetch(coverUrl);
                            if (coverResponse.ok) {
                                await cache.put(coverUrl, coverResponse);
                                console.log('Successfully cached cover image for:', event.data.songData.title);
                            }
                        } catch (error) {
                            console.error('Error caching cover image:', error);
                            // Don't throw the error, just log it
                        }
                    }
                    
                    console.log('Successfully cached song:', event.data.songData.title);
                } catch (error) {
                    console.error('Error caching song:', error);
                }
            })()
        );
    }
}); 