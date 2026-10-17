import { z } from "zod";

export const bookSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Название должно содержать минимум 2 символа.")
      .max(120, "Название слишком длинное."),

    author: z
      .string()
      .trim()
      .min(2, "Укажите автора.")
      .max(100, "Имя автора слишком длинное."),

    isbn: z
      .string()
      .trim()
      .regex(
        /^(?:\d{10}|\d{13})$/,
        "ISBN должен содержать 10 или 13 цифр.",
      ),

    publisher: z
      .string()
      .trim()
      .min(2, "Укажите издательство.")
      .max(100, "Название издательства слишком длинное."),

    language: z
      .string()
      .trim()
      .min(2, "Укажите язык."),

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