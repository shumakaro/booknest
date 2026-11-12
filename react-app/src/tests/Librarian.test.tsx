// Проверки рабочего раздела и клиентской роли дополняют независимые проверки API.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { LibrarianPage } from "../pages/librarian/LibrarianPage";
import { RequireAuth } from "../app/router/RequireAuth";
import { ApiError, apiFetch } from "../api/client";
import { safeReturnTo } from "../features/auth/returnTo";
const auth = vi.hoisted(() => ({ user: { id: 1, role: "librarian" } as { id: number; role: string } | null, loading: false }));
vi.mock("../app/useAuth", () => ({ useAuth: () => auth }));
vi.mock("../api/client", async original => ({ ...await original<typeof import("../api/client")>(), apiFetch: vi.fn() }));
const event = { id: 3, user_id: null, method: "PATCH", path: "/api/v1/books/7", created_at: "2026-11-12T08:00:00Z" };
const data = { items: [event], total: 1, page: 1, size: 20 };
function open(path = "/librarian") { render(<MemoryRouter initialEntries={[path]}><Routes>
  <Route element={<RequireAuth role="librarian" />}><Route path="librarian" element={<LibrarianPage />} /></Route>
  <Route path="login" element={<p>Вход</p>} /></Routes></MemoryRouter>); }
beforeEach(() => { auth.user = { id: 1, role: "librarian" }; vi.mocked(apiFetch).mockReset().mockResolvedValue(data); });
it("дает переходы к готовым действиям и показывает запись с недоступным пользователем", async () => {
  open(); await screen.findByText("/api/v1/books/7");
  expect(screen.getByRole("link", { name: /Добавить книгу/ })).toHaveAttribute("href", "/books/new");
  expect(screen.getByRole("link", { name: /Просроченные выдачи/ })).toHaveAttribute("href", "/loans?state=overdue");
  expect(screen.getByText("Запись №3 · Пользователь больше недоступен")).toBeInTheDocument();
  expect(safeReturnTo("/librarian?method=PATCH&page=2")).toBe("/librarian?method=PATCH&page=2");
});
it("не загружает журнал гостю или читателю", async () => {
  auth.user = null; const view = render(<MemoryRouter><Routes><Route element={<RequireAuth role="librarian" />}><Route index element={<LibrarianPage />} /></Route><Route path="login" element={<p>Вход</p>} /></Routes></MemoryRouter>);
  await screen.findByText("Вход"); expect(apiFetch).not.toHaveBeenCalled(); view.unmount();
  auth.user = { id: 2, role: "member" }; open();
  expect(screen.getByRole("heading", { name: "Недостаточно прав" })).toBeInTheDocument(); expect(apiFetch).not.toHaveBeenCalled();
});
it("фильтрует сервером и сбрасывает страницу", async () => {
  vi.mocked(apiFetch).mockResolvedValue({ ...data, total: 21 }); open("/librarian?page=2");
  await screen.findByText("/api/v1/books/7");
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Действие в журнале" }), "PATCH");
  await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/audit-events?page=1&size=20&method=PATCH", expect.anything()));
});
it("повторяет отказ чтения и отличает пустой фильтр", async () => {
  vi.mocked(apiFetch).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ ...data, items: [], total: 0 }); open("/librarian?method=DELETE");
  await screen.findByRole("alert"); await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
  await screen.findByRole("heading", { name: "Таких действий пока нет" });
});
it("показывает серверный 403 без автоматического обхода запрета", async () => {
  vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError("Недостаточно прав", 403)); open();
  expect(await screen.findByRole("alert")).toHaveTextContent("только библиотекарю");
  expect(screen.queryByRole("button", { name: "Повторить" })).not.toBeInTheDocument();
});
it("переходит с несуществующей страницы и не отправляет неизвестный метод", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce({ ...data, items: [], total: 0 }).mockResolvedValueOnce({ ...data, items: [], total: 0 });
  open("/librarian?page=999&method=EVIL"); await screen.findByRole("heading", { name: "Журнал пока пуст" });
  expect(apiFetch).toHaveBeenLastCalledWith("/audit-events?page=1&size=20", expect.anything());
});
