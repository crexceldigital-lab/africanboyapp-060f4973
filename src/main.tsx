import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { CountryProvider } from "./context/CountryContext.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { initAnalytics } from "./lib/analytics";
import { Toaster } from "sonner";

initAnalytics();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <CountryProvider>
      <App />
      <Toaster position="top-center" richColors closeButton toastOptions={{ style: { zIndex: 10000 } }} style={{ zIndex: 10000 }} />
    </CountryProvider>
  </ThemeProvider>
);
