import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BookForm } from '../features/books/components/BookForm';
import { BookFormApiError, saveBook } from '../api/bookForm';

vi.mock('../api/bookForm', async importOriginal => {
  const actual = await importOriginal<typeof import('../api/bookForm')>();
  return { ...actual, saveBook: vi.fn() };
});

beforeEach(() => { vi.mocked(saveBook).mockReset(); });
describe('Форма книги', () => {
  it('не отправляет невалидную форму и объясняет ошибку', async () => {
    vi.mocked(saveBook).mockClear();
    render(<MemoryRouter><BookForm mode="create" onSuccess={vi.fn()} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Создать книгу' }));
    expect(await screen.findByText('Название должно содержать минимум 2 символа.')).toBeInTheDocument();
    expect(saveBook).not.toHaveBeenCalled();
  });
  it('показывает конфликт ISBN у поля и не сообщает об успехе', async () => {
    vi.mocked(saveBook).mockRejectedValue(new BookFormApiError('Конфликт', 409, { isbn: 'ISBN уже используется' }));
    const success = vi.fn();
    render(<MemoryRouter><BookForm mode="create" onSuccess={success} defaultValues={{ title:'Учебная книга',author:'Автор',isbn:'9780306406157',publisher:'Издатель',language:'Русский',publicationYear:2020,editionYear:2021,pages:100 }} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Создать книгу' }));
    await waitFor(() => expect(screen.getByText('ISBN уже используется')).toBeInTheDocument());
    expect(success).not.toHaveBeenCalled();
  });
});

const values = { title:'Учебная книга',author:'Автор',isbn:'',publisher:'Издатель',language:'Русский',publicationYear:2020,editionYear:2021,pages:100,totalCopies:3 };
it('не придумывает годы и число страниц при создании', () => {
  render(<MemoryRouter><BookForm mode="create" onSuccess={vi.fn()} /></MemoryRouter>);
  expect(screen.getByLabelText('Год первой публикации')).toHaveValue(null);
  expect(screen.getByLabelText('Год издания')).toHaveValue(null);
  expect(screen.getByLabelText('Количество страниц')).toHaveValue(null);
});
it('редактирует импортированную книгу без ISBN и отправляет список измененных полей', async () => {
  vi.mocked(saveBook).mockResolvedValue({ id: '7' });
  render(<MemoryRouter><BookForm mode="edit" bookId="7" defaultValues={values} onSuccess={vi.fn()} /></MemoryRouter>);
  expect(screen.getByRole('button', { name:'Сохранить изменения' })).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Название'), ' новое');
  await userEvent.click(screen.getByRole('button', { name:'Сохранить изменения' }));
  await waitFor(() => expect(saveBook).toHaveBeenLastCalledWith(expect.objectContaining({ isbn:'' }), '7', ['title']));
});
it('блокирует поля и повторное сохранение на время запроса', async () => {
  let finish: (value: {id:string}) => void = () => {};
  vi.mocked(saveBook).mockReset().mockImplementation(() => new Promise(resolve => { finish=resolve; }));
  render(<MemoryRouter><BookForm mode="create" defaultValues={values} onSuccess={vi.fn()} /></MemoryRouter>);
  await userEvent.click(screen.getByRole('button', { name:'Создать книгу' }));
  const pending=screen.getByRole('button', { name:'Сохранение...' });
  expect(pending).toBeDisabled(); expect(screen.getByLabelText('Название')).toBeDisabled();
  await userEvent.click(pending);
  expect(saveBook).toHaveBeenCalledTimes(1);
  finish({id:'7'});
  await waitFor(() => expect(screen.getByLabelText('Название')).toBeEnabled());
});
it('сохраняет введенные данные после неизвестной ошибки 422 и показывает сообщение', async () => {
  vi.mocked(saveBook).mockRejectedValue(new BookFormApiError('Проверка записи не пройдена',422,{}));
  render(<MemoryRouter><BookForm mode="create" defaultValues={values} onSuccess={vi.fn()} /></MemoryRouter>);
  await userEvent.click(screen.getByRole('button', { name:'Создать книгу' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Проверка записи не пройдена');
  expect(screen.getByLabelText('Название')).toHaveValue(values.title);
});
