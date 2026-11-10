// Пользователь подтверждает параметры; повтор и ошибка не должны скрывать результат.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { ImportBookForm } from "../pages/discover/ImportBookForm";
import { apiFetch, ApiError } from "../api/client";

vi.mock("../app/useAuth", () => ({ useAuth: () => ({ user: { role: "librarian" } }) }));
vi.mock("../api/client", async original => ({ ...await original<typeof import("../api/client")>(), apiFetch: vi.fn() }));

const book = { id: "OL1W", title: "Книга", authors: ["Автор"], year: 2001, cover_id: 123, description: "Описание", notice: null };
it("открывает уже существующую библиотечную запись после импорта", async () => {
  vi.mocked(apiFetch).mockResolvedValue({ id: 7 });
  render(<MemoryRouter><ImportBookForm book={book} /></MemoryRouter>);
  await userEvent.click(screen.getByRole("button", { name: "Добавить в библиотеку" }));
  expect(await screen.findByRole("link", { name: "Открыть библиотечную запись" })).toHaveAttribute("href", "/books/7");
  const [, options] = vi.mocked(apiFetch).mock.calls.at(-1) ?? [];
  expect(JSON.parse(String(options?.body))).toEqual({ work_id: "OL1W", year: 2001, total_copies: 1 });
});

it("показывает конфликт архива и оставляет форму доступной", async () => {
  vi.mocked(apiFetch).mockRejectedValue(new ApiError("Книга в архиве", 409));
  render(<MemoryRouter><ImportBookForm book={book} /></MemoryRouter>);
  await userEvent.click(screen.getByRole("button", { name: "Добавить в библиотеку" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Книга в архиве");
  expect(screen.getByRole("button", { name: "Добавить в библиотеку" })).toBeEnabled();
});
