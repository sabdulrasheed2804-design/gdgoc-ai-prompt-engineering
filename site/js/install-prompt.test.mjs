import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectInstallPlatform, shouldShowInstallBanner, renderInstallBanner } from './install-prompt.js';

test('detectInstallPlatform recognizes iOS, Android, and everything else', () => {
  assert.equal(detectInstallPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'ios');
  assert.equal(detectInstallPlatform('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'), 'ios');
  assert.equal(detectInstallPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), 'android');
  assert.equal(detectInstallPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'other');
  assert.equal(detectInstallPlatform(), 'other');
});

test('shouldShowInstallBanner never shows on desktop or while already installed', () => {
  assert.equal(shouldShowInstallBanner({ platform: 'other', isStandalone: false, dismissedAt: null }), false);
  assert.equal(shouldShowInstallBanner({ platform: 'ios', isStandalone: true, dismissedAt: null }), false);
});

test('shouldShowInstallBanner shows on first visit (never dismissed)', () => {
  assert.equal(shouldShowInstallBanner({ platform: 'ios', isStandalone: false, dismissedAt: null }), true);
});

test('shouldShowInstallBanner stays hidden shortly after a dismissal, then returns', () => {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const twentyDaysAgo = now - 20 * 24 * 60 * 60 * 1000;
  assert.equal(shouldShowInstallBanner({ platform: 'android', isStandalone: false, dismissedAt: oneDayAgo, now }), false);
  assert.equal(shouldShowInstallBanner({ platform: 'android', isStandalone: false, dismissedAt: twentyDaysAgo, now }), true);
});

test('renderInstallBanner shows manual Share instructions on iOS and an Install button on Android', () => {
  const ios = renderInstallBanner('ios', 'GDGoC AI');
  assert.match(ios, /Add to Home Screen/);
  assert.doesNotMatch(ios, /data-install-action/);

  const android = renderInstallBanner('android', 'GDGoC AI');
  assert.match(android, /data-install-action/);
  assert.match(android, />Install</);
});

test('renderInstallBanner escapes the app name', () => {
  const html = renderInstallBanner('ios', '<script>bad</script>');
  assert.doesNotMatch(html, /<script>bad<\/script>/);
});
