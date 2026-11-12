// Разрешены только разделы приложения: адрес из URL/Router state не должен уводить наружу.
export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/books";
  const url = new URL(value, "https://booknest.invalid");
  const roots = ["/books", "/discover", "/wishlist", "/loans"];
  return url.origin === "https://booknest.invalid" && roots.some(root => url.pathname === root || url.pathname.startsWith(root + "/"))
    ? url.pathname + url.search + url.hash : "/books";
}
