// Даты API — календарные дни, поэтому UTC-парсинг не должен сдвигать их на сутки.
import type { LoanRead } from "../../api/generated";
const formatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });
export function formatLoanDate(value: string) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return "Дата не указана";
  return formatter.format(new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])));
}
export function loanState(loan: Pick<LoanRead, "returned_at" | "due_date">, now = new Date()) {
  if (loan.returned_at) return { kind: "returned", label: "Возвращена" };
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  if (loan.due_date < today) return { kind: "overdue", label: "Срок возврата прошел" };
  if (loan.due_date === today) return { kind: "today", label: "Вернуть сегодня" };
  return { kind: "active", label: "На руках" };
}
