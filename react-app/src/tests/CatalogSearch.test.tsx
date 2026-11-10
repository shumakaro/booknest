// ЛР10: проверяются действия и восстановление URL, а не устройство CSS-компонентов.
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { BooksPage } from "../pages/books/BooksPage";
import { BookDetailsPage } from "../pages/books/BookDetailsPage";
import { getBookDetailsById, searchBooks } from "../api/books";
import type { SearchResult } from "../types";

vi.mock("../api/books", async original => ({
  ...await original<typeof import("../api/books")>(), searchBooks: vi.fn(), getBookDetailsById: vi.fn(),
}));
vi.mock("../app/useAuth", () => ({ useAuth: () => ({ user: null }) }));

const result: SearchResult = { docs: [{ id: "21", title: "Локальная книга", authors: ["Автор"], year: 2000 }], total: 45 };
beforeEach(() => {
  vi.mocked(searchBooks).mockReset().mockResolvedValue(result);
  vi.mocked(getBookDetailsById).mockReset().mockResolvedValue({ id: "21", title: "Локальная книга", authors: [], description: "Описание локальной книги" });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Адрес каталога">{location.pathname + location.search}</output>;
}
function open(url = "/books") {
  render(<MemoryRouter initialEntries={[url]}><LocationProbe /><Routes>
    <Route path="/books" element={<BooksPage />} />
    <Route path="/books/:bookId" element={<BookDetailsPage />} />
  </Routes></MemoryRouter>);
}

it("передает фильтры прямой ссылки серверу и показывает диапазон по total", async () => {
  open("/books?q=Автор&page=2&genre=poetry&available=1&sort=-year");
  await screen.findByRole("heading", { name: "Локальная книга" });
  expect(searchBooks).toHaveBeenLastCalledWith("Автор", 2, expect.any(AbortSignal), { sort: "-year", genre: "poetry", availableOnly: true });
  expect(screen.getByText(/Показаны 21–21 из 45/)).toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Активные фильтры" })).toBeInTheDocument();
});

it("убирает один фильтр, сохраняя остальные и сбрасывая страницу", async () => {
  open("/books?q=Автор&page=2&genre=poetry&available=1&sort=-year");
  await screen.findByRole("heading", { name: "Локальная книга" });
  await userEvent.click(screen.getByRole("button", { name: "Убрать фильтр жанра" }));
  await waitFor(() => expect(searchBooks).toHaveBeenLastCalledWith("Автор", 1, expect.any(AbortSignal), { sort: "-year", genre: "", availableOnly: true }));
  expect(screen.getByRole("textbox", { name: "Поиск по названию или автору" })).toHaveValue("Автор");
  expect(screen.getByRole("checkbox", { name: "Только доступные" })).toBeChecked();
});

it("исправляет неизвестные и дробные параметры прямой ссылки до запроса API", async () => {
  open("/books?page=1.5&sort=unknown&genre=unknown&available=0");
  await screen.findByRole("heading", { name: "Локальная книга" });
  for (const call of vi.mocked(searchBooks).mock.calls) {
    expect(call[1]).toBe(1);
    expect(call[3]).toEqual({ sort: "title", genre: "", availableOnly: false });
  }
  expect(screen.getByLabelText("Адрес каталога")).toHaveTextContent("/books?page=1&sort=title");
});

it("возвращается с несуществующей страницы на последнюю существующую", async () => {
  vi.mocked(searchBooks).mockResolvedValueOnce({ docs: [], total: 23 }).mockResolvedValue({ ...result, total: 23 });
  open("/books?page=9");
  await waitFor(() => expect(searchBooks).toHaveBeenLastCalledWith("", 2, expect.any(AbortSignal), expect.any(Object)));
  await screen.findByRole("heading", { name: "Локальная книга" });
  expect(screen.getByRole("button", { name: "Следующая" })).toBeDisabled();
});

it("возвращает из детали к фильтрам, странице и позиции каталога", async () => {
  vi.spyOn(window, "scrollY", "get").mockReturnValue(640);
  open("/books?q=Автор&page=2&genre=poetry&sort=-year");
  await screen.findByRole("heading", { name: "Локальная книга" });
  await userEvent.click(screen.getByRole("button", { name: "Подробнее" }));
  await screen.findByText("Описание локальной книги");
  await userEvent.click(screen.getByRole("link", { name: "Вернуться в каталог" }));
  await screen.findByRole("heading", { name: "Локальная книга" });
  expect(screen.getByLabelText("Адрес каталога")).toHaveTextContent("/books?q=Автор&page=2&genre=poetry&sort=-year");
  await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 640, behavior: "instant" }));
});

it("отменяет старый запрос сразу при вводе; запоздавший ответ не заменяет новый", async () => {
  let finish: (value: SearchResult) => void = () => {};
  vi.mocked(searchBooks).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  open();
  await waitFor(() => expect(searchBooks).toHaveBeenCalledTimes(1));
  const signal = vi.mocked(searchBooks).mock.calls[0]?.[2];
  await userEvent.type(screen.getByRole("textbox", { name: "Поиск по названию или автору" }), "Новый автор");
  expect(signal?.aborted).toBe(true);
  await userEvent.click(screen.getByRole("button", { name: "Найти" }));
  await screen.findByRole("heading", { name: "Локальная книга" });
  await act(async () => { finish({ docs: [{ id: "99", title: "Устаревшая книга", authors: [] }], total: 1 }); });
  expect(screen.queryByRole("heading", { name: "Устаревшая книга" })).not.toBeInTheDocument();
  expect(searchBooks).toHaveBeenLastCalledWith("Новый автор", 1, expect.any(AbortSignal), expect.any(Object));
});
