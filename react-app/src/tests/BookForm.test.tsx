import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BookForm } from '../features/books/components/BookForm';
import { BookFormApiError, saveBook } from '../api/bookForm';

vi.mock('../api/bookForm', async importOriginal => {
  const actual = await importOriginal<typeof import('../api/bookForm')>();
  return { ...actual, saveBook: vi.fn() };
});

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
