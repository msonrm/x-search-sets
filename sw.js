const CACHE_NAME = 'sagasun-x-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'
];

// インストール時の処理
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // 新しいService Workerをすぐにアクティブにする
        return self.skipWaiting();
      })
  );
});

// アクティベート時の処理
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 古いキャッシュを削除
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // 全てのクライアントを制御下に置く
      return self.clients.claim();
    })
  );
});

// フェッチ時の処理
self.addEventListener('fetch', (event) => {
  // X(Twitter)のURLは直接アクセスを許可
  if (event.request.url.includes('x.com') || event.request.url.includes('twitter.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュがあればそれを返す
        if (response) {
          return response;
        }
        
        // ネットワークからフェッチ
        return fetch(event.request).then((response) => {
          // 有効なレスポンスでない場合はそのまま返す
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // レスポンスをクローンしてキャッシュに保存
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(() => {
          // オフライン時のフォールバック
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
        });
      })
  );
});

// メッセージ受信時の処理
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// バックグラウンド同期（オプション）
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync');
    // バックグラウンドでの同期処理をここに追加
  }
});

// プッシュ通知（オプション）
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'さがすんXからの通知',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'sagasun-x-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: '開く'
      },
      {
        action: 'close',
        title: '閉じる'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('さがすんX', options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click');
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
