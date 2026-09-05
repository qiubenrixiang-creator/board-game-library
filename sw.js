/* Board Game Library — service worker
   HTMLは「まず通信を試し、失敗したら保存版を使う」方式（network-first）。
   これにより、サイトを更新したときに古い画面が残り続ける問題を防ぐ。
   アイコンなどの変わらないファイルは保存優先（キャッシュファースト）で高速表示。
   library.json は毎回ネットワークを見に行き、失敗したらキャッシュを使う。 */
const CACHE = 'bgl-v5';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isHtmlRequest(req, url){
  return req.mode === 'navigate' ||
         url.pathname.endsWith('/') ||
         url.pathname.endsWith('index.html');
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;

  // library.json と index.html（本体）は network-first：
  // 通信できる時は必ず最新を取りに行き、オフラインの時だけ保存版で表示する。
  if(url.pathname.endsWith('library.json') || isHtmlRequest(req, url)){
    e.respondWith(
      fetch(req, {cache:'no-store'}).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // アイコンなど変わらないファイルは cache-first のまま（高速表示・オフライン対応）
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
