// ЛР9–10: журнал и права UI проверяются с фикстурами, production не используется.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = createRequire(path.resolve('react-app/package.json'))('@playwright/test');
(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const base = process.env.BOOKNEST_UI_URL || 'http://127.0.0.1:4173';
  const folder = '.tools/librarian-qa'; fs.mkdirSync(folder, { recursive: true });
  let role = 'librarian', reads = 0, fail = false, deny = false;
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const events = Array.from({ length: 25 }, (_, i) => ({ id: 25-i, user_id: i === 0 ? null : 1, method: i%2 ? 'PATCH' : 'POST', path: i === 2 ? '<img src=x onerror=alert(1)>' : `/api/v1/books/${25-i}`, created_at: '2026-11-12T08:00:00Z' }));
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url()); const reply = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (url.pathname.endsWith('/auth/refresh')) return role ? reply({ access_token: 'fixture-only', token_type: 'bearer' }) : reply({}, 401);
    if (url.pathname.endsWith('/auth/me')) return reply({ id: 1, email: 'staff-ui@example.test', role });
    if (url.pathname.endsWith('/audit-events')) {
      reads++; if (deny) return reply({ message: 'Недостаточно прав' }, 403);
      if (fail) { fail = false; return reply({ message: 'Учебный отказ чтения' }, 503); }
      const method = url.searchParams.get('method'); const filtered = events.filter(item => !method || item.method === method);
      const current = Number(url.searchParams.get('page') || 1);
      return reply({ items: filtered.slice((current-1)*20, current*20), total: filtered.length, page: current, size: 20 });
    }
    return reply({ items: [], total: 0, page: 1, size: 20 });
  });
  const shot = name => page.screenshot({ path: `${folder}/${name}.png`, animations: 'disabled' });
  try {
    await page.goto(base + '/librarian'); await page.getByText('Записи 1–20 из 25', { exact: true }).waitFor();
    await page.getByRole('link', { name: 'Библиотекарю', exact: true }).waitFor();
    const links = page.getByRole('navigation', { name: 'Действия библиотекаря', exact: true });
    assert.equal(await links.getByRole('link').count(), 6);
    assert.equal(await links.getByRole('link', { name: /Добавить книгу/ }).getAttribute('href'), '/books/new');
    assert.equal(await links.getByRole('link', { name: /Просроченные выдачи/ }).getAttribute('href'), '/loans?state=overdue');
    await page.getByText('Запись №25 · Пользователь больше недоступен', { exact: true }).waitFor();
    await page.getByText('<img src=x onerror=alert(1)>', { exact: true }).waitFor();
    assert.equal(await page.locator('.audit-list img, .audit-list script, .audit-list a').count(), 0);
    await shot('desktop');
    await page.getByRole('heading', { name: 'Журнал действий каталога', exact: true }).evaluate(item => item.scrollIntoView({ block: 'start' })); await shot('journal');
    await page.getByRole('button', { name: 'Следующая', exact: true }).click();
    await page.getByText('Записи 21–25 из 25', { exact: true }).waitFor();
    await page.getByRole('combobox', { name: 'Действие в журнале', exact: true }).selectOption('PATCH');
    await page.getByText('Записи 1–12 из 12', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('page'), null);
    assert.equal(await page.locator('.audit-list li').count(), 12);
    await page.getByRole('combobox', { name: 'Действие в журнале', exact: true }).selectOption('DELETE');
    await page.getByRole('heading', { name: 'Таких действий пока нет', exact: true }).waitFor();
    fail = true; await page.getByRole('button', { name: 'Обновить журнал', exact: true }).click();
    await page.getByRole('alert').waitFor(); await page.getByRole('button', { name: 'Повторить', exact: true }).click();
    await page.getByRole('heading', { name: 'Таких действий пока нет', exact: true }).waitFor();
    await page.goto(base + '/librarian?page=999'); await page.getByText('Записи 21–25 из 25', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('page'), '2');
    await page.goto(base + '/librarian'); await page.getByText('Записи 1–20 из 25', { exact: true }).waitFor();
    for (const width of [320,375,768,1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Переполнение ${width}`);
      if (width === 375) await shot('mobile');
    }
    await page.getByRole('button', { name: 'Тёмная тема', exact: true }).click(); await shot('dark');
    deny = true; await page.getByRole('button', { name: 'Обновить журнал', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'только библиотекарю' }).waitFor(); assert.equal(await page.locator('.audit-list').count(), 0);
    role = 'member'; const previous = reads; await page.reload();
    await page.getByRole('heading', { name: 'Недостаточно прав', exact: true }).waitFor();
    assert.equal(reads, previous); assert.equal(await page.getByRole('link', { name: 'Библиотекарю', exact: true }).count(), 0); await shot('denied');
    role = null; await page.reload(); await page.waitForURL('**/login'); assert.equal(reads, previous);
    assert.deepEqual(errors, []);
    const result = { source: 'Local production build; fixture API; SQL permissions tested separately on local PostgreSQL', sixExistingActionLinks: true, journalPagination: true, methodFilterResetsPage: true, nullUserHandled: true, historicalPathIsText: true, emptyFilter: true, retryAfterReadFailure: true, outOfRangeCorrected: true, server403HidesRows: true, memberDeniedWithoutRead: true, guestLoginWithoutRead: true, widths: [320,375,768,1280], overflow: false, darkTheme: true, pageErrors: errors };
    fs.writeFileSync(`${folder}/results.json`, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
