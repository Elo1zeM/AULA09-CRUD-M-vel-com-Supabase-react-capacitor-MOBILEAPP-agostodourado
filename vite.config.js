import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // No GitHub Pages o projeto fica dentro do caminho do repositório.
  // Localmente e no Capacitor, continua usando a raiz.
  base: process.env.GITHUB_ACTIONS === "true"
    ? "/AULA09-CRUD-M-vel-com-Supabase-react-capacitor-MOBILEAPP-agostodourado/"
    : "/",
});
