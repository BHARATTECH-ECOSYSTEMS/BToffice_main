import React from "react";
import { createRoot } from "react-dom/client";
import "@xterm/xterm/css/xterm.css";
import { App } from "./App";
import { AppErrorBoundary } from "./components/shared/AppErrorBoundary";
import { initializeI18n } from "./i18n";
import { ipc } from "./lib/ipc";
import { getBrowserLocaleFallback } from "./lib/locale";
import { isTauriRuntime } from "./lib/runtime";
import "./globals.css";

async function bootstrap() {
  let locale = getBrowserLocaleFallback();

  if (isTauriRuntime()) {
    try {
      locale = await ipc.getAppLocale();
    } catch {
      console.log("Failed to get locale from Tauri");
    }
  }

  await initializeI18n(locale);

  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </React.StrictMode>
  );
}

void bootstrap();
