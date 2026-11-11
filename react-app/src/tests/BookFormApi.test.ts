// Контракт ЛР10: проверка ISBN до HTTP и PATCH без перезаписи неизмененных полей.
import { beforeEach, expect, it, vi } from "vitest";
import { apiFetch, ApiError } from "../api/client";
import { saveBook } from "../api/bookForm";
import { normalizeIsbn } from "../features/books/isbn";
import type { BookFormValues } from "../features/books/bookSchema";

vi.mock("../api/client", async original => ({ ...await original<typeof import("../api/client")>(), apiFetch: vi.fn() }));
beforeEach(() => { vi.mocked(apiFetch).mockReset(); });
const data: BookFormValues = { title: "Книга", author: "Автор", isbn: "", publisher: "Издательство", language: "Русский", publicationYear: 2000, editionYear: 2001, pages: 120, totalCopies: 3 };

it.each([["", null], ["978-0-306-40615-7", "9780306406157"], ["0306406152", "9780306406157"], ["0-8044-2957-X", "9780804429573"]])("нормализует ISBN %s", (input, expected) => {
  expect(normalizeIsbn(input ?? "")).toBe(expected);
});
it("отклоняет неверную контрольную цифру до создания автора", async () => {
  await expect(saveBook({ ...data, isbn: "9780306406158" })).rejects.toMatchObject({ status: 422 });
  expect(apiFetch).not.toHaveBeenCalled();
});
it("изменяет только название, не трогая автора ISBN и экземпляры", async () => {
  vi.mocked(apiFetch).mockResolvedValue({ id: 7 });
  await saveBook(data, "7", ["title"]);
  expect(apiFetch).toHaveBeenCalledTimes(1);
  expect(apiFetch).toHaveBeenCalledWith("/books/7", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ title: "Книга" }) }));
});
it("передает null для явной очистки ISBN", async () => {
  vi.mocked(apiFetch).mockResolvedValue({ id: 7 });
  await saveBook(data, "7", ["isbn"]);
  expect(JSON.parse(String(vi.mocked(apiFetch).mock.calls[0]?.[1]?.body))).toEqual({ isbn: null });
});
it("создает книгу без ISBN и с подтвержденным числом экземпляров", async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce({ items: [{ id: 2, name: "Автор" }] }).mockResolvedValueOnce({ id: 7 });
  await saveBook(data);
  const payload = JSON.parse(String(vi.mocked(apiFetch).mock.calls[1]?.[1]?.body));
  expect(payload).toMatchObject({ isbn: null, author_id: 2, total_copies: 3, pages: 120 });
});
it("не выдает любой конфликт данных за дубликат ISBN", async () => {
  vi.mocked(apiFetch).mockRejectedValue(new ApiError("Нельзя уменьшить число экземпляров", 409));
  await expect(saveBook(data, "7", ["totalCopies"])).rejects.toMatchObject({ status: 409, fieldErrors: {} });
});
it("привязывает серверную ошибку числа экземпляров к соответствующему полю", async () => {
  vi.mocked(apiFetch).mockRejectedValue(new ApiError("Проверьте поля", 422, [{ loc: ["body", "total_copies"], msg: "Слишком много экземпляров" }]));
  await expect(saveBook(data, "7", ["totalCopies"])).rejects.toMatchObject({ fieldErrors: { totalCopies: "Слишком много экземпляров" } });
});
