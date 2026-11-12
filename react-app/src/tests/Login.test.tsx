// ЛР10: форма сохраняет маршрут, проверяет пароль до запроса и блокирует двойную отправку.
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { LoginPage } from "../pages/login/LoginPage";
import { apiFetch } from "../api/client";
import { safeReturnTo } from "../features/auth/returnTo";
const auth = vi.hoisted(() => ({ login: vi.fn(), loading: false }));
vi.mock("../app/useAuth", () => ({ useAuth: () => auth }));
vi.mock("../api/client", async original => ({ ...await original<typeof import("../api/client")>(), apiFetch: vi.fn() }));
function Destination() { const url = useLocation(); return <p>{url.pathname + url.search + url.hash}</p>; }
function open(path = "/login") { render(<MemoryRouter initialEntries={[path]}><Routes>
  <Route path="login" element={<LoginPage key="login" />} /><Route path="register" element={<LoginPage key="register" register />} /><Route path="*" element={<Destination />} />
</Routes></MemoryRouter>); }
beforeEach(() => { auth.loading = false; auth.login.mockReset().mockResolvedValue(undefined); vi.mocked(apiFetch).mockReset().mockResolvedValue({ id: 1 }); });
async function fill(password = "Test-pass-123") { await userEvent.type(screen.getByLabelText("E-mail"), "reader@example.test"); await userEvent.type(screen.getByLabelText("Пароль", { exact: true }), password); }
it("после регистрации сохраняет маршрут входа и очищает пароль", async () => {
  open("/login?returnTo=%2Floans%3Fstate%3Dreturned%23history");
  await userEvent.click(screen.getByRole("link", { name: "Создать учётную запись" }));
  await fill(); await userEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));
  await screen.findByText("Регистрация завершена. Теперь можно войти.");
  expect(screen.getByLabelText("Пароль", { exact: true })).toHaveValue("");
  await userEvent.click(screen.getByRole("link", { name: "Перейти ко входу" }));
  expect(screen.getByLabelText("E-mail")).toHaveValue("reader@example.test");
  await userEvent.type(screen.getByLabelText("Пароль", { exact: true }), "Test-pass-123");
  await userEvent.click(screen.getByRole("button", { name: "Войти" }));
  await screen.findByText("/loans?state=returned#history");
});
it("не отправляет пароль длиннее 72 байт и фокусирует поле", async () => {
  open("/register"); await fill("я".repeat(36) + "1");
  await userEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));
  expect(screen.getByRole("alert")).toHaveTextContent("72 байт");
  expect(screen.getByLabelText("Пароль", { exact: true })).toHaveFocus(); expect(apiFetch).not.toHaveBeenCalled();
});
it("сохраняет ввод после ошибки и блокирует повтор и переключение во время запроса", async () => {
  let fail!: (error: Error) => void;
  auth.login.mockImplementationOnce(() => new Promise((_, reject) => { fail = reject; }));
  open(); await fill(); await userEvent.click(screen.getByRole("button", { name: "Войти" }));
  expect(screen.getByLabelText("E-mail")).toBeDisabled();
  expect(screen.queryByRole("link", { name: "Создать учётную запись" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Подождите..." })); expect(auth.login).toHaveBeenCalledTimes(1);
  await act(async () => { fail(new Error("offline")); });
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.getByLabelText("E-mail")).toHaveValue("reader@example.test");
});
it("переключает видимость пароля без отправки формы", async () => {
  open(); await userEvent.click(screen.getByRole("button", { name: "Показать пароль" }));
  expect(screen.getByLabelText("Пароль", { exact: true })).toHaveAttribute("type", "text"); expect(auth.login).not.toHaveBeenCalled();
});
it("разрешает внутренний маршрут и отклоняет внешние адреса и циклы входа", () => {
  for (const value of ["//evil.test", "/\\evil.test", "https://evil.test", "/login", "/books/../login", "/register", null]) expect(safeReturnTo(value)).toBe("/books");
  expect(safeReturnTo("/wishlist?q=толкин#list")).toBe("/wishlist?q=%D1%82%D0%BE%D0%BB%D0%BA%D0%B8%D0%BD#list");
});
