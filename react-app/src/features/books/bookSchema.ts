import { z } from "zod";
import { normalizeIsbn } from "./isbn";

export const bookSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Название должно содержать минимум 2 символа.")
      .max(200, "Название слишком длинное (до 200 символов)."),

    author: z
      .string()
      .trim()
      .min(2, "Укажите автора.")
      .max(120, "Имя автора слишком длинное (до 120 символов)."),

    isbn: z
      .string()
      .trim()
      .refine(value => { try { normalizeIsbn(value); return true; } catch { return false; } },
        "Проверьте ISBN-10 или ISBN-13 и контрольную цифру; неизвестный ISBN можно оставить пустым."),

    publisher: z
      .string()
      .trim()
      .min(2, "Укажите издательство.")
      .max(100, "Название издательства слишком длинное."),

    language: z
      .string()
      .trim()
      .min(2, "Укажите язык.")
      .max(30, "Название языка слишком длинное."),

    totalCopies: z.number({ error: "Укажите количество экземпляров." }).int("Нужно целое число.")
      .min(0, "Количество не может быть отрицательным.").max(10000, "Допустимо до 10000 экземпляров.").optional(),

    publicationYear: z
      .number({
        error: "Укажите год публикации.",
      })
      .int("Год должен быть целым числом.")
      .min(1450, "Год не может быть меньше 1450.")
      .max(2100, "Некорректный год."),

    editionYear: z
      .number({
        error: "Укажите год издания.",
      })
      .int("Год должен быть целым числом.")
      .min(1450, "Год не может быть меньше 1450.")
      .max(2100, "Некорректный год."),

    pages: z
      .number({
        error: "Укажите количество страниц.",
      })
      .int("Количество страниц должно быть целым числом.")
      .min(1, "Количество страниц должно быть больше нуля.")
      .max(10000, "Слишком большое количество страниц."),
  })
  .refine(
    (data) =>
      data.editionYear >=
      data.publicationYear,
    {
      message:
        "Год издания не может быть раньше года первой публикации.",
      path: ["editionYear"],
    },
  );

export type BookFormValues =
  z.infer<typeof bookSchema>;
