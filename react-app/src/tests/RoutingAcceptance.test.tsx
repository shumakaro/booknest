// ЛР10, проверка лекции 8: используется настоящий роутер вместе с его страницами.
// Подменяются только сеанс и сетевые данные; правила маршрутов не копируются в тест.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AppRouter } from "../app/router/AppRouter";
import { getBookDetailsById, searchBooks } from "../api/books";

const session = vi.hoisted(() => ({
  user: null as { id: number; email: string; role: "member" | "librarian" } | null,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("../app/useAuth", () => ({ useAuth: () => session }));
vi.mock("../app/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));
vi.mock("../api/books", async original => ({
  ...await original<typeof import("../api/books")>(),
  searchBooks: vi.fn(),
  getBookDetailsById: vi.fn(),
}));

function Address() {
  const location = useLocation();
  return <>
    <output aria-label="Адрес проверки">{location.pathname}</output>
    <output aria-label="Исходный маршрут">{location.state?.from?.pathname ?? ""}</output>
  </>;
}

function open(path: string) {
  render(<MemoryRouter initialEntries={[path]}><Address /><AppRouter /></MemoryRouter>);
}

beforeEach(() => {
  session.user = null;
  session.loading = false;
  vi.mocked(searchBooks).mockReset().mockResolvedValue({ docs: [], total: 0 });
  vi.mocked(getBookDetailsById).mockReset().mockResolvedValue({
    id: "42", title: "Книга прямой ссылки", authors: [], description: "Описание книги",
  });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

it("неизвестный адрес показывает 404 и позволяет вернуться в настоящий каталог", async () => {
  open("/not-a-real-page");
  expect(screen.getByRole("heading", { name: "404" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("link", { name: "Вернуться в каталог" }));
  await waitFor(() => expect(screen.getByLabelText("Адрес проверки")).toHaveTextContent("/books"));
  await waitFor(() => expect(searchBooks).toHaveBeenCalled());
  expect(screen.queryByRole("heading", { name: "404" })).not.toBeInTheDocument();
});

it("прямая ссылка передает строковый bookId настоящей странице деталей", async () => {
  open("/books/42");
  expect(await screen.findByRole("heading", { name: "Книга прямой ссылки" })).toBeInTheDocument();
  expect(getBookDetailsById).toHaveBeenCalledWith("42", expect.any(AbortSignal));
});

it("гость направляется ко входу с сохранением намерения открыть новую книгу", async () => {
  open("/books/new");
  await waitFor(() => expect(screen.getByLabelText("Адрес проверки")).toHaveTextContent("/login"));
  expect(screen.getByLabelText("Исходный маршрут")).toHaveTextContent("/books/new");
  expect(getBookDetailsById).not.toHaveBeenCalled();
});

it("читатель получает отказ роли при прямом открытии формы библиотекаря", () => {
  session.user = { id: 1, email: "reader@example.test", role: "member" };
  open("/books/new");
  expect(screen.getByRole("heading", { name: "Недостаточно прав" })).toBeInTheDocument();
  expect(screen.queryByRole("form", { name: "Новая книга" })).not.toBeInTheDocument();
  expect(getBookDetailsById).not.toHaveBeenCalled();
});
