// Действие в деталях не предполагает отсутствие книги при ошибке чтения списка.
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { WishlistAction } from "../features/books/components/WishlistAction";
import { getWishlist, setWishlistSaved } from "../api/wishlist";
const auth=vi.hoisted(()=>({user:{id:1} as {id:number}|null}));
vi.mock("../app/useAuth",()=>({useAuth:()=>auth}));
vi.mock("../api/wishlist",()=>({getWishlist:vi.fn(),setWishlistSaved:vi.fn()}));
beforeEach(()=>{auth.user={id:1};vi.mocked(getWishlist).mockReset().mockResolvedValue([]);vi.mocked(setWishlistSaved).mockReset().mockResolvedValue(undefined);});
function open(){render(<MemoryRouter><WishlistAction bookId="7" /></MemoryRouter>);}
it("гостю предлагает вход без запроса личного списка",()=>{
  auth.user=null;open();
  expect(screen.getByRole("link",{name:"Войти, чтобы добавить в желаемое"})).toHaveAttribute("href","/login");
  expect(getWishlist).not.toHaveBeenCalled();
});
it("показывает серверное сохранение и удаляет именно эту книгу",async()=>{
  vi.mocked(getWishlist).mockResolvedValue([{id:"7",title:"Книга",authors:[]}]);open();
  await userEvent.click(await screen.findByRole("button",{name:"Удалить из желаемого"}));
  expect(setWishlistSaved).toHaveBeenCalledWith("7",false);
  expect(await screen.findByRole("button",{name:"В желаемое"})).toHaveAttribute("aria-pressed","false");
});
it("после ошибки чтения сначала повторяет проверку, не изменяя данные",async()=>{
  vi.mocked(getWishlist).mockRejectedValueOnce(new Error("Сбой чтения")).mockResolvedValueOnce([]);open();
  await userEvent.click(await screen.findByRole("button",{name:"Повторить проверку желаемого"}));
  await screen.findByRole("button",{name:"В желаемое"});
  expect(setWishlistSaved).not.toHaveBeenCalled();
});
it("блокирует повтор и откатывает сохранение после ошибки",async()=>{
  let fail:(reason:Error)=>void=()=>{};
  vi.mocked(setWishlistSaved).mockImplementation(()=>new Promise((_,reject)=>{fail=reject;}));open();
  await userEvent.click(await screen.findByRole("button",{name:"В желаемое"}));
  const pending=screen.getByRole("button",{name:"Обновляем желаемое…"});
  expect(pending).toBeDisabled();await userEvent.click(pending);
  expect(setWishlistSaved).toHaveBeenCalledTimes(1);
  await act(async()=>{fail(new Error("Сбой записи"));});
  expect(await screen.findByRole("button",{name:"В желаемое"})).toHaveAttribute("aria-pressed","false");
  expect(screen.getByRole("alert")).toHaveTextContent("Изменение отменено");
});
