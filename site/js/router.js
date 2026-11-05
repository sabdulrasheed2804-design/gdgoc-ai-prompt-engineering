export function resolveRoute(routes, hash, fallback) {
  const key = (hash || '').replace(/^#/, '');
  return Object.hasOwn(routes, key) ? key : fallback;
}

export function initRouter(mountEl, routes, { fallback, navEl } = {}) {
  async function render() {
    const key = resolveRoute(routes, window.location.hash, fallback);
    await routes[key](mountEl);
    if (navEl) {
      navEl.querySelectorAll('[data-route]').forEach((link) => {
        link.classList.toggle('is-active', link.dataset.route === key);
      });
    }
  }
  window.addEventListener('hashchange', render);
  render();
  return { refresh: render };
}
