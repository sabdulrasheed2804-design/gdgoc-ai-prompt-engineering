export function resolveRoute(routes, hash, fallback) {
  // Only the segment before the first "/" or "?" selects the route handler
  // -- a hash like "#roadmap/3" or "#playground?week=3" still runs the
  // "roadmap"/"playground" handler, which reads the rest of
  // window.location.hash itself for its own sub-navigation or query params.
  // Lets one route own a whole area without the router needing to know
  // about its internal structure.
  const key = (hash || '').replace(/^#/, '').split(/[/?]/)[0];
  return Object.hasOwn(routes, key) ? key : fallback;
}

export function createRunner(routes, fallback) {
  let seq = 0;
  return async function run(hash, mountEl) {
    const id = ++seq;
    const key = resolveRoute(routes, hash, fallback);
    try {
      await routes[key](mountEl, () => id !== seq);
    } catch (err) {
      console.error(`route "${key}" failed to render`, err);
      if (id === seq) mountEl.innerHTML = '<p class="route-error">Couldn\'t load this page. Please refresh.</p>';
    }
    return { key, stale: id !== seq };
  };
}

export function initRouter(mountEl, routes, { fallback, navEl } = {}) {
  const run = createRunner(routes, fallback);
  async function render() {
    const { key, stale } = await run(window.location.hash, mountEl);
    if (stale || !navEl) return;
    navEl.querySelectorAll('[data-route]').forEach((link) => {
      link.classList.toggle('is-active', link.dataset.route === key);
    });
  }
  window.addEventListener('hashchange', render);
  render();
  return { refresh: render };
}
