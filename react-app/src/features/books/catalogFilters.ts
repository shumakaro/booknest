// ЛР10: URL можно открыть напрямую, поэтому значения проверяются до вызова API.
export const catalogSorts = [
  ["title", "Название А–Я"], ["-title", "Название Я–А"],
  ["year", "Сначала старые"], ["-year", "Сначала новые"],
] as const;
export const catalogGenres = [
  ["scifi", "Фантастика"], ["history", "История"], ["poetry", "Поэзия"],
  ["cs", "Информатика"], ["fiction", "Проза"],
] as const;

export function catalogFilters(params: URLSearchParams) {
  const rawPage = params.get("page");
  const number = Number(rawPage);
  // Ограничение защищает от бесконечных/дробных номеров из вручную измененной ссылки.
  const page = Number.isSafeInteger(number) && number >= 1 && number <= 1_000_000 ? number : 1;
  const rawSort = params.get("sort");
  const rawGenre = params.get("genre");
  const sort = catalogSorts.find(([value]) => value === rawSort)?.[0] ?? "title";
  const genre = catalogGenres.find(([value]) => value === rawGenre)?.[0] ?? "";
  const available = params.get("available") === "1";
  const query = params.get("q") ?? "";
  const invalid = (rawPage !== null && rawPage !== String(page))
    || (rawSort !== null && rawSort !== sort) || (rawGenre !== null && rawGenre !== genre)
    || (params.has("available") && params.get("available") !== "1");
  return { query, sort, genre, available, page, invalid };
}
