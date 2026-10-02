import { useEffect, useState } from "react";
import { supabase } from "./services/supabaseClient";

export default function App() {
  // =========================
  // AUTENTICAÇÃO
  // =========================

  const [usuario, setUsuario] = useState(null);
  const [emailLogin, setEmailLogin] = useState("");
  const [senhaLogin, setSenhaLogin] = useState("");

  const [carregandoLogin, setCarregandoLogin] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  // =========================
  // PERFIL
  // =========================

  const [perfis, setPerfis] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");

  const [editandoId, setEditandoId] = useState(null);

  // =========================
  // VERIFICAR USUÁRIO LOGADO
  // =========================

  useEffect(() => {
    verificarUsuario();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuario(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function verificarUsuario() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUsuario(user ?? null);
  }

  // =========================
  // LOGIN
  // =========================

  async function entrar(e) {
    e.preventDefault();

    setErro("");
    setMensagem("");
    setCarregandoLogin(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailLogin,
      password: senhaLogin,
    });

    setCarregandoLogin(false);

    if (error) {
      setErro("E-mail ou senha incorretos.");
      return;
    }

    setUsuario(data.user);
    setMensagem("Login realizado com sucesso!");

    setEmailLogin("");
    setSenhaLogin("");
  }

  // =========================
  // LOGOUT
  // =========================

  async function sair() {
    await supabase.auth.signOut();

    setUsuario(null);
    setPerfis([]);
    limparFormulario();
    setMensagem("");
  }

  // =========================
  // READ
  // =========================

  async function buscarPerfis() {
    if (!usuario) return;

    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("perfis")
      .select("id, nome, email, foto_url, bio, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setErro(error.message);
    } else {
      setPerfis(data || []);
    }

    setCarregando(false);
  }

  // Buscar perfis quando o usuário entrar
  useEffect(() => {
    if (usuario) {
      buscarPerfis();
    }
  }, [usuario]);

  // =========================
  // REALTIME
  // =========================

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
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [usuario]);

  // =========================
  // CREATE / UPDATE
  // =========================

  async function salvarPerfil(e) {
    e.preventDefault();

    setErro("");
    setMensagem("");

    if (!nome.trim()) {
      setErro("Digite o nome.");
      return;
    }

    // UPDATE
    if (editandoId) {
      const { error } = await supabase
        .from("perfis")
        .update({
          nome: nome.trim(),
          bio: bio.trim(),
        })
        .eq("id", editandoId);

      if (error) {
        setErro(error.message);
        return;
      }

      setMensagem("Perfil atualizado com sucesso!");
      limparFormulario();
      return;
    }

    // CREATE
    if (!usuario) {
      setErro("Você precisa estar logado.");
      return;
    }

    const { error } = await supabase
      .from("perfis")
      .insert({
        id: usuario.id,
        nome: nome.trim(),
        email: usuario.email,
        bio: bio.trim(),
      });

    if (error) {
      if (error.code === "23505") {
        setErro("Você já possui um perfil cadastrado.");
      } else {
        setErro(error.message);
      }

      return;
    }

    setMensagem("Perfil criado com sucesso!");
    limparFormulario();
  }

  // =========================
  // EDITAR
  // =========================

  function editarPerfil(perfil) {
    // Só pode editar o próprio perfil
    if (perfil.id !== usuario?.id) {
      setErro("Você só pode editar o seu próprio perfil.");
      return;
    }

    setEditandoId(perfil.id);
    setNome(perfil.nome || "");
    setEmail(perfil.email || usuario.email || "");
    setBio(perfil.bio || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =========================
  // DELETE
  // =========================

  async function excluirPerfil(id) {
    if (id !== usuario?.id) {
      setErro("Você só pode excluir o seu próprio perfil.");
      return;
    }

    const confirmar = window.confirm(
      "Tem certeza que deseja excluir seu perfil?"
    );

    if (!confirmar) return;

    setErro("");
    setMensagem("");

    const { error } = await supabase
      .from("perfis")
      .delete()
      .eq("id", id);

    if (error) {
      setErro(error.message);
      return;
    }

    setMensagem("Perfil excluído com sucesso!");
    limparFormulario();
  }

  // =========================
  // LIMPAR FORMULÁRIO
  // =========================

  function limparFormulario() {
    setEditandoId(null);
    setNome("");
    setEmail("");
    setBio("");
  }

  // =========================
  // TELA DE LOGIN
  // =========================

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
              value={emailLogin}
              onChange={(e) => setEmailLogin(e.target.value)}
              style={campo}
              required
            />

            <input
              type="password"
              placeholder="Senha"
              value={senhaLogin}
              onChange={(e) => setSenhaLogin(e.target.value)}
              style={campo}
              required
            />

            <button
              type="submit"
              style={botao}
              disabled={carregandoLogin}
            >
              {carregandoLogin ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {erro && <p style={erroStyle}>{erro}</p>}
        </div>
      </div>
    );
  }

  // =========================
  // TELA PRINCIPAL
  // =========================

  return (
    <div style={pagina}>
      <div style={container}>
        <div style={cabecalho}>
          <div>
            <h1>🌟 Agosto Dourado</h1>

            <p>
              Usuário conectado: <strong>{usuario.email}</strong>
            </p>
          </div>

          <button onClick={sair} style={botaoSair}>
            Sair
          </button>
        </div>

        {mensagem && (
          <div style={sucessoStyle}>
            {mensagem}
          </div>
        )}

        {erro && (
          <div style={erroStyle}>
            {erro}
          </div>
        )}

        {/* FORMULÁRIO */}

        <div style={caixa}>
          <h2>
            {editandoId
              ? "✏️ Editar meu perfil"
              : "➕ Criar meu perfil"}
          </h2>

          <form onSubmit={salvarPerfil}>
            <input
              type="text"
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={campo}
              required
            />

            <input
              type="email"
              placeholder="E-mail"
              value={usuario.email}
              disabled
              style={{
                ...campo,
                background: "#eeeeee",
              }}
            />

            <textarea
              placeholder="Conte um pouco sobre você..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              style={textarea}
            />

            <button type="submit" style={botao}>
              {editandoId
                ? "Salvar alterações"
                : "Criar perfil"}
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

        {/* LISTA */}

        <h2>👥 Perfis cadastrados</h2>

        {carregando && <p>Carregando dados da nuvem...</p>}

        {!carregando && perfis.length === 0 && (
          <p>Nenhum perfil cadastrado.</p>
        )}

        {perfis.map((perfil) => {
          const meuPerfil = perfil.id === usuario.id;

          return (
            <div key={perfil.id} style={card}>
              <h2>{perfil.nome}</h2>

              <p>
                <strong>E-mail:</strong> {perfil.email}
              </p>

              {perfil.bio && (
                <p>
                  <strong>Bio:</strong> {perfil.bio}
                </p>
              )}

              {meuPerfil && (
                <div>
                  <button
                    onClick={() => editarPerfil(perfil)}
                    style={botao}
                  >
                    ✏️ Editar
                  </button>

                  <button
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

// =========================
// ESTILOS
// =========================

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
};

const erroStyle = {
  background: "#ffe5e5",
  color: "#b00020",
  padding: "12px",
  borderRadius: "8px",
  marginBottom: "20px",
};

const sucessoStyle = {
  background: "#e5f7e8",
  color: "#176b2c",
  padding: "12px",
  borderRadius: "8px",
  marginBottom: "20px",
};