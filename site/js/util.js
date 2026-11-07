export function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Client-side form validation (e.g. profile.js's registration form) is not
// a security boundary -- a direct Firestore write can set any string into
// a URL field (githubUrl, repoUrl, ...). Never render such a field as an
// href without this check first, or a "javascript:" scheme becomes a
// clickable self-XSS against whoever views it (e.g. an admin reviewing a
// milestone submission).
export function isHttpUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}
