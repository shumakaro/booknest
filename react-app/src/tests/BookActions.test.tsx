import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { BookDetailsPage } from '../pages/books/BookDetailsPage';
import { apiFetch } from '../api/client';

// Ошибка бизнес-правила приходит с сервера: проверяется сообщение для пользователя,
// а не внутренняя реализация компонента или CSS-классы.
vi.mock('../app/useAuth', () => ({ useAuth: () => ({ user: { role: 'member' } }) }));
// Этот тест проверяет выдачу; серверное желаемое имеет отдельные сценарии.
vi.mock('../features/books/components/WishlistAction', () => ({ WishlistAction: () => null }));
vi.mock('../features/books/hooks/useBookDetails', () => ({ useBookDetails: () => ({
  details: { title: 'Тестовая книга', authors: [], record: { available: 1 } },
  status: 'success', retry: vi.fn(),
}) }));
vi.mock('../api/client', async importOriginal => ({
  ...await importOriginal<typeof import('../api/client')>(), apiFetch: vi.fn(),
}));

beforeEach(() => { vi.mocked(apiFetch).mockReset(); });
it('при отказе выдачи показывает доступную ошибку и снова разрешает действие', async () => {
  const { ApiError } = await import('../api/client');
  vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError('Все экземпляры выданы', 409));
  render(<MemoryRouter><BookDetailsPage /></MemoryRouter>);
  await userEvent.click(screen.getByRole('button', { name: 'Взять книгу' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Все экземпляры выданы');
  expect(screen.getByRole('button', { name: 'Взять книгу' })).toBeEnabled();
  expect(apiFetch).toHaveBeenCalledTimes(1);
});

it('не отправляет вторую выдачу пока первая не завершена', async () => {
  let finish: (value: unknown) => void = () => {};
  vi.mocked(apiFetch).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<MemoryRouter><BookDetailsPage /></MemoryRouter>);
  await userEvent.click(screen.getByRole('button', { name: 'Взять книгу' }));
  const pending = screen.getByRole('button', { name: 'Выполняется…' });
  expect(pending).toBeDisabled(); await userEvent.click(pending);
  expect(apiFetch).toHaveBeenCalledTimes(1);
  await act(async () => { finish({ id: 1 }); });
  expect(screen.getByText('Книга выдана. Возврат доступен в разделе выдач.')).toBeInTheDocument();
});
