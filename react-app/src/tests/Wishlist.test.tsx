import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { it, expect, vi } from 'vitest';
import { WishlistPage } from '../pages/wishlist/WishlistPage';
import { getWishlist, syncWishlist } from '../api/wishlist';

vi.mock('../api/wishlist', () => ({ getWishlist: vi.fn(), syncWishlist: vi.fn() }));
it('восстанавливает книгу после ошибки оптимистичного удаления', async () => {
  vi.mocked(getWishlist).mockResolvedValue([{ id:'7',title:'Книга отката',authors:['Автор'] }]);
  vi.mocked(syncWishlist).mockRejectedValue(new Error('Сервер недоступен'));
  render(<MemoryRouter><WishlistPage /></MemoryRouter>);
  await screen.findByRole('heading', { name:'Книга отката' });
  await userEvent.click(screen.getByRole('button', { name:/Удалить из желаемого/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Изменение отменено');
  expect(screen.getByRole('heading', { name:'Книга отката' })).toBeInTheDocument();
});
