// Проверяются доступность описания и честное отображение неполных внешних данных.
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { BookCover, BookDescription, BookFacts } from "../features/books/components/BookPresentation";

it("позволяет раскрыть длинное описание и снова свернуть его", async () => {
  render(<BookDescription text={"Начало описания. ".repeat(70) + "Заключительная фраза."} />);
  expect(screen.queryByText(/Заключительная фраза/)).not.toBeInTheDocument();
  const expand = screen.getByRole("button", { name: "Читать полностью" });
  expect(expand).toHaveAttribute("aria-expanded", "false");
  await userEvent.click(expand);
  expect(screen.getByText(/Заключительная фраза/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Свернуть описание" }));
  expect(screen.queryByText(/Заключительная фраза/)).not.toBeInTheDocument();
});

it("показывает внешний HTML текстом, не создавая исполняемую разметку", () => {
  const text = '<img src=x onerror="window.untrusted = true">';
  const { container } = render(<BookDescription text={text} />);
  expect(screen.getByText(text)).toBeInTheDocument();
  expect(container.querySelector("img")).toBeNull();
});

it("сворачивает многострочное описание даже при небольшом числе символов", async () => {
  render(<BookDescription text={Array.from({ length: 10 }, (_, index) => `Строка ${index + 1}`).join("\n")} />);
  expect(screen.queryByText(/Строка 10/)).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Читать полностью" }));
  expect(screen.getByText(/Строка 10/)).toBeInTheDocument();
});

it("после ошибки картинки показывает подписанную замену без сломанной обложки", () => {
  render(<BookCover title="Книга" coverId={123} />);
  fireEvent.error(screen.getByRole("img", { name: "Обложка книги Книга" }));
  expect(screen.getByRole("img", { name: /Обложка книги «Книга» отсутствует/ })).toBeInTheDocument();
});

it("отличает неизвестные характеристики от настоящего нуля", () => {
  render(<BookFacts facts={[["Издательство", null], ["ISBN", ""], ["Всего экземпляров", 0]]} />);
  expect(screen.getAllByText("Не указано")).toHaveLength(2);
  expect(screen.getByText("0")).toBeInTheDocument();
});
