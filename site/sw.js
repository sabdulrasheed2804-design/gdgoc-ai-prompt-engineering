// A registered fetch handler is one of Chrome's install-eligibility
// requirements for the "Add to Home Screen" prompt to fire -- this file
// exists to satisfy that, not to provide offline caching. It passes every
// request straight through to the network.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
