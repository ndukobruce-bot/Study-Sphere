const STUDYSPHERE_CACHE = "studysphere-v2";
const CORE_ASSETS = [
  "index.html",
  "login.html",
  "dashboard.html",
  "onboarding.html",
  "autopilot.html",
  "reminders.html",
  "summarizer.html",
  "exam-mode.html",
  "report.html",
  "tasks.html",
  "timer.html",
  "game.html",
  "css/style.css",
  "js/app.js",
  "js/auth.js",
  "js/smart-tools.js",
  "js/landing.js",
  "manifest.json",
  "assets/images/studysphere-icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STUDYSPHERE_CACHE).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== STUDYSPHERE_CACHE).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(STUDYSPHERE_CACHE).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match("index.html"));
    })
  );
});
