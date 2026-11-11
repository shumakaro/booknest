// ЛР10: локальная сборка и учебный API; ни один запрос не изменяет рабочую БД.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = createRequire(path.resolve('react-app/package.json'))('@playwright/test');

(async () => {
  const base = process.env.BOOKNEST_UI_URL || 'http://127.0.0.1:4173';
  const folder = '.tools/loans-qa'; fs.mkdirSync(folder, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const day = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-'); };
  const loans = Array.from({ length: 22 }, (_, i) => ({ id: i+1, book_id: i+1, book_title: i === 20 ? 'Последняя копия' : `История книги ${i+1}`, user_id: 1, issued_at: day(-20), due_date: day(i === 0 ? -2 : i === 1 ? 0 : 14), returned_at: i === 21 ? day(-1) : null }));
  let failReturn = true, failRead = false, returns = 0, issues = 0, role = 'member';
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url()); const method = route.request().method();
    const reply = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (url.pathname.endsWith('/auth/refresh')) return reply({ access_token: 'ui-fixture-only', token_type: 'bearer' });
    if (url.pathname.endsWith('/auth/me')) return reply({ id: 1, email: 'loans-ui@example.test', role });
    if (url.pathname.endsWith('/wishlist')) return reply({ items: [], total: 0, page: 1, size: 100 });
    if (url.pathname.endsWith('/loans') && method === 'GET') {
      if (failRead) { failRead = false; return reply({ message: 'Учебная ошибка загрузки' }, 503); }
      const state = url.searchParams.get('state');
      const items = loans.filter(loan => state === 'returned' ? loan.returned_at : state === 'overdue' ? !loan.returned_at && loan.due_date < day(0) : state === 'active' ? !loan.returned_at : true);
      const current = Number(url.searchParams.get('page') || 1);
      return reply({ items: items.slice((current-1)*20, current*20), total: items.length, page: current, size: 20 });
    }
    if (/\/loans\/\d+$/.test(url.pathname) && method === 'PATCH') {
      returns++; await new Promise(resolve => setTimeout(resolve, 450));
      if (failReturn) { failReturn = false; return reply({ message: 'Учебный отказ возврата' }, 503); }
      const loan = loans.find(item => item.id === Number(url.pathname.split('/').pop()));
      if (!loan || loan.returned_at) return reply({ message: 'Книга уже возвращена' }, 409);
      loan.returned_at = day(0); return reply(loan);
    }
    if (/\/books\/\d+\/loans$/.test(url.pathname) && method === 'POST') {
      issues++; await new Promise(resolve => setTimeout(resolve, 450));
      const id = Number(url.pathname.split('/').at(-2));
      const loan = { id: 99, book_id: id, book_title: 'Последняя копия', user_id: 1, issued_at: day(0), due_date: day(14), returned_at: null };
      loans.push(loan); return reply(loan, 201);
    }
    if (/\/books\/\d+$/.test(url.pathname)) {
      const id = Number(url.pathname.split('/').pop());
      return reply({ id, title: id === 21 ? 'Последняя копия' : `История книги ${id}`, author: 'Учебный автор', author_id: 1, year: 2000, edition_year: 2000, total_copies: 1,
        available: loans.some(loan => loan.book_id === id && !loan.returned_at) ? 0 : 1, genre: 'fiction', language: 'Русский', pages: 100, description: '', cover_id: null, isbn: null, publisher: null, external_work_id: null });
    }
    return reply({ message: 'Учебный маршрут не найден' }, 404);
  });
  const shot = name => page.screenshot({ path: `${folder}/${name}.png`, animations: 'disabled' });
  try {
    await page.goto(base + '/loans?state=active&page=2');
    await page.getByText('Показаны 21–21 из 21', { exact: true }).waitFor();
    await page.getByRole('link', { name: 'Последняя копия', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Взять книгу', exact: true }).isDisabled(), true);
    await page.getByRole('link', { name: 'Вернуться к выдачам', exact: true }).click();
    await page.getByText('Страница 2 из 2', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Вернуть «Последняя копия»', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Возвращаем…', exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'История', exact: true }).isDisabled(), true);
    await page.getByRole('alert').filter({ hasText: 'Список не изменен' }).waitFor();
    assert.equal(returns, 1); await shot('failed-return');
    await page.getByRole('button', { name: 'Вернуть «Последняя копия»', exact: true }).click();
    await page.getByText('Страница 1 из 1', { exact: true }).waitFor();
    assert.equal(returns, 2); assert.equal(new URL(page.url()).searchParams.get('page'), null);
    await page.getByText('Срок возврата прошел', { exact: true }).waitFor();
    await page.getByText('Вернуть сегодня', { exact: true }).waitFor();
    const selected = await page.locator('.loans-filters [aria-pressed="true"]').evaluate(button => ({ color: getComputedStyle(button).backgroundColor, height: button.getBoundingClientRect().height }));
    const unselected = await page.locator('.loans-filters [aria-pressed="false"]').first().evaluate(button => getComputedStyle(button).backgroundColor);
    assert.notEqual(selected.color, unselected); assert(selected.height >= 44);
    await shot('desktop');
    const link = page.getByRole('link', { name: 'История книги 19', exact: true });
    await link.scrollIntoViewIfNeeded(); const scroll = await page.evaluate(() => scrollY); assert(scroll > 0);
    await link.click(); await page.getByRole('link', { name: 'Вернуться к выдачам', exact: true }).click();
    await page.getByText('Страница 1 из 1', { exact: true }).waitFor();
    await page.waitForFunction(top => Math.abs(scrollY - top) <= 2, scroll);
    await page.getByRole('button', { name: 'Просроченные', exact: true }).click();
    await page.getByText('Показаны 1–1 из 1', { exact: true }).waitFor();
    assert.equal(await page.locator('.loan-card').count(), 1);
    await page.getByRole('button', { name: 'История', exact: true }).click();
    await page.getByText('Показаны 1–2 из 2', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: /^Вернуть «/ }).count(), 0);
    await page.getByRole('link', { name: 'Последняя копия', exact: true }).click();
    await page.getByText('Доступно экземпляров: 1', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Взять книгу', exact: true }).dblclick();
    await page.getByText('Все экземпляры выданы', { exact: true }).waitFor(); assert.equal(issues, 1);
    await page.getByRole('link', { name: 'Вернуться к выдачам', exact: true }).click();
    failRead = true; await page.getByRole('button', { name: 'Все', exact: true }).click();
    await page.getByRole('alert').waitFor(); await page.getByRole('button', { name: 'Повторить', exact: true }).click();
    await page.getByText('Страница 1 из 2', { exact: true }).waitFor();
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Переполнение ${width}`);
      if (width === 375) { await page.evaluate(() => scrollTo(0, 0)); await shot('mobile'); }
    }
    await page.evaluate(() => scrollTo(0, 0)); await page.getByRole('button', { name: 'Тёмная тема', exact: true }).click(); await shot('dark');
    role = 'librarian'; await page.reload(); await page.getByText('Читатель', { exact: true }).first().waitFor();
    assert.deepEqual(errors, []);
    const result = { source: 'Local production build; fixture API; no production data', stateFiltersBeforePagination: true, selectedFilterVisible: true, controls44px: true, lastCopyUnavailable: true, failedReturnKeepsList: true, returnPendingDisabled: true, shrinkPageAfterReturn: true, dueTodayAndOverdue: true, historyReadOnly: true, availableAfterReturn: true, duplicateIssueBlocked: true, detailsReturnUrlAndActualScroll: true, loadRetry: true, librarianReaderVisible: true, widths: [320,375,768,1280], overflow: false, darkTheme: true, pageErrors: errors };
    fs.writeFileSync(`${folder}/results.json`, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
