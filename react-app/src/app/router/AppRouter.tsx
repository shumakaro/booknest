import {
  lazy,
  Suspense,
} from "react";

import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { Spinner } from "../../components/Spinner";
import { BookDetailsPage } from "../../pages/books/BookDetailsPage";
import { BooksPage } from "../../pages/books/BooksPage";

import { LoginPage } from "../../pages/login/LoginPage";
import { NotFoundPage } from "../../pages/not-found/NotFoundPage";

import { AppLayout } from "../../shared/layout/AppLayout";

import { RequireAuth } from "./RequireAuth";

// Нечастые личные разделы не увеличивают первую загрузку каталога.
const LoansPage = lazy(async () => {
  const module = await import("../../pages/loans/LoansPage");
  return { default: module.LoansPage };
});
const WishlistPage = lazy(async () => {
  const module = await import("../../pages/wishlist/WishlistPage");
  return { default: module.WishlistPage };
});

const BookFormPage = lazy(
  async () => {
    const module =
      await import(
        "../../pages/books/BookFormPage"
      );

    return {
      default:
        module.BookFormPage,
    };
  },
);

function LazyBookFormPage() {
  return (
    <Suspense
      fallback={
        <Spinner label="Загружаем форму..." />
      }
    >
      <BookFormPage />
    </Suspense>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        element={<AppLayout />}
      >
        <Route
          index
          element={
            <Navigate
              to="/books"
              replace
            />
          }
        />

        <Route
          path="books"
          element={<BooksPage />}
        />

        <Route
          path="books/:bookId"
          element={
            <BookDetailsPage />
          }
        />

        <Route element={<RequireAuth role="librarian" />}>
        <Route
          path="books/new"
          element={
            <LazyBookFormPage />
          }
        />

        <Route
          path="books/:bookId/edit"
          element={
            <LazyBookFormPage />
          }
        />

        </Route>
        <Route
          element={<RequireAuth />}
        >
          <Route path="loans" element={<Suspense fallback={<Spinner label="Загрузка выдач..." />}><LoansPage /></Suspense>} />
          <Route
            path="wishlist"
            element={<Suspense fallback={<Spinner label="Загрузка желаемого..." />}><WishlistPage /></Suspense>}
          />
        </Route>

        <Route path="register" element={<LoginPage register />} />

        <Route
          path="login"
          element={<LoginPage />}
        />

        <Route
          path="*"
          element={<NotFoundPage />}
        />
      </Route>
    </Routes>
  );
}