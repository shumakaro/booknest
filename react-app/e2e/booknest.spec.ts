import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// Только локальные учебные роли; пароли из игнорируемого файла не публикуются.
const accounts = JSON.parse(readFileSync(new URL('../../.tools/demo-accounts.json', import.meta.url), 'utf8')) as Record<string, { email: string; password: string }>;

function newIsbn(): string {
  const prefix = '978' + String(Date.now()).slice(-9);
  let sum = 0;
  for (let index = 0; index < 12; index++) sum += Number(prefix[index]) * (index % 2 === 0 ? 1 : 3);
  return prefix + String((10 - sum % 10) % 10);
}

test('вход создание редактирование выдача возврат и удаление собственной тестовой книги', async ({ page }) => {
  const librarian = accounts.librarian;
  if (!librarian) throw new Error('Нет локальной демонстрационной роли librarian');
  const title = 'Сквозная проверка ' + Date.now();
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill(librarian.email);
  await page.getByLabel('Пароль', { exact: true }).fill(librarian.password);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await page.waitForURL('**/books');
  await page.getByRole('link', { name: 'Добавить книгу', exact: true }).click();
  await page.getByLabel('Название', { exact: true }).fill(title);
  await page.getByLabel('Автор', { exact: true }).fill('Автор сквозной проверки');
  await page.getByLabel('ISBN', { exact: true }).fill(newIsbn());
  await page.getByLabel('Издательство', { exact: true }).fill('Проверенное издательство');
  await page.getByLabel('Язык', { exact: true }).fill('Русский');
  await page.getByLabel('Год первой публикации', { exact: true }).fill('2020');
  await page.getByLabel('Год издания', { exact: true }).fill('2022');
  await page.getByLabel('Количество страниц', { exact: true }).fill('137');
  await page.getByRole('button', { name: 'Создать книгу', exact: true }).click();
  await page.waitForURL('**/books');
  await page.getByLabel('Поиск по названию').fill(title);
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Подробнее', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  const id = page.url().split('/').at(-1)!;
  await page.getByRole('link', { name: 'Редактировать книгу', exact: true }).click();
  await expect(page.getByLabel('Издательство', { exact: true })).toHaveValue('Проверенное издательство');
  await expect(page.getByLabel('Количество страниц', { exact: true })).toHaveValue('137');
  await page.getByLabel('Название', { exact: true }).fill(title + ' изменена');
  await page.getByRole('button', { name: 'Сохранить изменения', exact: true }).click();
  await expect(page.getByRole('heading', { name: title + ' изменена', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Взять книгу', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Уведомления' }).getByRole('status')).toContainText('Книга выдана');
  await page.screenshot({ path: '../.tools/stage3/fullstack-success.png', fullPage: true });
  function isLoansResponse(response: import('@playwright/test').Response, pageNumber: number) {
    const url = new URL(response.url());
    return response.status() === 200 && url.pathname.endsWith('/loans') && url.searchParams.get('page') === String(pageNumber);
  }
  const initialLoans = page.waitForResponse(response => isLoansResponse(response, 1));
  await page.getByRole('link', { name: 'Перейти к выдачам', exact: true }).click();
  let loanPage = await (await initialLoans).json() as { items: { book_id: number; returned_at: string | null }[]; total: number };
  let pageNumber = 1;
  while (!loanPage.items.some(loan => String(loan.book_id) === id && !loan.returned_at)) {
    if (pageNumber * 20 >= loanPage.total) throw new Error('Созданная выдача отсутствует в списке');
    pageNumber += 1;
    const loaded = page.waitForResponse(response => isLoansResponse(response, pageNumber));
    await page.getByRole('button', { name: 'Следующая', exact: true }).click();
    loanPage = await (await loaded).json();
  }
  const returnButton = page.getByRole('button', { name: `Вернуть книгу №${id}`, exact: true });
  await expect(returnButton).toBeVisible();
  await returnButton.click();
  await expect(returnButton).toHaveCount(0);
  await page.goto(`/books/${id}`);
  await expect(page.getByRole('heading', { name: title + ' изменена', exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Удалить книгу', exact: true }).click();
  await page.waitForURL('**/books');
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Войти', exact: true })).toBeVisible();
});
