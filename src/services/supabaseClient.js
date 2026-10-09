import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  document.body.innerHTML =
    "<h2 style='font-family:Arial;padding:30px;color:#b00020'>" +
    "Faltam as variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY.<br>" +
    "Local: confira o arquivo .env e reinicie o npm run dev.<br>" +
    "Publicado: cadastre as variáveis na hospedagem e faça novo deploy." +
    "</h2>";
  throw new Error("Variáveis do Supabase não definidas");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
