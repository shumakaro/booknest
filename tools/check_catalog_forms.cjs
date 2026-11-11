// ЛР10: CRUD формы проверяются локально с учебными ответами API, без рабочей БД.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = createRequire(path.resolve('react-app/package.json'))('@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
  const base = process.env.BOOKNEST_UI_URL || 'http://127.0.0.1:4173';
  const folder = '.tools/catalog-forms-qa'; fs.mkdirSync(folder, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = []; const posts = []; const patches = []; let deletes = 0; let deleted = false;
  let book = { id: 7, title: 'Проверенная книга', author: 'Автор', author_id: 2, year: 2000, edition_year: 2001, isbn: null, publisher: 'Издательство', language: 'Русский', pages: 150, total_copies: 3, available: 3, genre: 'fiction', description: '', cover_id: null, external_work_id: null };
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url()); const method = route.request().method();
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.pathname.endsWith('/auth/refresh')) return reply({ access_token: 'fixture-only', token_type: 'bearer' });
    if (url.pathname.endsWith('/auth/me')) return reply({ id: 1, role: 'librarian', email: 'fixture@example.com' });
    if (url.pathname.endsWith('/wishlist')) return reply({ items: [], total: 0, page: 1, size: 100 });
    if (url.pathname.endsWith('/authors')) return reply({ items: [{ id: 2, name: 'Автор' }], total: 1, page: 1, size: 100 });
    if (url.pathname.endsWith('/books') && method === 'POST') {
      posts.push(route.request().postDataJSON()); await new Promise(resolve => setTimeout(resolve, 350));
      if (posts.length === 1) return reply({ message: 'ISBN уже используется' }, 409);
      book = { ...book, ...posts.at(-1) }; return reply(book, 201);
    }
    if (url.pathname.endsWith('/books/7') && method === 'PATCH') {
      patches.push(route.request().postDataJSON()); await new Promise(resolve => setTimeout(resolve, 350));
      if (patches.length === 1) { book.publisher = 'Другое издательство'; book.pages = 999; return reply({ message: 'Запись изменилась. Проверьте данные и повторите.' }, 409); }
      book = { ...book, ...patches.at(-1) }; return reply(book);
    }
    if (url.pathname.endsWith('/books/7') && method === 'DELETE') {
      deletes += 1;
      if (deletes === 1) return reply({ message: 'Нельзя удалить книгу с действующими выдачами' }, 409);
      deleted = true; return route.fulfill({ status: 204 });
    }
    if (url.pathname.endsWith('/books/7')) return deleted ? reply({ message: 'Книга не найдена' }, 404) : reply(book);
    if (url.pathname.endsWith('/books')) return reply({ items: deleted ? [] : [book], total: deleted ? 0 : 1, page: 1, size: 20 });
    return reply({ message: 'Учебный маршрут отсутствует' }, 404);
  });
  const shot = name => page.screenshot({ path: `${folder}/${name}.png`, fullPage: true, animations: 'disabled' });
  try {
    await page.goto(base + '/books/new');
    await page.getByRole('button', { name: 'Создать книгу', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Год первой публикации', { exact: true }).inputValue(), '');
    assert.equal(await page.getByLabel('Количество страниц', { exact: true }).inputValue(), '');
    await page.getByRole('button', { name: 'Создать книгу', exact: true }).click();
    await page.getByText('Название должно содержать минимум 2 символа.', { exact: true }).waitFor();
    await page.waitForFunction(() => document.activeElement?.id === 'book-title');
    assert.equal(posts.length, 0);
    const values = { 'Название': 'Проверенная книга', 'Автор': 'Автор', 'ISBN': '9780306406157', 'Издательство': 'Издательство', 'Язык': 'Русский', 'Год первой публикации': '2000', 'Год издания': '2001', 'Количество страниц': '150', 'Количество экземпляров': '3' };
    for (const [label, value] of Object.entries(values)) await page.getByLabel(label, { exact: true }).fill(value);
    await shot('create-desktop');
    await page.getByRole('button', { name: 'Создать книгу', exact: true }).click();
    const pending = page.getByRole('button', { name: 'Сохранение...', exact: true });
    await pending.waitFor(); assert.equal(await page.getByLabel('Название', { exact: true }).isDisabled(), true);
    await page.getByText('ISBN уже используется', { exact: true }).waitFor();
    await page.waitForFunction(() => document.activeElement?.id === 'book-isbn');
    assert.equal(posts.length, 1);
    await page.getByLabel('ISBN', { exact: true }).fill('');
    await page.getByRole('button', { name: 'Создать книгу', exact: true }).click();
    await page.waitForURL('**/books'); assert.equal(posts[1].isbn, null); assert.equal(posts[1].total_copies, 3);
    await page.getByRole('button', { name: 'Подробнее', exact: true }).click();
    await page.getByRole('link', { name: 'Редактировать книгу', exact: true }).click();
    const save = page.getByRole('button', { name: 'Сохранить изменения', exact: true });
    await save.waitFor(); assert.equal(await save.isDisabled(), true);
    assert.equal(await page.getByLabel('ISBN', { exact: true }).inputValue(), '');
    await page.getByLabel('Название', { exact: true }).fill('Проверенная книга изменена');
    await save.click(); await page.getByRole('alert').filter({ hasText: 'Запись изменилась.' }).waitFor();
    assert.equal(await page.getByLabel('Название', { exact: true }).inputValue(), 'Проверенная книга изменена');
    assert.equal(await page.getByLabel('ISBN', { exact: true }).getAttribute('aria-invalid'), 'false');
    await shot('edit-conflict');
    await page.getByRole('button', { name: 'Сохранить изменения', exact: true }).click();
    await page.waitForURL('**/books/7');
    assert.deepEqual(patches, [{ title: 'Проверенная книга изменена' }, { title: 'Проверенная книга изменена' }]);
    assert.equal(book.publisher, 'Другое издательство'); assert.equal(book.pages, 999);
    await page.getByRole('link', { name: 'Редактировать книгу', exact: true }).click();
    await page.getByLabel('Название', { exact: true }).fill('Несохраненная правка');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Отмена', exact: true }).click();
    assert.equal(new URL(page.url()).pathname, '/books/7/edit');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('link', { name: 'Моя библиотека', exact: true }).click();
    assert.equal(new URL(page.url()).pathname, '/books/7/edit');
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Переполнение ${width}`);
      if (width === 375) await shot('edit-mobile');
    }
    await page.getByRole('button', { name: 'Тёмная тема', exact: true }).click(); await shot('edit-dark');
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Отмена', exact: true }).click();
    await page.getByRole('heading', { name: 'Проверенная книга изменена', exact: true }).waitFor();
    assert.equal(patches.length, 2);
    let text = '';
    page.once('dialog', async dialog => { text = dialog.message(); await dialog.dismiss(); });
    await page.getByRole('button', { name: 'Удалить книгу', exact: true }).click();
    assert(text.includes(book.title) && text.includes('история выдач сохранится')); assert.equal(deletes, 0);
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Удалить книгу', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'действующими выдачами' }).waitFor();
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Удалить книгу', exact: true }).click();
    await page.waitForURL('**/books'); assert.equal(deletes, 2);
    assert.deepEqual(errors, []);
    const result = { source: 'Local production build with fixture API; no production data', blankYearsAndPages: true, clientErrorFocus: true, duplicateIsbnFocus: true, pendingDisablesFields: true, createWithoutIsbn: true, copiesConfirmed: true, unchangedEditDisabled: true, partialPatchOnlyTitle: true, unrelatedConcurrentValuesPreserved: true, conflictIsNotAlwaysIsbn: true, dirtyCancelAndLinkProtected: true, cancelDoesNotSave: true, deleteNamesBookAndPreservesHistoryNotice: true, cancelledDeleteSendsNothing: true, deleteConflictAndRetry: true, darkTheme: true, widths: [320,375,768,1280], overflow: false, pageErrors: errors };
    fs.writeFileSync(`${folder}/results.json`, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
