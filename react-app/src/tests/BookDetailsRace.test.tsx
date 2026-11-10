// ЛР10: даже транспорт, игнорирующий AbortSignal, не подменяет открываемую книгу.
import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useBookDetails } from "../features/books/hooks/useBookDetails";
import { getBookDetailsById } from "../api/books";
import type { BookDetails } from "../types";

vi.mock("../api/books", () => ({ getBookDetailsById: vi.fn() }));
it("игнорирует старую деталь после перехода к другой книге", async () => {
  let finish: (value: BookDetails) => void = () => {};
  vi.mocked(getBookDetailsById).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValueOnce({ id: "2", title: "Вторая книга", authors: [], description: "" });
  const { result, rerender } = renderHook(({ id }) => useBookDetails(id), { initialProps: { id: "1" } });
  await waitFor(() => expect(getBookDetailsById).toHaveBeenCalledTimes(1));
  const firstSignal = vi.mocked(getBookDetailsById).mock.calls[0]?.[1];
  rerender({ id: "2" });
  await waitFor(() => expect(result.current.details?.id).toBe("2"));
  expect(firstSignal?.aborted).toBe(true);
  await act(async () => { finish({ id: "1", title: "Устаревшая книга", authors: [], description: "" }); });
  expect(result.current.details?.id).toBe("2");
});
