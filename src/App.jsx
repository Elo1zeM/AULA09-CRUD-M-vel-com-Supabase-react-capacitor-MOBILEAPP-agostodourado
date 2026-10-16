
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./services/supabaseClient";

export default function App() {
  // AUTENTICAÇÃO
  const [usuario, setUsuario] = useState(null);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [emailLogin, setEmailLogin] = useState("");
  const [senhaLogin, setSenhaLogin] = useState("");
  const [carregandoLogin, setCarregandoLogin] = useState(false);
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  // PERFIL
  const [perfis, setPerfis] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [nome, setNome] = useState("");
  const [bio, setBio] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  // RECUPERAR SESSÃO E ACOMPANHAR AUTENTICAÇÃO
  useEffect(() => {
    let ativo = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento, session) => {
      if (!ativo) return;

      setUsuario(session?.user ?? null);
      setVerificandoSessao(false);

      if (evento === "SIGNED_IN") {
        setErro("");
      }
    });

    async function verificarUsuario() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (ativo) {
          setUsuario(data.session?.user ?? null);
        }
      } catch (error) {
        console.error("Erro ao recuperar sessão:", error);

        if (ativo) {
          setErro("Não foi possível verificar sua sessão. Atualize a página.");
        }
      } finally {
        if (ativo) setVerificandoSessao(false);
      }
    }

    verificarUsuario();

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  // LOGIN COM E-MAIL E SENHA
  async function entrar(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");
    setCarregandoLogin(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailLogin.trim(),
        password: senhaLogin,
      });

      if (error) throw error;

      setMensagem("Login realizado com sucesso!");
      setEmailLogin("");
      setSenhaLogin("");
    } catch (error) {
      console.error("Erro no login:", error);
      setErro(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message || "Não foi possível realizar o login."
      );
    } finally {
      setCarregandoLogin(false);
    }
  }

  // LOGIN COM GOOGLE
  async function entrarComGoogle() {
    setErro("");
    setMensagem("");
    setCarregandoGoogle(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Retorna para a raiz da aplicação React publicada.
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      // O Supabase redireciona o navegador para o Google.
    } catch (error) {
      console.error("Erro no login Google:", error);
      setErro(error.message || "Não foi possível iniciar o login com Google.");
      setCarregandoGoogle(false);
    }
  }

  // LOGOUT
  async function sair() {
    setErro("");
    setMensagem("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erro ao sair:", error);
      setErro("Não foi possível sair da conta.");
      return;
    }

    limparFormulario();
    setPerfis([]);
    setEmailLogin("");
    setSenhaLogin("");
    setMensagem("Você saiu da sua conta.");
  }

  // BUSCAR PERFIS
  const buscarPerfis = useCallback(async () => {
    if (!usuario) return;

    setCarregando(true);

    try {
      const { data, error } = await supabase
        .from("perfis")
        .select("id, nome, email, foto_url, bio, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPerfis(data || []);
    } catch (error) {
      console.error("Erro ao buscar perfis:", error);
      setErro(error.message || "Não foi possível carregar os perfis.");
    } finally {
      setCarregando(false);
    }
  }, [usuario]);

  useEffect(() => {
    if (usuario) {
      buscarPerfis();
    } else {
      setPerfis([]);
    }
  }, [usuario, buscarPerfis]);

  // ATUALIZAÇÃO EM TEMPO REAL
  useEffect(() => {
    if (!usuario) return;

    const canal = supabase
      .channel("perfis-em-tempo-real")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "perfis",
        },
        () => {
          buscarPerfis();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Erro ao conectar ao Realtime.");
        }
      });

    return () => {
      supabase.removeChannel(canal);
    };
  }, [usuario, buscarPerfis]);

  // LIMPAR FORMULÁRIO
  function limparFormulario() {
    setEditandoId(null);
    setNome("");
    setBio("");
  }

  // CRIAR E ATUALIZAR PERFIL
  async function salvarPerfil(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");

    if (!nome.trim()) {
      setErro("Digite seu nome.");
      return;
    }

    if (!usuario) {
      setErro("Você precisa estar logado.");
      return;
    }

    try {
      if (editandoId) {
        if (editandoId !== usuario.id) {
          setErro("Você só pode editar seu próprio perfil.");
          return;
        }

        const { error } = await supabase
          .from("perfis")
          .update({
            nome: nome.trim(),
            bio: bio.trim(),
          })
          .eq("id", usuario.id);

        if (error) throw error;

        setMensagem("Perfil atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("perfis").insert({
          id: usuario.id,
          nome: nome.trim(),
          email: usuario.email,
          bio: bio.trim(),
        });

        if (error) {
          if (error.code === "23505") {
            throw new Error(
              "Você já possui um perfil cadastrado. Edite o perfil existente."
            );
          }

          throw error;
        }

        setMensagem("Perfil criado com sucesso!");
      }

      limparFormulario();
      await buscarPerfis();
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      setErro(error.message || "Não foi possível salvar o perfil.");
    }
  }

  // EDITAR PERFIL
  function editarPerfil(perfil) {
    if (perfil.id !== usuario?.id) {
      setErro("Você só pode editar seu próprio perfil.");
      return;
    }

    setErro("");
    setEditandoId(perfil.id);
    setNome(perfil.nome || "");
    setBio(perfil.bio || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // EXCLUIR PERFIL
  async function excluirPerfil(id) {
    if (id !== usuario?.id) {
      setErro("Você só pode excluir seu próprio perfil.");
      return;
    }

    if (!window.confirm("Tem certeza que deseja excluir seu perfil?")) {
      return;
    }

    setErro("");
    setMensagem("");

    try {
      const { error } = await supabase
        .from("perfis")
        .delete()
        .eq("id", usuario.id);

      if (error) throw error;

      limparFormulario();
      setMensagem("Perfil excluído com sucesso!");
      await buscarPerfis();
    } catch (error) {
      console.error("Erro ao excluir perfil:", error);
      setErro(error.message || "Não foi possível excluir o perfil.");
    }
  }

  // CARREGAMENTO INICIAL
  if (verificandoSessao) {
    return (
      <div style={pagina}>
        <div style={caixaLogin}>
          <h1>🌟 Agosto Dourado</h1>
          <p>Verificando sua sessão...</p>
        </div>
      </div>
    );
  }

  // TELA DE LOGIN
  if (!usuario) {
    return (
      <div style={pagina}>
        <div style={caixaLogin}>
          <h1>🌟 Agosto Dourado</h1>
          <p>Entre para acessar seu perfil.</p>

          <form onSubmit={entrar}>
            <input
              type="email"
              placeholder="E-mail"
              autoComplete="email"
              value={emailLogin}
              onChange={(e) => setEmailLogin(e.target.value)}
              style={campo}
              required
            />

            <input
              type="password"
              placeholder="Senha"
              autoComplete="current-password"
              value={senhaLogin}
              onChange={(e) => setSenhaLogin(e.target.value)}
              style={campo}
              required
            />

            <button
              type="submit"
              style={botao}
              disabled={carregandoLogin || carregandoGoogle}
            >
              {carregandoLogin ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <button
            type="button"
            onClick={entrarComGoogle}
            style={{
              ...botao,
              background: "#4285F4",
              width: "100%",
              marginTop: "10px",
              marginRight: 0,
              opacity: carregandoGoogle ? 0.7 : 1,
            }}
            disabled={carregandoGoogle || carregandoLogin}
          >
            {carregandoGoogle ? "Conectando ao Google..." : "Entrar com Google"}
          </button>

          {erro && <p role="alert" style={erroStyle}>{erro}</p>}
          {mensagem && <p role="status" style={sucessoStyle}>{mensagem}</p>}
        </div>
      </div>
    );
  }

  // TELA PRINCIPAL
  return (
    <div style={pagina}>
      <div style={container}>
        <div style={cabecalho}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {usuario.user_metadata?.avatar_url && (
              <img
                src={usuario.user_metadata.avatar_url}
                alt="Foto de perfil"
                referrerPolicy="no-referrer"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            )}

            <div>
              <h1>🌟 Agosto Dourado</h1>
              <p>
                <strong>
                  {usuario.user_metadata?.full_name ||
                    usuario.user_metadata?.name ||
                    "Usuário"}
                </strong>
                <br />
                {usuario.email}
              </p>
            </div>
          </div>

          <button onClick={sair} style={botaoSair}>
            Sair
          </button>
        </div>

        {mensagem && <div role="status" style={sucessoStyle}>{mensagem}</div>}
        {erro && <div role="alert" style={erroStyle}>{erro}</div>}

        <div style={caixa}>
          <h2>
            {editandoId ? "✏️ Editar meu perfil" : "➕ Criar meu perfil"}
          </h2>

          <form onSubmit={salvarPerfil}>
            <input
              type="text"
              placeholder="Nome"
              autoComplete="name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={campo}
              required
            />

            <input
              type="email"
              value={usuario.email || ""}
              disabled
              aria-label="E-mail da conta"
              style={{ ...campo, background: "#eeeeee" }}
            />

            <textarea
              placeholder="Conte um pouco sobre você..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              style={textarea}
            />

            <button type="submit" style={botao}>
              {editandoId ? "Salvar alterações" : "Criar perfil"}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={limparFormulario}
                style={botaoCancelar}
              >
                Cancelar
              </button>
            )}
          </form>
        </div>

        <h2>👥 Perfis cadastrados</h2>

        {carregando && <p>Carregando dados...</p>}

        {!carregando && perfis.length === 0 && (
          <p>Nenhum perfil cadastrado.</p>
        )}

        {perfis.map((perfil) => {
          const meuPerfil = perfil.id === usuario.id;

          return (
            <div key={perfil.id} style={card}>
              <h2>{perfil.nome}</h2>
              <p><strong>E-mail:</strong> {perfil.email}</p>

              {perfil.bio && (
                <p><strong>Bio:</strong> {perfil.bio}</p>
              )}

              {meuPerfil && (
                <div>
                  <button
                    type="button"
                    onClick={() => editarPerfil(perfil)}
                    style={botao}
                  >
                    ✏️ Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => excluirPerfil(perfil.id)}
                    style={botaoExcluir}
                  >
                    🗑️ Excluir
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ESTILOS
const pagina = {
  minHeight: "100vh",
  background: "#fffaf0",
  padding: "30px",
  fontFamily: "Arial, sans-serif",
  boxSizing: "border-box",
};

const container = {
  maxWidth: "900px",
  margin: "0 auto",
};

const caixaLogin = {
  maxWidth: "500px",
  margin: "80px auto",
  background: "white",
  padding: "30px",
  borderRadius: "15px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.12)",
};

const caixa = {
  background: "white",
  padding: "25px",
  borderRadius: "15px",
  marginBottom: "30px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
};

const cabecalho = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "30px",
};

const campo = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "13px",
  marginBottom: "12px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  fontSize: "16px",
};

const textarea = {
  ...campo,
  minHeight: "110px",
  resize: "vertical",
};

const botao = {
  padding: "12px 18px",
  border: "none",
  borderRadius: "8px",
  background: "#c2185b",
  color: "white",
  cursor: "pointer",
  fontSize: "15px",
  marginRight: "10px",
};

const botaoCancelar = {
  ...botao,
  background: "#777",
};

const botaoExcluir = {
  ...botao,
  background: "#b00020",
};

const botaoSair = {
  ...botao,
  background: "#333",
};

const card = {
  background: "white",
  padding: "20px",
  marginBottom: "15px",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  overflowWrap: "anywhere",
};

const erroStyle = {
  background: "#ffe5e5",
  color: "#b00020",
  padding: "12px",
  borderRadius: "8px",
  marginBottom: "20px",
  overflowWrap: "anywhere",
};

const sucessoStyle = {
  background: "#e5f7e8",
  color: "#176b2c",
  padding: "12px",
  borderRadius: "8px",
  marginBottom: "20px",
  overflowWrap: "anywhere",
};
