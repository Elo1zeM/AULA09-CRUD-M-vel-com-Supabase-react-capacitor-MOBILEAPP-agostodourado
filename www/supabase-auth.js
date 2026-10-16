
(function () {
    const SUPABASE_URL = "https://immjjiipnwdtsbflauuw.supabase.co";
    const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_67PoRLpvSI7mgUqVI-vVNw_lCsKJnps";

    const cliente = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

    const pagina = window.location.pathname.split("/").pop() || "index.html";
    const ehPaginaDeEntrada =
        pagina === "login.html" || pagina === "cadastro.html";

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

    window.entrarComGoogle = async function () {
        mostrarMensagem("Redirecionando para o Google...", "info");

        const { error } = await cliente.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: "https://aula09-crud-m-vel-com-supabase-react-capacitor-mobileapp-a.pages.dev/login.html"
            }
        });

        if (error) {
            mostrarMensagem(error.message, "erro");
            console.error(error);
        }
    };

    window.sairDoSupabase = async function () {
        const { error } = await cliente.auth.signOut();
        if (error) console.error(error);
    };

    cliente.auth.onAuthStateChange(function (evento, sessao) {
        if (!sessao || !sessao.user) return;

        salvarUsuario(sessao.user);

        if (
            ehPaginaDeEntrada &&
            (evento === "SIGNED_IN" || evento === "INITIAL_SESSION")
        ) {
            window.location.replace("comunidade.html");
        }
    });

    document.addEventListener("DOMContentLoaded", function () {
        const botao = document.getElementById("btnGoogle");

        if (botao) {
            botao.addEventListener("click", window.entrarComGoogle);
        }

        const params = new URLSearchParams(
            window.location.search + "&" +
            window.location.hash.replace("#", "")
        );

        if (params.get("error_description")) {
            mostrarMensagem(params.get("error_description"), "erro");
        } else if (params.get("code") && ehPaginaDeEntrada) {
            mostrarMensagem("Finalizando login com Google...", "info");
        }
    });
})();

