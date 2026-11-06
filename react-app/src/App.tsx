import { ErrorBoundary } from "./components/ErrorBoundary";
import { BrowserRouter } from "react-router-dom";

import "./App.css";
import { AppRouter } from "./app/router/AppRouter";

function App() {
  return (
    <ErrorBoundary><BrowserRouter>
      <AppRouter />
    </BrowserRouter></ErrorBoundary>
  );
}

export default App;