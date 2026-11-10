import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { BookDetailsPage } from '../pages/books/BookDetailsPage';
import { apiFetch } from '../api/client';

// Ошибка бизнес-правила приходит с сервера: проверяется сообщение для пользователя,
// а не внутренняя реализация компонента или CSS-классы.
vi.mock('../app/useAuth', () => ({ useAuth: () => ({ user: { role: 'member' } }) }));
vi.mock('../features/books/hooks/useBookDetails', () => ({ useBookDetails: () => ({
  details: { title: 'Тестовая книга', authors: [], record: { available: 1 } },
  status: 'success', retry: vi.fn(),
}) }));
vi.mock('../api/client', async importOriginal => ({
  ...await importOriginal<typeof import('../api/client')>(), apiFetch: vi.fn(),
}));

it('при отказе выдачи показывает доступную ошибку и снова разрешает действие', async () => {
  const { ApiError } = await import('../api/client');
  vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError('Все экземпляры выданы', 409));
  render(<MemoryRouter><BookDetailsPage /></MemoryRouter>);
  await userEvent.click(screen.getByRole('button', { name: 'Взять книгу' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Все экземпляры выданы');
  expect(screen.getByRole('button', { name: 'Взять книгу' })).toBeEnabled();
  expect(apiFetch).toHaveBeenCalledTimes(1);
});
