import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Используется только Postgres; работающая JWT-авторизация остается в FastAPI.
  auth: false,
  // Существующие ветки сохраняют свои настройки.
  branch: (branch) => {
    if (branch.isDefault) {
      // Основная ветка наследует параметры проекта.
      return {};
    }
    if (!branch.exists) {
      // Только новые временные ветки получают срок хранения.
      // Эта политика не меняет уже существующую production.
      return { ttl: "7d" };
    }
    // Без изменения действующей ветки.
    return {};
  },
});
