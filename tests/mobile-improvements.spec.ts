import { test, expect, type Page } from '@playwright/test';

const user = { id: 'mobile-regression', firstName: 'Alex', role: 'EMPLOYEE', team: { id: 'test', name: 'Équipe test' } };
async function openEmployee(page: Page, path: string) {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.addInitScript(() => localStorage.setItem('CapacitorStorage.moodly.token', 'test-session'));
  let submitted = false;
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: user });
    if (path === '/api/moods/today') return route.fulfill({ json: { hasSubmitted: submitted } });
    if (path === '/api/moods' && route.request().method() === 'POST') { submitted = true; return route.fulfill({ json: { ok: true } }); }
    return route.fulfill({ status: 404, json: { error: { message: 'Route de test non prévue' } } });
  });
  await page.goto(path);
}

test('mobile keeps five tabs and all additional pages accessible', async ({ page }) => {
  await openEmployee(page, '/accueil');
  const nav = page.locator('.mobile-navigation');
  await expect(nav.getByRole('link')).toHaveCount(5);
  await expect(page.getByText('Ton espace bien-être', { exact: true })).toHaveCount(0);
  await nav.getByRole('link', { name: 'Plus', exact: true }).click();
  await expect(page.locator('.more-links a')).toHaveCount(4);
  for (const href of ['/idees', '/aide', '/aide/signalement', '/confiance']) {
    await expect(page.locator(`.more-links a[href="${href}"]`)).toBeVisible();
  }
  await page.locator('.more-links a[href="/confiance"]').click();
  await expect(page.getByRole('heading', { name: 'Ce qui reste à toi.' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Plus', exact: true })).toHaveClass(/active/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/navigation-five-mobile.png', fullPage: true, animations: 'disabled' });
});

test('first mood activates private history and persists with notes across navigation and reload', async ({ page }) => {
  await openEmployee(page, '/humeur');
  await page.getByRole('button', { name: 'Bien', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /Garder cette humeur/ })).toBeChecked();
  await page.getByRole('button', { name: 'Valider mon humeur' }).click();
  await expect(page.getByRole('heading', { name: 'Merci, c’est noté.' })).toBeVisible();
  await page.locator('.mobile-navigation').getByRole('link', { name: 'Mon carnet' }).click();
  await expect(page.locator('.mood-timeline,.journal-controls,.journal-options')).toHaveCount(0);
  await expect(page.locator('.day-card h3')).toHaveText('Bien');
  await expect(page.locator('.calendar-day.today')).toHaveCSS('background-color', 'rgb(255, 216, 77)');
  await expect(page.locator('.calendar-day.today')).toHaveAttribute('aria-label', /Bien/);
  await page.locator('.note-editor textarea').fill('Une bonne journée avec mon équipe.');
  await page.getByRole('button', { name: 'Enregistrer ma note' }).click();
  await expect(page.locator('.calendar-day.today .calendar-note-icon')).toBeVisible();
  await page.reload();
  await expect(page.locator('.day-card h3')).toHaveText('Bien');
  await expect(page.locator('.note-editor textarea')).toHaveValue('Une bonne journée avec mon équipe.');
  await expect(page.locator('.history-list>button')).toHaveCount(1);
  await page.screenshot({ path: 'artifacts/journal-linked-mobile.png', fullPage: true, animations: 'disabled' });
});

test('private copy can be declined without losing successful team submission', async ({ page }) => {
  await openEmployee(page, '/humeur');
  await page.getByRole('button', { name: 'Bof', exact: true }).click();
  await page.getByRole('checkbox', { name: /Garder cette humeur/ }).uncheck();
  await page.getByRole('button', { name: 'Valider mon humeur' }).click();
  await expect(page.getByRole('heading', { name: 'Merci, c’est noté.' })).toBeVisible();
  await page.locator('.mobile-navigation').getByRole('link', { name: 'Mon carnet' }).click();
  await expect(page.locator('.day-card h3')).toHaveText('Une page encore blanche.');
  await expect(page.getByRole('button', { name: 'Activer mon carnet' })).toBeVisible();
});

test('pause controls remain on screen and actual audio follows play, pause, reset and close', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openEmployee(page, '/pauses');
  // Track the real HTML audio element without replacing its playback implementation.
  await page.evaluate(() => {
    const NativeAudio = window.Audio;
    (window as any).Audio = function(src: string) { const audio = new NativeAudio(src); (window as any).__pauseAudio = audio; return audio; };
  });
  await expect(page.getByRole('group', { name: 'Catégories de pauses' })).toHaveCount(0);
  await expect(page.locator('.full-activities>button')).toHaveCount(5);
  const first = page.locator('.full-activities>button').first();
  await first.hover();
  await expect(first).toHaveCSS('transform', 'none');
  const intro = await page.locator('.pause-intro').boundingBox(), grid = await page.locator('.full-activities').boundingBox();
  expect(intro!.y + intro!.height).toBeLessThanOrEqual(grid!.y);
  await page.getByRole('button', { name: /Un souffle à la fois/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect(await page.locator('body>.dialog-backdrop').count()).toBe(1);
  await page.getByRole('button', { name: /Ambiance sonore/ }).click();
  await page.getByRole('button', { name: 'Commencer', exact: true }).click();
  await expect.poll(() => page.evaluate(() => { const a = (window as any).__pauseAudio; return !!a && !a.paused && a.currentTime > 0; })).toBe(true);
  await expect(page.locator('.breathing-ring')).toHaveClass(/is-running/);
  await page.getByRole('button', { name: 'Mettre en pause', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__pauseAudio.paused)).toBe(true);
  await page.getByRole('button', { name: 'Reprendre', exact: true }).or(page.getByRole('button', { name: 'Commencer', exact: true })).click();
  await page.getByRole('button', { name: 'Recommencer la pause' }).click();
  await expect(page.getByText('00:00 / 1:00')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__pauseAudio.paused)).toBe(true);
  await page.getByRole('button', { name: 'Étape suivante' }).click();
  await expect(page.getByText('Suis le cercle si le rythme te convient. Sinon, garde ton rythme naturel.')).toBeVisible();
  await page.getByRole('button', { name: 'Commencer', exact: true }).click();
  await page.screenshot({ path: 'artifacts/pause-audio-mobile.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Fermer la pause' }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__pauseAudio.paused)).toBe(true);
  expect(errors).toEqual([]);
});

test('page navigation always starts at the top, including Back and delayed content', async ({ page }) => {
  await openEmployee(page, '/confiance');
  await expect(page.getByRole('heading', { name: 'Ce qui reste à toi.' })).toBeVisible();
  const nav = page.locator('.mobile-navigation');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  await nav.getByRole('link', { name: 'Mon carnet', exact: true }).click();
  await expect(page).toHaveURL(/\/carnet$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole('button', { name: 'Activer mon carnet', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await nav.getByRole('link', { name: 'Mes pauses', exact: true }).click();
  await expect(page).toHaveURL(/\/pauses$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.goBack();
  await expect(page).toHaveURL(/\/carnet$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.locator('.sidebar-content').getByRole('link', { name: 'Confiance', exact: true }).click();
  await expect(page).toHaveURL(/\/confiance$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
