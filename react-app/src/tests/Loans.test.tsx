// ЛР10: проверяются действия пользователя и контракт API, а не классы оформления.
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { LoansPage } from "../pages/loans/LoansPage";
import { apiFetch, ApiError } from "../api/client";
import { formatLoanDate, loanState } from "../features/loans/dates";
import type { LoanRead } from "../api/generated";
const auth = vi.hoisted(() => ({ user: { id: 1, role: "member" } }));
vi.mock("../app/useAuth", () => ({ useAuth: () => auth }));
vi.mock("../api/client", async original => ({ ...await original<typeof import("../api/client")>(), apiFetch: vi.fn() }));
const loan: LoanRead = { id: 7, book_id: 5, book_title: "Хоббит", user_id: 1, issued_at: "2026-11-01", due_date: "2026-11-11", returned_at: null };
const page = (items = [loan], total = items.length) => ({ items, total, page: 1, size: 20 });
function Url() { return <output data-testid="url">{useLocation().search}</output>; }
function open(path = "/loans") { render(<MemoryRouter initialEntries={[path]}><LoansPage /><Url /></MemoryRouter>); }
beforeEach(() => { auth.user = { id: 1, role: "member" }; vi.mocked(apiFetch).mockReset().mockResolvedValue(page()); vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });

it("запрашивает текущие выдачи по умолчанию и меняет серверный фильтр со сбросом страницы", async () => {
  open("/loans?state=active&page=2");
  vi.mocked(apiFetch).mockResolvedValue(page([loan], 21));
  await screen.findByRole("link", { name: "Хоббит" });
  await userEvent.click(screen.getByRole("button", { name: "История" }));
  await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/loans?state=returned&page=1&size=20", expect.anything()));
  expect(screen.getByTestId("url")).toHaveTextContent("state=returned");
  expect(screen.getByTestId("url")).not.toHaveTextContent("page=2");
});
it("не отправляет некорректные параметры URL в API", async () => {
  open("/loans?state=wrong&page=-3"); await screen.findByRole("link", { name: "Хоббит" });
  expect(apiFetch).toHaveBeenCalledWith("/loans?state=active&page=1&size=20", expect.anything());
  expect(screen.queryByText(/читатель №/i)).not.toBeInTheDocument();
});
it("блокирует повтор возврата и сохраняет запись после отказа", async () => {
  let fail: (reason: Error) => void = () => {};
  vi.mocked(apiFetch).mockResolvedValueOnce(page()).mockImplementationOnce(() => new Promise((_, reject) => { fail = reject; }));
  open(); await userEvent.click(await screen.findByRole("button", { name: "Вернуть «Хоббит»" }));
  const button = screen.getByRole("button", { name: "Возвращаем…" });
  expect(button).toBeDisabled(); expect(screen.getByRole("button", { name: "История" })).toBeDisabled();
  await userEvent.click(button); expect(apiFetch).toHaveBeenCalledTimes(2);
  await act(async () => { fail(new ApiError("Книга уже возвращена", 409)); });
  expect(await screen.findByRole("alert")).toHaveTextContent("Книга уже возвращена");
  expect(screen.getByRole("button", { name: "Вернуть «Хоббит»" })).toBeEnabled();
  vi.mocked(apiFetch).mockResolvedValueOnce(page([]));
  await userEvent.click(screen.getByRole("button", { name: "Обновить выдачи" }));
  await screen.findByRole("heading", { name: "Текущих выдач нет" });
});
it("после подтвержденного возврата перечитывает данные и уходит с исчезнувшей страницы", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce(page([loan], 21)).mockResolvedValueOnce({ ...loan, returned_at: "2026-11-11" })
    .mockResolvedValueOnce(page([], 20)).mockResolvedValueOnce(page([loan], 20));
  open("/loans?state=active&page=2");
  await userEvent.click(await screen.findByRole("button", { name: "Вернуть «Хоббит»" }));
  await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/loans?state=active&page=1&size=20", expect.anything()));
  await screen.findByText("Страница 1 из 1");
  expect(screen.getByText(/Возврат сохранен/)).toBeInTheDocument();
});
it("не предлагает вернуть завершенную выдачу и показывает читателя библиотекарю", async () => {
  auth.user.role = "librarian";
  vi.mocked(apiFetch).mockResolvedValue(page([{ ...loan, returned_at: "2026-11-10" }]));
  open("/loans?state=returned");
  await screen.findByText("Возвращена", { selector: "span" });
  expect(screen.queryByRole("button", { name: /Вернуть «/ })).not.toBeInTheDocument();
  expect(screen.getByText("Читатель")).toBeInTheDocument();
});
it("повторяет ошибку чтения и показывает отдельное пустое состояние истории", async () => {
  vi.mocked(apiFetch).mockRejectedValueOnce(new Error("Сеть недоступна")).mockResolvedValueOnce(page([]));
  open("/loans?state=returned"); await screen.findByRole("alert");
  await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
  await screen.findByRole("heading", { name: "История возвратов пока пуста" });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
it("не заменяет свежий фильтр запоздавшим ответом", async () => {
  let finish: (value: unknown) => void = () => {};
  vi.mocked(apiFetch).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce(page([]));
  open(); await userEvent.click(screen.getByRole("button", { name: "Просроченные" }));
  await screen.findByRole("heading", { name: "Просроченных выдач нет" });
  await act(async () => { finish(page()); });
  expect(screen.queryByRole("link", { name: "Хоббит" })).not.toBeInTheDocument();
});
it("считает срок включительно и сохраняет возвращенное состояние после срока", () => {
  const now = new Date(2026, 10, 11, 23, 59);
  expect(loanState(loan, now).label).toBe("Вернуть сегодня");
  expect(loanState({ ...loan, due_date: "2026-11-10" }, now).kind).toBe("overdue");
  expect(loanState({ ...loan, due_date: "2026-11-12" }, now).kind).toBe("active");
  expect(loanState({ ...loan, due_date: "2026-11-10", returned_at: "2026-11-10" }, now).kind).toBe("returned");
  expect(formatLoanDate("2026-11-11")).toContain("11 ноября 2026");
});
