import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AppLayout } from "../../shared/layout/AppLayout";
import { BookDetailsPage } from "../../pages/books/BookDetailsPage";
import { BookFormPage } from "../../pages/books/BookFormPage";
import { BooksPage } from "../../pages/books/BooksPage";
import { LoginPage } from "../../pages/login/LoginPage";
import { NotFoundPage } from "../../pages/not-found/NotFoundPage";
import { WishlistPage } from "../../pages/wishlist/WishlistPage";
import { RequireAuth } from "./RequireAuth";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          index
          element={<Navigate to="/books" replace />}
        />

        <Route path="books" element={<BooksPage />} />

        <Route
          path="books/:bookId"
          element={<BookDetailsPage />}
        />

        <Route
          path="books/new"
          element={<BookFormPage />}
        />

        <Route
          path="books/:bookId/edit"
          element={<BookFormPage />}
        />

        <Route path="login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route
            path="wishlist"
            element={<WishlistPage />}
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}