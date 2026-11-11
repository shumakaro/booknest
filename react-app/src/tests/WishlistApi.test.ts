// ЛР10: чтение всех страниц и отмена не должны терять записи или продолжать чужой запрос.
import { beforeEach, expect, it, vi } from "vitest";
import { apiFetch } from "../api/client";
import { getWishlist } from "../api/wishlist";
vi.mock("../api/client",()=>({apiFetch:vi.fn()}));
beforeEach(()=>vi.mocked(apiFetch).mockReset());
const book=(id:number)=>({id,title:`Книга ${id}`,author:"Автор",author_id:1,year:2000,available:1});
it("читает следующую страницу и не дублирует повторившуюся книгу",async()=>{
  vi.mocked(apiFetch).mockResolvedValueOnce({items:[book(1),book(2)],total:4}).mockResolvedValueOnce({items:[book(2),book(3)],total:4});
  expect((await getWishlist()).map(item=>item.id)).toEqual(["1","2","3"]);
  expect(apiFetch).toHaveBeenNthCalledWith(2,"/wishlist?page=2&size=100",{signal:undefined});
});
it("не начинает чтение, если запрос уже отменен",async()=>{
  const controller=new AbortController();controller.abort();
  await expect(getWishlist(controller.signal)).rejects.toMatchObject({name:"AbortError"});
  expect(apiFetch).not.toHaveBeenCalled();
});
it("не продолжает страницы после отмены даже при запоздавшем ответе",async()=>{
  const controller=new AbortController();
  vi.mocked(apiFetch).mockImplementation(async()=>{controller.abort();return {items:[book(1)],total:200};});
  await expect(getWishlist(controller.signal)).rejects.toMatchObject({name:"AbortError"});
  expect(apiFetch).toHaveBeenCalledTimes(1);
});
