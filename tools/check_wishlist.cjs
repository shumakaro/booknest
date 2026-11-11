// ЛР10: проверка личного желаемого в локальной сборке с учебным API.
// Изоляция настоящей БД проверяется pytest отдельно; production не используется.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = createRequire(path.resolve('react-app/package.json'))('@playwright/test');
(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const base = process.env.BOOKNEST_UI_URL || 'http://127.0.0.1:4173';
  const folder = '.tools/wishlist-qa'; fs.mkdirSync(folder, { recursive: true });
  const errors = []; const readPages = []; let deletes = 0; let adds = 0; let account = 1;
  const books = Array.from({ length: 102 }, (_, index) => ({ id: index + 1, title: index === 100 ? 'Последняя книга Толкина' : `Книга ${String(index + 1).padStart(3, '0')}`, author: index === 100 ? 'Толкин' : 'Автор', author_id: 1, year: 2000 + index % 20, edition_year: 2020, available: index === 100 ? 2 : index % 2, total_copies: 2, genre: 'fiction', cover_id: null, isbn: null, publisher: 'Издательство', pages: 200, language: 'ru', description: 'Учебные сведения' }));
  const saved = new Map([[1, new Set(books.map(book => book.id))], [2, new Set()]]);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url()); const method = route.request().method();
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.pathname.endsWith('/auth/refresh')) return account ? reply({ access_token: 'fixture-only', token_type: 'bearer' }) : reply({ message: 'Учебный гость' }, 401);
    if (url.pathname.endsWith('/auth/me')) return reply({ id: account, email: `fixture${account}@example.com`, role: 'member' });
    if (url.pathname.endsWith('/wishlist')) {
      const number = Number(url.searchParams.get('page')); readPages.push({ account, page: number });
      const items = books.filter(book => saved.get(account)?.has(book.id));
      return reply({ items: items.slice((number - 1) * 100, number * 100), total: items.length, page: number, size: 100 });
    }
    if (url.pathname.endsWith('/wishlist/101')) {
      await new Promise(resolve => setTimeout(resolve, 350));
      if (method === 'DELETE') { deletes += 1; if (deletes === 1) return reply({ message: 'Учебный отказ удаления' }, 503); saved.get(account).delete(101); }
      else { adds += 1; if (adds === 1) return reply({ message: 'Учебный отказ сохранения' }, 503); saved.get(account).add(101); }
      return route.fulfill({ status: 204 });
    }
    if (url.pathname.endsWith('/books/101')) return reply(books[100]);
    return reply({ message: 'Учебный маршрут отсутствует' }, 404);
  });
  const shot = name => page.screenshot({ path: `${folder}/${name}.png`, animations: 'disabled' });
  try {
    await page.goto(base + '/wishlist');
    await page.getByText('В желаемом: 102. Показано: 102.', { exact: true }).waitFor();
    assert.deepEqual(readPages.slice(0, 2).map(item => item.page), [1, 2]);
    await page.getByRole('searchbox', { name: 'Поиск в желаемом', exact: true }).fill('толкин');
    await page.getByText('В желаемом: 102. Показано: 1.', { exact: true }).waitFor();
    await page.getByRole('checkbox', { name: 'Только доступные', exact: true }).check();
    await page.getByRole('combobox', { name: 'Сортировка желаемого', exact: true }).selectOption('-year');
    await shot('desktop');
    await page.getByText('Показать таблицу желаемого', { exact: true }).click();
    await page.getByRole('table').waitFor();
    const card = page.getByRole('article', { name: 'Последняя книга Толкина', exact: true });
    await card.getByRole('button', { name: 'Подробнее', exact: true }).scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => scrollY); const beforeUrl = new URL(page.url()).search;
    await card.getByRole('button', { name: 'Подробнее', exact: true }).click();
    await page.getByRole('button', { name: 'Удалить из желаемого', exact: true }).waitFor();
    await page.getByRole('link', { name: 'Вернуться в желаемое', exact: true }).click();
    await page.getByText('В желаемом: 102. Показано: 1.', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).search, beforeUrl);
    await page.waitForFunction(top => Math.abs(scrollY - top) <= 2, before);
    await page.getByRole('button', { name: 'Удалить из желаемого', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Изменение отменено.' }).waitFor();
    await page.getByRole('heading', { name: 'Последняя книга Толкина', exact: true }).waitFor();
    await shot('rollback');
    await page.getByRole('button', { name: 'Удалить из желаемого', exact: true }).click();
    await page.getByRole('heading', { name: 'В желаемом нет совпадений', exact: true }).waitFor();
    // Ждем завершения записи, а не только оптимистичного изменения интерфейса.
    await page.waitForFunction(() => !document.body.textContent.includes('Обновляем желаемое…'));
    assert.equal(saved.get(1).has(101), false);
    await page.goto(base + '/books/101');
    await page.getByRole('button', { name: 'В желаемое', exact: true }).click();
    const pending = page.getByRole('button', { name: 'Обновляем желаемое…', exact: true });
    await pending.waitFor(); assert.equal(await pending.isDisabled(), true);
    await page.getByRole('alert').filter({ hasText: 'Изменение отменено.' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'В желаемое', exact: true }).getAttribute('aria-pressed'), 'false');
    await page.getByRole('button', { name: 'В желаемое', exact: true }).click();
    await page.getByRole('button', { name: 'Удалить из желаемого', exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('[aria-label="Желаемое книги"] button').disabled);
    assert.equal(saved.get(1).has(101), true);
    await page.goto(base + '/wishlist?q=толкин');
    await page.getByText('В желаемом: 102. Показано: 1.', { exact: true }).waitFor();
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Переполнение ${width}`);
      if (width === 375) await shot('mobile');
    }
    await page.getByRole('button', { name: 'Тёмная тема', exact: true }).click(); await shot('dark');
    account = 2; await page.reload();
    await page.getByRole('heading', { name: 'Список желаемого пуст', exact: true }).waitFor();
    assert.equal(await page.getByRole('article').count(), 0);
    await page.getByRole('link', { name: 'Выбрать книги в библиотеке', exact: true }).waitFor();
    const count = readPages.length;
    account = null; await page.reload(); await page.waitForURL('**/login');
    assert.equal(readPages.length, count);
    assert.deepEqual(errors, []);
    const result = { source: 'Local production build; fixture private API; no production data', all102BooksRead: true, authorBeyondFirst100Found: true, availabilityAndSort: true, oldTablePreserved: true, detailReturnKeepsFiltersAndScroll: true, failedDeleteRollsBack: true, retryDelete: true, detailSaveRollsBackAndRetries: true, pendingDisabled: true, accountSwitchHasNoOldBooks: true, guestRedirectWithoutPrivateRead: true, emptyListDistinctFromNoMatches: true, widths: [320,375,768,1280], overflow: false, darkTheme: true, pageErrors: errors };
    fs.writeFileSync(`${folder}/results.json`, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
