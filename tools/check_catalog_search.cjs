// ЛР10: браузерная проверка каталога с учебными ответами собственного API.
// SQL проверяется отдельно pytest на локальной _test БД; Neon/Render не используются.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = createRequire(path.resolve('react-app/package.json'))('@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
  const base = process.env.BOOKNEST_UI_URL || 'http://127.0.0.1:4173';
  const folder = '.tools/catalog-search-qa';
  fs.mkdirSync(folder, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  const requests = [];
  const books = Array.from({ length: 55 }, (_, index) => {
    const id = index + 1;
    return { id, title: `Каталог ${String(id).padStart(3, '0')}`, author: id >= 41 && id <= 45 ? 'Джон Толкин' : `Автор ${id}`, author_id: id, year: 1900 + id, edition_year: 1900 + id, available: id % 3 === 0 ? 0 : 2, total_copies: 2, genre: 'poetry', cover_id: null, description: 'Учебная страница книги', publisher: 'Учебное издательство', pages: 150, language: 'ru', isbn: null };
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.pathname.endsWith('/auth/refresh')) return reply({ message: 'Учебный гостевой сеанс' }, 401);
    if (/\/books\/\d+$/.test(url.pathname)) return reply(books.find(book => book.id === Number(url.pathname.split('/').at(-1))));
    if (url.pathname.endsWith('/books')) {
      const query = (url.searchParams.get('q') || '').toLocaleLowerCase('ru');
      const number = Number(url.searchParams.get('page'));
      const sort = url.searchParams.get('sort');
      const genre = url.searchParams.get('genre');
      const available = url.searchParams.get('available_only') === 'true';
      requests.push({ query, page: number, sort, genre, available });
      let items = books.filter(book => (book.title.toLocaleLowerCase('ru').includes(query) || book.author.toLocaleLowerCase('ru').includes(query)) && (!genre || genre === book.genre) && (!available || book.available > 0));
      items = items.sort((a, b) => sort === '-year' ? b.year - a.year : sort === 'year' ? a.year - b.year : sort === '-title' ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title));
      await new Promise(resolve => setTimeout(resolve, 150));
      return reply({ items: items.slice((number - 1) * 20, number * 20), total: items.length, page: number, size: 20 });
    }
    return reply({ message: 'Учебный маршрут отсутствует' }, 404);
  });
  try {
    const initial = '/books?q=Каталог&page=2&genre=poetry&available=1&sort=-year';
    await page.goto(base + initial);
    await page.getByText('Показаны 21–37 из 37', { exact: false }).waitFor();
    assert.equal(await page.getByRole('article').count(), 17);
    await page.getByRole('group', { name: 'Активные фильтры' }).waitFor();
    await page.screenshot({ path: `${folder}/filters-desktop.png` });
    const details = page.getByRole('button', { name: 'Подробнее', exact: true }).first();
    await details.scrollIntoViewIfNeeded();
    const top = await page.evaluate(() => scrollY);
    await details.click();
    await page.getByText('Учебная страница книги', { exact: true }).waitFor();
    await page.getByRole('link', { name: 'Вернуться в каталог', exact: true }).click();
    await page.getByText('Показаны 21–37 из 37', { exact: false }).waitFor();
    assert.equal(new URL(page.url()).search, new URL(base + initial).search);
    await page.waitForFunction(value => Math.abs(scrollY - value) <= 2, top);
    await page.getByRole('button', { name: 'Убрать фильтр жанра', exact: true }).click();
    await page.getByText('Показаны 1–20 из 37', { exact: false }).waitFor();
    const filteredUrl = new URL(page.url());
    assert.equal(filteredUrl.searchParams.has('genre'), false);
    assert.equal(filteredUrl.searchParams.get('available'), '1');
    assert.equal(filteredUrl.searchParams.get('sort'), '-year');
    await page.getByRole('button', { name: 'Сбросить фильтры', exact: true }).click();
    await page.getByText('Найдено: 55', { exact: true }).waitFor();
    await page.getByRole('textbox', { name: 'Поиск по названию или автору', exact: true }).fill('  толкин  ');
    await page.getByRole('button', { name: 'Найти', exact: true }).click();
    await page.getByText('Найдено: 5', { exact: true }).waitFor();
    assert.equal(await page.getByRole('article').count(), 5);
    await page.screenshot({ path: `${folder}/author-search.png` });
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Переполнение ${width}`);
      if (width === 375) await page.screenshot({ path: `${folder}/filters-mobile.png` });
    }
    await page.getByRole('button', { name: 'Тёмная тема', exact: true }).click();
    await page.locator('.app[data-theme="dark"]').waitFor();
    await page.screenshot({ path: `${folder}/filters-dark.png` });
    await page.goto(base + '/books?page=9999');
    await page.getByText('Показаны 41–55 из 55', { exact: false }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('page'), '3');
    const countBeforeInvalid = requests.length;
    await page.goto(base + '/books?page=Infinity&sort=bad&genre=unknown&available=0');
    await page.getByText('Показаны 1–20 из 55', { exact: false }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('page'), '1');
    assert(requests.slice(countBeforeInvalid).every(request => request.page === 1 && request.sort === 'title' && !request.genre && !request.available));
    await page.getByRole('textbox', { name: 'Поиск по названию или автору', exact: true }).fill('Нет такой книги');
    await page.getByRole('button', { name: 'Найти', exact: true }).click();
    await page.getByRole('heading', { name: 'Книги не найдены', exact: true }).waitFor();
    await page.getByRole('link', { name: 'Попробовать глобальный поиск в Open Library', exact: true }).click();
    assert.equal(new URL(page.url()).pathname, '/discover');
    assert.deepEqual(errors, []);
    const result = { source: 'Локальная production-сборка с 55 учебными книгами; API фикстурные, SQL проверяется отдельно', directFilters: true, rangeUsesTotal: true, returnPreservesUrlAndScroll: true, removeOneFilterKeepsOthers: true, resetAll: true, authorSearchBeyondFirstThirty: true, outOfRangeGoesToLastPage: true, invalidUrlNormalizedBeforeApi: true, emptyStateLinksToExternalSearch: true, darkTheme: true, widths: [320, 375, 768, 1280], horizontalOverflow: false, pageErrors: errors };
    fs.writeFileSync(`${folder}/results.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
