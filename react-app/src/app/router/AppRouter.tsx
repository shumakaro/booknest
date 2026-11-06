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
import { LoansPage } from "../../pages/loans/LoansPage";
import { LoginPage } from "../../pages/login/LoginPage";
import { NotFoundPage } from "../../pages/not-found/NotFoundPage";
import { WishlistPage } from "../../pages/wishlist/WishlistPage";
import { AppLayout } from "../../shared/layout/AppLayout";

import { RequireAuth } from "./RequireAuth";

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
          <Route path="loans" element={<LoansPage />} />
          <Route
            path="wishlist"
            element={
              <WishlistPage />
            }
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