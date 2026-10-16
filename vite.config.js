
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { cpSync, existsSync } from "node:fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copiar-site-institucional",
      closeBundle() {
        const origem = resolve("www");
        const destino = resolve("dist");

        if (existsSync(origem)) {
          cpSync(origem, destino, {
            recursive: true,
            force: true,
          });
        }
      },
    },
  ],

  base: "/AULA09-CRUD-M-vel-com-Supabase-react-capacitor-MOBILEAPP-agostodourado/",
});
