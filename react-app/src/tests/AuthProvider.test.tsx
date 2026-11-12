// Сеанс не должен оживать из ответа, начатого до нового входа или выхода.
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthProvider } from "../app/AuthProvider";
import { useAuth } from "../app/useAuth";
import { apiFetch, refreshAccess, setAccessToken } from "../api/client";
vi.mock("../api/client", () => ({ apiFetch: vi.fn(), refreshAccess: vi.fn(), setAccessToken: vi.fn() }));
function Panel() { const { user, loading, login, logout } = useAuth(); return <><p>{loading ? "Ожидание" : user?.email ?? "Гость"}</p>
  <button onClick={() => { void login("new@example.test", "Fixture-123").catch(() => {}); }}>Вход</button>
  <button onClick={() => { void logout().catch(() => {}); }}>Выход</button></>; }
beforeEach(() => { vi.mocked(apiFetch).mockReset(); vi.mocked(refreshAccess).mockReset().mockResolvedValue(undefined); vi.mocked(setAccessToken).mockClear(); });
it("поздний ответ восстановления не заменяет пользователя после нового входа", async () => {
  let finish!: (value: unknown) => void;
  vi.mocked(apiFetch).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValueOnce({ access_token: "fixture-new" }).mockResolvedValueOnce({ id: 2, email: "new@example.test", role: "member" });
  render(<AuthProvider><Panel /></AuthProvider>);
  await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
  await userEvent.click(screen.getByRole("button", { name: "Вход" }));
  await screen.findByText("new@example.test");
  await act(async () => { finish({ id: 1, email: "old@example.test", role: "member" }); });
  expect(screen.queryByText("old@example.test")).not.toBeInTheDocument();
});
it("не оставляет access после отказа чтения текущего пользователя при входе", async () => {
  vi.mocked(refreshAccess).mockRejectedValueOnce(new Error("guest"));
  vi.mocked(apiFetch).mockResolvedValueOnce({ access_token: "fixture-new" }).mockRejectedValueOnce(new Error("me failed"));
  render(<AuthProvider><Panel /></AuthProvider>); await screen.findByText("Гость");
  await userEvent.click(screen.getByRole("button", { name: "Вход" }));
  await waitFor(() => expect(setAccessToken).toHaveBeenLastCalledWith(null));
  expect(screen.getByText("Гость")).toBeInTheDocument();
});
it("не объявляет серверный выход успешным при сетевой ошибке и позволяет повтор", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce({ id: 1, email: "reader@example.test", role: "member" })
    .mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
  render(<AuthProvider><Panel /></AuthProvider>); await screen.findByText("reader@example.test");
  await userEvent.click(screen.getByRole("button", { name: "Выход" }));
  expect(screen.getByText("reader@example.test")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Выход" }));
  await screen.findByText("Гость");
});
