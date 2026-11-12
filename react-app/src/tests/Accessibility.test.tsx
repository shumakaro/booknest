// Поведение фокуса и уведомлений проверяется отдельно от внешнего вида.
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { MemoryRouter, Link, useNavigate } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { RouteAccessibility } from "../features/accessibility/RouteAccessibility";
import { NoticeHost } from "../components/NoticeHost";

function Shell() {
  const main = useRef<HTMLElement>(null); const navigate = useNavigate();
  return <><RouteAccessibility target={main} /><Link to="/loans">Выдачи</Link><main ref={main} tabIndex={-1} data-testid="main">
    <label>Поиск<input onChange={event => navigate(`/books?q=${event.target.value}`)} /></label></main></>;
}
afterEach(() => { vi.useRealTimers(); });
it("обновляет заголовок и фокус при переходе на страницу", async () => {
  render(<MemoryRouter initialEntries={["/books"]}><Shell /></MemoryRouter>);
  expect(document.title).toBe("Моя библиотека — BookNest");
  await userEvent.click(screen.getByRole("link", { name: "Выдачи" }));
  expect(document.title).toBe("Выдачи — BookNest"); expect(screen.getByTestId("main")).toHaveFocus();
});
it("не забирает фокус поиска при изменении query", async () => {
  render(<MemoryRouter initialEntries={["/books"]}><Shell /></MemoryRouter>);
  await userEvent.type(screen.getByRole("textbox"), "книга");
  expect(screen.getByRole("textbox")).toHaveFocus(); expect(screen.getByRole("textbox")).toHaveValue("книга");
});
function show(message = "Книга сохранена") { act(() => { globalThis.dispatchEvent(new CustomEvent("booknest:notice", { detail: message })); }); }
function tick(ms: number) { act(() => { vi.advanceTimersByTime(ms); }); }
it("дает прочитать уведомление под курсором, затем отсчитывает новое время", () => {
  vi.useFakeTimers(); render(<NoticeHost />); show();
  const notice = screen.getByText("Книга сохранена").parentElement!;
  fireEvent.mouseEnter(notice); tick(10000); expect(screen.getByText("Книга сохранена")).toBeInTheDocument();
  fireEvent.mouseLeave(notice); tick(6000); expect(screen.queryByText("Книга сохранена")).not.toBeInTheDocument();
});
it("сохраняет фокус кнопки при новом сообщении и возвращает к прежнему действию", () => {
  vi.useFakeTimers(); render(<><button>Предыдущее действие</button><NoticeHost /></>); show();
  const previous = screen.getByRole("button", { name: "Предыдущее действие" });
  act(() => previous.focus());
  const close = screen.getByRole("button", { name: "Закрыть уведомление" }); act(() => close.focus());
  tick(10000); expect(close).toHaveFocus(); show("Книга возвращена"); expect(close).toHaveFocus();
  tick(10000); expect(screen.getByText("Книга возвращена")).toBeInTheDocument();
  fireEvent.click(close); expect(previous).toHaveFocus(); expect(screen.queryByText("Книга возвращена")).not.toBeInTheDocument();
});
it("после ухода фокуса снова закрывается автоматически", () => {
  vi.useFakeTimers(); render(<><button>Другое действие</button><NoticeHost /></>); show();
  act(() => screen.getByRole("button", { name: "Закрыть уведомление" }).focus()); tick(10000);
  act(() => screen.getByRole("button", { name: "Другое действие" }).focus()); tick(6000);
  expect(screen.queryByText("Книга сохранена")).not.toBeInTheDocument();
});
