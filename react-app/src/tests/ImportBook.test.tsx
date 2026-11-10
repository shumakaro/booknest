// Пользователь подтверждает параметры; повтор и ошибка не должны скрывать результат.
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { ImportBookForm } from "../pages/discover/ImportBookForm";
import { apiFetch, ApiError } from "../api/client";

const auth = vi.hoisted(() => ({ user: { role: "librarian" } as { role: string } | null }));
vi.mock("../app/useAuth", () => ({ useAuth: () => auth }));
vi.mock("../api/client", async original => ({ ...await original<typeof import("../api/client")>(), apiFetch: vi.fn() }));

const book = { id: "OL1W", title: "Книга", authors: ["Автор"], year: 2001, cover_id: 123, description: "Описание", notice: null };
beforeEach(() => { auth.user = { role: "librarian" }; vi.mocked(apiFetch).mockReset(); });
it("открывает уже существующую библиотечную запись после импорта", async () => {
  vi.mocked(apiFetch).mockResolvedValue({ id: 7 });
  render(<MemoryRouter><ImportBookForm book={book} /></MemoryRouter>);
  await userEvent.click(screen.getByRole("button", { name: "Добавить в библиотеку" }));
  const link = await screen.findByRole("link", { name: "Открыть библиотечную запись" });
  expect(link).toHaveAttribute("href", "/books/7");
  expect(link).toHaveFocus();
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

it.each(["member", null])("не предлагает импорт роли %s", role => {
  auth.user = role ? { role } : null;
  render(<MemoryRouter><ImportBookForm book={book} /></MemoryRouter>);
  expect(screen.queryByRole("button", { name: "Добавить в библиотеку" })).not.toBeInTheDocument();
  expect(apiFetch).not.toHaveBeenCalled();
});

it("не подставляет выдуманный год и требует проверенное значение", async () => {
  vi.mocked(apiFetch).mockResolvedValue({ id: 7 });
  render(<MemoryRouter><ImportBookForm book={{ ...book, year: null }} /></MemoryRouter>);
  const year = screen.getByRole("spinbutton", { name: "Год первой публикации" });
  expect(year).toHaveValue(null);
  await userEvent.click(screen.getByRole("button", { name: "Добавить в библиотеку" }));
  expect(apiFetch).not.toHaveBeenCalled();
  await userEvent.type(year, "2005");
  await userEvent.click(screen.getByRole("button", { name: "Добавить в библиотеку" }));
  await screen.findByRole("link", { name: "Открыть библиотечную запись" });
  expect(JSON.parse(String(vi.mocked(apiFetch).mock.calls[0]?.[1]?.body)).year).toBe(2005);
});

it("блокирует форму и повтор запроса до получения существующей записи", async () => {
  let finish: (value: { id: number; total_copies: number }) => void = () => {};
  vi.mocked(apiFetch).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<MemoryRouter><ImportBookForm book={book} /></MemoryRouter>);
  await userEvent.click(screen.getByRole("button", { name: "Добавить в библиотеку" }));
  const pending = screen.getByRole("button", { name: "Добавляем…" });
  expect(pending).toBeDisabled();
  expect(screen.getByRole("spinbutton", { name: "Количество экземпляров" })).toBeDisabled();
  await userEvent.click(pending);
  expect(apiFetch).toHaveBeenCalledTimes(1);
  await act(async () => { finish({ id: 7, total_copies: 3 }); });
  expect(await screen.findByText("Экземпляров в библиотеке: 3")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Добавить в библиотеку" })).not.toBeInTheDocument();
});

it("после ошибки сохраняет исправленные параметры для повторной попытки", async () => {
  vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError("Временный сбой", 503)).mockResolvedValueOnce({ id: 8 });
  render(<MemoryRouter><ImportBookForm book={book} /></MemoryRouter>);
  const copies = screen.getByRole("spinbutton", { name: "Количество экземпляров" });
  await userEvent.clear(copies); await userEvent.type(copies, "4");
  await userEvent.click(screen.getByRole("button", { name: "Добавить в библиотеку" }));
  await screen.findByRole("alert");
  expect(copies).toHaveValue(4);
  await userEvent.click(screen.getByRole("button", { name: "Добавить в библиотеку" }));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
  expect(JSON.parse(String(vi.mocked(apiFetch).mock.calls[1]?.[1]?.body)).total_copies).toBe(4);
});

it("не отправляет известный неполный импорт без автора", async () => {
  render(<MemoryRouter><ImportBookForm book={{ ...book, authors: [] }} /></MemoryRouter>);
  expect(screen.getByRole("button", { name: "Добавить в библиотеку" })).toBeDisabled();
  expect(apiFetch).not.toHaveBeenCalled();
});
