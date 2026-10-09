// =====================================================
// LOGIN COM GOOGLE (Supabase Auth) - páginas do /www
// =====================================================
// 1) Preencha as duas constantes abaixo com os mesmos valores
//    do seu .env (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).
// 2) A chave "publishable" é pública por design.
//    NUNCA coloque aqui a chave "secret".
// =====================================================

(function () {

    const SUPABASE_URL = "https://immjjiipnwdtsbflauuw.supabase.co";
    const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_67PoRLpvSI7mgUqVI-vVNw_lCsKJnps";

    const configurado =
        SUPABASE_URL.startsWith("https://") &&
        !SUPABASE_PUBLISHABLE_KEY.startsWith("COLE_AQUI");

    const cliente = configurado
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
        : null;

    const pagina = window.location.pathname.split("/").pop() || "index.html";
    const ehPaginaDeEntrada =
        pagina === "login.html" || pagina === "cadastro.html";


    // ---------- mensagens (usa o <p id="mensagem"> da página) ----------

    function mostrarMensagem(texto, tipo) {

        const el = document.getElementById("mensagem");
        if (!el) return;

        const cores = {
            erro: "text-red-600",
            sucesso: "text-green-600",
            info: "text-gray-600"
        };

        el.textContent = texto;
        el.className =
            "text-center text-sm font-semibold " + (cores[tipo] || cores.info);
    }


    // ---------- guarda o usuário no formato que o site já usa ----------

    function salvarUsuario(user) {

        const meta = user.user_metadata || {};

        localStorage.setItem("agostoUsuarioLogado", JSON.stringify({
            id: user.id,
            nome: meta.full_name || meta.name || user.email,
            email: user.email,
            foto: meta.avatar_url || meta.picture || "",
            dataCadastro: user.created_at,
            origem: "google"
        }));
    }


    // ---------- ações públicas ----------

    window.entrarComGoogle = async function () {

        if (!cliente) {
            mostrarMensagem(
                "Configure a URL e a chave do Supabase no arquivo supabase-auth.js.",
                "erro"
            );
            return;
        }

        mostrarMensagem("Redirecionando para o Google...", "info");

        const { error } = await cliente.auth.signInWithOAuth({
            provider: "google",
            options: {
                // volta para o login.html, que conclui o login e segue para a comunidade
                redirectTo: new URL("login.html", window.location.href).href
            }
        });

        if (error) mostrarMensagem(error.message, "erro");
    };

    window.sairDoSupabase = async function () {

        if (!cliente) return;

        try {
            await cliente.auth.signOut();
        } catch (e) {
            console.error(e);
        }
    };


    // ---------- sincroniza a sessão do Supabase com o site ----------

    if (cliente) {

        cliente.auth.onAuthStateChange(function (evento, sessao) {

            if (!sessao || !sessao.user) return;

            salvarUsuario(sessao.user);

            if (ehPaginaDeEntrada) {
                mostrarMensagem("Login realizado com sucesso!", "sucesso");

                setTimeout(function () {
                    window.location.href = "comunidade.html";
                }, 700);
            }
        });
    }


    // ---------- liga o botão e trata retorno / erros do Google ----------

    document.addEventListener("DOMContentLoaded", function () {

        const botao = document.getElementById("btnGoogle");

        if (botao) botao.addEventListener("click", window.entrarComGoogle);

        const params = new URLSearchParams(
            window.location.search + "&" + window.location.hash.replace("#", "")
        );

        if (params.get("error_description")) {
            mostrarMensagem(params.get("error_description"), "erro");
        } else if (params.get("code") && ehPaginaDeEntrada) {
            mostrarMensagem("Finalizando login com Google...", "info");
        }
    });

})();
