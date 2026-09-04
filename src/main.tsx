import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { CountryProvider } from "./context/CountryContext.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { initAnalytics } from "./lib/analytics";

initAnalytics();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <CountryProvider>
      <App />
    </CountryProvider>
  </ThemeProvider>
);
