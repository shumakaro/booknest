import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, it, expect, vi } from 'vitest';
import { WishlistPage } from '../pages/wishlist/WishlistPage';
import { getWishlist, syncWishlist } from '../api/wishlist';

vi.mock('../api/wishlist', () => ({ getWishlist: vi.fn(), syncWishlist: vi.fn() }));
beforeEach(() => { vi.mocked(getWishlist).mockReset(); vi.mocked(syncWishlist).mockReset().mockResolvedValue(undefined); vi.spyOn(window,'scrollTo').mockImplementation(() => {}); });
it('восстанавливает книгу после ошибки оптимистичного удаления', async () => {
  vi.mocked(getWishlist).mockResolvedValue([{ id:'7',title:'Книга отката',authors:['Автор'] }]);
  vi.mocked(syncWishlist).mockRejectedValue(new Error('Сервер недоступен'));
  render(<MemoryRouter><WishlistPage /></MemoryRouter>);
  await screen.findByRole('heading', { name:'Книга отката' });
  await userEvent.click(screen.getByRole('button', { name:/Удалить из желаемого/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Изменение отменено');
  expect(screen.getByRole('heading', { name:'Книга отката' })).toBeInTheDocument();
});

const items = [
  { id:'1', title:'Альфа', authors:['Толкин'], year:2000, record:{id:1,title:'Альфа',author:'Толкин',author_id:1,year:2000,available:1} },
  { id:'2', title:'Бета', authors:['Другой автор'], year:2020, record:{id:2,title:'Бета',author:'Другой автор',author_id:2,year:2020,available:0} },
];
it('ищет автора и доступность по загруженному списку без новых запросов', async () => {
  vi.mocked(getWishlist).mockResolvedValue(items);
  render(<MemoryRouter><WishlistPage /></MemoryRouter>);
  await screen.findByRole('heading',{name:'Альфа'});
  await userEvent.type(screen.getByRole('searchbox',{name:'Поиск в желаемом'}),'толкин');
  expect(screen.queryByRole('heading',{name:'Бета'})).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button',{name:'Сбросить условия'}));
  await userEvent.click(screen.getByRole('checkbox',{name:'Только доступные'}));
  expect(screen.queryByRole('heading',{name:'Бета'})).not.toBeInTheDocument();
  expect(getWishlist).toHaveBeenCalledTimes(1);
});
it('сортирует по году, оставляя неизвестный год в конце', async () => {
  vi.mocked(getWishlist).mockResolvedValue([...items,{id:'3',title:'Без года',authors:[]}]);
  render(<MemoryRouter><WishlistPage /></MemoryRouter>);
  await screen.findByRole('heading',{name:'Альфа'});
  await userEvent.selectOptions(screen.getByRole('combobox',{name:'Сортировка желаемого'}),'-year');
  expect(screen.getAllByRole('article').map(article=>article.querySelector('h3')?.textContent)).toEqual(['Бета','Альфа','Без года']);
});
it('отличает отсутствие совпадений от пустого личного списка', async () => {
  vi.mocked(getWishlist).mockResolvedValue(items);
  render(<MemoryRouter><WishlistPage /></MemoryRouter>);
  await screen.findByRole('heading',{name:'Альфа'});
  await userEvent.type(screen.getByRole('searchbox',{name:'Поиск в желаемом'}),'Ничего');
  expect(screen.getByRole('heading',{name:'В желаемом нет совпадений'})).toBeInTheDocument();
  expect(screen.queryByRole('heading',{name:'Список желаемого пуст'})).not.toBeInTheDocument();
});
it('блокирует удаление остальных книг и восстанавливает список после отказа', async () => {
  let fail: (reason:Error)=>void = () => {};
  vi.mocked(getWishlist).mockResolvedValue(items);
  vi.mocked(syncWishlist).mockImplementation(()=>new Promise((_,reject)=>{fail=reject;}));
  render(<MemoryRouter><WishlistPage /></MemoryRouter>);
  await screen.findByRole('heading',{name:'Альфа'});
  await userEvent.click(screen.getAllByRole('button',{name:'Удалить из желаемого'})[0]!);
  const remaining=screen.getByRole('button',{name:'Удалить из желаемого'});
  expect(remaining).toBeDisabled(); await userEvent.click(remaining);
  expect(syncWishlist).toHaveBeenCalledTimes(1);
  await act(async()=>{fail(new Error('Сбой'));});
  await screen.findByRole('heading',{name:'Альфа'});
  expect(screen.getAllByRole('button',{name:'Удалить из желаемого'})).toHaveLength(2);
});
it('повторяет неудачную загрузку и очищает ошибку', async () => {
  vi.mocked(getWishlist).mockRejectedValueOnce(new Error('Не загрузилось')).mockResolvedValueOnce(items);
  render(<MemoryRouter><WishlistPage /></MemoryRouter>);
  await screen.findByRole('alert');
  await userEvent.click(screen.getByRole('button',{name:'Повторить'}));
  await screen.findByRole('heading',{name:'Альфа'});
  await waitFor(()=>expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});
