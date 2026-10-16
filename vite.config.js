
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { cpSync, copyFileSync, existsSync } from "node:fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "publicar-site-agosto-dourado",
      closeBundle() {
        const origem = resolve("www");
        const destino = resolve("dist");
        const indexReact = resolve(destino, "index.html");
        const appReact = resolve(destino, "app.html");

        // Guarda a página React para não perder o CRUD.
        if (existsSync(indexReact)) {
          copyFileSync(indexReact, appReact);
        }

        // Copia as páginas originais do Agosto Dourado.
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

