// Проверяется поведение пользователя: поиск, накопление, повтор, смена запроса и детали.
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { DiscoverPage } from "../pages/discover/DiscoverPage";
import { ExternalBookPage } from "../pages/discover/ExternalBookPage";
import { getGlobalBook, searchGlobalBooks } from "../api/discover";
import type { ExternalBook, ExternalPage } from "../api/discover";
import { ApiError } from "../api/client";
import { clearGlobalSearchCache } from "../features/books/hooks/useGlobalBooks";

vi.mock("../api/discover", async importOriginal => ({
  ...await importOriginal<typeof import("../api/discover")>(),
  searchGlobalBooks: vi.fn(), getGlobalBook: vi.fn(),
}));

beforeEach(() => {
  clearGlobalSearchCache();
  vi.mocked(searchGlobalBooks).mockReset();
  vi.mocked(getGlobalBook).mockReset();
});

function book(number: number): ExternalBook {
  return { id: `OL${number}W`, title: `Внешняя книга ${number}`, authors: ["Автор"], year: 2001, cover_id: 123 };
}
function page(items = Array.from({ length: 20 }, (_, index) => book(index + 1)), hasMore = true): ExternalPage {
  return { items, total: 22, page: hasMore ? 1 : 2, size: 20, has_more: hasMore };
}
function open(path = "/discover?title=test&page=1") {
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/discover" element={<DiscoverPage />} />
    <Route path="/discover/:workId" element={<ExternalBookPage />} />
  </Routes></MemoryRouter>);
}

it("не запрашивает весь внешний каталог без запроса; ищет только по автору", async () => {
  vi.mocked(searchGlobalBooks).mockResolvedValue(page([book(1)], false));
  open("/discover");
  expect(searchGlobalBooks).not.toHaveBeenCalled();
  await userEvent.type(screen.getByRole("textbox", { name: "Автор" }), "Толкин");
  await userEvent.click(screen.getByRole("button", { name: "Найти в Open Library" }));
  await screen.findByRole("heading", { name: "Внешняя книга 1" });
  expect(searchGlobalBooks).toHaveBeenCalledWith("", "Толкин", 1, expect.any(AbortSignal));
  expect(screen.queryByRole("button", { name: "В желаемое" })).not.toBeInTheDocument();
});

it("накапливает страницы без дублей и скрывает кнопку в конце", async () => {
  vi.mocked(searchGlobalBooks).mockResolvedValueOnce(page()).mockResolvedValueOnce(page([book(20), book(21)], false));
  open();
  await screen.findByRole("heading", { name: "Внешняя книга 1" });
  await userEvent.click(screen.getByRole("button", { name: "Показать ещё" }));
  await screen.findByRole("heading", { name: "Внешняя книга 21" });
  expect(screen.getAllByRole("heading", { name: "Внешняя книга 20" })).toHaveLength(1);
  expect(screen.getByRole("heading", { name: "Внешняя книга 1" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Показать ещё" })).not.toBeInTheDocument();
  expect(searchGlobalBooks).toHaveBeenLastCalledWith("test", "", 2, expect.any(AbortSignal));
});

it("сохраняет первую страницу при ошибке следующей и повторяет именно неудачную страницу", async () => {
  vi.mocked(searchGlobalBooks).mockResolvedValueOnce(page()).mockRejectedValueOnce(new ApiError("Сервис недоступен", 503))
    .mockResolvedValueOnce(page([book(21)], false));
  open();
  await screen.findByRole("heading", { name: "Внешняя книга 1" });
  await userEvent.click(screen.getByRole("button", { name: "Показать ещё" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Сервис недоступен");
  expect(screen.getByRole("heading", { name: "Внешняя книга 1" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /Повторить/ }));
  await screen.findByRole("heading", { name: "Внешняя книга 21" });
  expect(vi.mocked(searchGlobalBooks).mock.calls.map(call => call[2])).toEqual([1, 2, 2]);
});

it("новый запрос очищает старые результаты и показывает пустое состояние", async () => {
  vi.mocked(searchGlobalBooks).mockResolvedValueOnce(page()).mockResolvedValueOnce({ ...page([], false), total: 0 });
  open();
  await screen.findByRole("heading", { name: "Внешняя книга 1" });
  await userEvent.clear(screen.getByRole("textbox", { name: "Название книги" }));
  await userEvent.type(screen.getByRole("textbox", { name: "Название книги" }), "Нет такой книги");
  await userEvent.click(screen.getByRole("button", { name: "Найти в Open Library" }));
  await screen.findByRole("heading", { name: "Книги не найдены" });
  expect(screen.queryByRole("heading", { name: "Внешняя книга 1" })).not.toBeInTheDocument();
  expect(searchGlobalBooks).toHaveBeenLastCalledWith("Нет такой книги", "", 1, expect.any(AbortSignal));
});

it("запоздавший ответ старого запроса не заменяет новый", async () => {
  let finish: (value: ExternalPage) => void = () => {};
  vi.mocked(searchGlobalBooks).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValueOnce(page([book(99)], false));
  open();
  await waitFor(() => expect(searchGlobalBooks).toHaveBeenCalledTimes(1));
  await userEvent.type(screen.getByRole("textbox", { name: "Автор" }), "Новый автор");
  await userEvent.click(screen.getByRole("button", { name: "Найти в Open Library" }));
  await screen.findByRole("heading", { name: "Внешняя книга 99" });
  expect(vi.mocked(searchGlobalBooks).mock.calls[0]?.[3]?.aborted).toBe(true);
  await act(async () => { finish(page()); });
  expect(screen.queryByRole("heading", { name: "Внешняя книга 1" })).not.toBeInTheDocument();
});

it("открывает внешние детали напрямую и не предлагает локальную выдачу", async () => {
  vi.mocked(getGlobalBook).mockResolvedValue({ ...book(1), description: "Подробное описание", notice: null });
  open("/discover/OL1W");
  await screen.findByRole("heading", { name: "Внешняя книга 1" });
  expect(screen.getByText("Подробное описание")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Открыть в Open Library" })).toHaveAttribute("href", "https://openlibrary.org/works/OL1W");
  expect(screen.queryByRole("button", { name: /Выдать|Удалить|Редактировать/ })).not.toBeInTheDocument();
});

it("отображает ошибку отсутствующей внешней книги", async () => {
  vi.mocked(getGlobalBook).mockRejectedValue(new ApiError("Книга в Open Library не найдена", 404));
  open("/discover/OL999W");
  expect(await screen.findByRole("alert")).toHaveTextContent("Книга в Open Library не найдена");
});

it("после деталей возвращает накопленные страницы и поисковый запрос", async () => {
  vi.mocked(searchGlobalBooks).mockResolvedValueOnce(page()).mockResolvedValueOnce(page([book(21)], false));
  vi.mocked(getGlobalBook).mockResolvedValue({ ...book(21), description: "Описание", notice: null });
  open();
  await screen.findByRole("heading", { name: "Внешняя книга 1" });
  await userEvent.click(screen.getByRole("button", { name: "Показать ещё" }));
  await screen.findByRole("heading", { name: "Внешняя книга 21" });
  await userEvent.click(screen.getAllByRole("button", { name: "Подробнее" }).at(-1)!);
  await screen.findByText("Описание");
  await userEvent.click(screen.getByRole("link", { name: "Вернуться к глобальному поиску" }));
  await screen.findByRole("heading", { name: "Внешняя книга 1" });
  expect(screen.getByRole("heading", { name: "Внешняя книга 21" })).toBeInTheDocument();
  expect(searchGlobalBooks).toHaveBeenCalledTimes(2);
});
