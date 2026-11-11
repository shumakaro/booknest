// ISBN не обязателен. Дефисы/пробелы допускаются, контрольная цифра проверяется до HTTP.
export function normalizeIsbn(value: string): string | null {
  const isbn = value.replace(/[\s-]/g, "").toUpperCase();
  if (!isbn) return null;
  if (/^\d{13}$/.test(isbn)) {
    const sum = [...isbn].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
    if (sum % 10 === 0) return isbn;
  }
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = [...isbn].reduce((total, digit, index) => total + (digit === "X" ? 10 : Number(digit)) * (10 - index), 0);
    if (sum % 11 === 0) {
      const prefix = "978" + isbn.slice(0, 9);
      const weighted = [...prefix].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
      return prefix + String((10 - weighted % 10) % 10);
    }
  }
  throw new Error("Проверьте ISBN-10 или ISBN-13: неверный формат или контрольная цифра.");
}
