// ==========================================
// PASSO 1: IMPORTAÇÃO DOS MÓDULOS DO FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, deleteDoc, setDoc, doc, getDoc, onSnapshot, serverTimestamp, collectionGroup 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signOut, getIdTokenResult
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ==========================================
// PASSO 2: CONFIGURAÇÃO DE CREDENCIAIS E CONEXÃO
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCp40ALB_7lW7mOfX8NZkS8583YR3Khhbw",
  authDomain: "quiz-interativo-8a98c.firebaseapp.com",
  databaseURL: "https://quiz-interativo-8a98c-default-rtdb.firebaseio.com",
  projectId: "quiz-interativo-8a98c",
  storageBucket: "quiz-interativo-8a98c.firebasestorage.app",
  messagingSenderId: "948601017774",
  appId: "1:948601017774:web:bd0e038611ff6d2148643f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================================
// RESTAURAÇÃO DA SESSÃO DO PROFESSOR
// Não altera dados. Apenas garante que as leituras privadas só
// comecem depois de o Firebase confirmar login por senha.
// ============================================================
const authProfessor = getAuth(app);
const CHAVE_PROFESSOR_OFFLINE_AUTH = "quiz_professor_offline_v10c9";

function atualizarCabecalhoProfessorAuth(usuario, conectado = true) {
  const status = document.getElementById("status-conexao-professor");
  const email = document.getElementById("professor-email-logado");
  if (status) status.textContent = conectado ? "● CONECTADO" : "● MODO OFFLINE";
  if (email) email.textContent = usuario?.email || "Professor autorizado";
}

window.sairPainelProfessor = async function() {
  try { await signOut(authProfessor); }
  catch (erro) { console.warn("Falha ao sair online:", erro?.code || erro); }
  finally { window.location.replace("login.html"); }
};

async function validarSessaoProfessorAntesDoPainel() {
  const modoOffline = new URLSearchParams(location.search).get("modo") === "offline";
  if (modoOffline) {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_PROFESSOR_OFFLINE_AUTH) || "null");
      if (salvo?.email && salvo?.uid) {
        atualizarCabecalhoProfessorAuth({email: salvo.email}, false);
        return true;
      }
    } catch (_) {}
    window.location.replace("login.html");
    return false;
  }

  return await new Promise(resolve => {
    const cancelar = onAuthStateChanged(authProfessor, async usuario => {
      cancelar();
      if (!usuario) {
        window.location.replace("login.html");
        resolve(false);
        return;
      }
      try {
        const token = await getIdTokenResult(usuario, true);
        const provedor = token?.signInProvider || token?.claims?.firebase?.sign_in_provider || "";
        if (provedor !== "password") {
          await signOut(authProfessor).catch(()=>{});
          window.location.replace("login.html");
          resolve(false);
          return;
        }
        localStorage.setItem(CHAVE_PROFESSOR_OFFLINE_AUTH, JSON.stringify({
          email: usuario.email, uid: usuario.uid, validadoEm: Date.now()
        }));
        atualizarCabecalhoProfessorAuth(usuario, true);
        resolve(true);
      } catch (erro) {
        console.error("Falha ao validar sessão do professor:", erro);
        window.location.replace("login.html");
        resolve(false);
      }
    });
  });
}

// ==========================================
// PASSO 3: VARIÁVEIS DE ESTADO E CACHE GLOBAL
// ==========================================
let resultadosGlobaisCache = [];
let alunosOnlineCache = [];
let questoesBancoCache = [];
let ordemAtualMonitoramento = "nenhum";
let ordemAtualResultados = "nenhum";
let escolaAtivaSelecionadaIndependente = ""; 
let alunosOcultosCache = new Set(JSON.parse(localStorage.getItem("alunos_ocultos_painel") || "[]")); 
let alunosLixeiraCache = new Set(JSON.parse(localStorage.getItem("alunos_lixeira_painel") || "[]"));
let escolaPrincipalFixadaId = localStorage.getItem("escola_principal_fixada_id") || "";
let temaAtualSistema = localStorage.getItem("tema_sistema_escolar") || "dark";

// ==========================================
// PASSO 4: EVENTO DE INICIALIZAÇÃO DO DOM
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  if (!(await validarSessaoProfessorAntesDoPainel())) return;
  document.body.style.opacity = "1";
  aplicarTemaSistema(temaAtualSistema);
  garantirBancoCompleto100Questoes();
  forcarMenuClassificarCompleto();
  injetarEstilosGlobaisAjustados();
  injetarBarraNavegacaoGlobalTopo();
  removerAbaConfiguracoesGeraisDoDom();
  inicializarReordenacaoAbasDinamica();

  if (window.location.pathname.includes("escola.html")) {
    inicializarPaginaEscola();
  } else if (!window.location.pathname.includes("painel.html")) {
    inicializarTelaAlunoQuiz();
  }
});

// ==========================================
// GERENCIADOR DE REORDENAÇÃO LIVRE DAS ABAS
// ==========================================
function inicializarReordenacaoAbasDinamica() {
  const barraAbas = document.getElementById("barra-navegacao-abas");
  if (!barraAbas) return;

  // Restaurar ordem salva no localStorage, se houver
  const ordemSalva = JSON.parse(localStorage.getItem("ordem_abas_painel_professor") || "[]");
  if (ordemSalva.length > 0) {
    ordemSalva.forEach(abaId => {
      const btn = barraAbas.querySelector(`[data-aba="${abaId}"]`);
      if (btn) barraAbas.appendChild(btn);
    });
  }

  let botaoArrastadoAba = null;

  barraAbas.querySelectorAll(".btn-aba").forEach(botao => {
    botao.addEventListener("dragstart", (e) => {
      botaoArrastadoAba = botao;
      botao.classList.add("dragging");
    });

    botao.addEventListener("dragend", () => {
      botao.classList.remove("dragging");
      botaoArrastadoAba = null;
      
      // Salvar nova ordem no localStorage
      const novaOrdem = Array.from(barraAbas.querySelectorAll(".btn-aba")).map(b => b.getAttribute("data-aba"));
      localStorage.setItem("ordem_abas_painel_professor", JSON.stringify(novaOrdem));
      mostrarNotificacao("📌 Ordem das abas atualizada!");
    });

    botao.addEventListener("dragover", (e) => {
      e.preventDefault();
      const alvo = e.target.closest(".btn-aba");
      if (alvo && alvo !== botaoArrastadoAba && botaoArrastadoAba) {
        const bounding = alvo.getBoundingClientRect();
        const offset = e.clientX - bounding.left;
        if (offset > bounding.width / 2) {
          barraAbas.insertBefore(botaoArrastadoAba, alvo.nextSibling);
        } else {
          barraAbas.insertBefore(botaoArrastadoAba, alvo);
        }
      }
    });
  });
}

// ==========================================
// PASSO 5: TEMA DIA / NOITE (CLARO / ESCURO)
// ==========================================
window.alternarTemaSistema = function() {
  temaAtualSistema = temaAtualSistema === "dark" ? "light" : "dark";
  localStorage.setItem("tema_sistema_escolar", temaAtualSistema);
  aplicarTemaSistema(temaAtualSistema);
};

function aplicarTemaSistema(tema) {
  const root = document.documentElement;
  if (tema === "light") {
    root.style.setProperty("--bg-dark", "#f8fafc");
    root.style.setProperty("--card-bg", "#ffffff");
    root.style.setProperty("--border-color", "#cbd5e1");
    root.style.setProperty("--text", "#0f172a");
    root.style.setProperty("--text-muted", "#475569");
    document.body.classList.add("tema-claro-ativo");
  } else {
    root.style.setProperty("--bg-dark", "#0b0f19");
    root.style.setProperty("--card-bg", "#111827");
    root.style.setProperty("--border-color", "#1f2937");
    root.style.setProperty("--text", "#f3f4f6");
    root.style.setProperty("--text-muted", "#9ca3af");
    document.body.classList.remove("tema-claro-ativo");
  }
}

function salvarAlunosOcultosLocalStorage() {
  localStorage.setItem("alunos_ocultos_painel", JSON.stringify(Array.from(alunosOcultosCache)));
}

function salvarAlunosLixeiraLocalStorage() {
  localStorage.setItem("alunos_lixeira_painel", JSON.stringify(Array.from(alunosLixeiraCache)));
}

function removerAbaConfiguracoesGeraisDoDom() {
  const botoesAba = document.querySelectorAll('.btn-aba, button');
  botoesAba.forEach(btn => {
    if (btn.textContent.includes("Configurações Gerais")) {
      btn.remove();
    }
  });

  const conteudoConfig = document.getElementById("aba-configuracoes") || document.querySelector('[id*="configuracoes"]');
  if (conteudoConfig && !conteudoConfig.tagName.toLowerCase().includes('body')) {
    conteudoConfig.remove();
  }
}

// ==========================================
// PASSO 6: ESTILOS GLOBAIS E NAVEGAÇÃO COMPACTA
// ==========================================
function injetarEstilosGlobaisAjustados() {
  if (!document.getElementById("estilo-global-ajustado")) {
    const st = document.createElement("style");
    st.id = "estilo-global-ajustado";
    st.innerHTML = `
      input[type="datetime-local"]::-webkit-calendar-picker-indicator {
        filter: invert(1) brightness(1.8);
        cursor: pointer;
        opacity: 0.9;
      }
      body.tema-claro-ativo input[type="datetime-local"]::-webkit-calendar-picker-indicator {
        filter: none;
      }
      .aba-conteudo {
        display: flex;
        flex-direction: column !important;
        gap: 25px !important;
        padding-top: 25px !important;
      }
      .aba-conteudo h2 {
        margin-top: 0 !important;
        margin-bottom: 20px !important;
        padding-bottom: 10px !important;
      }

      /* SEPARAÇÃO VISUAL EXATA DAS BOXES DE ESCOLAS E ATIVAÇÃO */
      #aba-escolas {
        display: flex;
        flex-direction: column;
        gap: 20px !important;
      }
      
      /* Caixa 1: Formulário de Cadastro */
      #aba-escolas h2:nth-of-type(1) {
        background: rgba(30, 41, 59, 0.7);
        padding: 14px 18px;
        border-radius: 10px;
        border: 1px solid #3b82f6;
        margin-bottom: 10px !important;
      }
      #aba-escolas > div:has(#input-nome-escola),
      #aba-escolas > form:has(#input-nome-escola) {
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      }

      /* Caixa 2: Lista de Escolas Cadastradas */
      #aba-escolas h2:nth-of-type(2) {
        background: rgba(30, 41, 59, 0.7);
        padding: 14px 18px;
        border-radius: 10px;
        border: 1px solid #3b82f6;
        margin-top: 15px !important;
        margin-bottom: 10px !important;
      }
      #aba-escolas > div:has(#lista-escolas-cadastradas-container) {
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      }

      body.tema-claro-ativo #aba-escolas h2:nth-of-type(1),
      body.tema-claro-ativo #aba-escolas h2:nth-of-type(2) {
        background: #e2e8f0 !important;
        border-color: #0284c7 !important;
        color: #0f172a !important;
      }
      body.tema-claro-ativo #aba-escolas > div:has(#input-nome-escola),
      body.tema-claro-ativo #aba-escolas > form:has(#input-nome-escola),
      body.tema-claro-ativo #aba-escolas > div:has(#lista-escolas-cadastradas-container) {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
        box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      }

      .acoes-topo-bloco, .barra-controles-relatorios, div:has(> .acoes-topo-bloco) {
        position: relative !important;
        margin-top: 15px !important;
        margin-bottom: 25px !important;
        flex-shrink: 0 !important;
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 12px !important;
        align-items: center !important;
      }
      .table-responsive, .table-container, div:has(> table) {
        width: 100% !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch;
        margin-top: 20px !important;
      }
      table {
        border-collapse: collapse !important;
        width: 100% !important;
        border: 1px solid rgba(51, 65, 85, 0.7) !important;
      }
      body.tema-claro-ativo table { border: 1px solid #cbd5e1 !important; }
      table tr { border-bottom: 1px solid rgba(51, 65, 85, 0.7) !important; }
      body.tema-claro-ativo table tr { border-bottom: 1px solid #cbd5e1 !important; }
      
      table td, table th {
        padding: 10px 12px !important;
        border-right: 2px solid rgba(59, 130, 246, 0.4) !important;
        border-left: 1px solid rgba(51, 65, 85, 0.2) !important;
        border-bottom: 1px solid rgba(51, 65, 85, 0.7) !important;
        text-align: center !important;
        vertical-align: middle !important;
        font-size: 13px;
        resize: both !important;
        overflow: auto !important;
        display: table-cell !important;
        min-height: 45px !important;
      }
      body.tema-claro-ativo table td, body.tema-claro-ativo table th {
        border-right: 2px solid #0284c7 !important;
        border-left: 1px solid #e2e8f0 !important;
        border-bottom: 1px solid #cbd5e1 !important;
      }

      .grupo-botoes-acoes {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 4px !important;
        width: 100% !important;
        max-width: 120px !important;
        margin: 0 auto !important;
      }
      .grupo-botoes-acoes .btn-acao {
        width: 100% !important;
        padding: 6px 8px !important;
        font-size: 11.5px !important;
        font-weight: bold !important;
        text-align: center !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 5px !important;
        white-space: nowrap !important;
        border-radius: 6px !important;
        margin: 0 !important;
      }
      .checkbox-item-compacto {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 8px !important;
        padding: 6px 10px !important;
        background: rgba(15, 23, 42, 0.5) !important;
        border: 1px solid #334155 !important;
        border-radius: 6px !important;
        margin-bottom: 4px !important;
        font-size: 13px !important;
      }
      body.tema-claro-ativo .checkbox-item-compacto {
        background: #f8fafc !important;
        border-color: #cbd5e1 !important;
        color: #0f172a !important;
      }
      .checkbox-item-compacto span {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        flex: 1 !important;
        word-break: break-word !important;
        color: inherit !important;
      }
      .btn-acao-mini {
        padding: 3px 8px !important;
        font-size: 11px !important;
        font-weight: bold !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        border: none !important;
      }
      .dropdown-menu-win {
        display: none;
        position: absolute;
        background: #1e293b !important;
        border: 1px solid #334155 !important;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        border-radius: 8px;
        z-index: 99999;
        padding: 6px;
      }
      body.tema-claro-ativo .dropdown-menu-win {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
      }
      .dropdown-menu-win.show { display: block !important; }
      .btn-escola-clicavel {
        background: #1e293b;
        color: #f8fafc;
        border: 2px solid #334155;
        padding: 8px 14px;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }
      .btn-escola-clicavel.ativo {
        border-color: #3b82f6 !important;
        background: rgba(59, 130, 246, 0.2) !important;
      }
      body.tema-claro-ativo .btn-escola-clicavel {
        background: #ffffff;
        color: #0f172a;
        border-color: #cbd5e1;
      }
      body.tema-claro-ativo .btn-escola-clicavel.ativo {
        background: #e0f2fe !important;
        border-color: #0284c7 !important;
      }
      .card-escola-dinamico {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid #334155;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 10px;
        gap: 15px;
        flex-wrap: wrap;
        cursor: grab;
        color: #f8fafc;
        transition: background 0.2s, border-color 0.2s;
      }
      .card-escola-dinamico:hover {
        border-color: #3b82f6;
        background: rgba(30, 41, 59, 0.9);
      }
      .card-escola-dinamico.dragging {
        opacity: 0.4;
        cursor: grabbing;
      }
      .card-escola-dinamico.fixada {
        border: 2px solid #eab308 !important;
        background: rgba(234, 179, 8, 0.1) !important;
        cursor: default !important;
      }
      body.tema-claro-ativo .card-escola-dinamico {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
        color: #0f172a !important;
      }
      body.tema-claro-ativo .card-escola-dinamico.fixada {
        border: 2px solid #ca8a04 !important;
        background: #fef9c3 !important;
        cursor: default !important;
      }
      .barra-nav-global {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #0f172a;
        border-bottom: 1px solid #334155;
        padding: 10px 20px;
        margin-bottom: 20px;
        border-radius: 8px;
        flex-wrap: wrap;
        gap: 10px;
      }
      body.tema-claro-ativo .barra-nav-global {
        background: #e2e8f0;
        border-color: #cbd5e1;
        color: #0f172a;
      }
      .btn-nav-icone {
        background: #1e293b;
        color: #f8fafc;
        border: 1px solid #334155;
        padding: 6px 12px;
        border-radius: 6px;
        font-weight: bold;
        font-size: 13px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        text-decoration: none;
      }
      body.tema-claro-ativo .btn-nav-icone {
        background: #ffffff;
        color: #0f172a;
        border-color: #cbd5e1;
      }
    `;
    document.head.appendChild(st);
  }
}

function injetarBarraNavegacaoGlobalTopo() {
  if (document.getElementById("barra-nav-topo-global")) return;
   
  const barra = document.createElement("div");
  barra.id = "barra-nav-topo-global";
  barra.className = "barra-nav-global";
   
  barra.innerHTML = `
    <div class="nav-botoes-grupo" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
      <a href="painel.html" class="btn-nav-icone">🏠 Home / Painel</a>
      <button type="button" class="btn-nav-icone" onclick="if(window.history.length > 1) { window.history.back(); } else { window.location.href='painel.html'; }">⬅️ Voltar</button>
      <button type="button" class="btn-nav-icone" onclick="window.history.forward()">➡️ Avançar</button>
    </div>
    <div style="display:flex; align-items:center; gap:12px;">
      <button type="button" class="btn-nav-icone" onclick="alternarTemaSistema()" title="Alternar Tema Claro / Escuro">🌓 Modo Dia/Noite</button>
      <span style="font-size: 12px; font-weight: bold; display:flex; align-items:center; gap:8px;">⚡ Sistema de Avaliações</span>
    </div>
  `;

  const containerPrincipal = document.querySelector(".container") || document.querySelector("body");
  if (containerPrincipal.firstChild) {
    containerPrincipal.insertBefore(barra, containerPrincipal.firstChild);
  } else {
    containerPrincipal.appendChild(barra);
  }
}

window.addEventListener("click", (e) => {
  if (!e.target.closest('.dropdown-win')) {
    document.querySelectorAll('.dropdown-menu-win').forEach(menu => menu.classList.remove('show'));
  }
});

window.addEventListener("scroll", () => {
  atualizarPosicoesDropdownsAbertos();
}, { passive: true });

window.addEventListener("resize", () => {
  atualizarPosicoesDropdownsAbertos();
});

function atualizarPosicoesDropdownsAbertos() {
  document.querySelectorAll('.dropdown-menu-win.show').forEach(menu => {
    const parent = menu.closest('.dropdown-win');
    if (parent) {
      const btn = parent.querySelector('.btn-dropdown-win');
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const espacoAbaixo = window.innerHeight - rect.bottom;
        if (espacoAbaixo < menu.offsetHeight + 10 && rect.top > menu.offsetHeight) {
          menu.style.top = `${rect.top - menu.offsetHeight - 6}px`;
        } else {
          menu.style.top = `${rect.bottom + 6}px`;
        }

        let leftPos = rect.left;
        if (leftPos + menu.offsetWidth > window.innerWidth - 15) {
          leftPos = window.innerWidth - menu.offsetWidth - 15;
        }
        if (leftPos < 15) leftPos = 15;
         
        menu.style.left = `${leftPos}px`;
      }
    }
  });
}

window.toggleDropdown = function(event, idMenu, idBtn) {
  event.stopPropagation();
  const menu = document.getElementById(idMenu);
  if (!menu) return;
  const estaMostrando = menu.classList.contains('show');
   
  document.querySelectorAll('.dropdown-menu-win').forEach(m => m.classList.remove('show'));
   
  if (!estaMostrando) {
    menu.classList.add('show');
  }
};

function forcarMenuClassificarCompleto() {
  const menuResultados = document.getElementById("dropdown-menu-resultados");
  if (menuResultados) {
    menuResultados.style.minWidth = "260px";
    menuResultados.innerHTML = `
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:inherit; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('nenhum')">⚙️ Nenhum (Padrão)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:inherit; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('data-desc')">📅 Data/Hora (Mais Recente)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:inherit; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('data-asc')">📅 Data/Hora (Mais Antiga)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:inherit; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('nome-asc')">🔤 Nome Aluno (A-Z)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:inherit; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('nome-desc')">🔤 Nome Aluno (Z-A)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:inherit; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('turma-asc')">🏫 Turma (Crescente)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:inherit; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('escola-asc')">🏛️ Escola (A-Z)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:inherit; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('nota-desc')">⭐ Maior Nota</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:inherit; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('nota-asc')">⭐ Menor Nota</button>
    `;
  }

  const menuMonitoramento = document.getElementById("dropdown-menu-monitoramento");
  if (menuMonitoramento) {
    menuMonitoramento.style.minWidth = "240px";
    menuMonitoramento.innerHTML = `
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:inherit; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoMonitoramento('nenhum')">⚙️ Nenhum (Padrão)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:inherit; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoMonitoramento('inicio-desc')">📅 Início (Mais Recente)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:inherit; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoMonitoramento('nome-asc')">🔤 Nome Aluno (A-Z)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:inherit; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoMonitoramento('escola-asc')">🏛️ Escola (A-Z)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:inherit; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoMonitoramento('tempo-desc')">⏱️ Maior Tempo Gasto</button>
    `;
  }
}

document.addEventListener("click", (e) => {
  const link = e.target.closest("a");
  if (link && link.href && link.href.startsWith(window.location.origin) && !link.getAttribute("target")) {
    e.preventDefault();
    const destino = link.href;
    window.location.href = destino;
  }
});

function mostrarNotificacao(mensagem) {
  const toast = document.getElementById("toast-notification");
  if (!toast) { alert(mensagem); return; }
  toast.textContent = mensagem;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 3500);
}

function animarBotaoSucesso(btn) {
  if (!btn) return;
  const textoOriginal = btn.textContent;
  btn.textContent = "✅ Salvo com Sucesso!";
  btn.classList.add("btn-sucesso-animado");
  setTimeout(() => {
    btn.textContent = textoOriginal;
    btn.classList.remove("btn-sucesso-animado");
  }, 2500);
}

function obterIdAluno(nome, turma) {
  const norm = (str) => str ? str.toUpperCase().trim().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_") : "ANONIMO";
  return `${norm(nome)}_${norm(turma)}`;
}

function normalizarTexto(txt) {
  if (!txt) return "";
  return txt.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function limparPrefixoPergunta(pergunta) {
  if (!pergunta) return "";
  let limpa = pergunta.replace(/^\[.*?\]\s*/, "").trim();
  limpa = limpa.replace(/^\d+[\)\.\-\s]+\s*/, "").trim();
  return limpa;
}

function limparPrefixoOpcao(opcaoStr) {
  if (!opcaoStr) return "";
  let limpo = opcaoStr.toString().replace(/^[a-zA-Z][\)\.\-\s]+\s*/, "").trim();
  let lower = limpo.toLowerCase();
  if (lower.startsWith("alternativa e") || lower.startsWith("opção e") || lower === "alternativa e" || lower === "opção e") {
    return "";
  }
  return limpo;
}

function normalizarDocumentoQuestao(d, idDoc = null) {
  let perguntaBruta = d.pergunta || d.questao || d.titulo || "Pergunta Sem Título";
  let perguntaLimpa = limparPrefixoPergunta(perguntaBruta);
   
  let opcoesBrutas = d.opcoes || d.alternativas || d.respostas || [];
  
  let opcoesLimpas = opcoesBrutas
    .map(op => limparPrefixoOpcao(op))
    .filter(op => {
      if (!op || op === "") return false;
      let lower = op.toLowerCase();
      if (lower.startsWith("alternativa e") || lower.startsWith("opção e") || lower.includes("alternativa e padrão") || lower.includes("opção e padrão")) {
        return false;
      }
      return true;
    });

  let letraOriginal = (d.correta || d.resposta || d.correto || "A").toString().trim().toUpperCase();
  let indiceOriginal = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4}[letraOriginal] || 0;

  if (indiceOriginal >= opcoesLimpas.length) {
    indiceOriginal = 0;
  }

  let alternativasMapeadas = opcoesLimpas.map((texto, idx) => ({
    texto: texto,
    ehCorreta: (idx === indiceOriginal)
  }));

  let bancoDistratoresFalsosSeguros = [
    "Processamento autônomo baseado em regras estáticas locais",
    "Conversão estruturada de metadados em arquivos compactados",
    "Execução direta de rotinas em camada de hardware isolada",
    "Indexação sequencial de logs e repositórios desatualizados"
  ];

  let contadorComplemento = 0;
  while (alternativasMapeadas.length < 5) {
    let textoComplementar = bancoDistratoresFalsosSeguros[contadorComplemento % bancoDistratoresFalsosSeguros.length];
    contadorComplemento++;
    alternativasMapeadas.push({
      texto: textoComplementar,
      ehCorreta: false
    });
  }

  if (alternativasMapeadas.length > 5) {
    alternativasMapeadas = alternativasMapeadas.slice(0, 5);
  }

  for (let i = alternativasMapeadas.length - 1; i > 0; i--) {
    const aleatorio = crypto.getRandomValues(new Uint32Array(1))[0];
    const j = Math.floor((aleatorio / 4294967295) * (i + 1));
    [alternativasMapeadas[i], alternativasMapeadas[j]] = [alternativasMapeadas[j], alternativasMapeadas[i]];
  }

  let novoIndiceCorreto = alternativasMapeadas.findIndex(alt => alt.ehCorreta);
  if (novoIndiceCorreto === -1) novoIndiceCorreto = 0;

  let letrasNovas = ["A", "B", "C", "D", "E"];
  let letraCorretaFinal = letrasNovas[novoIndiceCorreto];

  return {
    idDoc: idDoc,
    pergunta: perguntaLimpa,
    opcoes: alternativasMapeadas.map(alt => alt.texto),
    correta: letraCorretaFinal,
    categoria: d.categoria || d.materia || d.disciplina || "Geral"
  };
}

let estruturaGlobalBoxes = [
  { 
    id: "materias", 
    titulo: "📚 Disciplinas e Matérias", 
    itens: [
      "Inteligência Artificial", "Programação Front-End", "Redes de Computadores e Segurança da Informação", 
      "Processos de Desenvolvimento de Software e Metodologias Ágeis", "Matemática", "Língua Portuguesa", 
      "Ciências", "História", "Geografia", "Física", "Química", "Biologia", "Inglês", "Espanhol", 
      "Educação Física", "Artes", "Filosofia", "Sociologia", "Pensamento Computacional", "Robótica Educativa"
    ]
  },
  { 
    id: "periodos", 
    titulo: "🏫 Períodos e Turnos", 
    itens: ["Manhã", "Tarde", "Noite", "Integral", "Noturno EJA", "Geral"] 
  },
  { 
    id: "bimestres", 
    titulo: "📅 Bimestres, Trimestres e Semestres", 
    itens: ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre", "1º Trimestre", "2º Trimestre", "3º Trimestre", "1º Semestre", "2º Semestre", "Ano Letivo Completo"] 
  }
];

let turmasCadastradasDiretas = ["1A", "2A", "3A", "1B", "2B", "3B"];

let listaEscolasCache = [];

async function carregarEscolasCache() {
  try {
    const snap = await getDocs(collection(db, "escolas_cadastradas"));
    listaEscolasCache = [];
    snap.forEach(docSnap => { listaEscolasCache.push({ idDoc: docSnap.id, ...docSnap.data() }); });
  } catch (e) { console.error(e); }
}

async function carregarEstruturaGlobalFirebase() {
  try {
    const docSnap = await getDoc(doc(db, "configuracoes", "estrutura_global_v2"));
    if (docSnap.exists()) {
      const dados = docSnap.data();
      if (dados.boxes) estruturaGlobalBoxes = dados.boxes;
      if (dados.turmasDiretas) turmasCadastradasDiretas = dados.turmasDiretas;
    }
  } catch (e) { console.error(e); }
}

async function garantirBancoCompleto100Questoes() {
  try {
    await carregarEstruturaGlobalFirebase();
    const snap = await getDocs(collection(db, "questoes"));
    let totalBanco = snap.size;
    if (totalBanco < 900) {
      const materiasCompletas = [
        "Inteligência Artificial", 
        "Programação Front-End", 
        "Redes de Computadores e Segurança da Informação", 
        "Processos de Desenvolvimento de Software e Metodologias Ágeis",
        "Matemática", "Língua Portuguesa", "História", "Geografia", "Biologia", "Física", "Química", "Inglês"
      ];

      for (let mat of materiasCompletas) {
        for (let i = 1; i <= 100; i++) {
          await addDoc(collection(db, "questoes"), {
            materia: mat,
            categoria: mat,
            pergunta: `Questão oficial de nível avançado nº ${i} abordando conceitos teóricos e práticos aplicados em ${mat}`,
            opcoes: [
              `Diretriz fundamental e parâmetro otimizado aplicado a ${mat}`,
              "Processamento autônomo baseado em regras estáticas locais",
              "Conversão estruturada de metadados em arquivos compactados",
              "Execução direta de rotinas em camada de hardware isolada",
              "Indexação sequencial de logs e repositórios desatualizados"
            ],
            correta: "A",
            criadoEm: serverTimestamp()
          });
        }
      }
    }
  } catch (e) { console.error(e); }
}

// ==========================================
// TELA DO ALUNO (index.html) - EMBARALHAMENTO ROBUSTO COM POUCAS QUESTÕES
// ==========================================
function inicializarTelaAlunoQuiz() {
  const telaQuiz = document.getElementById("tela-quiz") || document.querySelector(".quiz-container") || document.querySelector("#quiz");
  if (!telaQuiz) return;

  const btnEntrar = document.getElementById("btn-entrar") || document.querySelector("button[type='submit']");
  if (btnEntrar) {
    btnEntrar.addEventListener("click", async (e) => {
      e.preventDefault();
      await iniciarQuizAluno();
    });
  }
}

async function iniciarQuizAluno() {
  const inputNome = document.getElementById("input-nome-aluno") || document.querySelector("input[name='nome']");
  const inputTurma = document.getElementById("input-turma-aluno") || document.querySelector("input[name='turma']");
  
  const nomeAluno = inputNome ? inputNome.value.trim() : "Estudante";
  const turmaAluno = inputTurma ? inputTurma.value.trim() : "1A";

  if (!nomeAluno) {
    alert("Por favor, digite seu nome.");
    return;
  }

  try {
    const configDoc = await getDoc(doc(db, "configuracoes", "prova_ativa"));
    let configProva = configDoc.exists() ? configDoc.data() : { quantidadeQuestoes: 10, materiasAtivas: ["Inteligência Artificial"] };

    const snapshot = await getDocs(collection(db, "questoes"));
    let bancoBruto = [];
    snapshot.forEach(docSnap => bancoBruto.push(normalizarDocumentoQuestao(docSnap.data(), docSnap.id)));

    let materiasAlvo = configProva.materiasAtivas || [];
    let questoesFiltradas = [];

    if (materiasAlvo.length > 0 && !materiasAlvo.includes("TODAS")) {
      questoesFiltradas = bancoBruto.filter(q => 
        materiasAlvo.some(m => normalizarTexto(q.categoria).includes(normalizarTexto(m)) || normalizarTexto(m).includes(normalizarTexto(q.categoria)))
      );
    }

    if (questoesFiltradas.length === 0) {
      questoesFiltradas = bancoBruto; 
    }

    for (let i = questoesFiltradas.length - 1; i > 0; i--) {
      const aleatorio = crypto.getRandomValues(new Uint32Array(1))[0];
      const j = Math.floor((aleatorio / 4294967295) * (i + 1));
      [questoesFiltradas[i], questoesFiltradas[j]] = [questoesFiltradas[j], questoesFiltradas[i]];
    }

    let qtdDesejada = configProva.quantidadeQuestoes || 10;
    let listaQuestoesFinal = [];

    if (questoesFiltradas.length >= qtdDesejada) {
      listaQuestoesFinal = questoesFiltradas.slice(0, qtdDesejada);
    } else if (questoesFiltradas.length > 0) {
      while (listaQuestoesFinal.length < qtdDesejada && questoesFiltradas.length > 0) {
        listaQuestoesFinal.push(...questoesFiltradas);
      }
      listaQuestoesFinal = listaQuestoesFinal.slice(0, qtdDesejada);
    } else {
      for (let i = 1; i <= qtdDesejada; i++) {
        listaQuestoesFinal.push({
          pergunta: `Questão dinâmica de reforço ${i}: Qual parâmetro se aplica a esta avaliação?`,
          opcoes: ["Parâmetro padrão correto", "Opção incorreta A", "Opção incorreta B", "Opção incorreta C"],
          correta: "A",
          categoria: "Geral"
        });
      }
    }

    window.listaQuestoesQuizAtivo = listaQuestoesFinal;
    window.indiceQuizAtual = 0;
    window.pontosQuizAtual = 0;

    const telaLogin = document.getElementById("tela-login") || document.querySelector(".login-container");
    const telaQuiz = document.getElementById("tela-quiz") || document.querySelector(".quiz-container");
    if (telaLogin) telaLogin.classList.add("hidden");
    if (telaQuiz) telaQuiz.classList.remove("hidden");

    exibirQuestaoQuizAtual();
  } catch (err) {
    alert("Erro ao iniciar prova: " + err.message);
  }
}

window.exibirQuestaoQuizAtual = function() {
  const lista = window.listaQuestoesQuizAtivo || [];
  const idx = window.indiceQuizAtual || 0;
  if (idx >= lista.length) {
    finalizarQuizAlunoAtivo();
    return;
  }

  const q = lista[idx];
  const containerPergunta = document.getElementById("pergunta-txt") || document.querySelector(".enunciado-questao");
  const containerOpcoes = document.getElementById("opcoes-container") || document.querySelector(".opcoes-lista");
  const progressoTxt = document.getElementById("progresso-txt");

  if (containerPergunta) containerPergunta.textContent = `Questão ${idx + 1}: ${q.pergunta}`;
  if (progressoTxt) progressoTxt.textContent = `Questão ${idx + 1} de ${lista.length}`;
  if (containerOpcoes) {
    containerOpcoes.innerHTML = "";
    let letras = ["A", "B", "C", "D", "E"];
    q.opcoes.forEach((op, i) => {
      if (!op) return;
      let btn = document.createElement("button");
      btn.className = "opcao-btn";
      btn.style.cssText = "display: block; width: 100%; text-align: left; padding: 10px 14px; margin-bottom: 8px; border-radius: 6px; border: 1px solid #334155; background: #1e293b; color: #fff; cursor: pointer;";
      btn.textContent = `${letras[i]}) ${op}`;
      btn.onclick = () => verificarRespostaQuizAluno(letras[i], q.correta);
      containerOpcoes.appendChild(btn);
    });
  }
};

window.verificarRespostaQuizAluno = function(letraEscolhida, letraCorreta) {
  if (letraEscolhida === letraCorreta) {
    window.pontosQuizAtual = (window.pontosQuizAtual || 0) + 1;
    mostrarNotificacao("✅ Resposta Correta!");
  } else {
    mostrarNotificacao("❌ Resposta Incorreta.");
  }
  window.indiceQuizAtual++;
  setTimeout(() => {
    exibirQuestaoQuizAtual();
  }, 1000);
};

window.finalizarQuizAlunoAtivo = function() {
  const telaQuiz = document.getElementById("tela-quiz") || document.querySelector(".quiz-container");
  const telaResultado = document.getElementById("tela-resultado") || document.querySelector(".resultado-container");
  if (telaQuiz) telaQuiz.classList.add("hidden");
  if (telaResultado) telaResultado.classList.remove("hidden");
  mostrarNotificacao("🎉 Avaliação finalizada com sucesso!");
};

window.selecionarTodosOnline = function(marcar) {
  document.querySelectorAll(".chk-item-online").forEach(chk => chk.checked = marcar);
};

window.excluirOnlineSelecionados = async function() {
  const selecionados = Array.from(document.querySelectorAll(".chk-item-online:checked")).map(c => c.value);
  if (selecionados.length === 0) {
    alert("⚠️ Selecione pelo menos um aluno na tabela de monitoramento.");
    return;
  }
  if (confirm(`Deseja remover os ${selecionados.length} aluno(s) selecionado(s) do monitoramento?`)) {
    try {
      for (const idDoc of selecionados) {
        await deleteDoc(doc(db, "alunos_online", idDoc));
      }
      mostrarNotificacao(`🗑 ${selecionados.length} registro(s) removido(s) com sucesso!`);
    } catch (err) {
      alert("Erro ao excluir: " + err.message);
    }
  }
};

window.selecionarTodosResultados = function(marcar) {
  document.querySelectorAll(".chk-item-resultado").forEach(chk => chk.checked = marcar);
};

// ==========================================
// PASSO 7: LÓGICA DA PÁGINA ESCOLA.HTML
// ==========================================
function inicializarPaginaEscola() {
  const urlParams = new URLSearchParams(window.location.search);
  const nomeEscola = urlParams.get("escola") || "";

  const bannerTitulo = document.getElementById("banner-escola-ativa-isolada");
  if (bannerTitulo) bannerTitulo.textContent = `🏫 Configurando Unidade: ${nomeEscola || 'Geral'}`;
  
  const resumoAntigo = document.getElementById("texto-resumo-escolhas") || document.querySelector('[id*="resumo-escolhas"]');
  if (resumoAntigo) {
    resumoAntigo.remove();
  }

  injetarPainelResumoConsolidadoTopo(nomeEscola);
  injetarContainerBoxesEscolaDinamicoCompleto();
  injetarGerenciadorTurmasIndividual();

  window.adicionarTurmaIndividualDireta = function() {
    const input = document.getElementById("input-nova-turma-individual");
    if (!input || !input.value.trim()) {
      alert("⚠ Digite o nome da turma!");
      return;
    }
    const nomeTurma = input.value.trim().toUpperCase();
    if (!turmasCadastradasDiretas.includes(nomeTurma)) {
      turmasCadastradasDiretas.push(nomeTurma);
    }
    input.value = "";
    renderizarListaTurmasIndividuais();
    atualizarPainelResumoConsolidado();
    mostrarNotificacao(`➕ Turma "${nomeTurma}" adicionada com sucesso!`);
  };

  window.removerTurmaIndividualDireta = function(index) {
    turmasCadastradasDiretas.splice(index, 1);
    renderizarListaTurmasIndividuais();
    atualizarPainelResumoConsolidado();
    mostrarNotificacao("🗑️ Turma removida!");
  };

  window.editarTurmaIndividualDireta = function(index) {
    const atual = turmasCadastradasDiretas[index];
    const novoNome = prompt("Editar nome da turma:", atual);
    if (novoNome !== null && novoNome.trim() !== "") {
      turmasCadastradasDiretas[index] = novoNome.trim().toUpperCase();
      renderizarListaTurmasIndividuais();
      atualizarPainelResumoConsolidado();
      mostrarNotificacao("✏ Turma atualizada com sucesso!");
    }
  };

  window.marcarLimparTodasTurmas = function(marcar) {
    const chks = document.querySelectorAll(".chk-turma-direta-val");
    chks.forEach(c => c.checked = marcar);
    atualizarPainelResumoConsolidado();
  };

  window.ordenarTurmasDiretasAZ = function() {
    turmasCadastradasDiretas.sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
    renderizarListaTurmasIndividuais();
    mostrarNotificacao("🔤 Turmas ordenadas de A a Z!");
  };

  window.excluirTodasTurmasDiretas = function() {
    if (confirm("Deseja zerar/limpar todas as turmas cadastradas?")) {
      turmasCadastradasDiretas = [];
      renderizarListaTurmasIndividuais();
      atualizarPainelResumoConsolidado();
      mostrarNotificacao("🗑 Turmas limpas!");
    }
  };

  window.adicionarNovaBoxEspecificaEscola = function() {
    const input = document.getElementById("input-nome-nova-box-especifica");
    if (!input || !input.value.trim()) {
      alert("⚠ Digite o título da nova box!");
      return;
    }
    const tituloBox = input.value.trim();
    const idBox = normalizarTexto(tituloBox) + "_" + Date.now();
    
    const containerBoxes = document.getElementById("container-boxes-escola");
    if (containerBoxes) {
      let divNova = document.createElement("div");
      divNova.className = "card-box";
      divNova.setAttribute("data-box-id", idBox);
      divNova.style.cssText = "background: rgba(30, 41, 59, 0.7); border: 1px solid #334155; padding: 14px; border-radius: 8px; display:flex; flex-direction:column; gap:8px;";
      
      let itensHtml = `
        <label class="checkbox-item-compacto">
          <span><input type="checkbox" class="chk-item-box-val" value="Item Exemplo 1" onchange="atualizarPainelResumoConsolidado()" checked> Item Exemplo 1</span>
          <div style="display:flex; gap:3px;">
            <button type="button" class="btn-acao-mini" style="background:#eab308; color:white;" onclick="editarItemBoxEscolaCard(this)" title="Editar">✏️</button>
            <button type="button" class="btn-acao-mini" style="background:#ef4444; color:white;" onclick="removerItemBoxEscolaCard(this)" title="Excluir">🗑️</button>
          </div>
        </label>
      `;

      divNova.innerHTML = `
        <div class="box-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <h4 style="font-size:14px; margin:0; color:#f8fafc;">${tituloBox}</h4>
          <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
            <button type="button" class="btn-acao-mini" style="background:#0284c7; color:white;" onclick="marcarLimparCard(this, true)" title="Marcar Tudo">☑️ Marcar</button>
            <button type="button" class="btn-acao-mini" style="background:#475569; color:white;" onclick="marcarLimparCard(this, false)" title="Desmarcar Tudo">🔲 Limpar</button>
            <button type="button" class="btn-acao-mini" style="background:#8b5cf6; color:white;" onclick="ordenarCardAZ(this)" title="Ordenar A-Z">🔤</button>
            <button type="button" class="btn-acao-mini" style="background:#ef4444; color:white;" onclick="this.closest('.card-box').remove(); atualizarPainelResumoConsolidado(); mostrarNotificacao('🗑 Box removida!');" title="Excluir Box Inteira">🗑️ Excluir Box</button>
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          <input type="text" class="input-add-card-item" placeholder="Adicionar novo item..." style="flex:1; padding:5px 8px; border-radius:4px; border:1px solid #334155; background:#0f172a; color:#fff; font-size:12px;">
          <button type="button" class="btn-acao-mini" style="background:#2563eb; color:white;" onclick="adicionarItemCardDinamico(this)">➕ Adicionar</button>
        </div>
        <div class="grid-checkboxes" style="display:flex; flex-direction:column; max-height:180px; overflow-y:auto; gap:4px;">
          ${itensHtml}
        </div>
      `;
      containerBoxes.appendChild(divNova);
      input.value = "";
      atualizarPainelResumoConsolidado();
      mostrarNotificacao(`➕ Box "${tituloBox}" adicionada com sucesso!`);
    }
  };

  function injetarGerenciadorTurmasIndividual(turmasSalvas = null) {
    const containerBoxes = document.getElementById("container-boxes-escola");
    if (!containerBoxes || document.getElementById("card-turmas-individual-custom")) return;

    const divCardTurmas = document.createElement("div");
    divCardTurmas.id = "card-turmas-individual-custom";
    divCardTurmas.className = "card-box";
    divCardTurmas.setAttribute("data-box-id", "turmas_diretas");
    divCardTurmas.style.cssText = "background: rgba(30, 41, 59, 0.7); border: 1px solid #334155; padding: 14px; border-radius: 8px; display:flex; flex-direction:column; gap:8px;";
    
    divCardTurmas.innerHTML = `
      <div class="box-header" style="display:flex; justify-content:space-between; align-items:center;">
        <h4 style="font-size:14px; margin:0; color:#f8fafc;">🎒 Turmas Ativas (Escolha e Adição Individual)</h4>
        <div style="display:flex; gap:4px; flex-wrap:wrap;">
          <button type="button" class="btn-acao-mini" style="background:#0284c7; color:white;" onclick="marcarLimparTodasTurmas(true)" title="Marcar Tudo">☑️️ Marcar</button>
          <button type="button" class="btn-acao-mini" style="background:#475569; color:white;" onclick="marcarLimparTodasTurmas(false)" title="Desmarcar Tudo">🔲 Limpar</button>
          <button type="button" class="btn-acao-mini" style="background:#8b5cf6; color:white;" onclick="ordenarTurmasDiretasAZ()" title="Ordenar A-Z">🔤</button>
          <button type="button" class="btn-acao-mini" style="background:#ef4444; color:white;" onclick="excluirTodasTurmasDiretas()" title="Excluir Todas">🗑️</button>
        </div>
      </div>
      <div style="display:flex; gap:6px;">
        <input type="text" id="input-nova-turma-individual" placeholder="Nome da turma (Ex: 1º Ano A, 9º B)..." style="flex:1; padding:5px 8px; border-radius:4px; border:1px solid #334155; background:#0f172a; color:#fff; font-size:12px;">
        <button type="button" class="btn-acao-mini" style="background:#2563eb; color:white;" onclick="adicionarTurmaIndividualDireta()">➕ Adicionar</button>
      </div>
      <div id="grid-turmas-individuais-lista" class="grid-checkboxes" style="display:flex; flex-direction:column; max-height:180px; overflow-y:auto; gap:4px;"></div>
    `;

    containerBoxes.insertBefore(divCardTurmas, containerBoxes.firstChild);
    renderizarListaTurmasIndividuais(turmasSalvas);
  }

  function renderizarListaTurmasIndividuais(turmasSalvas = null) {
    const listaDiv = document.getElementById("grid-turmas-individuais-lista");
    if (!listaDiv) return;

    if (turmasCadastradasDiretas.length === 0) {
      listaDiv.innerHTML = `<p style="color: #94a3b8; font-size: 12px; font-style: italic; padding: 4px;">Nenhuma turma cadastrada.</p>`;
      return;
    }

    let html = "";
    turmasCadastradasDiretas.forEach((turma, idx) => {
      let estaMarcado = turmasSalvas ? turmasSalvas.includes(turma) : true;
      let checkedAttr = estaMarcado ? "checked" : "";

      html += `
        <label class="checkbox-item-compacto">
          <span>
            <input type="checkbox" class="chk-turma-direta-val" value="${turma}" onchange="atualizarPainelResumoConsolidado()" ${checkedAttr}> ${turma}
          </span>
          <div style="display:flex; gap:3px;">
            <button type="button" class="btn-acao-mini" style="background:#eab308; color:white;" onclick="editarItemBoxEscolaCard(this)" title="Editar">✏️</button>
            <button type="button" class="btn-acao-mini" style="background:#ef4444; color:white;" onclick="removerItemBoxEscolaCard(this)" title="Excluir">🗑️</button>
          </div>
        </label>
      `;
    });
    listaDiv.innerHTML = html;
    atualizarPainelResumoConsolidado();
  }

  function injetarPainelResumoConsolidadoTopo(escolaNome) {
    if (document.getElementById("painel-resumo-topo-consolidado")) return;
    
    const bannerAtivo = document.getElementById("banner-escola-ativa-isolada") || document.querySelector(".container")?.firstChild;
    const divResumo = document.createElement("div");
    divResumo.id = "painel-resumo-topo-consolidado";
    divResumo.style.cssText = "background: rgba(30, 41, 59, 0.9); border: 1px solid #3b82f6; padding: 15px 20px; border-radius: 10px; margin-top: 15px; margin-bottom: 20px; color: #f8fafc;";
    
    divResumo.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom: 8px;">
        <h4 style="margin: 0; color: #60a5fa; font-size: 15px; display:flex; align-items:center; gap:6px;">📊 Resumo Consolidado das Configurações Atuais (${escolaNome})</h4>
        <div style="display:flex; gap:8px;">
          <button type="button" onclick="if(window.history.length > 1) { window.history.back(); } else { window.location.href='painel.html'; }" class="btn-acao-mini" style="background:#475569; color:white; padding:6px 12px; border:none; border-radius:6px; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center;">🏠 Retornar à Tela Anterior</button>
        </div>
      </div>
      <div id="conteudo-resumo-consolidado" style="font-size: 13px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; color: #cbd5e1;">
        <div>🏫 <strong>Unidade:</strong> <span id="resumo-unidade">${escolaNome}</span></div>
        <div>🎒 <strong>Turmas:</strong> <span id="resumo-turmas">Nenhuma selecionada</span></div>
        <div id="bloco-resumo-dinamico-boxes" style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 4px; margin-top: 4px;"></div>
      </div>
    `;

    if (bannerAtivo && bannerAtivo.parentNode) {
      bannerAtivo.parentNode.insertBefore(divResumo, bannerAtivo.nextSibling);
    } else {
      document.body.prepend(divResumo);
    }
    atualizarPainelResumoConsolidado();
  }

  function atualizarPainelResumoConsolidado() {
    const spanTurmas = document.getElementById("resumo-turmas");
    const blocoDinamicoBoxes = document.getElementById("bloco-resumo-dinamico-boxes");

    if (!spanTurmas) return;

    const turmasSelecionadas = Array.from(document.querySelectorAll(".chk-turma-direta-val:checked")).map(c => c.value);
    spanTurmas.textContent = turmasSelecionadas.length > 0 ? turmasSelecionadas.join(", ") : "Nenhuma selecionada";

    if (!blocoDinamicoBoxes) return;
    let htmlDinamico = "";

    document.querySelectorAll(".card-box").forEach(card => {
      let idBox = card.getAttribute("data-box-id");
      if (idBox === "turmas_diretas") return;

      let tituloBox = card.querySelector("h4")?.textContent || "Box";
      let selecionados = Array.from(card.querySelectorAll(".chk-item-box-val:checked")).map(c => c.value);
      let itensStr = selecionados.length > 0 ? selecionados.join(", ") : "Nenhum selecionado";

      htmlDinamico += `<div>📌 <strong>${tituloBox}:</strong> <span>${itensStr}</span></div>`;
    });

    blocoDinamicoBoxes.innerHTML = htmlDinamico;
  }

  window.atualizarPainelResumoConsolidado = atualizarPainelResumoConsolidado;

  function injetarContainerBoxesEscolaDinamicoCompleto() {
    const containerPrincipal = document.querySelector(".container") || document.querySelector("body");
    if (document.getElementById("container-boxes-escola")) return;

    const wrapperBoxes = document.createElement("div");
    wrapperBoxes.style.cssText = "margin-top: 25px; margin-bottom: 25px;";
    
    wrapperBoxes.innerHTML = `
      <div id="container-boxes-escola" style="display: flex; flex-direction: column; gap: 14px;"></div>
      <div id="bloco-criar-box-especifica" style="background: rgba(30, 41, 59, 0.5); border: 1px dashed #3b82f6; padding: 15px; border-radius: 8px; margin-top: 15px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <input type="text" id="input-nome-nova-box-especifica" placeholder="Nome da Nova Box Específica (Ex: Laboratórios)..." style="flex:1; min-width: 220px; padding: 8px 12px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #fff; font-size: 13px;">
        <button type="button" class="btn-acao" style="background: #2563eb; color: white; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; border: none;" onclick="adicionarNovaBoxEspecificaEscola()">➕ Adicionar Box Específica</button>
      </div>
    `;

    const botaoSalvarRef = document.getElementById("btn-salvar-isolada")?.closest("div") || containerPrincipal.lastElementChild;
    containerPrincipal.insertBefore(wrapperBoxes, botaoSalvarRef);

    renderizarBoxesEscola();
  }

  function renderizarBoxesEscola(dadosSalvosBoxes = null) {
    const containerBoxes = document.getElementById("container-boxes-escola");
    if (!containerBoxes) return;

    let boxesParaRenderizar = dadosSalvosBoxes && dadosSalvosBoxes.length > 0 ? dadosSalvosBoxes : estruturaGlobalBoxes;

    let htmlBoxes = "";
    boxesParaRenderizar.forEach((box, indexBox) => {
      let itensAtivosSalvos = box.itensMarcados !== undefined ? box.itensMarcados : box.itens;

      let itensHtml = "";
      box.itens.forEach((item) => {
        let estaMarcado = itensAtivosSalvos ? itensAtivosSalvos.includes(item) : true;
        let checkedAttr = estaMarcado ? "checked" : "";

        itensHtml += `
          <label class="checkbox-item-compacto">
            <span>
              <input type="checkbox" class="chk-item-box-val" data-box-idx="${indexBox}" value="${item}" onchange="atualizarPainelResumoConsolidado()" ${checkedAttr}> ${item}
            </span>
            <div style="display:flex; gap:3px;">
              <button type="button" class="btn-acao-mini" style="background:#eab308; color:white;" onclick="editarItemBoxEscolaCard(this)" title="Editar">✏️</button>
              <button type="button" class="btn-acao-mini" style="background:#ef4444; color:white;" onclick="removerItemBoxEscolaCard(this)" title="Excluir">🗑️</button>
            </div>
          </label>
        `;
      });

      htmlBoxes += `
        <div class="card-box" data-box-id="${box.id || ('box_' + indexBox)}" style="background: rgba(30, 41, 59, 0.7); border: 1px solid #334155; padding: 14px; border-radius: 8px; display:flex; flex-direction:column; gap:8px;">
          <div class="box-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
            <h4 style="font-size:14px; margin:0; color:#f8fafc;">${box.titulo}</h4>
            <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
              <button type="button" class="btn-acao-mini" style="background:#0284c7; color:white;" onclick="marcarLimparCard(this, true)" title="Marcar Tudo">☑️ Marcar</button>
              <button type="button" class="btn-acao-mini" style="background:#475569; color:white;" onclick="marcarLimparCard(this, false)" title="Desmarcar Tudo">🔲 Limpar</button>
              <button type="button" class="btn-acao-mini" style="background:#8b5cf6; color:white;" onclick="ordenarCardAZ(this)" title="Ordenar A-Z">🔤</button>
              <button type="button" class="btn-acao-mini" style="background:#ef4444; color:white;" onclick="this.closest('.card-box').remove(); atualizarPainelResumoConsolidado(); mostrarNotificacao('🗑️ Box removida!');" title="Excluir Box Inteira">🗑 Excluir Box</button>
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <input type="text" class="input-add-card-item" placeholder="Adicionar novo item..." style="flex:1; padding:5px 8px; border-radius:4px; border:1px solid #334155; background:#0f172a; color:#fff; font-size:12px;">
            <button type="button" class="btn-acao-mini" style="background:#2563eb; color:white;" onclick="adicionarItemCardDinamico(this)">➕ Adicionar</button>
          </div>
          <div class="grid-checkboxes" style="display:flex; flex-direction:column; max-height:180px; overflow-y:auto; gap:4px;">
            ${itensHtml}
          </div>
        </div>
      `;
    });

    const elementoTurmas = document.getElementById("card-turmas-individual-custom");
    containerBoxes.innerHTML = htmlBoxes;
    if (elementoTurmas) {
      containerBoxes.prepend(elementoTurmas);
    }
    atualizarPainelResumoConsolidado();
  }

  window.adicionarItemCardDinamico = function(btn) {
    const card = btn.closest('.card-box');
    const input = card.querySelector('.input-add-card-item');
    if (!input || !input.value.trim()) return;
    const val = input.value.trim();
    const grid = card.querySelector('.grid-checkboxes');

    const novaLabel = document.createElement('label');
    novaLabel.className = "checkbox-item-compacto";
    novaLabel.innerHTML = `
      <span>
        <input type="checkbox" class="chk-item-box-val" value="${val}" onchange="atualizarPainelResumoConsolidado()" checked> ${val}
      </span>
      <div style="display:flex; gap:3px;">
        <button type="button" class="btn-acao-mini" style="background:#eab308; color:white;" onclick="editarItemBoxEscolaCard(this)" title="Editar">✏️</button>
        <button type="button" class="btn-acao-mini" style="background:#ef4444; color:white;" onclick="removerItemBoxEscolaCard(this)" title="Excluir">🗑️</button>
      </div>
    `;
    grid.appendChild(novaLabel);
    input.value = "";
    atualizarPainelResumoConsolidado();
    mostrarNotificacao(`➕ Item "${val}" adicionado!`);
  };

  window.editarItemBoxEscolaCard = function(btn) {
    const label = btn.closest('.checkbox-item-compacto');
    const span = label.querySelector('span');
    const chk = span.querySelector('input');
    const valorAntigo = chk.value;
    const novoValor = prompt("Editar nome do item:", valorAntigo);
    if (novoValor !== null && novoValor.trim() !== "") {
      const valTrim = novoValor.trim();
      chk.value = valTrim;
      span.innerHTML = `<input type="checkbox" class="chk-item-box-val" value="${valTrim}" onchange="atualizarPainelResumoConsolidado()" ${chk.checked ? 'checked' : ''}> ${valTrim}`;
      atualizarPainelResumoConsolidado();
      mostrarNotificacao("✏️ Item atualizado com sucesso!");
    }
  };

  window.removerItemBoxEscolaCard = function(btn) {
    btn.closest('.checkbox-item-compacto').remove();
    atualizarPainelResumoConsolidado();
    mostrarNotificacao("🗑 Item removido!");
  };

  window.marcarLimparCard = function(btn, marcar) {
    const card = btn.closest('.card-box');
    card.querySelectorAll('.chk-item-box-val').forEach(c => c.checked = marcar);
    atualizarPainelResumoConsolidado();
  };

  window.ordenarCardAZ = function(btn) {
    const card = btn.closest('.card-box');
    const grid = card.querySelector('.grid-checkboxes');
    const labels = Array.from(grid.querySelectorAll('.checkbox-item-compacto'));
    
    labels.sort((a, b) => {
      let txtA = a.querySelector('span').textContent.trim();
      let txtB = b.querySelector('span').textContent.trim();
      return txtA.localeCompare(txtB, undefined, {numeric: true});
    });

    labels.forEach(l => grid.appendChild(l));
    atualizarPainelResumoConsolidado();
    mostrarNotificacao("🔤 Itens ordenados de A a Z!");
  };

  function carregarDadosSalvosEscola() {
    onSnapshot(doc(db, "escolas_configuracoes", normalizarTexto(nomeEscola)), (docSnap) => {
      if (docSnap.exists()) {
        const dados = docSnap.data();
        if (dados.turmasDiretas) {
          turmasCadastradasDiretas = dados.turmasDiretas;
        }
        let turmasSalvas = dados.tabelasConfirmadas?.turmas || null;
        renderizarListaTurmasIndividuais(turmasSalvas);

        if (dados.boxesPersonalizadas && dados.boxesPersonalizadas.length > 0) {
          renderizarBoxesEscola(dados.boxesPersonalizadas);
          return;
        }
      }
      renderizarListaTurmasIndividuais();
      renderizarBoxesEscola();
    });
  }

  const btnSalvarIsolada = document.getElementById("btn-salvar-isolada");
  if (btnSalvarIsolada) {
    btnSalvarIsolada.addEventListener("click", async (e) => {
      e.preventDefault(); 
      const turmasConfirmadas = Array.from(document.querySelectorAll(".chk-turma-direta-val:checked")).map(c => c.value);
      
      let boxesSalvar = [];
      let materiasColetadas = [];

      document.querySelectorAll(".card-box").forEach(card => {
        let tituloBox = card.querySelector("h4")?.textContent || "Box";
        let idBox = card.getAttribute("data-box-id") || "box";
        if (idBox !== "turmas_diretas") {
          let itensBox = Array.from(card.querySelectorAll(".chk-item-box-val")).map(chk => chk.value);
          let itensMarcadosBox = Array.from(card.querySelectorAll(".chk-item-box-val:checked")).map(chk => chk.value);
          
          boxesSalvar.push({ 
            id: idBox, 
            titulo: tituloBox, 
            itens: itensBox, 
            itensMarcados: itensMarcadosBox 
          });

          if (tituloBox.toLowerCase().includes("disciplina") || tituloBox.toLowerCase().includes("matéria")) {
            materiasColetadas.push(...itensMarcadosBox);
          }
        }
      });

      try {
        await setDoc(doc(db, "escolas_configuracoes", normalizarTexto(nomeEscola)), {
          escolaNome: nomeEscola,
          turmasDiretas: turmasCadastradasDiretas,
          boxesPersonalizadas: boxesSalvar,
          tabelasConfirmadas: {
            turmas: turmasConfirmadas,
            materias: [...new Set(materiasColetadas)],
            periodos: boxesSalvar.find(b => b.titulo.toLowerCase().includes("período") || b.titulo.toLowerCase().includes("turno"))?.itensMarcados || [],
            bimestres: boxesSalvar.find(b => b.titulo.toLowerCase().includes("bimestre") || b.titulo.toLowerCase().includes("trimestre") || b.titulo.toLowerCase().includes("semestre"))?.itensMarcados || []
          },
          atualizadoEm: serverTimestamp()
        }, { merge: true });

        animarBotaoSucesso(e.target);
        mostrarNotificacao(`✅ Configurações completas da unidade "${nomeEscola}" salvas com sincronização instantânea!`);
        setTimeout(() => {
          window.history.back();
        }, 1200);
      } catch (err) {
        alert("Erro ao salvar: " + err.message);
      }
    });
  }

  carregarDadosSalvosEscola();
  setTimeout(() => { document.body.classList.add("fade-in"); }, 100);
}

// ==========================================
// PASSO 8: PAINEL DO PROFESSOR (painel.html)
// ==========================================
if (window.location.pathname.includes("painel.html")) {
  async function inicializarPainel() {
    await carregarEscolasCache();
    await carregarEstruturaGlobalFirebase();
    renderizarSeletorEscolasTopo();
    popularFiltroEscolaRelatorio();
    carregarListaEscolas();
    renderizarSeletorEscolasAtivacaoIndependente();
    inicializarTabelaResultados();
    inicializarTabelaTempoReal();
    popularSelectMateriasQuestao();
    organizarLayoutAbaRelatorios();
    inicializarGerenciadorBancoDados();
    setTimeout(() => {
      forcarMenuClassificarCompleto();
      carregarResumoProvaAtivaNoPainel();
    }, 400);

    const btnEscolasAba = document.querySelector('.btn-aba[data-aba="aba-escolas"]');
    if (btnEscolasAba) {
      btnEscolasAba.click();
    }

    if (window.location.hash) {
      const abaHash = window.location.hash.replace("#", "aba-");
      const btnAlvo = document.querySelector(`.btn-aba[data-aba="${abaHash}"]`);
      if (btnAlvo) btnAlvo.click();
    }
  }

  // ==========================================
  // MÓDULO: CATÁLOGO INTERATIVO DE BANCO DE DADOS
  // ==========================================
  function inicializarGerenciadorBancoDados() {
    carregarBancoDadosCompleto();
    
    const btnAbaBanco = document.querySelector('.btn-aba[data-aba="aba-banco-dados"]');
    if (btnAbaBanco) {
      btnAbaBanco.addEventListener("click", () => {
        carregarBancoDadosCompleto();
      });
    }
  }

  async function carregarBancoDadosCompleto() {
    try {
      const snap = await getDocs(collection(db, "questoes"));
      questoesBancoCache = [];
      snap.forEach(docSnap => {
        questoesBancoCache.push({
          idDoc: docSnap.id,
          refPath: docSnap.ref.path,
          ...docSnap.data()
        });
      });
      popularFiltroMateriaCatalogo();
      renderizarCatalogoBancoDados();
    } catch (err) {
      console.error("Erro ao carregar banco de dados:", err);
    }
  }

  // Exposição explícita para os onclick/onchange do painel.html.
  window.carregarBancoDadosCompleto = carregarBancoDadosCompleto;

  function popularFiltroMateriaCatalogo() {
    const selectFiltro = document.getElementById("select-filtro-materia-db");
    if (!selectFiltro) return;

    let materiasSet = new Set();
    questoesBancoCache.forEach(q => {
      if (q.materia) materiasSet.add(q.materia);
      if (q.categoria) materiasSet.add(q.categoria);
    });

    let html = `<option value="TODAS">📚 Todas as Matérias (${questoesBancoCache.length})</option>`;
    Array.from(materiasSet).sort().forEach(mat => {
      let qtd = questoesBancoCache.filter(q => (q.materia === mat || q.categoria === mat)).length;
      html += `<option value="${mat}">${mat} (${qtd})</option>`;
    });
    selectFiltro.innerHTML = html;
  }


  // ==========================================
  // FUNÇÕES DE COMPATIBILIDADE DO MODAL DE EDIÇÃO
  // ==========================================
  window.fecharModalEditarQuestao = function() {
    const modal = document.getElementById("modal-editar-questao");
    if (modal) modal.classList.remove("show");
  };

  window.adicionarNovaAlternativaEdicao = function() {
    const container = document.getElementById("edit-container-alternativas");
    if (!container) return;

    const indice = container.querySelectorAll(".linha-alternativa-estatica").length;
    const letra = String.fromCharCode(65 + indice);

    const linha = document.createElement("div");
    linha.className = "linha-alternativa-estatica";
    linha.style.cssText = "display:flex;gap:8px;align-items:center;margin-bottom:8px;";

    linha.innerHTML = `
      <span style="font-weight:bold;min-width:25px;">${letra})</span>
      <input type="text" class="input-alternativa-estatica"
             placeholder="Alternativa ${letra}"
             style="flex:1;padding:8px;border-radius:6px;border:1px solid var(--border);background:#0f172a;color:#fff;">
      <button type="button" class="btn-acao-mini"
              style="background:#ef4444;color:#fff;padding:6px 10px;border-radius:4px;border:none;cursor:pointer;"
              onclick="this.closest('.linha-alternativa-estatica').remove()">🗑️</button>
    `;
    container.appendChild(linha);
  };

  window.salvarEdicaoQuestaoModal = async function() {
    const idDoc = document.getElementById("edit-id-questao")?.value?.trim();
    const materia = document.getElementById("edit-materia-questao")?.value?.trim();
    const pergunta = document.getElementById("edit-pergunta-questao")?.value?.trim();
    const container = document.getElementById("edit-container-alternativas");

    if (!idDoc) {
      alert("⚠️ ID da questão não encontrado.");
      return;
    }

    const linhas = container
      ? Array.from(container.querySelectorAll(".linha-alternativa-estatica"))
      : [];

    const opcoes = linhas
      .map(linha => linha.querySelector(".input-alternativa-estatica")?.value?.trim() || "")
      .filter(Boolean);

    let correta = "A";
    const radio = container?.querySelector('input[name="edit-correta"]:checked');
    const select = document.getElementById("edit-correta");
    if (radio) correta = radio.value.toUpperCase();
    else if (select) correta = select.value.toUpperCase();

    if (!materia || !pergunta || opcoes.length < 2) {
      alert("⚠️ Preencha matéria, enunciado e pelo menos 2 alternativas.");
      return;
    }

    if (!/^[A-Z]$/.test(correta) || opcoes[correta.charCodeAt(0) - 65] === undefined) {
      correta = "A";
    }

    try {
      await setDoc(doc(db, "questoes", idDoc), {
        materia,
        categoria: materia,
        pergunta,
        opcoes,
        correta,
        atualizadoEm: serverTimestamp()
      }, { merge: true });

      const idx = questoesBancoCache.findIndex(q => q.idDoc === idDoc);
      if (idx >= 0) {
        questoesBancoCache[idx] = {
          ...questoesBancoCache[idx],
          materia,
          categoria: materia,
          pergunta,
          opcoes,
          correta
        };
      }

      window.fecharModalEditarQuestao();
      if (typeof popularFiltroMateriaCatalogo === "function") popularFiltroMateriaCatalogo();
      if (typeof renderizarCatalogoBancoDados === "function") renderizarCatalogoBancoDados();
      mostrarNotificacao("✅ Questão atualizada com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar a questão: " + err.message);
    }
  };

  // ==========================================
  // COMPATIBILIDADE DA BOX GLOBAL
  // ==========================================
  window.criarNovaBoxGlobal = function() {
    const input = document.getElementById("nova-box-titulo");
    if (!input) return;

    const titulo = input.value.trim();
    if (!titulo) {
      alert("⚠️ Digite o nome da nova Box.");
      return;
    }

    const idBase = titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "box";

    let id = idBase;
    let n = 2;
    while (estruturaGlobalBoxes.some(box => box.id === id)) {
      id = `${idBase}_${n++}`;
    }

    estruturaGlobalBoxes.push({
      id,
      titulo,
      itens: []
    });

    input.value = "";

    const container = document.getElementById("container-boxes-globais");
    if (container) {
      const box = document.createElement("div");
      box.style.cssText = "background:#0f172a;border:1px solid var(--border);padding:14px;border-radius:8px;margin-top:10px;";
      box.innerHTML = `<strong style="color:#60a5fa;">${titulo}</strong><div style="color:#94a3b8;font-size:12px;margin-top:5px;">Nova Box criada. Adicione itens pela configuração correspondente.</div>`;
      container.appendChild(box);
    }

    mostrarNotificacao(`✅ Box "${titulo}" criada com sucesso.`);
  };

  // ==========================================
  // GERENCIADOR COMPLETO DO CATÁLOGO DE BANCO DE DADOS
  // ==========================================
  window.renderizarCatalogoBancoDados = function() {
    const gridCatalogo = document.getElementById("catalogo-questoes-grid") || document.getElementById("lista-banco-dados-container");
    const inputBusca = document.getElementById("input-busca-banco-dados") || document.querySelector('input[placeholder*="Pesquisar"]');
    const selectFiltroMateria = document.getElementById("select-filtro-materia-db") || document.querySelector('select');
    if (!gridCatalogo) return;

    let barraFerramentas = document.getElementById("barra-ferramentas-db-avancada");
    if (!barraFerramentas && gridCatalogo.parentNode) {
      barraFerramentas = document.createElement("div");
      barraFerramentas.id = "barra-ferramentas-db-avancada";
      barraFerramentas.style.cssText = "display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; background: rgba(30, 41, 59, 0.9); padding: 14px; border-radius: 10px; border: 1px solid #334155; width: 100%;";
      barraFerramentas.innerHTML = `
        <div style="display: flex; gap: 8px; align-items: center; flex: 1; min-width: 250px;">
          <input type="text" id="input-busca-banco-dados-dinamico" placeholder="🔍 Buscar no banco por termo ou enunciado..." style="flex: 1; padding: 8px 12px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #fff; font-size: 13px;" oninput="renderizarCatalogoBancoDados()">
        </div>
        <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
          <button type="button" class="btn-acao-mini" style="background: #0284c7; color: white; padding: 7px 12px; border-radius:6px; font-weight:bold; cursor:pointer; border:none;" onclick="selecionarTodasQuestoesBanco(true)">☑️ Marcar Todas</button>
          <button type="button" class="btn-acao-mini" style="background: #475569; color: white; padding: 7px 12px; border-radius:6px; font-weight:bold; cursor:pointer; border:none;" onclick="selecionarTodasQuestoesBanco(false)">🔲 Desmarcar</button>
          <button type="button" class="btn-acao-mini" style="background: #ef4444; color: white; padding: 7px 12px; border-radius:6px; font-weight:bold; cursor:pointer; border:none;" onclick="excluirQuestoesSelecionadasEmMassa()">🗑️ Excluir Selecionadas</button>
        </div>
      `;
      gridCatalogo.parentNode.insertBefore(barraFerramentas, gridCatalogo);
    }

    const termoBusca = inputBusca ? normalizarTexto(inputBusca.value) : "";
    const materiaSel = selectFiltroMateria ? selectFiltroMateria.value : "TODAS";

    let filtradas = [...questoesBancoCache];

    if (materiaSel && materiaSel !== "TODAS" && !materiaSel.includes("Todas")) {
      filtradas = filtradas.filter(q => (q.materia === materiaSel || q.categoria === materiaSel));
    }

    if (termoBusca) {
      filtradas = filtradas.filter(q => {
        let texto = normalizarTexto(`${q.materia || ''} ${q.pergunta || ''} ${(q.opcoes || []).join(' ')} ${q.correta || ''}`);
        return texto.includes(termoBusca);
      });
    }

    if (filtradas.length === 0) {
      gridCatalogo.innerHTML = `<div style="text-align:center; color: #94a3b8; padding: 30px; grid-column: 1/-1;">Nenhuma questão encontrada com os filtros atuais.</div>`;
      return;
    }

    let html = "";
    filtradas.forEach(q => {
      let materia = q.materia || q.categoria || "Geral";
      let pergunta = q.pergunta || "Sem enunciado";
      let correta = (q.correta || "A").toString().trim().toUpperCase();
      let opcoes = q.opcoes || [];
      let letras = ["A", "B", "C", "D", "E", "F", "G"];

      let opcoesHtml = "";
      opcoes.forEach((op, idx) => {
        if (!op) return;
        let letra = letras[idx] || ("Opt" + (idx+1));
        let ehCorreta = (letra === correta);
        opcoesHtml += `
          <div style="display:flex; align-items:center; justify-content:space-between; padding: 4px 8px; background: rgba(15,23,42,0.4); border-radius:4px; font-size:12px; margin-bottom:3px; ${ehCorreta ? 'border:1px solid #22c55e; color:#4ade80; font-weight:bold;' : ''}">
            <span><strong>${letra})</strong> ${op}</span>
            ${ehCorreta ? '<span style="font-size:10px; background:rgba(34,197,94,0.2); padding:1px 4px; border-radius:3px;">Correta</span>' : ''}
          </div>
        `;
      });

      html += `
        <div class="catalogo-card" data-id="${q.idDoc}" style="background: rgba(15, 23, 42, 0.9); border: 1px solid #334155; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" class="chk-questao-catalogo" value="${q.idDoc}" style="cursor:pointer; width:16px; height:16px;">
              <span style="font-size:11px; background:rgba(59,130,246,0.2); color:#60a5fa; padding:2px 6px; border-radius:4px; font-weight:bold;">📚 ${materia}</span>
            </div>
            <div style="display:flex; gap:6px;">
              <button type="button" class="btn-acao-mini" style="background:#eab308; color:white; padding:5px 10px; border-radius:4px; border:none; cursor:pointer; font-weight:bold; font-size:11px;" onclick="abrirModalEditarQuestaoBanco('${q.idDoc}')">✏️ Editar</button>
              <button type="button" class="btn-acao-mini" style="background:#ef4444; color:white; padding:5px 10px; border-radius:4px; border:none; cursor:pointer; font-weight:bold; font-size:11px;" onclick="excluirQuestaoBancoIndividual('${q.idDoc}')">🗑️ Excluir</button>
            </div>
          </div>
          <div style="font-size:13px; font-weight:bold; color:inherit; margin-top:4px;">${pergunta}</div>
          <div style="display:flex; flex-direction:column; gap:2px; margin-top:4px;">
            ${opcoesHtml}
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: auto; padding-top: 6px; border-top: 1px solid rgba(51, 65, 85, 0.4);">
            ID Ref: ${q.idDoc}
          </div>
        </div>
      `;
    });
    gridCatalogo.innerHTML = html;
  };

  window.selecionarTodasQuestoesBanco = function(marcar) {
    document.querySelectorAll(".chk-questao-catalogo").forEach(chk => chk.checked = marcar);
  };

  window.excluirQuestoesSelecionadasEmMassa = async function() {
    const selecionadas = Array.from(document.querySelectorAll(".chk-questao-catalogo:checked")).map(c => c.value);
    if (selecionadas.length === 0) {
      alert("⚠️ Selecione pelo menos uma questão no catálogo para excluir.");
      return;
    }
    if (confirm(`🔥 Deseja realmente excluir permanentemente as ${selecionadas.length} questões selecionadas?`)) {
      try {
        for (const idDoc of selecionadas) {
          await deleteDoc(doc(db, "questoes", idDoc));
          questoesBancoCache = questoesBancoCache.filter(q => q.idDoc !== idDoc);
        }
        popularFiltroMateriaCatalogo();
        renderizarCatalogoBancoDados();
        mostrarNotificacao(`🗑️ ${selecionadas.length} questão(ões) excluída(s) com sucesso!`);
      } catch (err) {
        alert("Erro ao excluir em massa: " + err.message);
      }
    }
  };

  window.abrirModalEditarQuestaoBanco = function(idDoc) {
    const q = questoesBancoCache.find(item => item.idDoc === idDoc);
    if (!q) return;

    let modal = document.getElementById("modal-editar-questao-db");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "modal-editar-questao-db";
      modal.style.cssText = "display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:90%; max-width:650px; background:#1e293b; border:1px solid #3b82f6; border-radius:12px; z-index:999999; padding:25px; box-shadow:0 10px 30px rgba(0,0,0,0.7); max-height:90vh; overflow-y:auto; color:#f8fafc;";
      document.body.appendChild(modal);
    }

    let opcoesHtml = "";
    let letras = ["A", "B", "C", "D", "E", "F", "G"];
    (q.opcoes || []).forEach((op, idx) => {
      let letra = letras[idx] || ("Opt" + (idx+1));
      opcoesHtml += `
        <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;" class="linha-opcao-edicao">
          <span style="font-weight:bold; min-width:25px;">${letra})</span>
          <input type="text" class="input-opcao-valor" value="${op}" style="flex:1; padding:6px 10px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#fff; font-size:13px;">
          <button type="button" class="btn-acao-mini" style="background:#ef4444; color:white; padding:6px 10px; border-radius:4px; border:none; cursor:pointer;" onclick="this.closest('.linha-opcao-edicao').remove()">🗑️</button>
        </div>
      `;
    });

    let corretaAtual = (q.correta || "A").toString().trim().toUpperCase();

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h3 style="margin:0; color:#60a5fa; font-size:16px;">✏️ Editar Questão do Banco</h3>
        <button type="button" onclick="document.getElementById('modal-editar-questao-db').style.display='none'" style="background:transparent; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">✕</button>
      </div>
      <form id="form-editar-questao-db" style="display:flex; flex-direction:column; gap:14px;">
        <input type="hidden" id="edit-id-doc" value="${q.idDoc}">
        <div>
          <label style="font-size:12px; color:#cbd5e1; display:block; margin-bottom:4px;">Matéria / Categoria:</label>
          <input type="text" id="edit-materia" value="${q.materia || q.categoria || 'Geral'}" style="width:100%; padding:8px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#fff; font-size:13px;">
        </div>
        <div>
          <label style="font-size:12px; color:#cbd5e1; display:block; margin-bottom:4px;">Enunciado da Pergunta:</label>
          <textarea id="edit-pergunta" rows="3" style="width:100%; padding:8px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#fff; font-size:13px;">${q.pergunta || ''}</textarea>
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <label style="font-size:12px; color:#cbd5e1;">Alternativas:</label>
            <button type="button" class="btn-acao-mini" style="background:#2563eb; color:white; padding:5px 10px; border-radius:6px; font-weight:bold; cursor:pointer; border:none;" onclick="adicionarAlternativaModalEdicao()">➕ Adicionar Alternativa</button>
          </div>
          <div id="container-opcoes-edicao" style="display:flex; flex-direction:column; gap:4px;">
            ${opcoesHtml}
          </div>
        </div>
        <div>
          <label style="font-size:12px; color:#cbd5e1; display:block; margin-bottom:4px;">Alternativa Correta (Letra exata, ex: A, B, C):</label>
          <input type="text" id="edit-correta" value="${corretaAtual}" maxlength="1" style="width:80px; padding:8px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#fff; font-size:13px; text-align:center; font-weight:bold;">
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
          <button type="button" onclick="document.getElementById('modal-editar-questao-db').style.display='none'" style="background:#475569; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer;">Cancelar</button>
          <button type="submit" style="background:#22c55e; color:white; border:none; padding:8px 20px; border-radius:6px; font-weight:bold; cursor:pointer;">💾 Salvar Alterações</button>
        </div>
      </form>
    `;

    modal.style.display = "block";

    document.getElementById("form-editar-questao-db").onsubmit = async (e) => {
      e.preventDefault();
      const idDoc = document.getElementById("edit-id-doc").value;
      const materia = document.getElementById("edit-materia").value.trim();
      const pergunta = document.getElementById("edit-pergunta").value.trim();
      const correta = document.getElementById("edit-correta").value.trim().toUpperCase();
      
      const opcoesInputs = Array.from(document.querySelectorAll("#container-opcoes-edicao .input-opcao-valor"));
      const opcoesLimpas = opcoesInputs.map(inp => inp.value.trim()).filter(Boolean);

      if (!pergunta || opcoesLimpas.length < 2) {
        alert("⚠️ Preencha o enunciado e pelo menos 2 alternativas válidas.");
        return;
      }

      try {
        const dadosAtualizados = {
          materia: materia,
          categoria: materia,
          pergunta: pergunta,
          opcoes: opcoesLimpas,
          correta: correta,
          atualizadoEm: serverTimestamp()
        };

        await setDoc(doc(db, "questoes", idDoc), dadosAtualizados, { merge: true });
        
        let idxCache = questoesBancoCache.findIndex(item => item.idDoc === idDoc);
        if (idxCache !== -1) {
          questoesBancoCache[idxCache] = { ...questoesBancoCache[idxCache], ...dadosAtualizados };
        }

        modal.style.display = "none";
        popularFiltroMateriaCatalogo();
        renderizarCatalogoBancoDados();
        mostrarNotificacao("✅ Questão atualizada com sucesso!");
      } catch (err) {
        alert("Erro ao atualizar questão: " + err.message);
      }
    };
  };

  window.adicionarAlternativaModalEdicao = function() {
    const container = document.getElementById("container-opcoes-edicao");
    if (!container) return;
    const totalAtual = container.querySelectorAll(".linha-opcao-edicao").length;
    let letras = ["A", "B", "C", "D", "E", "F", "G"];
    let letra = letras[totalAtual] || ("Opt" + (totalAtual+1));

    let div = document.createElement("div");
    div.className = "linha-opcao-edicao";
    div.style.cssText = "display:flex; gap:8px; align-items:center; margin-bottom:8px;";
    div.innerHTML = `
      <span style="font-weight:bold; min-width:25px;">${letra})</span>
      <input type="text" class="input-opcao-valor" placeholder="Nova alternativa..." style="flex:1; padding:6px 10px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#fff; font-size:13px;">
      <button type="button" class="btn-acao-mini" style="background:#ef4444; color:white; padding:6px 10px; border-radius:4px; border:none; cursor:pointer;" onclick="this.closest('.linha-opcao-edicao').remove()">🗑️</button>
    `;
    container.appendChild(div);
  };

  function organizarLayoutAbaRelatorios() {
    const abaRelatorios = document.getElementById("aba-relatorios");
    if (!abaRelatorios) return;

    let blocoTopo = abaRelatorios.querySelector(".acoes-topo-bloco") || abaRelatorios.querySelector(".barra-controles-relatorios") || abaRelatorios.querySelector("div");
    if (blocoTopo) {
      blocoTopo.style.display = "flex";
      blocoTopo.style.flexWrap = "wrap";
      blocoTopo.style.gap = "12px";
      blocoTopo.style.alignItems = "center";
      blocoTopo.style.justifyContent = "space-between";
      blocoTopo.style.marginBottom = "25px";
      blocoTopo.style.marginTop = "20px";

      let inputBuscaRes = document.getElementById("input-busca-resultados") || abaRelatorios.querySelector('input[type="text"], input[type="search"]');
      let selectEscolaRes = document.getElementById("select-filtro-escola-relatorio") || abaRelatorios.querySelector('select');
       
      let divEsquerda = document.getElementById("bloco-esquerda-relatorios");
      let divDireita = document.getElementById("bloco-direita-relatorios");

      if (!divEsquerda) {
        divEsquerda = document.createElement("div");
        divEsquerda.id = "bloco-esquerda-relatorios";
        divEsquerda.style.display = "flex";
        divEsquerda.style.gap = "10px";
        divEsquerda.style.alignItems = "center";
        divEsquerda.style.flexWrap = "wrap";
        divEsquerda.style.flex = "1";
      }

      if (!divDireita) {
        divDireita = document.createElement("div");
        divDireita.id = "bloco-direita-relatorios";
        divDireita.style.display = "flex";
        divDireita.style.gap = "10px";
        divDireita.style.alignItems = "center";
        divDireita.style.flexWrap = "wrap";
        divDireita.style.justifyContent = "flex-end";
      }

      if (inputBuscaRes) divEsquerda.appendChild(inputBuscaRes);
      if (selectEscolaRes) divEsquerda.appendChild(selectEscolaRes);

      const elementosParaDireita = Array.from(blocoTopo.children).filter(el => el !== divEsquerda && el !== divDireita);
      elementosParaDireita.forEach(el => divDireita.appendChild(el));

      if (!document.getElementById("btn-ocultar-selecionados")) {
        const btnOcultar = document.createElement("button");
        btnOcultar.type = "button";
        btnOcultar.id = "btn-ocultar-selecionados";
        btnOcultar.className = "btn-acao";
        btnOcultar.style.background = "#0d9488";
        btnOcultar.style.color = "white";
        btnOcultar.style.padding = "6px 12px";
        btnOcultar.style.borderRadius = "6px";
        btnOcultar.style.fontWeight = "bold";
        btnOcultar.style.fontSize = "12px";
        btnOcultar.innerHTML = "📁 Ocultar Conferidos";
        btnOcultar.onclick = () => window.ocultarAlunosSelecionados();
        divDireita.appendChild(btnOcultar);
      }

      blocoTopo.innerHTML = "";
      blocoTopo.appendChild(divEsquerda);
      blocoTopo.appendChild(divDireita);
    }
  }

  window.ocultarAlunosSelecionados = function() {
    const checkboxes = document.querySelectorAll(".chk-item-resultado:checked");
    if (checkboxes.length === 0) {
      alert("⚠️ Selecione pelo menos um aluno na tabela para arquivar/ocultar.");
      return;
    }
     
    checkboxes.forEach(chk => {
      if (chk.value) {
        alunosOcultosCache.add(chk.value);
      }
    });

    salvarAlunosOcultosLocalStorage();
    renderizarTabelaResultadosFiltrada();
    mostrarNotificacao(`📁 ${checkboxes.length} aluno(s) arquivado(s)!`);
  };

  window.abrirModalOcultos = function() {
    renderizarTabelaOcultos(); 
    const modal = document.getElementById("modal-ocultos");
    if (modal) {
      modal.classList.add("show");
    }
  };

  window.fecharModalOcultos = function() {
    const modal = document.getElementById("modal-ocultos");
    if (modal) {
      modal.classList.remove("show");
    }
  };

  window.alternarTodosModalOcultos = function(marcar) {
    document.querySelectorAll(".chk-modal-oculto").forEach(chk => chk.checked = marcar);
  };

  function renderizarTabelaOcultos() {
    const corpoOcultos = document.getElementById("corpo-tabela-ocultos");
    if (!corpoOcultos) return;

    const listaOcultos = resultadosGlobaisCache.filter(res => alunosOcultosCache.has(res.idDoc));

    if (listaOcultos.length === 0) {
      corpoOcultos.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding: 15px;">Nenhum registro oculto no momento.</td></tr>`;
      return;
    }

    let html = "";
    listaOcultos.forEach(res => {
      let dataFormatada = res.dataEnvio?.toDate ? res.dataEnvio.toDate().toLocaleString('pt-BR') : "Data recente";
      let totalQ = res.totalQuestoes || 0;
      let acertos = res.pontuacao || 0;
      let nota = totalQ > 0 ? ((acertos / totalQ) * 10).toFixed(1) : "0.0";

      html += `
        <tr>
          <td style="text-align: center;"><input type="checkbox" class="chk-modal-oculto" value="${res.idDoc}"></td>
          <td>${dataFormatada}</td>
          <td><strong>${res.nome || 'Aluno'}</strong></td>
          <td>${res.turma || 'N/D'}</td>
          <td>${res.materia || 'Geral'}</td>
          <td><strong style="color: #60a5fa;">${nota} / 10</strong></td>
        </tr>
      `;
    });
    corpoOcultos.innerHTML = html;
  }

  window.abrirModalLixeira = function() {
    renderizarTabelaLixeira();
    const modal = document.getElementById("modal-lixeira");
    if (modal) {
      modal.classList.add("show");
    }
  };

  window.fecharModalLixeira = function() {
    const modal = document.getElementById("modal-lixeira");
    if (modal) {
      modal.classList.remove("show");
    }
  };

  window.alternarTodosModalLixeira = function(marcar) {
    document.querySelectorAll(".chk-modal-lixeira").forEach(chk => chk.checked = marcar);
  };

  function renderizarTabelaLixeira() {
    const corpoLixeira = document.getElementById("corpo-tabela-lixeira");
    if (!corpoLixeira) return;

    const listaLixeira = resultadosGlobaisCache.filter(res => alunosLixeiraCache.has(res.idDoc));

    if (listaLixeira.length === 0) {
      corpoLixeira.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding: 15px;">A lixeira está vazia.</td></tr>`;
      return;
    }

    let html = "";
    listaLixeira.forEach(res => {
      let dataFormatada = res.dataEnvio?.toDate ? res.dataEnvio.toDate().toLocaleString('pt-BR') : "Data recente";
      let totalQ = res.totalQuestoes || 0;
      let acertos = res.pontuacao || 0;
      let nota = totalQ > 0 ? ((acertos / totalQ) * 10).toFixed(1) : "0.0";

      html += `
        <tr>
          <td style="text-align: center;"><input type="checkbox" class="chk-modal-lixeira" value="${res.idDoc}"></td>
          <td>${dataFormatada}</td>
          <td><strong>${res.nome || 'Aluno'}</strong></td>
          <td>${res.turma || 'N/D'}</td>
          <td>${res.materia || 'Geral'}</td>
          <td><strong style="color: #60a5fa;">${nota} / 10</strong></td>
        </tr>
      `;
    });
    corpoLixeira.innerHTML = html;
  }

  window.restaurarAlunosSelecionadosLixeira = function() {
    const selecionados = Array.from(document.querySelectorAll(".chk-modal-lixeira:checked")).map(c => c.value);
    if (selecionados.length === 0) {
      alert("⚠ Selecione pelo menos um aluno para restaurar.");
      return;
    }
    selecionados.forEach(id => alunosLixeiraCache.delete(id));
     
    salvarAlunosLixeiraLocalStorage();
    renderizarTabelaResultadosFiltrada();
    renderizarTabelaLixeira();
    mostrarNotificacao(`♻️ ${selecionados.length} aluno(s) restaurado(s) para a tabela principal!`);
  };

  window.excluirPermanentementeSelecionados = async function() {
    const selecionados = Array.from(document.querySelectorAll(".chk-modal-lixeira:checked"));
    if (selecionados.length === 0) {
      alert("⚠️ Selecione pelo menos um aluno para exclusão permanente.");
      return;
    }

    if (confirm(`🔥 Tem certeza que deseja apagar permanentemente do banco de dados ${selecionados.length} registro(s)? Esta ação não pode ser desfeita.`)) {
      try {
        for (const chk of selecionados) {
          let idDoc = chk.value;
          let resObj = resultadosGlobaisCache.find(r => r.idDoc === idDoc);
          if (resObj && resObj.refPath) {
            await deleteDoc(doc(db, resObj.refPath));
          } else {
            await deleteDoc(doc(db, "avaliacoes", idDoc));
          }
          alunosLixeiraCache.delete(idDoc);
        }
        salvarAlunosLixeiraLocalStorage();
        renderizarTabelaLixeira();
        mostrarNotificacao(`🔥 Registros excluídos permanentemente!`);
      } catch (err) {
        alert("Erro ao excluir: " + err.message);
      }
    }
  };

  window.resgatarAlunosSelecionados = function() {
    const selecionados = Array.from(document.querySelectorAll(".chk-modal-oculto:checked")).map(c => c.value);
    if (selecionados.length === 0) {
      alert("⚠️ Selecione pelo menos um aluno para resgatar.");
      return;
    }
    selecionados.forEach(id => alunosOcultosCache.delete(id));
     
    salvarAlunosOcultosLocalStorage();
    renderizarTabelaResultadosFiltrada();
    renderizarTabelaOcultos();
    mostrarNotificacao(`♻️ ${selecionados.length} aluno(s) resgatado(s) para a tabela principal!`);
  };

  window.irParaMonitoramentoTab = function() {
    const btnMonitoramento = document.querySelector('.btn-aba[data-aba="aba-monitoramento"]');
    if (btnMonitoramento) {
      btnMonitoramento.click();
    } else {
      window.location.href = "painel.html#monitoramento";
    }
  };

  function renderizarSeletorEscolasAtivacaoIndependente() {
    const containerAtivacao = document.getElementById("aba-ativacao");
    if (!containerAtivacao) return;

    let wrapperSeletor = document.getElementById("wrapper-escola-ativacao-profissional");
    if (!wrapperSeletor) {
      wrapperSeletor = document.createElement("div");
      wrapperSeletor.id = "wrapper-escola-ativacao-profissional";
      containerAtivacao.insertBefore(wrapperSeletor, containerAtivacao.children[1] || containerAtivacao.firstChild);
    }

    let escolasOrdenadasAtivacao = [...listaEscolasCache];
    escolasOrdenadasAtivacao.sort((a, b) => {
      if (a.idDoc === escolaPrincipalFixadaId) return -1;
      if (b.idDoc === escolaPrincipalFixadaId) return 1;
      return 0;
    });

    let html = `
      <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid #334155; border-radius: 12px; padding: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #60a5fa; font-size: 15px; background: rgba(30, 41, 59, 0.7); padding: 12px 16px; border-radius: 10px; border: 1px solid #3b82f6;">🏫 Selecione a Unidade Escolar para Configurar</h4>
        <p style="color: #cbd5e1; font-size: 13px; margin-bottom: 12px;">Clique na escola desejada para carregar e ativar independentemente (A escola fixada fica travada no topo e as demais podem ser arrastadas):</p>
        <div id="container-botoes-escola-ativacao" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
    `;

    if (escolasOrdenadasAtivacao.length === 0) {
      html += `<p style="color: #94a3b8; font-size: 13px;">Nenhuma escola cadastrada.</p>`;
    } else {
      escolasOrdenadasAtivacao.forEach(esc => {
        let ehFixada = esc.idDoc === escolaPrincipalFixadaId;
        let classeFixada = ehFixada ? "fixada" : "";
        let classeAtiva = escolaAtivaSelecionadaIndependente === esc.nome ? "ativo" : "";
        let textoPin = ehFixada ? "📌 Fixada" : "📌 Fixar";
        let draggableAttr = ehFixada ? "false" : "true";

        html += `
          <div class="card-escola-dinamico ${classeFixada} ${classeAtiva}" draggable="${draggableAttr}" data-id="${esc.idDoc}" data-nome-escola="${esc.nome}" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; max-width: 320px; padding: 10px 14px;">
            <div style="display: flex; align-items: center; gap: 8px; flex: 1; cursor: pointer;" onclick="selecionarEscolaAtivacaoDireta('${esc.nome}', this)">
              <span style="font-size: 14px; font-weight: bold;">🏫 ${esc.nome} ${ehFixada ? '<span style="font-size:10px; color:#eab308; background:rgba(234,179,8,0.2); padding:2px 4px; border-radius:3px;">⭐ Principal</span>' : ''}</span>
            </div>
            <button type="button" class="btn-fixar-escola-ativacao btn-acao-mini" data-id="${esc.idDoc}" style="background:${ehFixada ? '#eab308' : '#334155'}; color:white;" title="Fixar Escola Principal">${textoPin}</button>
          </div>
        `;
      });
    }

    html += `
        </div>
      </div>
    `;

    wrapperSeletor.innerHTML = html;

    window.selecionarEscolaAtivacaoDireta = function(nomeEscola, el) {
      escolaAtivaSelecionadaIndependente = nomeEscola;
      wrapperSeletor.querySelectorAll(".card-escola-dinamico").forEach(b => b.classList.remove("ativo"));
      el.closest(".card-escola-dinamico").classList.add("ativo");
      carregarConfiguracoesEscolaParaAtivacao(nomeEscola);
    };

    const containerBotoesAtivacao = wrapperSeletor.querySelector("#container-botoes-escola-ativacao");
    if (containerBotoesAtivacao) {
      let cardArrastadoAtivacao = null;
      containerBotoesAtivacao.querySelectorAll(".card-escola-dinamico").forEach(card => {
        if (!card.classList.contains("fixada")) {
          card.addEventListener("dragstart", () => {
            cardArrastadoAtivacao = card;
            card.classList.add("dragging");
          });
          card.addEventListener("dragend", () => {
            card.classList.remove("dragging");
            cardArrastadoAtivacao = null;
          });
        }

        card.addEventListener("dragover", (e) => {
          e.preventDefault();
          const cardAbaixo = e.target.closest(".card-escola-dinamico");
          if (cardAbaixo && cardAbaixo !== cardArrastadoAtivacao && !cardAbaixo.classList.contains("fixada") && cardArrastadoAtivacao) {
            const bounding = cardAbaixo.getBoundingClientRect();
            const offset = e.clientY - bounding.top;
            if (offset > bounding.height / 2) {
              containerBotoesAtivacao.insertBefore(cardArrastadoAtivacao, cardAbaixo.nextSibling);
            } else {
              containerBotoesAtivacao.insertBefore(cardArrastadoAtivacao, cardAbaixo);
            }
          }
        });
      });
    }

    wrapperSeletor.querySelectorAll(".btn-fixar-escola-ativacao").forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        if (escolaPrincipalFixadaId === id) {
          escolaPrincipalFixadaId = "";
          localStorage.removeItem("escola_principal_fixada_id");
          mostrarNotificacao("📌 Escola desfixada.");
        } else {
          escolaPrincipalFixadaId = id;
          localStorage.setItem("escola_principal_fixada_id", id);
          mostrarNotificacao("⭐ Escola definida como principal e fixada no topo!");
        }
        renderizarSeletorEscolasAtivacaoIndependente();
        carregarListaEscolas();
      };
    });
  }

  function carregarConfiguracoesEscolaParaAtivacao(escolaNome) {
    const containerAtivacao = document.getElementById("aba-ativacao");
    if (!containerAtivacao) return;

    let painelDinamico = document.getElementById("painel-ativacao-configurado-dinamico");
    if (!painelDinamico) {
      painelDinamico = document.createElement("div");
      painelDinamico.id = "painel-ativacao-configurado-dinamico";
      containerAtivacao.appendChild(painelDinamico);
    }

    onSnapshot(doc(db, "escolas_configuracoes", normalizarTexto(escolaNome)), (docSnap) => {
      let tab = {};
      let turmasCarregadas = ["1A", "2A", "3A"];
      let materiasMarcadasSalvas = [];
      let disciplinasMarcadasSalvas = [];
      let periodosMarcadosSalvos = [];
      let turmasMarcadasSalvas = [];
      let boxesPersonalizadas = [];

      if (docSnap.exists()) {
        const dadosEscola = docSnap.data();
        tab = dadosEscola.tabelasConfirmadas || {};
        if (dadosEscola.turmasDiretas && dadosEscola.turmasDiretas.length > 0) {
          turmasCarregadas = dadosEscola.turmasDiretas;
        }
        if (dadosEscola.boxesPersonalizadas) {
          boxesPersonalizadas = dadosEscola.boxesPersonalizadas;
          boxesPersonalizadas.forEach(b => {
            let tBox = b.titulo.toLowerCase();
            let itensM = b.itensMarcados || [];
            if (tBox.includes("matéria")) {
              materiasMarcadasSalvas.push(...itensM);
            } else if (tBox.includes("disciplina")) {
              disciplinasMarcadasSalvas.push(...itensM);
            } else if (tBox.includes("período") || tBox.includes("turno")) {
              periodosMarcadosSalvos.push(...itensM);
            }
          });
        }
        turmasMarcadasSalvas = tab.turmas || [];
      }

      let listaMat = materiasMarcadasSalvas.length > 0 ? [...new Set(materiasMarcadasSalvas)] : (tab.materias || ["Inteligência Artificial", "Programação Front-End"]);
      let listaDisc = disciplinasMarcadasSalvas.length > 0 ? [...new Set(disciplinasMarcadasSalvas)] : (tab.disciplinas || ["Redes de Computadores", "Metodologias Ágeis"]);
      let listaPer = periodosMarcadosSalvos.length > 0 ? [...new Set(periodosMarcadosSalvos)] : (tab.periodos || ["Geral"]);
      let turmasParaExibir = turmasMarcadasSalvas.length > 0 ? turmasMarcadasSalvas : turmasCarregadas;

      let htmlMat = "";
      listaMat.forEach(m => {
        htmlMat += `<label class="checkbox-item-compacto"><input type="checkbox" class="chk-materia-ativacao" value="${m}" checked> ${m}</label>`;
      });

      let htmlDisc = "";
      listaDisc.forEach(d => {
        htmlDisc += `<label class="checkbox-item-compacto"><input type="checkbox" class="chk-disciplina-ativacao" value="${d}" checked> ${d}</label>`;
      });

      let htmlPeriodos = "";
      listaPer.forEach(p => {
        htmlPeriodos += `<option value="${p}">${p}</option>`;
      });

      let htmlTurmas = "";
      if (turmasParaExibir.length === 0) {
        htmlTurmas = `<p style="color:#94a3b8; font-size:13px; font-style:italic;">Nenhuma turma cadastrada.</p>`;
      } else {
        turmasParaExibir.forEach(t => {
          htmlTurmas += `<label class="checkbox-item-compacto"><input type="checkbox" class="chk-turma-ativacao" value="${t}" checked> ${t}</label>`;
        });
      }

      painelDinamico.innerHTML = `
        <div style="background: rgba(15, 23, 42, 0.85); border: 2px solid #3b82f6; padding: 24px; border-radius: 12px; margin-top: 15px; display: flex; flex-direction: column; gap: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
          
          <div style="background: rgba(30, 41, 59, 0.9); border: 1px solid #1e293b; padding: 16px; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
              <h5 style="margin: 0; color: #60a5fa; font-size: 14px;">📋 Resumo Geral da Unidade: <strong>${escolaNome}</strong></h5>
              <a href="escola.html?escola=${encodeURIComponent(escolaNome)}&retorno=ativacao" class="btn-acao-mini" style="background: #0d9488; color: white; padding: 6px 12px; text-decoration: none; border-radius: 6px;">⚙ Ir para Configuração do Cadastro</a>
            </div>
            <div style="font-size: 13px; color: #cbd5e1; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px;">
              <div>📚 <strong>Matérias:</strong> ${listaMat.join(', ') || 'Nenhuma'}</div>
              <div>📖 <strong>Disciplinas:</strong> ${listaDisc.join(', ') || 'Nenhuma'}</div>
              <div>🏫 <strong>Períodos:</strong> ${listaPer.join(', ') || 'Nenhum'}</div>
              <div>🎒 <strong>Turmas:</strong> ${turmasParaExibir.join(', ') || 'Nenhuma'}</div>
            </div>
          </div>

          <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid #334155; padding: 16px; border-radius: 10px;">
            <h5 style="margin: 0 0 10px 0; color: #f8fafc; font-size: 13px;">📚 Matérias para Ativação</h5>
            <div style="max-height: 160px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;">
              ${htmlMat}
            </div>
          </div>

          <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid #334155; padding: 16px; border-radius: 10px;">
            <h5 style="margin: 0 0 10px 0; color: #f8fafc; font-size: 13px;">📖 Disciplinas para Ativação</h5>
            <div style="max-height: 160px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;">
              ${htmlDisc}
            </div>
          </div>

          <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid #334155; padding: 16px; border-radius: 10px;">
            <h5 style="margin: 0 0 10px 0; color: #f8fafc; font-size: 13px;">🏫 Período / Turno</h5>
            <select id="select-periodo-ativacao" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #fff; font-size: 13px;">
              ${htmlPeriodos}
            </select>
          </div>

          <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid #334155; padding: 16px; border-radius: 10px;">
            <h5 style="margin: 0 0 10px 0; color: #f8fafc; font-size: 13px;">🎒 Turmas que Vão Fazer a Prova</h5>
            <div style="max-height: 160px; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 6px;">
              ${htmlTurmas}
            </div>
          </div>

          <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid #334155; padding: 16px; border-radius: 10px; display: flex; flex-direction: column; gap: 12px;">
            <h5 style="margin: 0; color: #f8fafc; font-size: 13px;">⏱️ Parâmetros de Ativação, Tempo e Segurança</h5>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
              <div>
                <label style="font-size: 12px; color: #cbd5e1; display: block; margin-bottom: 4px;">Qtd. de Questões:</label>
                <input type="number" id="qtd-questoes-ativacao" value="10" style="width: 100%; padding: 7px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #fff; font-size: 13px;">
              </div>
              <div>
                <label style="font-size: 12px; color: #cbd5e1; display: block; margin-bottom: 4px;">Tempo Mínimo (minutos):</label>
                <input type="number" id="tempo-minimo-ativacao" value="0" style="width: 100%; padding: 7px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #fff; font-size: 13px;">
              </div>
              <div>
                <label style="font-size: 12px; color: #cbd5e1; display: block; margin-bottom: 4px;">Tempo Máximo / Limite (min):</label>
                <input type="number" id="tempo-prova-ativacao" value="0" style="width: 100%; padding: 7px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #fff; font-size: 13px;">
              </div>
              <div>
                <label style="font-size: 12px; color: #cbd5e1; display: block; margin-bottom: 4px;">Token / Senha de Acesso:</label>
                <input type="text" id="input-token-ativacao" placeholder="Ex: PROVA123" style="width: 100%; padding: 7px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #fff; font-size: 13px;">
              </div>
              <div>
                <label style="font-size: 12px; color: #cbd5e1; display: block; margin-bottom: 4px;">Agendar Início Simultâneo:</label>
                <input type="datetime-local" id="input-agendamento-ativacao" style="width: 100%; padding: 7px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #fff; font-size: 13px;">
              </div>
            </div>
          </div>

          <div style="background: rgba(15, 23, 42, 0.95); border: 1px dashed #38bdf8; padding: 16px; border-radius: 10px; display: flex; flex-direction: column; gap: 10px;">
            <h5 style="margin: 0; color: #38bdf8; font-size: 14px;">🔍 Pré-visualização Geral e Confirmação</h5>
            <div id="bloco-preview-ativacao-geral" style="font-size: 13px; color: #e2e8f0; display: flex; flex-direction: column; gap: 4px;">
              <div>🏫 <strong>Unidade Selecionada:</strong> ${escolaNome}</div>
              <div>📚 <strong>Matérias:</strong> <span id="prev-mat">Nenhuma</span></div>
              <div>📖 <strong>Disciplinas:</strong> <span id="prev-disc">Nenhuma</span></div>
              <div>🏫 <strong>Período:</strong> <span id="prev-per">Geral</span></div>
              <div>🎒 <strong>Turmas Destino:</strong> <span id="prev-tur">Nenhuma</span></div>
              <div>⏱️ <strong>Parâmetros:</strong> Qtd: <span id="prev-qtd">10</span> | Mín: <span id="prev-tmin">0</span>m | Máx: <span id="prev-tlim">0</span>m</div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 5px;">
            <button type="button" id="btn-publicar-prova-escola-profissional" style="background: #22c55e; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);">🚀 Confirmar e Publicar Avaliação para os Alunos</button>
          </div>

        </div>
      `;

      function atualizarPreviewDinamicoAtivacao() {
        const matSel = Array.from(painelDinamico.querySelectorAll(".chk-materia-ativacao:checked")).map(c => c.value);
        const discSel = Array.from(painelDinamico.querySelectorAll(".chk-disciplina-ativacao:checked")).map(c => c.value);
        const perSel = painelDinamico.querySelector("#select-periodo-ativacao")?.value || "Geral";
        const turSel = Array.from(painelDinamico.querySelectorAll(".chk-turma-ativacao:checked")).map(c => c.value);
        const qtdVal = painelDinamico.querySelector("#qtd-questoes-ativacao")?.value || "10";
        const tMinVal = painelDinamico.querySelector("#tempo-minimo-ativacao")?.value || "0";
        const tLimVal = painelDinamico.querySelector("#tempo-prova-ativacao")?.value || "0";

        if (document.getElementById("prev-mat")) document.getElementById("prev-mat").textContent = matSel.join(", ") || "Nenhuma";
        if (document.getElementById("prev-disc")) document.getElementById("prev-disc").textContent = discSel.join(", ") || "Nenhuma";
        if (document.getElementById("prev-per")) document.getElementById("prev-per").textContent = perSel;
        if (document.getElementById("prev-tur")) document.getElementById("prev-tur").textContent = turSel.join(", ") || "Nenhuma";
        if (document.getElementById("prev-qtd")) document.getElementById("prev-qtd").textContent = qtdVal;
        if (document.getElementById("prev-tmin")) document.getElementById("prev-tmin").textContent = tMinVal;
        if (document.getElementById("prev-tlim")) document.getElementById("prev-tlim").textContent = tLimVal;
      }

      painelDinamico.addEventListener("change", atualizarPreviewDinamicoAtivacao);
      painelDinamico.addEventListener("input", atualizarPreviewDinamicoAtivacao);
      atualizarPreviewDinamicoAtivacao();

      document.getElementById("btn-publicar-prova-escola-profissional")?.addEventListener("click", async (e) => {
        e.preventDefault(); 
        const materiasSelecionadas = Array.from(painelDinamico.querySelectorAll(".chk-materia-ativacao:checked")).map(c => c.value);
        const disciplinasSelecionadas = Array.from(painelDinamico.querySelectorAll(".chk-disciplina-ativacao:checked")).map(c => c.value);
        const periodoEscolhido = painelDinamico.querySelector("#select-periodo-ativacao")?.value || "Geral";
        const turmasSelecionadas = Array.from(painelDinamico.querySelectorAll(".chk-turma-ativacao:checked")).map(c => c.value);
        const tokenProva = painelDinamico.querySelector("#input-token-ativacao")?.value.trim() || "";
        const agendamentoData = painelDinamico.querySelector("#input-agendamento-ativacao")?.value || "";
        const qtdQ = parseInt(painelDinamico.querySelector("#qtd-questoes-ativacao")?.value) || 10;
        const tempoMin = parseInt(painelDinamico.querySelector("#tempo-minimo-ativacao")?.value) || 0;
        const tempoLim = parseInt(painelDinamico.querySelector("#tempo-prova-ativacao")?.value) || 0;

        if (materiasSelecionadas.length === 0 || turmasSelecionadas.length === 0) {
          alert("⚠ Selecione pelo menos uma matéria e uma turma para publicar a prova!");
          return;
        }

        if (!confirm(`Deseja realmente confirmar e publicar a avaliação para a unidade "${escolaNome}"?`)) return;

        let timestampAgendamento = agendamentoData ? new Date(agendamentoData).getTime() : 0;

        try {
          const dadosPublicacao = {
            escolaAtiva: escolaNome,
            materiasAtivas: materiasSelecionadas,
            disciplinasAtivas: disciplinasSelecionadas,
            periodoAtivo: periodoEscolhido,
            quantidadeQuestoes: qtdQ,
            tempoMinimoMinutos: tempoMin,
            tempoLimiteMinutos: tempoLim,
            turmasAtivas: turmasSelecionadas,
            token: tokenProva,
            agendamento: timestampAgendamento,
            seedReordenacao: Date.now().toString(),
            publicadoEm: serverTimestamp()
          };

          await setDoc(doc(db, "configuracoes", "prova_ativa"), dadosPublicacao);
          animarBotaoSucesso(e.target);
          alert(`✅ Avaliação publicada e liberada com sucesso para a unidade "${escolaNome}"!`);
        } catch (err) {
          alert("Erro ao publicar: " + err.message);
        }
      });
    });
  }

  function carregarResumoProvaAtivaNoPainel() {
    onSnapshot(doc(db, "configuracoes", "prova_ativa"), (docSnap) => {
      const abaAtivacao = document.getElementById("aba-ativacao");
      if (!abaAtivacao) return;

      let blocoTopoAtiva = document.getElementById("bloco-prova-ativa-topo");
      if (!blocoTopoAtiva) {
        blocoTopoAtiva = document.createElement("div");
        blocoTopoAtiva.id = "bloco-prova-ativa-topo";
        blocoTopoAtiva.style.marginBottom = "20px";
        abaAtivacao.prepend(blocoTopoAtiva);
      }

      if (docSnap.exists()) {
        const dados = docSnap.data();
        const escolaAtiva = dados.escolaAtiva || "";
         
        if (!escolaAtiva || escolaAtiva === "") {
          blocoTopoAtiva.innerHTML = `
            <div style="background: rgba(15, 23, 42, 0.95); border: 2px dashed #ef4444; padding: 20px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); margin-bottom: 20px;">
              <div style="color: #ef4444; font-weight: bold; font-size: 15px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                🚨 STATUS DA PROVA ATIVA: NENHUMA AVALIAÇÃO LIBERADA
              </div>
              <p style="color: #cbd5e1; font-size: 13px; margin: 0; line-height: 1.5;">
                Atenção professor(a): Não há nenhuma prova ativa no momento. Para liberar uma avaliação para os alunos, selecione uma escola abaixo, configure os parâmetros e clique em <strong>Confirmar e Publicar Avaliação</strong>.
              </p>
            </div>
          `;
          return;
        }

        const materiasStr = (dados.materiasAtivas || []).join(', ');
        const disciplinasStr = (dados.disciplinasAtivas || []).join(', ');
        const turmasStr = (dados.turmasAtivas || []).join(', ');
        const periodoStr = dados.periodoAtivo || 'Geral';
        const tempoMin = dados.tempoMinimoMinutos ? `${dados.tempoMinimoMinutos} minuto(s)` : 'Nenhum';
        const tempoLim = dados.tempoLimiteMinutos ? `${dados.tempoLimiteMinutos} minuto(s)` : 'Sem limite';

        blocoTopoAtiva.innerHTML = `
          <div style="background: rgba(15, 23, 42, 0.95); border: 2px solid #22c55e; padding: 20px; border-radius: 12px; box-shadow: 0 4px 20px rgba(34,197,94,0.25); display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
              <div>
                <span style="color: #22c55e; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">🟢 STATUS: PROVA ATIVA E LIBERADA</span>
                <div style="color: #ffffff; font-weight: bold; font-size: 20px; margin-top: 2px;">🏫 Unidade: ${escolaAtiva}</div>
              </div>
              <div style="color: #cbd5e1; font-size: 13px; background: rgba(30, 41, 59, 0.8); padding: 8px 12px; border-radius: 8px; border: 1px solid #334155;">
                📅 <strong>Período:</strong> ${periodoStr} | ⏱️ <strong>Mín:</strong> ${tempoMin} | ⏳ <strong>Limite:</strong> ${tempoLim}
              </div>
            </div>
            <div style="font-size: 13px; color: #e2e8f0; display: flex; flex-direction: column; gap: 4px;">
              <div>📚 <strong>Matérias:</strong> ${materiasStr || 'Nenhuma'}</div>
              <div>📖 <strong>Disciplinas:</strong> ${disciplinasStr || 'Nenhuma'}</div>
              <div>🎒 <strong>Turmas:</strong> ${turmasStr || 'Nenhuma'}</div>
            </div>
            <hr style="border: none; border-top: 1px solid #334155; margin: 4px 0;">
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
              <a href="index.html" target="_blank" style="background: #22c55e; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 13px; display: inline-flex; align-items: center; gap: 5px;">👁️ Testar Prova do Aluno</a>
              <button type="button" onclick="gerarCopiaProvaAtivaPDF()" style="background: #0284c7; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px;">📄 Gerar Cópia Geral</button>
              <button type="button" onclick="irParaMonitoramentoTab()" style="background: #f59e0b; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px;">📊 Monitoramento</button>
              <button type="button" id="btn-embaralhar-manual-ativas" style="background: #8b5cf6; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px;">🔀 Reembaralhar</button>
              <button type="button" onclick="encerrarProvaAtivaAgora()" style="background: #ef4444; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px;">🛑 Encerrar</button>
            </div>
          </div>
        `;
      } else {
        blocoTopoAtiva.innerHTML = `
          <div style="background: rgba(15, 23, 42, 0.95); border: 2px dashed #ef4444; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <div style="color: #ef4444; font-weight: bold; font-size: 15px; margin-bottom: 6px;">🚨 STATUS DA PROVA ATIVA: NENHUMA AVALIAÇÃO LIBERADA</div>
            <p style="color: #cbd5e1; font-size: 13px; margin: 0;">Selecione uma escola abaixo para ativar uma nova avaliação.</p>
          </div>
        `;
      }
    });
  }

  document.addEventListener("click", async (e) => {
    const btnEmbaralhar = e.target.closest("#btn-embaralhar-manual-ativas");
    if (btnEmbaralhar) {
      if (confirm("🔀 Deseja reembaralhar imediatamente todas as questões da prova ativa para os alunos?")) {
        try {
          await setDoc(doc(db, "configuracoes", "prova_ativa"), { 
            seedReordenacao: Date.now().toString(),
            atualizadoEm: serverTimestamp() 
          }, { merge: true });
          mostrarNotificacao("✅ Questões reembaralhadas com sucesso!");
        } catch(err) { alert("Erro ao reembaralhar: " + err.message); }
      }
    }
  });

  window.gerarCopiaProvaAtivaPDF = async function() {
    try {
      const snap = await getDoc(doc(db, "configuracoes", "prova_ativa"));
      if (!snap.exists()) { alert("⚠ Nenhuma prova ativa."); return; }
      const pData = snap.data();
      const escola = pData.escolaAtiva || 'Rede de Ensino';
      const materias = pData.materiasAtivas || [];
      const dataHoraAtual = new Date().toLocaleString('pt-BR');
      const periodo = pData.periodoAtivo || 'Geral';
       
      const qSnap = await getDocs(collection(db, "questoes"));
      let questoesValidas = [];
      qSnap.forEach(s => {
        let q = normalizarDocumentoQuestao(s.data(), s.id);
        if (materias.length === 0 || materias.some(m => normalizarTexto(q.categoria).includes(normalizarTexto(m)))) {
          questoesValidas.push(q);
        }
      });

      for (let i = questoesValidas.length - 1; i > 0; i--) {
        const aleatorio = crypto.getRandomValues(new Uint32Array(1))[0];
        const j = Math.floor((aleatorio / 4294967295) * (i + 1));
        [questoesValidas[i], questoesValidas[j]] = [questoesValidas[j], questoesValidas[i]];
      }

      let limitQ = pData.quantidadeQuestoes || 10;
      let selecionadas = questoesValidas.slice(0, limitQ);

      let janelaImpressao = window.open('', '_blank');
      let html = `
      <html>
      <head>
        <title>Avaliação Oficial - ${escola}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #000; line-height: 1.6; }
          .cabecalho { border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 25px; }
          .questao { margin-bottom: 30px; page-break-inside: avoid; border-bottom: 1px solid #ccc; padding-bottom: 15px; }
          .questao p.enunciado { font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #000; }
          .opcoes { margin-left: 20px; font-size: 14px; }
          .opcoes div { margin-bottom: 6px; }
          .gabarito { margin-top: 50px; border-top: 2px dashed #000; padding-top: 25px; page-break-before: always; }
          .gabarito h3 { margin-bottom: 15px; font-size: 18px; }
          .gabarito ul { list-style-type: none; padding: 0; }
          .gabarito li { padding: 6px 0; border-bottom: 1px solid #ddd; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="cabecalho">
          <h2>AVALIAÇÃO DE SISTEMA - ${escola}</h2>
          <p><strong>Aluno(a):</strong> _________________________________________________ <strong>Turma:</strong> ________</p>
          <p><strong>Matéria(s):</strong> ${materias.join(', ')} | <strong>Período/Turno:</strong> ${periodo}</p>
          <p><strong>Data e Horário de Emissão:</strong> ${dataHoraAtual}</p>
        </div>
      `;

      selecionadas.forEach((q, idx) => {
        let letras = ['A', 'B', 'C', 'D', 'E'];
        let htmlOpcoes = '';
        letras.forEach((letra, i) => {
          if (q.opcoes[i] && q.opcoes[i].trim() !== "") {
            htmlOpcoes += `<div>${letra}) ${q.opcoes[i]}</div>`;
          }
        });

        html += `
          <div class="questao">
            <p class="enunciado">Questão ${idx + 1}: ${q.pergunta}</p>
            <div class="opcoes">
              ${htmlOpcoes}
            </div>
          </div>
        `;
      });

      html += `<div class="gabarito"><h3>GABARITO OFICIAL (USO EXCLUSIVO DO PROFESSOR)</h3><ul>`;
      selecionadas.forEach((q, idx) => {
        html += `<li><strong>Questão ${idx + 1}:</strong> Resposta Correta: <strong>${q.correta}</strong></li>`;
      });
      html += `</ul></div>`;

      html += `</body></html>`;
      janelaImpressao.document.write(html);
      janelaImpressao.document.close();
      janelaImpressao.print();
    } catch(err) {
      alert("Erro ao gerar cópia: " + err.message);
    }
  };

  window.gerarCopiaProvaIndividual = async function(nomeAluno, turmaAluno, materiaAluno, periodoAluno = 'Geral', dataEnvioAluno = null, escolaAluno = '') {
    try {
      const snapProva = await getDoc(doc(db, "configuracoes", "prova_ativa"));
      const pData = snapProva.exists() ? snapProva.data() : { quantidadeQuestoes: 10 };
       
      const qSnap = await getDocs(collection(db, "questoes"));
      let banco = [];
      qSnap.forEach(s => banco.push(normalizarDocumentoQuestao(s.data(), s.id)));

      let filtradas = banco.filter(q => normalizarTexto(q.categoria).includes(normalizarTexto(materiaAluno)) || normalizarTexto(materiaAluno).includes(normalizarTexto(q.categoria)));
      if (filtradas.length === 0) filtradas = banco;

      for (let i = filtradas.length - 1; i > 0; i--) {
        const aleatorio = crypto.getRandomValues(new Uint32Array(1))[0];
        const j = Math.floor((aleatorio / 4294967295) * (i + 1));
        [filtradas[i], filtradas[j]] = [filtradas[j], filtradas[i]];
      }

      let qtdQ = pData.quantidadeQuestoes || 10;
      let questoesAluno = filtradas.slice(0, qtdQ);

      let dataImpressaoStr = dataEnvioAluno ? dataEnvioAluno : new Date().toLocaleString('pt-BR');

      let win = window.open('', '_blank');
      let html = `
        <html>
        <head>
          <title>Caderno de Prova - ${nomeAluno}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #000; line-height: 1.6; }
            .cabecalho { border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 25px; }
            .questao { margin-bottom: 30px; page-break-inside: avoid; border-bottom: 1px solid #ccc; padding-bottom: 15px; }
            .questao p.enunciado { font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #000; }
            .opcoes { margin-left: 20px; font-size: 14px; }
            .opcoes div { margin-bottom: 6px; }
            .gabarito { margin-top: 50px; border-top: 2px dashed #000; padding-top: 25px; page-break-before: always; }
            .gabarito h3 { margin-bottom: 15px; font-size: 18px; }
            .gabarito ul { list-style-type: none; padding: 0; }
            .gabarito li { padding: 6px 0; border-bottom: 1px solid #ddd; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="cabecalho">
            <h2>CADERNO DE PROVA INDIVIDUAL ${escolaAluno ? '- ' + escolaAluno : ''}</h2>
            <p><strong>Aluno(a):</strong> ${nomeAluno} | <strong>Turma:</strong> ${turmaAluno}</p>
            <p><strong>Matéria:</strong> ${materiaAluno} | <strong>Período/Turno:</strong> ${periodoAluno}</p>
            <p><strong>Data e Horário da Prova/Emissão:</strong> ${dataImpressaoStr}</p>
          </div>
      `;

      questoesAluno.forEach((q, idx) => {
        let letras = ['A', 'B', 'C', 'D', 'E'];
        let htmlOpcoes = '';
        letras.forEach((letra, i) => {
          if (q.opcoes[i] && q.opcoes[i].trim() !== "") {
            htmlOpcoes += `<div>${letra}) ${q.opcoes[i]}</div>`;
          }
        });

        html += `
          <div class="questao">
            <p class="enunciado">Questão ${idx + 1}: ${q.pergunta}</p>
            <div class="opcoes">
              ${htmlOpcoes}
            </div>
          </div>
        `;
      });

      html += `<div class="gabarito"><h3>GABARITO DA AVALIAÇÃO</h3><ul>`;
      questoesAluno.forEach((q, idx) => {
        html += `<li><strong>Questão ${idx + 1}:</strong> Resposta Correta: <strong>${q.correta}</strong></li>`;
      });
      html += `</ul></div>`;

      html += `</body></html>`;
      win.document.write(html);
      win.document.close();
      win.print();
    } catch (err) {
      alert("Erro ao gerar prova individual: " + err.message);
    }
  };

  function renderizarSeletorEscolasTopo() {
    const select = document.getElementById("select-escola-geral-topo");
    const btnIr = document.getElementById("btn-ir-config-escola");
    if (!select) return;

    if (listaEscolasCache.length === 0) {
      select.innerHTML = `<option value="" disabled selected>Nenhuma escola cadastrada</option>`;
      if (btnIr) btnIr.onclick = () => alert("Cadastre uma escola na aba 'Cadastro de Escolas' primeiro!");
      return;
    }

    let html = "";
    listaEscolasCache.forEach(esc => { html += `<option value="${esc.nome}">${esc.nome}</option>`; });
    select.innerHTML = html;

    if (btnIr) {
      btnIr.onclick = () => {
        const escolaEscolhida = select.value;
        if (escolaEscolhida) { window.location.href = `escola.html?escola=${encodeURIComponent(escolaEscolhida)}&retorno=escolas`; }
      };
    }
  }

  function popularFiltroEscolaRelatorio() {
    const selectFiltro = document.getElementById("select-filtro-escola-relatorio");
    if (!selectFiltro) return;

    let html = `<option value="TODAS">🏫 Escolas (Todas)</option>`;
    listaEscolasCache.forEach(esc => {
      html += `<option value="${esc.nome}">${esc.nome}</option>`;
    });
    selectFiltro.innerHTML = html;

    selectFiltro.onchange = () => {
      renderizarTabelaResultadosFiltrada();
    };
  }

  const botoesAba = document.querySelectorAll(".btn-aba");
  const conteudosAba = document.querySelectorAll(".aba-conteudo");
  botoesAba.forEach(btn => {
    btn.addEventListener("click", () => {
      botoesAba.forEach(b => b.classList.remove("active"));
      conteudosAba.forEach(c => c.classList.add("hidden"));
      btn.classList.add("active");
      const abaId = btn.getAttribute("data-aba");
      const alvo = document.getElementById(abaId);
      if (alvo) alvo.classList.remove("hidden");
       
      const hashNome = abaId.replace("aba-", "");
      if (history.replaceState) {
        history.replaceState(null, null, `#${hashNome}`);
      }

      if(abaId === "aba-questoes") { popularSelectMateriasQuestao(); }
      if(abaId === "aba-banco-dados") { carregarBancoDadosCompleto(); }
      if(abaId === "aba-relatorios") { forcarMenuClassificarCompleto(); organizarLayoutAbaRelatorios(); }
    });
  });

  const inputNomeEscola = document.getElementById("input-nome-escola");
  const inputGestorEscola = document.getElementById("input-gestor-escola");
  const inputCidadeEscola = document.getElementById("input-cidade-escola");
  const inputEscolaIdEditando = document.getElementById("input-escola-id-editando");
  const btnSalvarNovaEscola = document.getElementById("btn-salvar-nova-escola");
  const btnCancelarEdicao = document.getElementById("btn-cancelar-edicao");
  const listaEscolasContainer = document.getElementById("lista-escolas-cadastradas-container");

  async function carregarListaEscolas() {
    try {
      const snap = await getDocs(collection(db, "escolas_cadastradas"));
      let escolas = [];
      snap.forEach(docSnap => { escolas.push({ idDoc: docSnap.id, ...docSnap.data() }); });
      
      escolas.sort((a, b) => {
        if (a.idDoc === escolaPrincipalFixadaId) return -1;
        if (b.idDoc === escolaPrincipalFixadaId) return 1;
        return 0;
      });

      listaEscolasCache = escolas;
      renderizarSeletorEscolasTopo();
      popularFiltroEscolaRelatorio();
      renderizarSeletorEscolasAtivacaoIndependente();

      if (listaEscolasContainer) {
        let htmlCadastradas = "";
        if (escolas.length === 0) {
          htmlCadastradas = `<p style="text-align:center; color:#94a3b8; padding: 10px;">Nenhuma escola cadastrada.</p>`;
        } else {
          escolas.forEach(esc => {
            let ehFixada = esc.idDoc === escolaPrincipalFixadaId;
            let classeFixada = ehFixada ? "fixada" : "";
            let textoPin = ehFixada ? "📌 Fixada" : "📌 Fixar Principal";
            let draggableAttr = ehFixada ? "false" : "true";

            htmlCadastradas += `
              <div class="card-escola-dinamico ${classeFixada}" draggable="${draggableAttr}" data-id="${esc.idDoc}" onclick="window.location.href='escola.html?escola=${encodeURIComponent(esc.nome)}&retorno=escolas';">
                <div style="display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0;">
                  <strong style="font-size: 15px; color: inherit; display: block;">🏫 ${esc.nome} ${ehFixada ? '<span style="font-size:11px; color:#eab308; background:rgba(234,179,8,0.2); padding:2px 6px; border-radius:4px; margin-left:6px;">⭐ Principal</span>' : ''}</strong>
                  <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 12px; opacity: 0.85;">
                    <span>Gestor(a): ${esc.gestor || 'N/D'} | Cidade: ${esc.cidade || 'N/D'}</span>
                    <span style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 2px 6px; border-radius: 4px; font-weight: bold;">⚙️ Configurar Unidade</span>
                  </div>
                </div>
                <div style="display: flex; gap: 6px; align-items: center; flex-shrink: 0;" onclick="event.stopPropagation();">
                  <button type="button" class="btn-fixar-escola btn-acao-mini" data-id="${esc.idDoc}" style="background:${ehFixada ? '#eab308' : '#334155'}; color:white;" title="Fixar Escola Principal">${textoPin}</button>
                  <button type="button" class="btn-editar-escola btn-acao-mini" data-id="${esc.idDoc}" data-nome="${esc.nome}" data-gestor="${esc.gestor || ''}" data-cidade="${esc.cidade || ''}" style="background:#eab308; color:white;" title="Editar">✏️</button>
                  <button type="button" class="btn-excluir-escola btn-acao-mini" data-id="${esc.idDoc}" data-nome="${esc.nome}" style="background:#ef4444; color:white;" title="Excluir">🗑️</button>
                </div>
              </div>
            `;
          });
        }
        listaEscolasContainer.innerHTML = htmlCadastradas;

        let cardArrastado = null;
        listaEscolasContainer.querySelectorAll(".card-escola-dinamico").forEach(card => {
          if (!card.classList.contains("fixada")) {
            card.addEventListener("dragstart", (e) => {
              cardArrastado = card;
              card.classList.add("dragging");
            });
            card.addEventListener("dragend", () => {
              card.classList.remove("dragging");
              cardArrastado = null;
            });
          }

          card.addEventListener("dragover", (e) => {
            e.preventDefault();
            const cardAbaixo = e.target.closest(".card-escola-dinamico");
            if (cardAbaixo && cardAbaixo !== cardArrastado && !cardAbaixo.classList.contains("fixada") && cardArrastado) {
              const bounding = cardAbaixo.getBoundingClientRect();
              const offset = e.clientY - bounding.top;
              if (offset > bounding.height / 2) {
                listaEscolasContainer.insertBefore(cardArrastado, cardAbaixo.nextSibling);
              } else {
                listaEscolasContainer.insertBefore(cardArrastado, cardAbaixo);
              }
            }
          });
        });

        document.querySelectorAll(".btn-fixar-escola").forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const id = btn.getAttribute("data-id");
            if (escolaPrincipalFixadaId === id) {
              escolaPrincipalFixadaId = "";
              localStorage.removeItem("escola_principal_fixada_id");
              mostrarNotificacao("📌 Escola desfixada.");
            } else {
              escolaPrincipalFixadaId = id;
              localStorage.setItem("escola_principal_fixada_id", id);
              mostrarNotificacao("⭐ Escola definida como principal e fixada no topo!");
            }
            carregarListaEscolas();
          };
        });

        document.querySelectorAll(".btn-editar-escola").forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const b = e.target.closest("button");
            inputEscolaIdEditando.value = b.getAttribute("data-id");
            inputNomeEscola.value = b.getAttribute("data-nome");
            inputGestorEscola.value = b.getAttribute("data-gestor");
            inputCidadeEscola.value = b.getAttribute("data-cidade");
            btnSalvarNovaEscola.textContent = "💾 Atualizar Escola";
            btnCancelarEdicao.classList.remove("hidden");
            window.scrollTo({ top: 0, behavior: 'smooth' });
          };
        });

        document.querySelectorAll(".btn-excluir-escola").forEach(btn => {
          btn.onclick = async (e) => {
            e.stopPropagation();
            const b = e.target.closest("button");
            const id = b.getAttribute("data-id");
            const nomeEscola = b.getAttribute("data-nome");
            if (confirm(`Deseja excluir a escola "${nomeEscola}"?`)) {
              await deleteDoc(doc(db, "escolas_cadastradas", id));
              await deleteDoc(doc(db, "escolas_configuracoes", normalizarTexto(nomeEscola)));
              mostrarNotificacao("🗑️ Escola excluída!");
              carregarListaEscolas();
            }
          };
        });
      }
    } catch (e) { console.error(e); }
  }

  btnCancelarEdicao?.addEventListener("click", () => {
    inputEscolaIdEditando.value = "";
    inputNomeEscola.value = "";
    inputGestorEscola.value = "";
    inputCidadeEscola.value = "";
    btnSalvarNovaEscola.textContent = "➕ Cadastrar Escola";
    btnCancelarEdicao.classList.add("hidden");
  });

  btnSalvarNovaEscola?.addEventListener("click", async (e) => {
    e.preventDefault(); 
    const idEditando = inputEscolaIdEditando?.value;
    const nome = inputNomeEscola?.value.trim();
    const gestor = inputGestorEscola?.value.trim();
    const cidade = inputCidadeEscola?.value.trim();
    if (!nome) { mostrarNotificacao("⚠ Digite o nome da escola!"); return; }
    try {
      const docId = idEditando || normalizarTexto(nome);
      await setDoc(doc(db, "escolas_cadastradas", docId), { nome, gestor, cidade, atualizadoEm: serverTimestamp() });
      animarBotaoSucesso(e.target);
      mostrarNotificacao(`✅ Escola "${nome}" salva!`);
      inputEscolaIdEditando.value = ""; inputNomeEscola.value = ""; inputGestorEscola.value = ""; inputCidadeEscola.value = "";
      btnSalvarNovaEscola.textContent = "➕ Cadastrar Escola";
      btnCancelarEdicao.classList.add("hidden");
      await carregarListaEscolas();
    } catch (err) { mostrarNotificacao("Erro: " + err.message); }
  });

  window.encerrarProvaAtivaAgora = async function() {
    if (confirm("⚠️ Deseja encerrar a prova ativa no momento?")) {
      try {
        await setDoc(doc(db, "configuracoes", "prova_ativa"), { 
          escolaAtiva: "", materiasAtivas: [], turmasAtivas: [], periodoAtivo: "", token: "", quantidadeQuestoes: 0 
        });
        mostrarNotificacao("🛑 Prova encerrada com sucesso!");
      } catch(err) { alert("Erro ao encerrar."); }
    }
  };

  function popularSelectMateriasQuestao() {
    const sel = document.getElementById("cad-materia");
    if (!sel) return;
    let materias = ["Inteligência Artificial", "Programação Front-End", "Matemática", "Língua Portuguesa"];
    estruturaGlobalBoxes.forEach(b => {
      if (b.id === "materias" || b.titulo.toLowerCase().includes("disciplina") || b.titulo.toLowerCase().includes("matéria")) {
        materias = b.itens;
      }
    });
    let html = "";
    materias.forEach(m => { html += `<option value="${m}">${m}</option>`; });
    sel.innerHTML = html;
  }

  document.getElementById("form-cadastrar-questao")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const materia = document.getElementById("cad-materia").value;
    const pergunta = document.getElementById("cad-pergunta").value.trim();
    const opA = document.getElementById("cad-op-a").value.trim();
    const opB = document.getElementById("cad-op-b").value.trim();
    const opC = document.getElementById("cad-op-c").value.trim();
    const opD = document.getElementById("cad-op-d").value.trim();
    const opE = document.getElementById("cad-op-e") ? document.getElementById("cad-op-e").value.trim() : "";
    const correta = document.getElementById("cad-correta").value.toUpperCase();

    if (!pergunta || !materia) { mostrarNotificacao("⚠ Preencha todos os campos!"); return; }

    try {
      await addDoc(collection(db, "questoes"), {
        materia: materia,
        categoria: materia,
        pergunta: pergunta,
        opcoes: [opA, opB, opC, opD, opE].filter(Boolean),
        correta: correta,
        criadoEm: serverTimestamp()
      });
      animarBotaoSucesso(e.submitter);
      mostrarNotificacao("✅ Questão cadastrada com sucesso!");
      document.getElementById("form-cadastrar-questao").reset();
      popularSelectMateriasQuestao();
    } catch (err) { mostrarNotificacao("Erro ao cadastrar: " + err.message); }
  });

  window.processarArquivoImportacao = async function(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    const extensao = arquivo.name.split('.').pop().toLowerCase();
    const textarea = document.getElementById("input-massa-questoes");

    if (extensao === 'txt') {
      const leitor = new FileReader();
      leitor.onload = function(e) {
        textarea.value = e.target.result;
        mostrarNotificacao("📄 Arquivo TXT carregado na caixa de texto!");
      };
      leitor.readAsText(arquivo);
    } 
    else if (extensao === 'docx') {
      const leitor = new FileReader();
      leitor.onload = async function(e) {
        try {
          const resultado = await mammoth.extractRawText({ arrayBuffer: e.target.result });
          textarea.value = resultado.value;
          mostrarNotificacao("📄 Arquivo Word (.docx) convertido e carregado!");
        } catch (err) {
          alert("⚠️ Erro ao ler arquivo Word: " + err.message);
        }
      };
      leitor.readAsArrayBuffer(arquivo);
    } 
    else if (extensao === 'xlsx' || extensao === 'xls') {
      const leitor = new FileReader();
      leitor.onload = function(e) {
        try {
          const dadosBinarios = new Uint8Array(e.target.result);
          const workbook = XLSX.read(dadosBinarios, { type: 'array' });
          const primeiraAba = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[primeiraAba];
          const linhasJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          let textoFormatado = "";
          linhasJson.forEach(linha => {
            if (linha && linha.length >= 6) {
              textoFormatado += linha.join(" | ") + "\n";
            }
          });

          textarea.value = textoFormatado;
          mostrarNotificacao("📊 Planilha Excel lida e convertida com sucesso!");
        } catch (err) {
          alert("⚠️ Erro ao ler planilha Excel: " + err.message);
        }
      };
      leitor.readAsArrayBuffer(arquivo);
    } else {
      alert("⚠️ Formato de arquivo não suportado.");
    }
  };

  window.importarQuestoesEmMassa = async function() {
    const texto = document.getElementById("input-massa-questoes").value.trim();
    const materiaPadrao = document.getElementById("cad-materia").value || "Geral";
    if (!texto) { alert("⚠️ Cole o texto ou envie um arquivo com as questões para importar."); return; }

    let linhas = texto.split("\n");
    let importadas = 0;

    for (let linha of linhas) {
      if (!linha.trim()) continue;
      let partes = linha.split("|").map(p => p.trim());
       
      try {
        if (partes.length >= 8) {
          await addDoc(collection(db, "questoes"), {
            materia: partes[0],
            categoria: partes[0],
            pergunta: partes[1],
            opcoes: [partes[2], partes[3], partes[4], partes[5], partes[6]].filter(Boolean),
            correta: partes[7].toUpperCase(),
            criadoEm: serverTimestamp()
          });
          importadas++;
        } else if (partes.length >= 7) {
          await addDoc(collection(db, "questoes"), {
            materia: materiaPadrao,
            categoria: materiaPadrao,
            pergunta: partes[0],
            opcoes: [partes[1], partes[2], partes[3], partes[4], partes[5]].filter(Boolean),
            correta: partes[6].toUpperCase(),
            criadoEm: serverTimestamp()
          });
          importadas++;
        }
      } catch(e) {}
    }

    if (importadas > 0) {
      document.getElementById("input-massa-questoes").value = "";
      document.getElementById("input-arquivo-questoes").value = "";
      mostrarNotificacao(`✅ ${importadas} questões importadas em massa com sucesso!`);
    } else {
      alert("⚠️ Formato inválido.");
    }
  };

  function inicializarTabelaResultados() {
    const corpoTabelaResultados = document.getElementById("corpo-tabela");
    if (!corpoTabelaResultados) return;

    onSnapshot(collectionGroup(db, "avaliacoes"), (snapshot) => {
      resultadosGlobaisCache = [];
      snapshot.forEach(docSnap => {
        resultadosGlobaisCache.push({ 
          idDoc: docSnap.id, 
          refPath: docSnap.ref.path, 
          ...docSnap.data() 
        });
      });
      renderizarTabelaResultadosFiltrada();
    });
  }

  window.aplicarOrdenacaoResultados = function(criterio) {
    ordemAtualResultados = criterio;
    renderizarTabelaResultadosFiltrada();
    const menuRes = document.getElementById('dropdown-menu-resultados');
    if (menuRes) menuRes.classList.remove('show');
  };

  window.renderizarTabelaResultadosFiltrada = function() {
    const corpoTabelaResultados = document.getElementById("corpo-tabela");
    const selectFiltro = document.getElementById("select-filtro-escola-relatorio");
    const selectFiltroPeriodo = document.getElementById("select-filtro-periodo-relatorio");
    const inputBusca = document.getElementById("input-busca-resultados");
    if (!corpoTabelaResultados) return;

    const escolaSelecionada = selectFiltro ? selectFiltro.value : "TODAS";
    const periodoSelecionado = selectFiltroPeriodo ? selectFiltroPeriodo.value : "TODOS";
    const termoBusca = inputBusca ? normalizarTexto(inputBusca.value) : "";

    let dadosFiltrados = [...resultadosGlobaisCache];

    dadosFiltrados = dadosFiltrados.filter(res => !alunosOcultosCache.has(res.idDoc) && !alunosLixeiraCache.has(res.idDoc));

    if (escolaSelecionada && escolaSelecionada !== "TODAS") {
      dadosFiltrados = dadosFiltrados.filter(res => {
        let escolaRes = (res.escola || "").trim();
        return normalizarTexto(escolaRes) === normalizarTexto(escolaSelecionada) || escolaRes.toLowerCase() === escolaSelecionada.toLowerCase();
      });
    }

    if (periodoSelecionado && periodoSelecionado !== "TODOS") {
      dadosFiltrados = dadosFiltrados.filter(res => normalizarTexto(res.periodo) === normalizarTexto(periodoSelecionado));
    }

    if (termoBusca) {
      dadosFiltrados = dadosFiltrados.filter(res => {
        const textoConcatenado = normalizarTexto(`${res.nome || ''} ${res.escola || ''} ${res.turma || ''} ${res.materia || ''} ${res.periodo || ''}`);
        return textoConcatenado.includes(termoBusca);
      });
    }

    atualizarGraficosDesempenho(dadosFiltrados);

    if (ordemAtualResultados !== "nenhum") {
      dadosFiltrados.sort((a, b) => {
        let notaA = a.totalQuestoes > 0 ? (a.pontuacao / a.totalQuestoes) * 10 : 0;
        let notaB = b.totalQuestoes > 0 ? (b.pontuacao / b.totalQuestoes) * 10 : 0;
        let nomeA = (a.nome || "").trim();
        let nomeB = (b.nome || "").trim();

        switch (ordemAtualResultados) {
          case "data-asc": return (a.timestamp || 0) - (b.timestamp || 0);
          case "data-desc": return (b.timestamp || 0) - (a.timestamp || 0);
          case "nome-asc": return nomeA.localeCompare(nomeB);
          case "nome-desc": return nomeB.localeCompare(nomeA);
          case "turma-asc": return (a.turma || "").localeCompare(b.turma || "", undefined, {numeric: true});
          case "escola-asc": return (a.escola || "").localeCompare(b.escola || "");
          case "nota-desc": return notaB - notaA;
          case "nota-asc": return notaA - notaB;
          default: return (b.timestamp || 0) - (a.timestamp || 0);
        }
      });
    }

    if (dadosFiltrados.length === 0) {
      corpoTabelaResultados.innerHTML = `<tr><td colspan="12" style="text-align:center; color: #94a3b8; padding: 20px;">Nenhum aluno encontrado.</td></tr>`;
      return;
    }

    let htmlResultados = "";
    dadosFiltrados.forEach(res => {
      let dataFormatada = res.dataEnvio?.toDate ? res.dataEnvio.toDate().toLocaleString('pt-BR') : "Data recente";
      let totalQ = res.totalQuestoes || 0;
      let acertos = res.pontuacao || 0;
      let erros = totalQ - acertos;
      let notaCalculada = totalQ > 0 ? ((acertos / totalQ) * 10).toFixed(1) : "0.0";
      let tempoGastoStr = res.tempoGastoFormatado || "N/D";
      let idAlunoAlvo = res.idAluno || obterIdAluno(res.nome, res.turma);
       
      htmlResultados += `
        <tr>
          <td class="chk-col" style="text-align: center;">
            <input type="checkbox" class="chk-item-resultado" value="${res.idDoc}" data-refpath="${res.refPath || ''}">
          </td>
          <td><span style="background: rgba(34, 197, 94, 0.2); color: #4ade80; padding: 3px 6px; border-radius: 6px; font-weight: bold; font-size: 11px;">✅ Finalizado</span></td>
          <td>${dataFormatada}</td>
          <td><strong>${res.escola || 'N/D'}</strong></td>
          <td>${res.periodo || 'N/D'}</td>
          <td>${res.nome || 'Aluno'}</td>
          <td>${res.turma || 'N/D'}</td>
          <td>${res.materia || 'Geral'}</td>
          <td><span style="color: #facc15;">⏱ ${tempoGastoStr}</span></td>
          <td><span style="color: #4ade80;">✅ ${acertos}</span> / <span style="color: #ef4444;">❌ ${erros}</span></td>
          <td><strong style="color: #60a5fa; font-size: 14px;">${notaCalculada} / 10</strong></td>
          <td style="text-align: center;">
            <div class="grupo-botoes-acoes">
              <button type="button" class="btn-acao" style="background:#0284c7;" onclick="gerarBoletimIndividual('${res.nome || 'Aluno'}', '${res.turma || ''}', '${res.escola || ''}', '${notaCalculada}', '${res.materia || 'Geral'}')">📜 Boletim</button>
              <button type="button" class="btn-acao" style="background:#0d9488;" onclick="gerarCopiaProvaIndividual('${res.nome || 'Aluno'}', '${res.turma || ''}', '${res.materia || 'Geral'}', '${res.periodo || 'Geral'}', '${dataFormatada}', '${res.escola || ''}')">📄 Prova</button>
              <button type="button" class="btn-acao" style="background:#10b981;" onclick="gerarCertificadoIndividual('${res.nome || 'Aluno'}', '${res.escola || ''}', '${notaCalculada}')">🎓 Certificado</button>
              <button type="button" class="btn-acao" style="background: #eab308;" onclick="autorizarAlunoRefazer('${idAlunoAlvo}', '${res.nome || 'Aluno'}')">🔄 Refazer</button>
            </div>
          </td>
        </tr>
      `;
    });
    corpoTabelaResultados.innerHTML = htmlResultados;
  };

  window.gerarBoletimIndividual = function(nome, turma, escola, nota, materia) {
    let win = window.open('', '_blank');
    win.document.write(`
      <html>
      <head><title>Boletim - ${nome}</title></head>
      <body style="font-family: Arial; padding: 30px; text-align: center; border: 5px solid #1e293b; margin: 20px;">
        <h1>📜 BOLETIM DE AVALIAÇÃO ESCOLAR</h1>
        <h3>${escola}</h3>
        <hr style="margin: 20px 0;">
        <p style="text-align: left; font-size: 16px;"><strong>Aluno(a):</strong> ${nome}</p>
        <p style="text-align: left; font-size: 16px;"><strong>Turma:</strong> ${turma} | <strong>Matéria:</strong> ${materia}</p>
        <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <h2>Nota Final: <span style="color: #2563eb;">${nota} / 10.0</span></h2>
        </div>
        <p style="margin-top: 60px;">___________________________________________________<br>Assinatura da Coordenação Pedagógica</p>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  window.gerarCertificadoIndividual = function(nome, escola, nota) {
    let win = window.open('', '_blank');
    win.document.write(`
      <html>
      <head><title>Certificado - ${nome}</title></head>
      <body style="font-family: Georgia, serif; padding: 40px; text-align: center; border: 10px double #b45309; margin: 20px; background: #fffbeb;">
        <h1 style="color: #b45309; font-size: 32px;">CERTIFICADO DE CONCLUSÃO</h1>
        <p style="font-size: 18px; margin-top: 20px;">Certificamos para os devidos fins que</p>
        <h2 style="font-size: 28px; color: #1e293b; border-bottom: 2px solid #b45309; display: inline-block; padding: 0 20px; margin: 15px 0;">${nome}</h2>
        <p style="font-size: 18px; line-height: 1.6;">concluiu com êxito a avaliação oficial aplicada pela instituição <strong>${escola}</strong>, alcançando média <strong>${nota}</strong>.</p>
        <div style="margin-top: 80px; display: flex; justify-content: space-around;">
          <div>________________________________________<br>Direção Escolar</div>
          <div>________________________________________<br>Coordenação</div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  function atualizarGraficosDesempenho(lista) {
    const contadorTotal = document.getElementById("contador-total-avaliacoes");
    const barraAcertos = document.getElementById("grafico-barra-acertos");
    const textoAcertos = document.getElementById("texto-media-acertos");
    if (!contadorTotal) return;

    contadorTotal.textContent = lista.length;

    if (lista.length === 0) {
      barraAcertos.style.width = "0%";
      textoAcertos.textContent = "Nenhum dado disponível";
      return;
    }

    let somaNotas = 0;
    lista.forEach(res => {
      let tQ = res.totalQuestoes || 10;
      let ac = res.pontuacao || 0;
      let nota = (ac / tQ) * 10;
      somaNotas += nota;
    });

    let mediaGeral = somaNotas / lista.length;
    let porcentagem = (mediaGeral / 10) * 100;

    barraAcertos.style.width = `${porcentagem}%`;
    textoAcertos.textContent = `Média Geral: ${mediaGeral.toFixed(1)} / 10.0`;
  }

  window.autorizarAlunoRefazer = async function(idAluno, nomeAluno) {
    if (confirm(`Deseja autorizar o aluno(a) "${nomeAluno}" a refazer a prova?`)) {
      try {
        await setDoc(doc(db, "permissoes_alunos", idAluno), { podeFazer: true }, { merge: true });
        mostrarNotificacao(`✅ Aluno(a) ${nomeAluno} autorizado(a) a refazer a prova!`);
      } catch (err) {
        mostrarNotificacao("Erro ao autorizar: " + err.message);
      }
    }
  };

  window.excluirResultadosSelecionados = function() {
    const checkboxes = Array.from(document.querySelectorAll(".chk-item-resultado:checked"));
    if (checkboxes.length === 0) { alert("⚠️ Selecione ao menos um resultado."); return; }
    
    if (confirm(`Mover os ${checkboxes.length} resultado(s) selecionado(s) para a lixeira?`)) {
      try {
        checkboxes.forEach(chk => {
          if (chk.value) {
            alunosLixeiraCache.add(chk.value);
          }
        });
        salvarAlunosLixeiraLocalStorage();
        renderizarTabelaResultadosFiltrada();
        mostrarNotificacao(`🗑 ${checkboxes.length} resultado(s) movido(s) para a lixeira!`);
      } catch (err) { 
        mostrarNotificacao("Erro: " + err.message); 
      }
    }
  };

  window.exportarResultadosCSV = function() {
    if (!resultadosGlobaisCache || resultadosGlobaisCache.length === 0) { alert("⚠️ Sem dados."); return; }
    let csvContent = "\uFEFFStatus;Data/Hora;Escola;Período;Aluno;Turma;Matéria;Tempo Gasto;Acertos;Erros;Nota\n";
    resultadosGlobaisCache.forEach(res => {
      let dataFormatada = res.dataEnvio?.toDate ? res.dataEnvio.toDate().toLocaleString('pt-BR') : "Data recente";
      let totalQ = res.totalQuestoes || 0;
      let acertos = res.pontuacao || 0;
      let erros = totalQ - acertos;
      let nota = totalQ > 0 ? ((acertos / totalQ) * 10).toFixed(1) : "0.0";
      csvContent += `"Finalizado";"${dataFormatada}";"${res.escola || ''}";"${res.periodo || ''}";"${res.nome || ''}";"${res.turma || ''}";"${res.materia || ''}";"${res.tempoGastoFormatado || ''}";"${acertos}";"${erros}";"${nota}"\n`;
    });
    let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `resultados_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  function inicializarTabelaTempoReal() {
    const corpoTabelaTempoReal = document.getElementById("corpo-tabela-tempo-real");
    if (!corpoTabelaTempoReal) return;
     
    onSnapshot(collection(db, "alunos_online"), (snapshot) => {
      alunosOnlineCache = [];
      snapshot.forEach(docSnap => { 
        alunosOnlineCache.push({ idDoc: docSnap.id, ...docSnap.data() }); 
      });
      renderizarTabelaTempoReal();
    });
  }

  window.aplicarOrdenacaoMonitoramento = function(criterio) {
    ordemAtualMonitoramento = criterio;
    renderizarTabelaTempoReal();
    const menuMon = document.getElementById('dropdown-menu-monitoramento');
    if (menuMon) menuMon.classList.remove('show');
  };

  window.renderizarTabelaTempoReal = function() {
    const corpoTabelaTempoReal = document.getElementById("corpo-tabela-tempo-real");
    const inputBusca = document.getElementById("input-busca-monitoramento");
    if (!corpoTabelaTempoReal) return;

    const selecionadosAntes = new Set(
      Array.from(document.querySelectorAll(".chk-item-online:checked")).map(c => c.value)
    );

    const termoBusca = inputBusca ? normalizarTexto(inputBusca.value) : "";
    let dadosFiltrados = [...alunosOnlineCache];

    if (termoBusca) {
      dadosFiltrados = dadosFiltrados.filter(aluno => {
        const textoConcatenado = normalizarTexto(`${aluno.nome || ''} ${aluno.escola || ''} ${aluno.turma || ''} ${aluno.materia || ''}`);
        return textoConcatenado.includes(termoBusca);
      });
    }

    if (ordemAtualMonitoramento !== "nenhum") {
      dadosFiltrados.sort((a, b) => {
        let tA = a.dataInicio?.seconds || a.dataInicio || 0;
        let tB = b.dataInicio?.seconds || b.dataInicio || 0;
        switch (ordemAtualMonitoramento) {
          case "inicio-asc": return tA - tB;
          case "nome-asc": return (a.nome || "").localeCompare(b.nome || "");
          case "escola-asc": return (a.escola || "").localeCompare(b.escola || "");
          case "tempo-desc": return (b.segundosPassados || 0) - (a.segundosPassados || 0);
          case "inicio-desc": default: return tB - tA;
        }
      });
    }

    if (dadosFiltrados.length === 0) {
      corpoTabelaTempoReal.innerHTML = `<tr><td colspan="10" style="text-align:center; color: #94a3b8; padding: 20px;">Nenhum aluno online no momento.</td></tr>`;
      return;
    }

    let htmlOnline = "";
    dadosFiltrados.forEach(aluno => {
      let min = Math.floor((aluno.segundosPassados || 0) / 60);
      let seg = (aluno.segundosPassados || 0) % 60;
      let tempoStr = `${min}m ${seg}s`;
      let dataInicioStr = aluno.dataInicio?.toDate ? aluno.dataInicio.toDate().toLocaleString('pt-BR') : "Agora";
      let estaMarcado = selecionadosAntes.has(aluno.idDoc) ? "checked" : "";
       
      let questaoAtualProgresso = aluno.questaoAtual || 1;
      let totalQProgresso = aluno.totalQuestoes || 10;

      htmlOnline += `
        <tr>
          <td class="chk-col" style="text-align: center;">
            <input type="checkbox" class="chk-item-online" value="${aluno.idDoc}" ${estaMarcado}>
          </td>
          <td><span style="background: rgba(34, 197, 94, 0.2); color: #4ade80; padding: 3px 6px; border-radius: 6px; font-weight: bold; font-size: 11px;">🟢 Online</span></td>
          <td><span style="color: #cbd5e1; font-size: 12px;">📅 ${dataInicioStr}</span></td>
          <td><strong>${aluno.escola || 'N/D'}</strong></td>
          <td>${aluno.nome || 'Aluno'}</td>
          <td>${aluno.turma || 'N/D'}</td>
          <td>${aluno.materia || 'Geral'}</td>
          <td><span style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">📝 Q. ${questaoAtualProgresso} / ${totalQProgresso}</span></td>
          <td><span style="color: #facc15;">⏱ ${tempoStr}</span></td>
          <td style="text-align: center;">
            <button type="button" class="btn-acao btn-danger" style="padding: 5px 8px; font-size: 11.5px; margin: 0;" data-id="${aluno.idDoc}" data-nome="${aluno.nome || 'Aluno'}" onclick="finalizarAlunoElemento(this)">🏁 Finalizar</button>
          </td>
        </tr>
      `;
    });
    corpoTabelaTempoReal.innerHTML = htmlOnline;
  };

  window.finalizarAlunoElemento = function(btn) {
    window.finalizarAlunoIndividual(btn.getAttribute("data-id"), btn.getAttribute("data-nome"));
  };

  window.finalizarAlunoIndividual = async function(idAluno, nomeAluno) {
    if (!idAluno) return;
    if (confirm(`Deseja finalizar a prova de "${nomeAluno}" agora?`)) {
      try {
        let alunoObj = alunosOnlineCache.find(a => a.idDoc === idAluno);
        const agora = Date.now();
        let segundos = alunoObj ? (alunoObj.segundosPassados || 0) : 0;
        let totalQ = alunoObj?.totalQuestoes || 10;
        let pontuacaoAtual = alunoObj?.pontuacao || 0;
        let escolaDestino = alunoObj?.escola || escolaAtivaSelecionadaIndependente || "Escola";

        await setDoc(doc(db, "escolas_configuracoes", normalizarTexto(escolaDestino), "avaliacoes", (9999999999999 - agora).toString()), {
          idAluno: idAluno,
          nome: alunoObj?.nome || nomeAluno,
          turma: alunoObj?.turma || "N/D",
          escola: escolaDestino,
          periodo: alunoObj?.periodo || "Geral",
          materia: alunoObj?.materia || "Geral",
          pontuacao: pontuacaoAtual,
          totalQuestoes: totalQ,
          tempoGastoSegundos: segundos,
          tempoGastoFormatado: `${Math.floor(segundos/60)}m ${segundos%60}s`,
          dataEnvio: serverTimestamp(),
          timestamp: agora
        });

        await setDoc(doc(db, "permissoes_alunos", idAluno), { podeFazer: false, provaFinalizadaPeloProfessor: true }, { merge: true });
        await deleteDoc(doc(db, "alunos_online", idAluno));

        alunosOnlineCache = alunosOnlineCache.filter(a => a.idDoc !== idAluno);
        renderizarTabelaTempoReal();

        mostrarNotificacao(`✅ Prova de ${nomeAluno} finalizada e removida do monitoramento!`);
      } catch (err) { alert("Erro: " + err.message); }
    }
  };

  // ==========================================
// MELHORIAS NA ABA DE BANCO DE DADOS (CATÁLOGO DE QUESTÕES)
// ==========================================

window.selecionarTodasQuestoesBanco = function(marcar) {
  document.querySelectorAll(".chk-questao-catalogo").forEach(chk => chk.checked = marcar);
};

window.excluirQuestoesSelecionadasEmMassa = async function() {
  const selecionadas = Array.from(document.querySelectorAll(".chk-questao-catalogo:checked")).map(c => c.value);
  if (selecionadas.length === 0) {
    alert("⚠️ Selecione pelo menos uma questão no catálogo para excluir.");
    return;
  }
  if (confirm(`🔥 Deseja realmente excluir permanentemente as ${selecionadas.length} questões selecionadas?`)) {
    try {
      for (const idDoc of selecionadas) {
        await deleteDoc(doc(db, "questoes", idDoc));
        questoesBancoCache = questoesBancoCache.filter(q => q.idDoc !== idDoc);
      }
      popularFiltroMateriaCatalogo();
      renderizarCatalogoBancoDados();
      mostrarNotificacao(`🗑️ ${selecionadas.length} questão(ões) excluída(s) com sucesso!`);
    } catch (err) {
      alert("Erro ao excluir em massa: " + err.message);
    }
  }
};

window.abrirModalEditarQuestaoBanco = function(idDoc) {
  const q = questoesBancoCache.find(item => item.idDoc === idDoc);
  if (!q) return;

  let modal = document.getElementById("modal-editar-questao-db");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-editar-questao-db";
    modal.style.cssText = "display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:90%; max-width:650px; background:#1e293b; border:1px solid #3b82f6; border-radius:12px; z-index:999999; padding:25px; box-shadow:0 10px 30px rgba(0,0,0,0.7); max-height:90vh; overflow-y:auto; color:#f8fafc;";
    document.body.appendChild(modal);
  }

  let opcoesHtml = "";
  let letras = ["A", "B", "C", "D", "E", "F", "G"];
  (q.opcoes || []).forEach((op, idx) => {
    let letra = letras[idx] || ("Opt" + (idx+1));
    opcoesHtml += `
      <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;" class="linha-opcao-edicao">
        <span style="font-weight:bold; min-width:25px;">${letra})</span>
        <input type="text" class="input-opcao-valor" value="${op}" style="flex:1; padding:6px 10px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#fff; font-size:13px;">
        <button type="button" class="btn-acao-mini" style="background:#ef4444; color:white;" onclick="this.closest('.linha-opcao-edicao').remove()">🗑️</button>
      </div>
    `;
  });

  let corretaAtual = (q.correta || "A").toString().trim().toUpperCase();

  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
      <h3 style="margin:0; color:#60a5fa; font-size:16px;">✏️ Editar Questão do Banco</h3>
      <button type="button" onclick="document.getElementById('modal-editar-questao-db').style.display='none'" style="background:transparent; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">✕</button>
    </div>
    <form id="form-editar-questao-db" style="display:flex; flex-direction:column; gap:14px;">
      <input type="hidden" id="edit-id-doc" value="${q.idDoc}">
      <div>
        <label style="font-size:12px; color:#cbd5e1; display:block; margin-bottom:4px;">Matéria / Categoria:</label>
        <input type="text" id="edit-materia" value="${q.materia || q.categoria || 'Geral'}" style="width:100%; padding:8px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#fff; font-size:13px;">
      </div>
      <div>
        <label style="font-size:12px; color:#cbd5e1; display:block; margin-bottom:4px;">Enunciado da Pergunta:</label>
        <textarea id="edit-pergunta" rows="3" style="width:100%; padding:8px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#fff; font-size:13px;">${q.pergunta || ''}</textarea>
      </div>
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <label style="font-size:12px; color:#cbd5e1;">Alternativas:</label>
          <button type="button" class="btn-acao-mini" style="background:#2563eb; color:white;" onclick="adicionarAlternativaModalEdicao()">➕ Adicionar Alternativa</button>
        </div>
        <div id="container-opcoes-edicao" style="display:flex; flex-direction:column; gap:4px;">
          ${opcoesHtml}
        </div>
      </div>
      <div>
        <label style="font-size:12px; color:#cbd5e1; display:block; margin-bottom:4px;">Alternativa Correta (Letra exata, ex: A, B, C):</label>
        <input type="text" id="edit-correta" value="${corretaAtual}" maxlength="1" style="width:80px; padding:8px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#fff; font-size:13px; text-align:center; font-weight:bold;">
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
        <button type="button" onclick="document.getElementById('modal-editar-questao-db').style.display='none'" style="background:#475569; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer;">Cancelar</button>
        <button type="submit" style="background:#22c55e; color:white; border:none; padding:8px 20px; border-radius:6px; font-weight:bold; cursor:pointer;">💾 Salvar Alterações</button>
      </div>
    </form>
  `;

  modal.style.display = "block";

  document.getElementById("form-editar-questao-db").onsubmit = async (e) => {
    e.preventDefault();
    const idDoc = document.getElementById("edit-id-doc").value;
    const materia = document.getElementById("edit-materia").value.trim();
    const pergunta = document.getElementById("edit-pergunta").value.trim();
    const correta = document.getElementById("edit-correta").value.trim().toUpperCase();
    
    const opcoesInputs = Array.from(document.querySelectorAll("#container-opcoes-edicao .input-opcao-valor"));
    const opcoesLimpas = opcoesInputs.map(inp => inp.value.trim()).filter(Boolean);

    if (!pergunta || opcoesLimpas.length < 2) {
      alert("⚠️ Preencha o enunciado e pelo menos 2 alternativas válidas.");
      return;
    }

    try {
      const dadosAtualizados = {
        materia: materia,
        categoria: materia,
        pergunta: pergunta,
        opcoes: opcoesLimpas,
        correta: correta,
        atualizadoEm: serverTimestamp()
      };

      await setDoc(doc(db, "questoes", idDoc), dadosAtualizados, { merge: true });
      
      let idxCache = questoesBancoCache.findIndex(item => item.idDoc === idDoc);
      if (idxCache !== -1) {
        questoesBancoCache[idxCache] = { ...questoesBancoCache[idxCache], ...dadosAtualizados };
      }

      modal.style.display = "none";
      popularFiltroMateriaCatalogo();
      renderizarCatalogoBancoDados();
      mostrarNotificacao("✅ Questão atualizada com sucesso!");
    } catch (err) {
      alert("Erro ao atualizar questão: " + err.message);
    }
  };
};

window.adicionarAlternativaModalEdicao = function() {
  const container = document.getElementById("container-opcoes-edicao");
  if (!container) return;
  const totalAtual = container.querySelectorAll(".linha-opcao-edicao").length;
  let letras = ["A", "B", "C", "D", "E", "F", "G"];
  let letra = letras[totalAtual] || ("Opt" + (totalAtual+1));

  let div = document.createElement("div");
  div.className = "linha-opcao-edicao";
  div.style.cssText = "display:flex; gap:8px; align-items:center; margin-bottom:8px;";
  div.innerHTML = `
    <span style="font-weight:bold; min-width:25px;">${letra})</span>
    <input type="text" class="input-opcao-valor" placeholder="Nova alternativa..." style="flex:1; padding:6px 10px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#fff; font-size:13px;">
    <button type="button" class="btn-acao-mini" style="background:#ef4444; color:white;" onclick="this.closest('.linha-opcao-edicao').remove()">🗑️</button>
  `;
  container.appendChild(div);
};

// ==========================================
// CORREÇÃO DOS CLIQUES NOS MENUS DE CLASSIFICAÇÃO DO BANCO
// ==========================================
let ordemAtualBanco = "nenhum";

window.aplicarOrdenacaoBanco = function(criterio) {
  ordemAtualBanco = criterio;
  
  if (criterio === "materia") {
    questoesBancoCache.sort((a, b) => (a.materia || a.categoria || "").localeCompare(b.materia || b.categoria || ""));
  } else if (criterio === "enunciado-az") {
    questoesBancoCache.sort((a, b) => (a.pergunta || "").localeCompare(b.pergunta || ""));
  } else if (criterio === "id-asc") {
    questoesBancoCache.sort((a, b) => (a.idDoc || "").localeCompare(b.idDoc || ""));
  } else if (criterio === "id-desc") {
    questoesBancoCache.sort((a, b) => (b.idDoc || "").localeCompare(a.idDoc || ""));
  }

  renderizarCatalogoBancoDados();
  
  // Fechar menus suspensos após o clique
  document.querySelectorAll('.dropdown-menu-win, .dropdown-content').forEach(m => {
    m.classList.remove('show');
    m.style.display = 'none';
  });
  
  if (typeof mostrarNotificacao === 'function') {
    mostrarNotificacao("📌 Questões ordenadas com sucesso!");
  }
};

document.addEventListener("click", (e) => {
  const item = e.target.closest("button, a, div");
  if (!item) return;
  const texto = item.textContent ? item.textContent.trim() : "";
  
  if (texto.includes("Matéria / Categoria")) {
    e.preventDefault();
    aplicarOrdenacaoBanco("materia");
  } else if (texto.includes("Enunciado (A-Z)")) {
    e.preventDefault();
    aplicarOrdenacaoBanco("enunciado-az");
  } else if (texto.includes("Ordem Crescente (ID)")) {
    e.preventDefault();
    aplicarOrdenacaoBanco("id-asc");
  } else if (texto.includes("Ordem Decrescente (ID)")) {
    e.preventDefault();
    aplicarOrdenacaoBanco("id-desc");
  }
});

// ==========================================
// CORREÇÃO DOS BOTÕES DE CLASSIFICAÇÃO E VISUALIZAÇÃO DO CATÁLOGO
// ==========================================
window.ordemAtualBancoCatalogo = "nenhum";

// ==========================================
// FUNÇÕES DE CLASSIFICAÇÃO E VISUALIZAÇÃO DO CATÁLOGO (BANCO DE DADOS)
// ==========================================

window.aplicarClassificacaoDB = function(criterio) {
  window.ordemAtualBancoCatalogo = criterio;
  renderizarCatalogoBancoDados();
  document.querySelectorAll('.dropdown-menu-win').forEach(m => m.classList.remove('show'));
  mostrarNotificacao("📌 Catálogo reordenado com sucesso!");
};

window.alterarModoVisualizacaoDB = function(modo) {
  const grid = document.getElementById("catalogo-questoes-grid");
  if (!grid) return;
  grid.classList.remove("modo-lista", "modo-blocos");
  if (modo === "lista") {
    grid.classList.add("modo-lista");
  } else if (modo === "blocos") {
    grid.classList.add("modo-blocos");
  }
  document.querySelectorAll('.dropdown-menu-win').forEach(m => m.classList.remove('show'));
  mostrarNotificacao(`🔲 Visualização alterada para ${modo}!`);
};

// Sobrescrita do renderizador para tratar exatamente os critérios enviados no seu HTML:
window.renderizarCatalogoBancoDados = function() {
  const gridCatalogo = document.getElementById("catalogo-questoes-grid");
  const inputBusca = document.getElementById("input-busca-banco-dados");
  const selectFiltroMateria = document.getElementById("select-filtro-materia-db");
  
  const elContador = document.getElementById("db-total-questoes");
  if (elContador) elContador.textContent = questoesBancoCache.length;

  if (!gridCatalogo) return;

  const termoBusca = inputBusca ? normalizarTexto(inputBusca.value) : "";
  const materiaSel = selectFiltroMateria ? selectFiltroMateria.value : "TODAS";

  let filtradas = [...questoesBancoCache];

  if (materiaSel && materiaSel !== "TODAS") {
    filtradas = filtradas.filter(q => q.materia === materiaSel || q.categoria === materiaSel);
  }

  if (termoBusca) {
    filtradas = filtradas.filter(q => {
      let texto = normalizarTexto(`${q.materia || ''} ${q.pergunta || ''} ${(q.opcoes || []).join(' ')}`);
      return texto.includes(termoBusca);
    });
  }

  // Tratamento dos critérios de ordenação do seu HTML
  const criterio = window.ordemAtualBancoCatalogo || "nenhum";
  if (criterio !== "nenhum") {
    if (criterio === "materia") {
      filtradas.sort((a, b) => (a.materia || "").localeCompare(b.materia || ""));
    } else if (criterio === "nome" || criterio === "enunciado-az") {
      filtradas.sort((a, b) => (a.pergunta || "").localeCompare(b.pergunta || ""));
    } else if (criterio === "crescente" || criterio === "id-asc") {
      filtradas.sort((a, b) => (a.idDoc || "").localeCompare(b.idDoc || ""));
    } else if (criterio === "decrescente" || criterio === "id-desc") {
      filtradas.sort((a, b) => (b.idDoc || "").localeCompare(a.idDoc || ""));
    }
  }

  if (filtradas.length === 0) {
    gridCatalogo.innerHTML = `<div style="text-align:center; color: #94a3b8; padding: 30px; grid-column: 1/-1;">Nenhuma questão encontrada.</div>`;
    return;
  }

  let html = "";
  filtradas.forEach(q => {
    let materia = q.materia || q.categoria || "Geral";
    let pergunta = q.pergunta || "Sem enunciado";
    let correta = (q.correta || "A").toUpperCase();
    let opcoes = q.opcoes || [];
    let letras = ["A", "B", "C", "D", "E"];

    let opcoesHtml = "";
    opcoes.forEach((op, idx) => {
      if (!op) return;
      let letra = letras[idx] || "A";
      let ehCorreta = (letra === correta);
      opcoesHtml += `
        <div style="display:flex; align-items:center; justify-content:space-between; padding: 4px 8px; background: rgba(15,23,42,0.4); border-radius:4px; font-size:12px; margin-bottom:3px; ${ehCorreta ? 'border:1px solid #22c55e; color:#4ade80; font-weight:bold;' : ''}">
          <span><strong>${letra})</strong> ${op}</span>
          ${ehCorreta ? '<span style="font-size:10px; background:rgba(34,197,94,0.2); padding:1px 4px; border-radius:3px;">Correta</span>' : ''}
        </div>
      `;
    });

    html += `
      <div class="catalogo-card" data-id="${q.idDoc}" style="background: rgba(15, 23, 42, 0.9); border: 1px solid #334155; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" class="chk-questao-catalogo" value="${q.idDoc}" style="cursor:pointer; width:16px; height:16px;">
            <span style="font-size:11px; background:rgba(59,130,246,0.2); color:#60a5fa; padding:2px 6px; border-radius:4px; font-weight:bold;">📚 ${materia}</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn-acao-mini" style="background:#ef4444; color:white; padding:5px 10px; border-radius:4px; border:none; cursor:pointer; font-size:11px;" onclick="excluirQuestaoBancoIndividual('${q.idDoc}')">🗑️ Excluir</button>
          </div>
        </div>
        <div style="font-size:13px; font-weight:bold; color:inherit; margin-top:4px;">${pergunta}</div>
        <div style="display:flex; flex-direction:column; gap:2px; margin-top:4px;">${opcoesHtml}</div>
      </div>
    `;
  });
  gridCatalogo.innerHTML = html;
};

window.alterarModoVisualizacaoDB = function(modo) {
  const grid = document.getElementById("catalogo-questoes-grid");
  if (!grid) return;

  grid.classList.remove("modo-lista", "modo-blocos");
  if (modo === "lista") {
    grid.classList.add("modo-lista");
    mostrarNotificacao("≡ Visualização em Lista ativada!");
  } else if (modo === "blocos") {
    grid.classList.add("modo-blocos");
    mostrarNotificacao("🗂️ Visualização em Blocos ativada!");
  } else {
    mostrarNotificacao("🔲 Visualização em Grade ativada!");
  }

  // Fecha o menu suspenso
  document.querySelectorAll('.dropdown-menu-win').forEach(m => m.classList.remove('show'));
};

// ==========================================
// CORREÇÃO DEFINITIVA DO BANCO DE DADOS E MENUS
// ==========================================
window.ordemAtualBancoCatalogo = "nenhum";

window.renderizarCatalogoBancoDados = function() {
  const gridCatalogo = document.getElementById("catalogo-questoes-grid") || document.getElementById("lista-banco-dados-container");
  const inputBusca = document.getElementById("input-busca-banco-dados") || document.querySelector('input[placeholder*="Pesquisar"]');
  const selectFiltroMateria = document.getElementById("select-filtro-materia-db") || document.querySelector('select');
  
  // Atualizar o contador total de questões na tela imediatamente
  const elContador = document.getElementById("db-total-questoes");
  if (elContador) {
    elContador.textContent = questoesBancoCache.length;
  } else {
    document.querySelectorAll('div, section').forEach(card => {
      if (card.textContent && card.textContent.includes("TOTAL DE QUESTÕES")) {
        const valEl = card.querySelector('div:last-child, h2, h3, span');
        if (valEl) {
          valEl.textContent = questoesBancoCache.length;
        }
      }
    });
  }

  if (!gridCatalogo) return;

  // Barra de ferramentas de seleção em massa
  let barraFerramentas = document.getElementById("barra-ferramentas-db-avancada");
  if (!barraFerramentas && gridCatalogo.parentNode) {
    barraFerramentas = document.createElement("div");
    barraFerramentas.id = "barra-ferramentas-db-avancada";
    barraFerramentas.style.cssText = "display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; background: rgba(30, 41, 59, 0.9); padding: 14px; border-radius: 10px; border: 1px solid #334155; width: 100%;";
    barraFerramentas.innerHTML = `
      <div style="display: flex; gap: 8px; align-items: center; flex: 1; min-width: 250px;">
        <input type="text" id="input-busca-banco-dados-dinamico" placeholder="🔍 Buscar no banco por termo ou enunciado..." style="flex: 1; padding: 8px 12px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #fff; font-size: 13px;" oninput="renderizarCatalogoBancoDados()">
      </div>
      <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
        <button type="button" class="btn-acao-mini" style="background: #0284c7; color: white; padding: 7px 12px; border-radius:6px; font-weight:bold; cursor:pointer; border:none;" onclick="selecionarTodasQuestoesBanco(true)">☑️ Marcar Todas</button>
        <button type="button" class="btn-acao-mini" style="background: #475569; color: white; padding: 7px 12px; border-radius:6px; font-weight:bold; cursor:pointer; border:none;" onclick="selecionarTodasQuestoesBanco(false)">🔲 Desmarcar</button>
        <button type="button" class="btn-acao-mini" style="background: #ef4444; color: white; padding: 7px 12px; border-radius:6px; font-weight:bold; cursor:pointer; border:none;" onclick="excluirQuestoesSelecionadasEmMassa()">🗑️ Excluir Selecionadas</button>
      </div>
    `;
    gridCatalogo.parentNode.insertBefore(barraFerramentas, gridCatalogo);
  }

  const termoBusca = inputBusca ? normalizarTexto(inputBusca.value) : "";
  const materiaSel = selectFiltroMateria ? selectFiltroMateria.value : "TODAS";

  let filtradas = [...questoesBancoCache];

  // Se for "Todas", exibe tudo sem filtrar
  if (materiaSel && materiaSel !== "TODAS" && !materiaSel.includes("Todas") && !materiaSel.includes("todas")) {
    filtradas = filtradas.filter(q => (q.materia === materiaSel || q.categoria === materiaSel));
  }

  if (termoBusca) {
    filtradas = filtradas.filter(q => {
      let texto = normalizarTexto(`${q.materia || ''} ${q.pergunta || ''} ${(q.opcoes || []).join(' ')} ${q.correta || ''}`);
      return texto.includes(termoBusca);
    });
  }

  // Ordenação ativa
  if (window.ordemAtualBancoCatalogo && window.ordemAtualBancoCatalogo !== "nenhum") {
    if (window.ordemAtualBancoCatalogo === "materia") {
      filtradas.sort((a, b) => (a.materia || a.categoria || "").localeCompare(b.materia || b.categoria || ""));
    } else if (window.ordemAtualBancoCatalogo === "enunciado-az") {
      filtradas.sort((a, b) => (a.pergunta || "").localeCompare(b.pergunta || ""));
    } else if (window.ordemAtualBancoCatalogo === "id-asc") {
      filtradas.sort((a, b) => (a.idDoc || "").localeCompare(b.idDoc || ""));
    } else if (window.ordemAtualBancoCatalogo === "id-desc") {
      filtradas.sort((a, b) => (b.idDoc || "").localeCompare(a.idDoc || ""));
    }
  }

  if (filtradas.length === 0) {
    gridCatalogo.innerHTML = `<div style="text-align:center; color: #94a3b8; padding: 30px; grid-column: 1/-1;">Nenhuma questão encontrada com os filtros atuais.</div>`;
    return;
  }

  let html = "";
  filtradas.forEach(q => {
    let materia = q.materia || q.categoria || "Geral";
    let pergunta = q.pergunta || "Sem enunciado";
    let correta = (q.correta || "A").toString().trim().toUpperCase();
    let opcoes = q.opcoes || [];
    let letras = ["A", "B", "C", "D", "E", "F", "G"];

    let opcoesHtml = "";
    opcoes.forEach((op, idx) => {
      if (!op) return;
      let letra = letras[idx] || ("Opt" + (idx+1));
      let ehCorreta = (letra === correta);
      opcoesHtml += `
        <div style="display:flex; align-items:center; justify-content:space-between; padding: 4px 8px; background: rgba(15,23,42,0.4); border-radius:4px; font-size:12px; margin-bottom:3px; ${ehCorreta ? 'border:1px solid #22c55e; color:#4ade80; font-weight:bold;' : ''}">
          <span><strong>${letra})</strong> ${op}</span>
          ${ehCorreta ? '<span style="font-size:10px; background:rgba(34,197,94,0.2); padding:1px 4px; border-radius:3px;">Correta</span>' : ''}
        </div>
      `;
    });

    html += `
      <div class="catalogo-card" data-id="${q.idDoc}" style="background: rgba(15, 23, 42, 0.9); border: 1px solid #334155; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" class="chk-questao-catalogo" value="${q.idDoc}" style="cursor:pointer; width:16px; height:16px;">
            <span style="font-size:11px; background:rgba(59,130,246,0.2); color:#60a5fa; padding:2px 6px; border-radius:4px; font-weight:bold;">📚 ${materia}</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn-acao-mini" style="background:#eab308; color:white; padding:5px 10px; border-radius:4px; border:none; cursor:pointer; font-weight:bold; font-size:11px;" onclick="abrirModalEditarQuestaoBanco('${q.idDoc}')">✏️ Editar</button>
            <button type="button" class="btn-acao-mini" style="background:#ef4444; color:white; padding:5px 10px; border-radius:4px; border:none; cursor:pointer; font-weight:bold; font-size:11px;" onclick="excluirQuestaoBancoIndividual('${q.idDoc}')">🗑️ Excluir</button>
          </div>
        </div>
        <div style="font-size:13px; font-weight:bold; color:inherit; margin-top:4px;">${pergunta}</div>
        <div style="display:flex; flex-direction:column; gap:2px; margin-top:4px;">
          ${opcoesHtml}
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: auto; padding-top: 6px; border-top: 1px solid rgba(51, 65, 85, 0.4);">
          ID Ref: ${q.idDoc}
        </div>
      </div>
    `;
  });
  gridCatalogo.innerHTML = html;
};

// Eventos de clique para menus e botões
document.addEventListener("click", async (e) => {
  const alvo = e.target.closest("button, a, div");
  if (!alvo) return;
  const texto = alvo.textContent ? alvo.textContent.trim() : "";

  // Botão Atualizar
  if (texto.includes("Atualizar") || texto.includes("Recarregar")) {
    e.preventDefault();
    if (typeof carregarBancoDadosCompleto === 'function') {
      mostrarNotificacao("🔄 Atualizando banco de dados...");
      await carregarBancoDadosCompleto();
      mostrarNotificacao("✅ Banco de dados atualizado com sucesso!");
    }
  }

  // Opções de Classificação
  if (texto.includes("Matéria / Categoria")) {
    e.preventDefault();
    window.ordemAtualBancoCatalogo = "materia";
    renderizarCatalogoBancoDados();
    mostrarNotificacao("📌 Ordenado por Matéria / Categoria");
  } else if (texto.includes("Enunciado (A-Z)")) {
    e.preventDefault();
    window.ordemAtualBancoCatalogo = "enunciado-az";
    renderizarCatalogoBancoDados();
    mostrarNotificacao("📌 Ordenado por Enunciado (A-Z)");
  } else if (texto.includes("Ordem Crescente (ID)")) {
    e.preventDefault();
    window.ordemAtualBancoCatalogo = "id-asc";
    renderizarCatalogoBancoDados();
    mostrarNotificacao("📌 Ordenado por ID (Crescente)");
  } else if (texto.includes("Ordem Decrescente (ID)")) {
    e.preventDefault();
    window.ordemAtualBancoCatalogo = "id-desc";
    renderizarCatalogoBancoDados();
    mostrarNotificacao("📌 Ordenado por ID (Decrescente)");
  } else if (texto.includes("Ver Tudo") || texto.includes("Sem Classificação")) {
    e.preventDefault();
    window.ordemAtualBancoCatalogo = "nenhum";
    renderizarCatalogoBancoDados();
    mostrarNotificacao("🔄 Exibindo acervo completo!");
  }
});

// Injetar automaticamente o botão "Ver Tudo / Sem Classificação" nos menus suspensos
setInterval(() => {
  document.querySelectorAll('.dropdown-menu-win, .dropdown-content, div').forEach(menu => {
    if (menu.textContent && menu.textContent.includes("Enunciado (A-Z)") && !menu.textContent.includes("Ver Tudo")) {
      const btnVerTudo = document.createElement("button");
      btnVerTudo.type = "button";
      btnVerTudo.style.cssText = "width:100%; text-align:left; background:transparent; border:none; color:inherit; padding:8px 12px; cursor:pointer; border-radius:4px; font-weight:bold;";
      btnVerTudo.innerHTML = "🔄 Ver Tudo / Sem Classificação";
      btnVerTudo.onclick = () => {
        window.ordemAtualBancoCatalogo = "nenhum";
        renderizarCatalogoBancoDados();
        menu.classList.remove('show');
        menu.style.display = 'none';
        mostrarNotificacao("🔄 Exibindo acervo completo!");
      };
      menu.prepend(btnVerTudo);
    }
  });
}, 1500);

// ==========================================
// FUNÇÕES GLOBAIS DE EXCLUSÃO DE QUESTÕES
// ==========================================

window.excluirQuestaoBancoIndividual = async function(idDoc) {
  if (!idDoc) {
    alert("⚠️ ID da questão inválido.");
    return;
  }
  
  if (confirm("🗑️ Deseja realmente excluir permanentemente esta questão do banco de dados?")) {
    try {
      await deleteDoc(doc(db, "questoes", idDoc));
      
      // Remove do cache local e atualiza a interface imediatamente
      if (typeof questoesBancoCache !== 'undefined') {
        questoesBancoCache = questoesBancoCache.filter(q => q.idDoc !== idDoc);
      }
      
      if (typeof renderizarCatalogoBancoDados === 'function') {
        renderizarCatalogoBancoDados();
      }
      
      if (typeof popularFiltroMateriaCatalogo === 'function') {
        popularFiltroMateriaCatalogo();
      }
      
      mostrarNotificacao("🗑️ Questão excluída com sucesso!");
    } catch (err) {
      alert("Erro ao excluir questão: " + err.message);
    }
  }
};

window.excluirQuestoesSelecionadasEmMassa = async function() {
  const selecionadas = Array.from(document.querySelectorAll(".chk-questao-catalogo:checked")).map(c => c.value);
  
  if (selecionadas.length === 0) {
    alert("⚠️ Selecione pelo menos uma questão no catálogo para excluir.");
    return;
  }
  
  if (confirm(`🔥 Deseja realmente excluir permanentemente as ${selecionadas.length} questões selecionadas?`)) {
    try {
      for (const idDoc of selecionadas) {
        await deleteDoc(doc(db, "questoes", idDoc));
        if (typeof questoesBancoCache !== 'undefined') {
          questoesBancoCache = questoesBancoCache.filter(q => q.idDoc !== idDoc);
        }
      }
      
      if (typeof popularFiltroMateriaCatalogo === 'function') {
        popularFiltroMateriaCatalogo();
      }
      
      if (typeof renderizarCatalogoBancoDados === 'function') {
        renderizarCatalogoBancoDados();
      }
      
      mostrarNotificacao(`🗑️ ${selecionadas.length} questão(ões) excluída(s) com sucesso!`);
    } catch (err) {
      alert("Erro ao excluir em massa: " + err.message);
    }
  }
};

// ==========================================
// SISTEMA DE EXCLUSÃO COM LIXEIRA PARA QUESTÕES
// ==========================================

// ==========================================
// SISTEMA DA LIXEIRA DE QUESTÕES CORRIGIDO
// ==========================================

window.excluirQuestaoBancoIndividual = async function(idDoc) {
  if (!idDoc) return;
  if (confirm("🗑️ Deseja mover esta questão para a lixeira?")) {
    try {
      const questaoObj = questoesBancoCache.find(q => q.idDoc === idDoc);
      if (questaoObj) {
        // Grava explicitamente na coleção "lixeira_questoes" no Firebase
        await setDoc(doc(db, "lixeira_questoes", idDoc), {
          materia: questaoObj.materia || questaoObj.categoria || "Geral",
          pergunta: questaoObj.pergunta || "Sem enunciado",
          opcoes: questaoObj.opcoes || [],
          correta: questaoObj.correta || "A",
          categoria: questaoObj.categoria || "Geral",
          idDocOriginal: idDoc,
          excluidoEm: new Date().toISOString()
        });
        
        // Remove da coleção ativa de questões
        await deleteDoc(doc(db, "questoes", idDoc));
        
        // Atualiza o cache e a tela
        questoesBancoCache = questoesBancoCache.filter(q => q.idDoc !== idDoc);
        renderizarCatalogoBancoDados();
        mostrarNotificacao("🗑️ Questão movida para a Lixeira!");
      } else {
        alert("⚠️ Questão não encontrada no cache local.");
      }
    } catch (err) {
      console.error("Erro ao excluir questão:", err);
      alert("Erro ao excluir: " + err.message);
    }
  }
};

window.excluirQuestoesSelecionadasEmMassa = async function() {
  const selecionadas = Array.from(document.querySelectorAll(".chk-questao-catalogo:checked")).map(c => c.value);
  if (selecionadas.length === 0) {
    alert("⚠️ Selecione pelo menos uma questão.");
    return;
  }
  if (confirm(`🔥 Mover as ${selecionadas.length} questões selecionadas para a lixeira?`)) {
    try {
      for (const idDoc of selecionadas) {
        const questaoObj = questoesBancoCache.find(q => q.idDoc === idDoc);
        if (questaoObj) {
          await setDoc(doc(db, "lixeira_questoes", idDoc), {
            materia: questaoObj.materia || questaoObj.categoria || "Geral",
            pergunta: questaoObj.pergunta || "Sem enunciado",
            opcoes: questaoObj.opcoes || [],
            correta: questaoObj.correta || "A",
            categoria: questaoObj.categoria || "Geral",
            idDocOriginal: idDoc,
            excluidoEm: new Date().toISOString()
          });
          await deleteDoc(doc(db, "questoes", idDoc));
          questoesBancoCache = questoesBancoCache.filter(q => q.idDoc !== idDoc);
        }
      }
      renderizarCatalogoBancoDados();
      mostrarNotificacao(`🗑️️ ${selecionadas.length} questão(ões) movida(s) para a lixeira!`);
    } catch (err) {
      console.error("Erro na exclusão em massa:", err);
      alert("Erro: " + err.message);
    }
  }
};

window.abrirModalLixeiraQuestao = async function() {
  const modal = document.getElementById("modal-lixeira-questoes");
  if (modal) {
    modal.classList.add("show");
    await carregarConteudoLixeiraQuestoes();
  }
};

window.fecharModalLixeiraQuestao = function() {
  const modal = document.getElementById("modal-lixeira-questoes");
  if (modal) modal.classList.remove("show");
};

async function carregarConteudoLixeiraQuestoes() {
  const corpo = document.getElementById("corpo-tabela-lixeira-questoes");
  if (!corpo) return;
  try {
    corpo.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding: 20px;">Carregando lixeira...</td></tr>`;
    const snap = await getDocs(collection(db, "lixeira_questoes"));
    
    if (snap.empty) {
      corpo.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding: 20px;">A lixeira de questões está vazia.</td></tr>`;
      return;
    }
    
    let html = "";
    snap.forEach(docSnap => {
      let q = docSnap.data();
      let materia = q.materia || 'Geral';
      let pergunta = q.pergunta || 'Sem enunciado';
      html += `
        <tr>
          <td style="text-align: center;"><input type="checkbox" class="chk-lixeira-item" value="${docSnap.id}"></td>
          <td>📚 ${materia}</td>
          <td><strong>${pergunta}</strong></td>
          <td style="text-align: center;">
            <button type="button" class="btn-acao-mini" style="background:#22c55e; color:white; padding:5px 10px; border-radius:4px; border:none; cursor:pointer;" onclick="restaurarQuestaoLixeiraIndividual('${docSnap.id}')">♻️ Restaurar</button>
          </td>
        </tr>
      `;
    });
    corpo.innerHTML = html;
  } catch (err) {
    console.error("Erro ao carregar lixeira:", err);
    corpo.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ef4444; padding: 20px;">Erro ao carregar lixeira: ${err.message}</td></tr>`;
  }
}

window.restaurarQuestaoLixeiraIndividual = async function(idDoc) {
  try {
    const docRef = doc(db, "lixeira_questoes", idDoc);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      let dados = docSnap.data();
      delete dados.excluidoEm;
      delete dados.idDocOriginal;
      
      // Retorna para a coleção oficial de questões
      await setDoc(doc(db, "questoes", idDoc), dados);
      // Remove da lixeira
      await deleteDoc(docRef);
      
      await carregarBancoDadosCompleto();
      await carregarConteudoLixeiraQuestoes();
      mostrarNotificacao("♻️ Questão restaurada ao catálogo com sucesso!");
    }
  } catch (err) {
    console.error("Erro ao restaurar questão:", err);
    alert("Erro ao restaurar: " + err.message);
  }
};

window.restaurarQuestoesSelecionadasLixeira = async function() {
  const sel = Array.from(document.querySelectorAll(".chk-lixeira-item:checked")).map(c => c.value);
  if (sel.length === 0) { alert("⚠️ Selecione pelo menos uma questão."); return; }
  for (const id of sel) {
    await restaurarQuestaoLixeiraIndividual(id);
  }
};

window.excluirPermanentementeQuestoesLixeira = async function() {
  const sel = Array.from(document.querySelectorAll(".chk-lixeira-item:checked")).map(c => c.value);
  if (sel.length === 0) { alert("⚠️ Selecione pelo menos uma questão."); return; }
  if (confirm(`🔥 Excluir permanentemente as ${sel.length} questões selecionadas?`)) {
    for (const id of sel) {
      await deleteDoc(doc(db, "lixeira_questoes", id));
    }
    await carregarConteudoLixeiraQuestoes();
    mostrarNotificacao("🔥 Questões excluídas permanentemente!");
  }
};

window.alternarTodosModalLixeiraQuestao = function(marcar) {
  document.querySelectorAll(".chk-lixeira-item").forEach(chk => chk.checked = marcar);
};

  inicializarPainel();
}