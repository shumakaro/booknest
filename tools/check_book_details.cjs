// ЛР10: страницы деталей и импорт проверяются на локальной сборке с учебным API.
// Серверная идемпотентность проверяется отдельно pytest; production не используется.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = createRequire(path.resolve('react-app/package.json'))('@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
  const base = process.env.BOOKNEST_UI_URL || 'http://127.0.0.1:4173';
  const folder = '.tools/book-details-qa';
  fs.mkdirSync(folder, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  let role = null;
  let imports = 0;
  const payloads = [];
  const localBook = { id: 7, title: 'Название сохранено библиотекарем', author: 'Первый автор', author_id: 1, year: 2001, edition_year: 2001, available: 3, total_copies: 3, genre: 'fiction', cover_id: 101, external_work_id: 'OL1W', description: 'Описание книги в моей библиотеке.', publisher: null, language: '', pages: null, isbn: null };
  const external = { id: 'OL1W', title: 'Внешняя история с длинным названием для проверки переноса на мобильном экране', authors: ['Первый автор', 'Второй автор'], year: null, cover_id: 102, description: 'Это описание внешнего произведения.\n'.repeat(40) + '<img src=x onerror="window.untrusted=true"> Конец полного описания.', notice: null };
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://covers.openlibrary.org/**', route => {
    if (route.request().url().includes('/102-')) return route.abort();
    return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="400"><rect width="280" height="400" fill="#526451"/><text x="140" y="180" text-anchor="middle" fill="#fff6e5" font-size="26">BOOKNEST</text><text x="140" y="225" text-anchor="middle" fill="#fff6e5" font-size="16">Учебная обложка</text></svg>' });
  });
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.pathname.endsWith('/auth/refresh')) return role ? reply({ access_token: 'ui-fixture-only', token_type: 'bearer' }) : reply({ message: 'Учебный гость' }, 401);
    if (url.pathname.endsWith('/auth/me')) return reply({ id: 1, email: 'fixture@example.com', role });
    if (url.pathname.endsWith('/discover/books/OL1W')) return reply(external);
    if (url.pathname.endsWith('/discover/books/OL2W')) return reply({ ...external, id: 'OL2W', authors: [], year: 2000, description: '' });
    if (url.pathname.endsWith('/discover/imports')) {
      imports += 1; payloads.push(route.request().postDataJSON());
      await new Promise(resolve => setTimeout(resolve, 400));
      return imports === 1 ? reply({ message: 'Учебный временный сбой импорта' }, 503) : reply(localBook, 200);
    }
    if (url.pathname.endsWith('/books/7')) return reply(localBook);
    if (url.pathname.endsWith('/books/2')) return reply({ ...localBook, id: 2, available: 0 });
    return reply({ message: 'Учебная запись не найдена' }, 404);
  });
  try {
    await page.goto(base + '/books/7');
    await page.getByRole('heading', { name: localBook.title, exact: true }).waitFor();
    await page.getByRole('img', { name: `Обложка книги ${localBook.title}`, exact: true }).evaluate(image => image.decode());
    assert(await page.getByText('Не указано', { exact: true }).count() >= 3);
    assert.equal(await page.getByRole('link', { name: 'Редактировать книгу', exact: true }).count(), 0);
    await page.screenshot({ path: `${folder}/local-desktop.png`, fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Войти, чтобы взять книгу', exact: true }).click();
    assert.equal(new URL(page.url()).pathname, '/login');
    role = 'member';
    await page.goto(base + '/books/2');
    await page.getByText('Все экземпляры выданы', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Взять книгу', exact: true }).isDisabled(), true);
    await page.goto(base + '/discover/OL1W');
    await page.getByRole('heading', { name: external.title, exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Добавить в библиотеку', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Взять книгу', exact: true }).count(), 0);
    role = 'librarian';
    await page.reload();
    await page.getByRole('button', { name: 'Добавить в библиотеку', exact: true }).waitFor();
    await page.getByRole('img', { name: /отсутствует или недоступна/ }).waitFor();
    await page.getByRole('button', { name: 'Читать полностью', exact: true }).click();
    await page.getByText(/Конец полного описания/).waitFor();
    assert.equal(await page.locator('img[src="x"]').count(), 0);
    assert.equal(await page.evaluate(() => window.untrusted), undefined);
    await page.getByRole('button', { name: 'Свернуть описание', exact: true }).click();
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Переполнение внешней детали ${width}`);
      if (width === 375) await page.screenshot({ path: `${folder}/external-mobile.png`, fullPage: true, animations: 'disabled' });
    }
    await page.screenshot({ path: `${folder}/external-import.png`, fullPage: true, animations: 'disabled' });
    const add = page.getByRole('button', { name: 'Добавить в библиотеку', exact: true });
    await add.click();
    assert.equal(imports, 0, 'Неизвестный год не должен подменяться автоматически');
    await page.getByRole('spinbutton', { name: 'Год первой публикации', exact: true }).fill('2001');
    await page.getByRole('spinbutton', { name: 'Количество экземпляров', exact: true }).fill('2');
    await add.click();
    const pending = page.getByRole('button', { name: 'Добавляем…', exact: true });
    await pending.waitFor();
    assert.equal(await pending.isDisabled(), true);
    assert.equal(await page.getByRole('spinbutton', { name: 'Количество экземпляров', exact: true }).isDisabled(), true);
    await page.getByRole('form', { name: 'Параметры импорта', exact: true }).evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await page.getByRole('alert').filter({ hasText: 'Учебный временный сбой импорта' }).waitFor();
    assert.equal(imports, 1);
    assert.equal(await page.getByRole('spinbutton', { name: 'Количество экземпляров', exact: true }).inputValue(), '2');
    await page.getByRole('button', { name: 'Добавить в библиотеку', exact: true }).click();
    const imported = page.getByRole('link', { name: 'Открыть библиотечную запись', exact: true });
    await imported.waitFor();
    assert.equal(await page.getByText('Экземпляров в библиотеке: 3', { exact: true }).count(), 1);
    assert.equal(await imported.evaluate(element => document.activeElement === element), true);
    assert.deepEqual(payloads, [{ work_id: 'OL1W', year: 2001, total_copies: 2 }, { work_id: 'OL1W', year: 2001, total_copies: 2 }]);
    await page.screenshot({ path: `${folder}/import-result.png`, fullPage: true, animations: 'disabled' });
    await imported.click();
    await page.getByRole('heading', { name: localBook.title, exact: true }).waitFor();
    await page.getByRole('link', { name: 'Редактировать книгу', exact: true }).waitFor();
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Переполнение ${width}`);
      if (width === 375) await page.screenshot({ path: `${folder}/local-mobile.png`, fullPage: true, animations: 'disabled' });
    }
    await page.getByRole('button', { name: 'Тёмная тема', exact: true }).click();
    await page.locator('.app[data-theme="dark"]').waitFor();
    await page.screenshot({ path: `${folder}/local-dark.png`, fullPage: true, animations: 'disabled' });
    await page.goto(base + '/discover/OL2W');
    await page.getByRole('heading', { name: external.title, exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Добавить в библиотеку', exact: true }).isDisabled(), true);
    assert.deepEqual(errors, []);
    const result = { source: 'Локальная production-сборка; API/обложки учебные; рабочая БД не используется', localCover: true, missingFactsExplicit: true, unavailableLoanDisabled: true, guestGoesToLogin: true, readerHasNoManagementOrImport: true, externalHasNoLocalLoan: true, brokenCoverFallback: true, descriptionExpandCollapse: true, externalHtmlIsText: true, unknownYearNotInvented: true, missingAuthorBlocksImport: true, pendingBlocksFieldsAndDuplicateSubmit: true, failedImportRetainsValues: true, serverResultCopiesPreserved: true, successFocusesLocalLink: true, librarianManagementVisible: true, externalResponsive: true, darkTheme: true, widths: [320, 375, 768, 1280], horizontalOverflow: false, pageErrors: errors };
    fs.writeFileSync(`${folder}/results.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
