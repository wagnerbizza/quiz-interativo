import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, deleteDoc, setDoc, doc, getDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let resultadosGlobaisCache = [];
let alunosOnlineCache = [];
let ordemAtualMonitoramento = "nenhum";
let ordemAtualResultados = "nenhum";
let escolaAtivaSelecionadaIndependente = ""; 

document.addEventListener("DOMContentLoaded", () => {
  document.body.style.opacity = "1";
  garantirBancoMinimoQuestoes();
  forcarMenuClassificarCompleto();
  injetarEstilosGlobaisAjustados();
  injetarBarraNavegacaoGlobalTopo();
  removerAbaConfiguracoesGeraisDoDom();
});

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
      input[type="datetime-local"]::-webkit-calendar-picker-indicator:hover {
        opacity: 1;
      }
      .checkbox-item-global, .checkbox-item {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px !important;
        padding: 8px 12px !important;
        background: rgba(15, 23, 42, 0.6) !important;
        border: 1px solid #334155 !important;
        border-radius: 8px !important;
        margin-bottom: 6px !important;
      }
      .checkbox-item-global span, .checkbox-item span {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        text-align: left !important;
        flex: 1 !important;
        word-break: break-word !important;
        color: #f8fafc !important;
        font-size: 13px !important;
      }
      .checkbox-item-global input[type="checkbox"], .checkbox-item input[type="checkbox"] {
        margin: 0 !important;
        cursor: pointer !important;
        min-width: 16px !important;
        min-height: 16px !important;
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
      .dropdown-menu-win.show {
        display: block !important;
      }
      .acoes-topo-bloco {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
        align-items: center !important;
        justify-content: flex-end !important;
      }
      .item-revisao {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
        color: #f8fafc;
      }
      .item-revisao.correta { border-left: 5px solid #22c55e; }
      .item-revisao.incorreta { border-left: 5px solid #ef4444; }
      .btn-escola-clicavel {
        background: #1e293b;
        color: #f8fafc;
        border: 2px solid #334155;
        padding: 10px 16px;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .btn-escola-clicavel:hover {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.1);
      }
      .btn-escola-clicavel.ativo {
        border-color: #22c55e;
        background: rgba(34, 197, 94, 0.2);
        color: #4ade80;
      }
      .card-escola-dinamico {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid #334155;
        padding: 16px;
        border-radius: 10px;
        margin-bottom: 12px;
        gap: 12px;
        flex-wrap: wrap;
        transition: all 0.25s ease;
        cursor: pointer;
      }
      .card-escola-dinamico:hover {
        border-color: #3b82f6;
        background: rgba(30, 41, 59, 0.9);
        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.25);
        transform: translateY(-2px);
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
      .barra-nav-global .nav-botoes-grupo {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
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
        transition: background 0.2s;
      }
      .btn-nav-icone:hover {
        background: #334155;
        border-color: #3b82f6;
        color: #60a5fa;
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
    <div class="nav-botoes-grupo" id="grupo-botoes-topo-dinamico">
      <a href="painel.html" class="btn-nav-icone" title="Ir para o Painel Principal">🏠 Home / Painel</a>
      <button type="button" class="btn-nav-icone" onclick="if(window.history.length > 1) { window.history.back(); } else { window.location.href='painel.html'; }" title="Voltar página anterior">⬅️ Voltar</button>
      <button type="button" class="btn-nav-icone" onclick="window.history.forward()" title="Avançar página">➡️ Avançar</button>
    </div>
    <div style="font-size: 12px; color: #94a3b8; font-weight: bold; display:flex; align-items:center; gap:8px;">
      <span>⚡ Sistema de Avaliações</span>
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
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:white; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('nenhum')">⚙️ Nenhum (Padrão)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:white; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('data-desc')">📅 Data/Hora (Mais Recente)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:white; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('data-asc')">📅 Data/Hora (Mais Antiga)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:white; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('nome-asc')">🔤 Nome Aluno (A-Z)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:white; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('nome-desc')">🔤 Nome Aluno (Z-A)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:white; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('turma-asc')">🏫 Turma (Crescente)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:white; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('escola-asc')">🏛️ Escola (A-Z)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:white; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('nota-desc')">⭐ Maior Nota</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:white; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoResultados('nota-asc')">⭐ Menor Nota</button>
    `;
  }

  const menuMonitoramento = document.getElementById("dropdown-menu-monitoramento");
  if (menuMonitoramento) {
    menuMonitoramento.style.minWidth = "240px";
    menuMonitoramento.innerHTML = `
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:white; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoMonitoramento('nenhum')">⚙️ Nenhum (Padrão)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:white; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoMonitoramento('inicio-desc')">📅 Início (Mais Recente)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:white; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoMonitoramento('nome-asc')">🔤 Nome Aluno (A-Z)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:white; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoMonitoramento('escola-asc')">🏛️ Escola (A-Z)</button>
      <button type="button" style="width:100%; text-align:left; background:transparent; border:none; color:white; padding:8px 12px; cursor:pointer; border-radius:4px;" onclick="aplicarOrdenacaoMonitoramento('tempo-desc')">⏱️ Maior Tempo Gasto</button>
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
  return pergunta.replace(/^\[.*?\]\s*/, "").trim();
}

function limparPrefixoOpcao(opcaoStr) {
  if (!opcaoStr) return "";
  return opcaoStr.toString().replace(/^[a-zA-Z][\)\.\-\s]+\s*/, "").trim();
}

function normalizarDocumentoQuestao(d, idDoc = null) {
  let perguntaBruta = d.pergunta || d.questao || d.titulo || "Pergunta Sem Título";
  let perguntaLimpa = limparPrefixoPergunta(perguntaBruta);
  
  let opcoesBrutas = d.opcoes || d.alternativas || d.respostas || ["Opção A", "Opção B", "Opção C", "Opção D"];
  let opcoesLimpas = opcoesBrutas.map(op => limparPrefixoOpcao(op));

  let correta = (d.correta || d.resposta || d.correto || "A").toString().trim().toUpperCase();

  return {
    idDoc: idDoc,
    pergunta: perguntaLimpa,
    opcoes: opcoesLimpas,
    correta: ["A", "B", "C", "D"].includes(correta) ? correta : "A",
    categoria: d.categoria || d.materia || d.disciplina || "Geral"
  };
}

let estruturaGlobalBoxes = [
  { id: "materias", titulo: "📚 Disciplinas e Matérias", itens: [
    "Inteligência Artificial", 
    "Programação Front-End", 
    "Redes de Computadores e Segurança da Informação na Nuvem", 
    "Processos de Desenvolvimentos de Software e metodologias Ágeis",
    "Matemática", "Língua Portuguesa", "Ciências", "História", "Geografia", "Física", "Química", "Biologia", "Inglês"
  ]},
  { id: "periodos", titulo: "🏫 Períodos e Turnos", itens: ["Manhã", "Tarde", "Noite", "Integral", "Geral"] },
  { id: "bimestres", titulo: "📅 Bimestres e Semestres", itens: ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"] }
];

let turmaDadosGlobal = {
  numeros: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
  letras: ["A", "B", "C", "D", "E", "F", "G", "H", "I"]
};

let listaEscolasCache = [];
let dadosConfirmadosEscola = { turmas: [], materias: [], periodos: [], bimestres: [] };

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
      if (dados.turmas) turmaDadosGlobal = dados.turmas;
    }
  } catch (e) { console.error(e); }
}

async function garantirBancoMinimoQuestoes() {
  try {
    await carregarEstruturaGlobalFirebase();
    const bancoQuestoesTecnicasExtendido = {
      "Inteligencia Artificial": [
        { p: "O que caracteriza o aprendizado supervisionado em Inteligência Artificial?", ops: ["Dados sem rótulos descobertos automaticamente", "Uso de dados de entrada juntamente com as respostas corretas desejadas", "Tentativa e erro autônoma sem histórico", "Regras fixas de lógica booleana"], c: "B" },
        { p: "Qual é a principal função de uma rede neural artificial?", ops: ["Gerenciar partições físicas de disco rígido", "Compilar códigos de baixo nível", "Processar dados através de camadas de nós para reconhecimento de padrões", "Imprimir relatórios em formato PDF"], c: "C" }
      ],
      "Programação Front-End": [
        { p: "Qual a principal responsabilidade do CSS em páginas web?", ops: ["Estruturar os textos semânticos", "Controlar a aparência visual, layout, cores e responsividade", "Processar regras de negócio no servidor", "Armazenar dados em banco NoSQL"], c: "B" }
      ],
      "Redes de Computadores e Segurança da Informação na Nuvem": [
        { p: "O que caracteriza o modelo IaaS na computação em nuvem?", ops: ["Locação de infraestrutura básica como servidores virtuais, armazenamento e redes", "Entrega de softwares prontos via navegador", "Ambiente exclusivo para programar sem gerenciar servidores", "Armazenamento local em HDs físicos"], c: "A" }
      ],
      "Processos de Desenvolvimentos de Software e metodologias Ágeis": [
        { p: "O que é uma Sprint no framework Scrum?", ops: ["Um documento com requisitos estáticos", "Um período de tempo curto (time-box) para desenvolver um incremento de produto utilizável", "Reunião final de homologação do cliente", "Cargo de gestão tradicional de projetos"], c: "B" }
      ]
    };

    const snap = await getDocs(collection(db, "questoes"));
    let bancoAtual = [];
    snap.forEach(s => bancoAtual.push(normalizarDocumentoQuestao(s.data(), s.id)));

    for (const [mat, listaBase] of Object.entries(bancoQuestoesTecnicasExtendido)) {
      let qMat = bancoAtual.filter(q => normalizarTexto(q.categoria).includes(normalizarTexto(mat)) || normalizarTexto(mat).includes(normalizarTexto(q.categoria)));
      if (qMat.length < 15) {
        let faltam = 15 - qMat.length;
        for (let i = 0; i < faltam; i++) {
          let baseModelo = listaBase[i % listaBase.length];
          await addDoc(collection(db, "questoes"), {
            materia: mat,
            categoria: mat,
            pergunta: `[Técnico ${i + 1} - ${Date.now()}] ${baseModelo.p}`,
            opcoes: [`${baseModelo.ops[0]}`, `${baseModelo.ops[1]}`, `${baseModelo.ops[2]}`, `${baseModelo.ops[3]}`],
            correta: baseModelo.c,
            criadoEm: serverTimestamp()
          });
        }
      }
    }
  } catch (e) { console.error(e); }
}

// ==========================================
// PAINEL DO PROFESSOR (painel.html)
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

  function organizarLayoutAbaRelatorios() {
    const abaRelatorios = document.getElementById("aba-relatorios");
    if (!abaRelatorios) return;

    let barraControles = abaRelatorios.querySelector(".barra-controles-relatorios") || abaRelatorios.querySelector(".acoes-topo-bloco") || abaRelatorios.querySelector("div");
    if (barraControles) {
      barraControles.style.display = "flex";
      barraControles.style.flexWrap = "wrap";
      barraControles.style.gap = "10px";
      barraControles.style.alignItems = "center";
      barraControles.style.justifyContent = "space-between";
      barraControles.style.marginBottom = "15px";
    }
  }

  window.irParaMonitoramentoTab = function() {
    const btnMonitoramento = document.querySelector('.btn-aba[data-aba="aba-monitoramento"]');
    if (btnMonitoramento) {
      btnMonitoramento.click();
    } else {
      window.location.href = "painel.html#monitoramento";
    }
  };

  function renderizarSeletorEscolasAtivacaoIndependente() {
    const elementoAntigo = document.getElementById("select-escola-ativacao");
    if (!elementoAntigo) return;
    
    let html = `
      <label style="display:block; font-weight:bold; margin-bottom:8px; color:#93c5fd;">🏫 Clique na escola desejada para configurar e ativar independentemente:</label>
      <div id="grid-botoes-escolas-ativacao" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 15px;">
    `;

    if (listaEscolasCache.length === 0) {
      html += `<p style="color: #94a3b8; font-size: 13px;">Nenhuma escola cadastrada. Cadastre na aba "Cadastro de Escolas".</p>`;
    } else {
      listaEscolasCache.forEach(esc => {
        let classeAtiva = escolaAtivaSelecionadaIndependente === esc.nome ? "ativo" : "";
        html += `<button type="button" class="btn-escola-clicavel ${classeAtiva}" data-nome-escola="${esc.nome}">🏫 ${esc.nome}</button>`;
      });
    }

    html += `
      </div>
      <div id="acoes-escola-selecionada-painel" style="display: ${escolaAtivaSelecionadaIndependente ? 'flex' : 'none'}; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; background: rgba(15, 23, 42, 0.4); padding: 10px; border-radius: 8px; border: 1px solid #334155;">
        <span style="color: #4ade80; font-weight: bold; font-size: 13px;" id="span-escola-selecionada-nome">Unidade Selecionada: ${escolaAtivaSelecionadaIndependente}</span>
        <a id="link-configurar-unidade-direto" href="escola.html?escola=${encodeURIComponent(escolaAtivaSelecionadaIndependente)}&retorno=ativacao" class="btn-acao" style="background: #0d9488; padding: 6px 12px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 12px; display: inline-flex;">⚙️ Abrir Configurações da Unidade</a>
      </div>
    `;

    const wrapper = document.createElement("div");
    wrapper.id = "wrapper-escola-ativacao-independente";
    wrapper.innerHTML = html;
    elementoAntigo.parentNode.replaceChild(wrapper, elementoAntigo);

    document.querySelectorAll(".btn-escola-clicavel").forEach(btn => {
      btn.onclick = () => {
        const nomeEscola = btn.getAttribute("data-nome-escola");
        escolaAtivaSelecionadaIndependente = nomeEscola;
        
        document.querySelectorAll(".btn-escola-clicavel").forEach(b => b.classList.remove("ativo"));
        btn.classList.add("ativo");

        const acoesDiv = document.getElementById("acoes-escola-selecionada-painel");
        const spanNome = document.getElementById("span-escola-selecionada-nome");
        const linkConfig = document.getElementById("link-configurar-unidade-direto");

        if (acoesDiv) acoesDiv.style.display = "flex";
        if (spanNome) spanNome.textContent = `Unidade Selecionada: ${nomeEscola}`;
        if (linkConfig) linkConfig.href = `escola.html?escola=${encodeURIComponent(nomeEscola)}&retorno=ativacao`;

        carregarConfiguracoesEscolaParaAtivacao(nomeEscola);
      };
    });
  }

  async function carregarConfiguracoesEscolaParaAtivacao(escolaNome) {
    const containerCalculadoraAtivacao = document.getElementById("container-calculadora-ativacao");
    const gridMateriasAtivacao = document.getElementById("grid-materias-ativacao");
    const selectPeriodoAtivacao = document.getElementById("select-periodo-ativacao");
    const gridTurmasAtivacao = document.getElementById("grid-turmas-ativacao");

    try {
      const docSnap = await getDoc(doc(db, "escolas_configuracoes", normalizarTexto(escolaNome)));
      if (containerCalculadoraAtivacao) containerCalculadoraAtivacao.classList.remove("hidden");

      let tab = {};
      if (docSnap.exists()) {
        tab = docSnap.data().tabelasConfirmadas || {};
      }

      if (gridMateriasAtivacao) {
        let listaMat = tab.materias && tab.materias.length > 0 ? tab.materias : ["Inteligência Artificial", "Programação Front-End"];
        let htmlMat = ``;
        listaMat.forEach(m => {
          htmlMat += `<label class="checkbox-item"><input type="checkbox" class="chk-materia-ativacao" value="${m}" checked> ${m}</label>`;
        });
        gridMateriasAtivacao.innerHTML = htmlMat;
      }

      if (selectPeriodoAtivacao) {
        let listaPer = tab.periodos && tab.periodos.length > 0 ? tab.periodos : ["Manhã", "Tarde", "Noite", "Geral"];
        selectPeriodoAtivacao.innerHTML = "";
        listaPer.forEach(p => { selectPeriodoAtivacao.innerHTML += `<option value="${p}">${p}</option>`; });
      }

      if (gridTurmasAtivacao) {
        let listaTurmas = tab.turmas && tab.turmas.length > 0 ? tab.turmas : ["1A", "2A", "3A"];
        let htmlTurmas = ``;
        listaTurmas.forEach(t => {
          htmlTurmas += `<label class="checkbox-item"><input type="checkbox" class="chk-turma-ativacao" value="${t}" checked> ${t}</label>`;
        });
        gridTurmasAtivacao.innerHTML = htmlTurmas;
      }
      mostrarNotificacao(`📂 Configurações carregadas para: ${escolaNome}`);
    } catch(err) { console.error(err); }
  }

  function carregarResumoProvaAtivaNoPainel() {
    const painelResumo = document.getElementById("painel-resumo-escola-ativacao");

    onSnapshot(doc(db, "configuracoes", "prova_ativa"), (docSnap) => {
      let blocoTopoAtiva = document.querySelector(".bloco-prova-ativa-atual") || document.getElementById("bloco-prova-ativa-topo");
      if (!blocoTopoAtiva) {
        const centralAtivacao = document.querySelector(".central-ativacao-topo") || document.querySelector("#aba-ativacao") || document.querySelector(".container") || document.body;
        blocoTopoAtiva = document.createElement("div");
        blocoTopoAtiva.id = "bloco-prova-ativa-topo";
        blocoTopoAtiva.style.marginBottom = "20px";
        if (centralAtivacao.firstChild) {
          centralAtivacao.insertBefore(blocoTopoAtiva, centralAtivacao.firstChild);
        } else {
          centralAtivacao.appendChild(blocoTopoAtiva);
        }
      }

      if (docSnap.exists()) {
        const dados = docSnap.data();
        const escolaAtiva = dados.escolaAtiva || "N/D";
        
        if (!escolaAtiva || escolaAtiva === "" || escolaAtiva === "N/D") {
          if (painelResumo) painelResumo.classList.add("hidden");
          blocoTopoAtiva.innerHTML = `
            <div style="margin-bottom: 6px; font-weight: bold; color: #94a3b8; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">🚀 Central de Ativação de Provas</div>
            <div style="background: rgba(239, 68, 68, 0.15); border: 2px solid #ef4444; padding: 14px 18px; border-radius: 10px; color: #f8fafc; font-weight: bold; font-size: 14px;">
              ⚠️ Nenhuma prova ativa no momento. Clique em uma escola acima para configurar e publicar uma avaliação.
            </div>
          `;
          return;
        }

        const materiasStr = (dados.materiasAtivas || []).join(', ');
        const turmasStr = (dados.turmasAtivas || []).join(', ');
        const periodoStr = dados.periodoAtivo || 'Geral';
        const tempoMin = dados.tempoMinimoMinutos ? `${dados.tempoMinimoMinutos} minuto(s)` : 'Nenhum';
        const tempoLim = dados.tempoLimiteMinutos ? `${dados.tempoLimiteMinutos} minuto(s)` : 'Sem limite';

        if (painelResumo) painelResumo.classList.add("hidden");

        blocoTopoAtiva.innerHTML = `
          <div style="margin-bottom: 6px; font-weight: bold; color: #94a3b8; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">🚀 Central de Ativação de Provas</div>
          <div style="background: rgba(37, 99, 235, 0.15); border: 2px solid #3b82f6; padding: 18px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.4); display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
              <div>
                <span style="color: #4ade80; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">🟢 ESCOLA COM PROVA ATIVA:</span>
                <div style="color: #ffffff; font-weight: bold; font-size: 18px; margin-top: 2px;">${escolaAtiva}</div>
              </div>
              <div style="color: #cbd5e1; font-size: 13px; background: rgba(15, 23, 42, 0.4); padding: 6px 10px; border-radius: 6px; border: 1px solid #334155;">
                📅 <strong>Período:</strong> ${periodoStr} | ⏱️ <strong>Mín:</strong> ${tempoMin} | ⏳ <strong>Limite:</strong> ${tempoLim}
              </div>
            </div>
            <div style="font-size: 13px; color: #e2e8f0; display: flex; flex-direction: column; gap: 4px;">
              <div>📚 <strong>Matérias:</strong> ${materiasStr || 'Nenhuma'}</div>
              <div>🏫 <strong>Turmas:</strong> ${turmasStr || 'Nenhuma'}</div>
            </div>
            <hr style="border: none; border-top: 1px solid #334155; margin: 4px 0;">
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
              <a href="index.html" target="_blank" style="background: #22c55e; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 13px; display: inline-flex; align-items: center; gap: 5px;">👁️ Testar Prova do Aluno</a>
              <button type="button" onclick="gerarCopiaProvaAtivaPDF()" style="background: #0284c7; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px;">📄 Gerar Cópia Geral</button>
              <button type="button" onclick="irParaMonitoramentoTab()" style="background: #f59e0b; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px;">📊 Monitoramento</button>
              <button type="button" id="btn-embaralhar-manual-ativas" style="background: #8b5cf6; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px;">🔀 Reembaralhar</button>
              <button type="button" onclick="carregarDadosParaEdicao()" style="background: #eab308; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px;">✏️ Editar</button>
              <button type="button" onclick="encerrarProvaAtivaAgora()" style="background: #ef4444; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px;">🛑 Encerrar</button>
            </div>
          </div>
        `;
      } else {
        if (painelResumo) painelResumo.classList.add("hidden");
        blocoTopoAtiva.innerHTML = `
          <div style="margin-bottom: 6px; font-weight: bold; color: #94a3b8; font-size: 14px; text-transform: uppercase;">🚀 Central de Ativação de Provas</div>
          <div style="background: rgba(239, 68, 68, 0.15); border: 2px solid #ef4444; padding: 14px 18px; border-radius: 10px; color: #f8fafc; font-weight: bold; font-size: 14px;">
            ⚠️ Nenhuma prova ativa no momento. Publique uma avaliação abaixo.
          </div>
        `;
      }
    });
  }

  window.gerarCopiaProvaAtivaPDF = async function() {
    try {
      const snap = await getDoc(doc(db, "configuracoes", "prova_ativa"));
      if (!snap.exists()) { alert("⚠️ Nenhuma prova ativa."); return; }
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

      let janelaImpressao = window.open('', '_blank');
      let html = `
      <html>
      <head>
        <title>Avaliação Oficial - ${escola}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #000; line-height: 1.6; }
          .cabecalho { border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 25px; }
          .questao { margin-bottom: 25px; page-break-inside: avoid; }
          .opcoes { margin-left: 20px; margin-top: 8px; }
          .gabarito { margin-top: 40px; border-top: 2px dashed #000; padding-top: 20px; page-break-before: always; }
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

      let limitQ = pData.quantidadeQuestoes || 10;
      let selecionadas = questoesValidas.slice(0, limitQ);

      selecionadas.forEach((q, idx) => {
        html += `
          <div class="questao">
            <p><strong>Questão ${idx + 1}:</strong> ${q.pergunta}</p>
            <div class="opcoes">
              A) ${q.opcoes[0] || ''}<br>
              B) ${q.opcoes[1] || ''}<br>
              C) ${q.opcoes[2] || ''}<br>
              D) ${q.opcoes[3] || ''}
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
            .questao { margin-bottom: 25px; page-break-inside: avoid; }
            .opcoes { margin-left: 20px; margin-top: 8px; }
            .gabarito { margin-top: 40px; border-top: 2px dashed #000; padding-top: 20px; page-break-before: always; }
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
        html += `
          <div class="questao">
            <p><strong>Questão ${idx + 1}:</strong> ${q.pergunta}</p>
            <div class="opcoes">
              A) ${q.opcoes[0] || ''}<br>
              B) ${q.opcoes[1] || ''}<br>
              C) ${q.opcoes[2] || ''}<br>
              D) ${q.opcoes[3] || ''}
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
            htmlCadastradas += `
              <div class="card-escola-dinamico" onclick="window.location.href='escola.html?escola=${encodeURIComponent(esc.nome)}&retorno=escolas';">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <strong style="font-size: 16px; color: #ffffff; display: flex; align-items: center; gap: 6px;">🏫 ${esc.nome} <span style="font-size: 11px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 2px 6px; border-radius: 4px;">⚙️ Clique para Configurar Unidade</span></strong>
                  <span style="font-size: 12px; color: #94a3b8;">Gestor(a): ${esc.gestor || 'N/D'} | Cidade: ${esc.cidade || 'N/D'}</span>
                </div>
                <div style="display: flex; gap: 6px; align-items: center;" onclick="event.stopPropagation();">
                  <button class="btn-editar-escola" data-id="${esc.idDoc}" data-nome="${esc.nome}" data-gestor="${esc.gestor || ''}" data-cidade="${esc.cidade || ''}" style="background:#eab308; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:11px; font-weight:bold;" title="Editar Dados Cadastrais">✏️ Editar</button>
                  <button class="btn-excluir-escola" data-id="${esc.idDoc}" data-nome="${esc.nome}" style="background:#ef4444; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:11px; font-weight:bold;" title="Excluir Escola">🗑️ Excluir</button>
                </div>
              </div>
            `;
          });
        }
        listaEscolasContainer.innerHTML = htmlCadastradas;

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
    const idEditando = inputEscolaIdEditando?.value;
    const nome = inputNomeEscola?.value.trim();
    const gestor = inputGestorEscola?.value.trim();
    const cidade = inputCidadeEscola?.value.trim();
    if (!nome) { mostrarNotificacao("⚠️ Digite o nome da escola!"); return; }
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

  window.carregarDadosParaEdicao = async function() {
    try {
      const docSnap = await getDoc(doc(db, "configuracoes", "prova_ativa"));
      if (!docSnap.exists()) {
        alert("⚠️ Nenhuma prova ativa no momento para editar.");
        return;
      }
      const dados = docSnap.data();

      const abaBtn = document.querySelector('.btn-aba[data-aba="aba-ativacao"]');
      if (abaBtn) abaBtn.click();

      setTimeout(() => {
        if (document.getElementById("qtd-questoes-ativacao")) {
          document.getElementById("qtd-questoes-ativacao").value = dados.quantidadeQuestoes || 10;
        }
        if (document.getElementById("tempo-minimo-ativacao")) {
          document.getElementById("tempo-minimo-ativacao").value = dados.tempoMinimoMinutos || 0;
        }
        if (document.getElementById("tempo-prova-ativacao")) {
          document.getElementById("tempo-prova-ativacao").value = dados.tempoLimiteMinutos || 0;
        }
        if (document.getElementById("input-token-ativacao")) {
          document.getElementById("input-token-ativacao").value = dados.token || "";
        }
        if (document.getElementById("select-periodo-ativacao")) {
          document.getElementById("select-periodo-ativacao").value = dados.periodoAtivo || "Geral";
        }
        if (document.getElementById("input-agendamento-ativacao") && dados.agendamento) {
          let dataObj = new Date(dados.agendamento);
          let ano = dataObj.getFullYear();
          let mes = String(dataObj.getMonth() + 1).padStart(2, '0');
          let dia = String(dataObj.getDate()).padStart(2, '0');
          let hora = String(dataObj.getHours()).padStart(2, '0');
          let min = String(dataObj.getMinutes()).padStart(2, '0');
          document.getElementById("input-agendamento-ativacao").value = `${ano}-${mes}-${dia}T${hora}:${min}`;
        }

        if (dados.escolaAtiva) {
          const btnEscola = document.querySelector(`.btn-escola-clicavel[data-nome-escola="${dados.escolaAtiva}"]`);
          if (btnEscola) btnEscola.click();
        }

        if (dados.materiasAtivas) {
          document.querySelectorAll(".chk-materia-ativacao").forEach(chk => {
            chk.checked = dados.materiasAtivas.includes(chk.value);
          });
        }

        if (dados.turmasAtivas) {
          document.querySelectorAll(".chk-turma-ativacao").forEach(chk => {
            chk.checked = dados.turmasAtivas.includes(chk.value);
          });
        }
      }, 600);

      alert("✏️ Dados da prova carregados para edição com sucesso!");
    } catch(err) {
      console.error(err);
      alert("⚠️ Erro ao carregar dados para edição.");
    }
  };

  document.getElementById("btn-publicar-prova-escola")?.addEventListener("click", async (e) => {
    const escolaSelecionada = escolaAtivaSelecionadaIndependente;
    const materiasSelecionadas = Array.from(document.querySelectorAll(".chk-materia-ativacao:checked")).map(c => c.value);
    const periodoEscolhido = document.getElementById("select-periodo-ativacao")?.value || "Geral";
    const qtdQ = parseInt(document.getElementById("qtd-questoes-ativacao")?.value) || 10;
    const tempoMin = parseInt(document.getElementById("tempo-minimo-ativacao")?.value) || 0;
    const tempoLim = parseInt(document.getElementById("tempo-prova-ativacao")?.value) || 0;
    const turmasSelecionadas = Array.from(document.querySelectorAll(".chk-turma-ativacao:checked")).map(c => c.value);
    const tokenProva = document.getElementById("input-token-ativacao")?.value.trim() || "";
    const agendamentoData = document.getElementById("input-agendamento-ativacao")?.value || "";

    if (!escolaSelecionada || materiasSelecionadas.length === 0 || turmasSelecionadas.length === 0) {
      alert("⚠️ Clique em uma escola acima, selecione pelo menos uma matéria e uma turma!");
      return;
    }

    let timestampAgendamento = agendamentoData ? new Date(agendamentoData).getTime() : 0;

    if (!confirm(`Deseja publicar a avaliação especificamente para a unidade "${escolaSelecionada}"?`)) return;

    try {
      const dadosPublicacao = {
        escolaAtiva: escolaSelecionada,
        materiasAtivas: materiasSelecionadas,
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
      alert(`✅ Prova publicada com sucesso para a unidade "${escolaSelecionada}"!`);
    } catch (err) {
      alert("Erro ao publicar: " + err.message);
    }
  });

  document.addEventListener("click", async (e) => {
    if (e.target && e.target.id === "btn-embaralhar-manual-ativas") {
      if (confirm("🔀 Deseja reembaralhar imediatamente todas as questões da prova ativa?")) {
        try {
          await setDoc(doc(db, "configuracoes", "prova_ativa"), { seedReordenacao: Date.now().toString() }, { merge: true });
          alert("✅ Questões reembaralhadas com sucesso!");
        } catch(err) { alert("Erro: " + err.message); }
      }
    }
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
    const correta = document.getElementById("cad-correta").value;

    if (!pergunta || !materia) { mostrarNotificacao("⚠️ Preencha todos os campos!"); return; }

    try {
      await addDoc(collection(db, "questoes"), {
        materia: materia,
        categoria: materia,
        pergunta: pergunta,
        opcoes: [opA, opB, opC, opD],
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
        if (partes.length >= 7) {
          await addDoc(collection(db, "questoes"), {
            materia: partes[0],
            categoria: partes[0],
            pergunta: partes[1],
            opcoes: [partes[2], partes[3], partes[4], partes[5]],
            correta: partes[6].toUpperCase(),
            criadoEm: serverTimestamp()
          });
          importadas++;
        } else if (partes.length >= 6) {
          await addDoc(collection(db, "questoes"), {
            materia: materiaPadrao,
            categoria: materiaPadrao,
            pergunta: partes[0],
            opcoes: [partes[1], partes[2], partes[3], partes[4]],
            correta: partes[5].toUpperCase(),
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
      alert("⚠️ Formato inválido. Use: Matéria | Pergunta | OpA | OpB | OpC | OpD | Correta");
    }
  };

  function inicializarTabelaResultados() {
    const corpoTabelaResultados = document.getElementById("corpo-tabela");
    if (!corpoTabelaResultados) return;

    onSnapshot(collection(db, "avaliacoes"), (snapshot) => {
      resultadosGlobaisCache = [];
      snapshot.forEach(docSnap => {
        resultadosGlobaisCache.push({ idDoc: docSnap.id, ...docSnap.data() });
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
      corpoTabelaResultados.innerHTML = `<tr><td colspan="12" style="text-align:center; color: #94a3b8; padding: 20px;">Nenhum resultado registrado encontrado para os filtros selecionados.</td></tr>`;
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
            <input type="checkbox" class="chk-item-resultado" value="${res.idDoc}">
          </td>
          <td><span style="background: rgba(34, 197, 94, 0.2); color: #4ade80; padding: 3px 6px; border-radius: 6px; font-weight: bold; font-size: 11px;">✅ Finalizado</span></td>
          <td>${dataFormatada}</td>
          <td><strong>${res.escola || 'N/D'}</strong></td>
          <td>${res.periodo || 'N/D'}</td>
          <td>${res.nome || 'Aluno'}</td>
          <td>${res.turma || 'N/D'}</td>
          <td>${res.materia || 'Geral'}</td>
          <td><span style="color: #facc15;">⏱️ ${tempoGastoStr}</span></td>
          <td><span style="color: #4ade80;">✅ ${acertos}</span> / <span style="color: #ef4444;">❌ ${erros}</span></td>
          <td><strong style="color: #60a5fa; font-size: 14px;">${notaCalculada} / 10</strong></td>
          <td style="text-align: center; display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
            <button type="button" class="btn-acao" style="background:#0284c7; padding:4px 8px; font-size:10px; margin:0;" onclick="gerarBoletimIndividual('${res.nome || 'Aluno'}', '${res.turma || ''}', '${res.escola || ''}', '${notaCalculada}', '${res.materia || 'Geral'}')">📜 Boletim</button>
            <button type="button" class="btn-acao" style="background:#0d9488; padding:4px 8px; font-size:10px; margin:0;" onclick="gerarCopiaProvaIndividual('${res.nome || 'Aluno'}', '${res.turma || ''}', '${res.materia || 'Geral'}', '${res.periodo || 'Geral'}', '${dataFormatada}', '${res.escola || ''}')">📄 Prova</button>
            <button type="button" class="btn-acao" style="background:#10b981; padding:4px 8px; font-size:10px; margin:0;" onclick="gerarCertificadoIndividual('${res.nome || 'Aluno'}', '${res.escola || ''}', '${notaCalculada}')">🎓 Certificado</button>
            <button type="button" class="btn-acao" style="background: #eab308; padding: 4px 8px; font-size: 10px; margin: 0;" onclick="autorizarAlunoRefazer('${idAlunoAlvo}', '${res.nome || 'Aluno'}')">🔄 Refazer</button>
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

  window.selecionarTodosResultados = function(marcar) {
    document.querySelectorAll(".chk-item-resultado").forEach(chk => chk.checked = marcar);
  };

  window.excluirResultadosSelecionados = async function() {
    const selecionados = Array.from(document.querySelectorAll(".chk-item-resultado:checked")).map(c => c.value);
    if (selecionados.length === 0) { alert("⚠️ Selecione ao menos um resultado."); return; }
    if (confirm(`Excluir permanentemente os ${selecionados.length} resultado(s) selecionado(s)?`)) {
      try {
        for (const idDoc of selecionados) { await deleteDoc(doc(db, "avaliacoes", idDoc)); }
        mostrarNotificacao(`🗑️ Resultados excluídos!`);
      } catch (err) { mostrarNotificacao("Erro: " + err.message); }
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
          <td><span style="color: #facc15;">⏱️ ${tempoStr}</span></td>
          <td style="text-align: center;">
            <button type="button" class="btn-acao btn-danger" style="padding: 5px 8px; font-size: 11px; margin: 0;" data-id="${aluno.idDoc}" data-nome="${aluno.nome || 'Aluno'}" onclick="finalizarAlunoElemento(this)">🏁 Finalizar</button>
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

        await setDoc(doc(db, "avaliacoes", (9999999999999 - agora).toString()), {
          idAluno: idAluno,
          nome: alunoObj?.nome || nomeAluno,
          turma: alunoObj?.turma || "N/D",
          escola: alunoObj?.escola || escolaAtivaSelecionadaIndependente || "Escola",
          periodo: alunoObj?.periodo || "Geral",
          materia: alunoObj?.materia || "Geral",
          pontuacao: pontuacaoAtual,
          totalQuestoes: totalQ,
          tempoGastoSegundos: segundos,
          tempoGastoFormatado: `${Math.floor(segundos/60)}m ${segundos%60}s`,
          dataEnvio: serverTimestamp(),
          timestamp: agora
        });

        await setDoc(doc(db, "permissoes_alunos", idAluno), { podeFazer: false }, { merge: true });
        await deleteDoc(doc(db, "alunos_online", idAluno));
        mostrarNotificacao(`✅ Prova de ${nomeAluno} finalizada!`);
      } catch (err) { alert("Erro: " + err.message); }
    }
  };

  inicializarPainel();
}

// ==========================================
// CONFIGURAÇÃO ESPECÍFICA DA ESCOLA (escola.html)
// ==========================================
if (window.location.pathname.includes("escola.html")) {
  let escolaUrl = "";
  let retornoAba = "escolas";
  const urlParams = new URLSearchParams(window.location.search);
  escolaUrl = urlParams.get("escola") ? decodeURIComponent(urlParams.get("escola")) : "";
  retornoAba = urlParams.get("retorno") || "escolas";

  async function inicializarEscolaPage() {
    await carregarEstruturaGlobalFirebase();
    if (escolaUrl) {
      document.getElementById("banner-escola-ativa-isolada").textContent = `🏫 Configurando Unidade: ${escolaUrl}`;
      await carregarDadosEscola(escolaUrl);
    }
  }

  async function carregarDadosEscola(nomeEscola) {
    try {
      const docSnap = await getDoc(doc(db, "escolas_configuracoes", normalizarTexto(nomeEscola)));
      if (docSnap.exists()) {
        const d = docSnap.data();
        if (d.tabelasConfirmadas) dadosConfirmadosEscola = d.tabelasConfirmadas;
        if (d.customBoxes) estruturaGlobalBoxes = d.customBoxes;
        if (d.customTurma) turmaDadosGlobal = d.customTurma;
      } else {
        dadosConfirmadosEscola = { turmas: [], materias: [], periodos: [], bimestres: [] };
        estruturaGlobalBoxes.forEach(box => {
          let tipoChave = box.id || `box_${box}`;
          dadosConfirmadosEscola[tipoChave] = [...box.itens];
        });
      }
    } catch (e) { console.error(e); }
    renderizarTurmasEscola();
    renderizarBoxesEscola();
    atualizarResumoFinalConsolidado();
  }

  window.renderizarTurmasEscola = function() {
    renderizarRolagemTurmas("numeros", "grid-numeros", "chk-numero");
    renderizarRolagemTurmas("letras", "grid-letras", "chk-letra");
    atualizarPreviaTurmas();
    renderizarTabelaConferenciaEscolaGenerica('turmas');
  };

  function renderizarRolagemTurmas(tipo, gridId, classeChk) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    let html = "";
    turmaDadosGlobal[tipo].forEach((item, idx) => {
      html += `
        <div class="checkbox-item">
          <span><input type="checkbox" class="${classeChk}" value="${item}"> ${item}</span>
          <div class="acoes-item-global">
            <button type="button" class="btn-editar-item" onclick="editarItemTurma('${tipo}', ${idx})">✏️</button>
            <button type="button" class="btn-excluir-item" onclick="excluirItemTurma('${tipo}', ${idx})">🗑️</button>
          </div>
        </div>
      `;
    });
    grid.innerHTML = html;
  }

  window.adicionarItemTurma = function(tipo, inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    if (!turmaDadosGlobal[tipo].includes(val)) {
      turmaDadosGlobal[tipo].push(val);
      renderizarTurmasEscola();
      input.value = "";
      mostrarNotificacao(`➕ "${val}" adicionado!`);
    }
  };

  window.editarItemTurma = function(tipo, idx) {
    let atual = turmaDadosGlobal[tipo][idx];
    let novo = prompt("Editar item:", atual);
    if (novo && novo.trim() !== "") {
      turmaDadosGlobal[tipo][idx] = novo.trim();
      renderizarTurmasEscola();
      mostrarNotificacao("✏️ Atualizado!");
    }
  };

  window.excluirItemTurma = function(tipo, idx) {
    turmaDadosGlobal[tipo].splice(idx, 1);
    renderizarTurmasEscola();
    mostrarNotificacao("🗑️ Removido!");
  };

  window.atualizarPreviaTurmas = function() {
    const numSel = Array.from(document.querySelectorAll('.chk-numero:checked')).map(c => c.value);
    const letSel = Array.from(document.querySelectorAll('.chk-letra:checked')).map(c => c.value);
    const container = document.getElementById("resultado-parcial-turmas");
    if (!container) return;

    let combinadas = [];
    numSel.forEach(n => { letSel.forEach(l => { combinadas.push(`${n}${l}`); }); });
    if (combinadas.length === 0) {
      numSel.forEach(n => combinadas.push(n));
      letSel.forEach(l => combinadas.push(l));
    }

    if (combinadas.length === 0) {
      container.innerHTML = "Nenhuma combinação gerada.";
    } else {
      let html = "";
      combinadas.forEach(t => {
        html += `<label class="tag-selecao"><input type="checkbox" class="chk-parcial-turma" value="${t}" checked> ${t}</label>`;
      });
      container.innerHTML = html;
    }
  };

  window.confirmarTurmasSelecionadas = function() {
    const checks = document.querySelectorAll('.chk-parcial-turma:checked');
    if (checks.length === 0) { mostrarNotificacao("⚠️ Selecione ao menos uma turma!"); return; }
    checks.forEach(c => {
      if (!dadosConfirmadosEscola.turmas) dadosConfirmadosEscola.turmas = [];
      if (!dadosConfirmadosEscola.turmas.includes(c.value)) dadosConfirmadosEscola.turmas.push(c.value);
    });
    document.querySelectorAll('.chk-numero, .chk-letra').forEach(c => c.checked = false);
    atualizarPreviaTurmas();
    renderizarTabelaConferenciaEscolaGenerica('turmas');
    atualizarResumoFinalConsolidado();
    mostrarNotificacao("✅ Turmas confirmadas!");
  };

  window.excluirSecaoTurmas = function() {
    document.querySelectorAll('.chk-numero, .chk-letra').forEach(c => c.checked = false);
    dadosConfirmadosEscola.turmas = [];
    atualizarPreviaTurmas();
    renderizarTabelaConferenciaEscolaGenerica('turmas');
    atualizarResumoFinalConsolidado();
    mostrarNotificacao("🗑️ Seleção de turmas limpa.");
  };

  window.renderizarBoxesEscola = function() {
    const container = document.getElementById("container-boxes-escola");
    if (!container) return;
    let html = "";
    estruturaGlobalBoxes.forEach((box, bIdx) => {
      let tipoChave = box.id || `box_${bIdx}`;
      if (!dadosConfirmadosEscola[tipoChave]) dadosConfirmadosEscola[tipoChave] = [];

      html += `
        <div class="card-box">
          <div class="box-header">
            <h2>
              <span id="escola-box-titulo-${bIdx}">${box.titulo}</span>
              <button type="button" class="btn-editar-item" onclick="editarTituloBoxEscola(${bIdx})" title="Editar Título" style="margin-left: 6px;">✏️</button>
            </h2>
            <div class="acoes-box">
              <button type="button" class="btn-excluir-item" style="background:#ef4444; color:white; padding:3px 6px; border-radius:4px; font-weight:bold;" onclick="excluirBoxEscola(${bIdx})">🗑️</button>
            </div>
          </div>
          <div class="aviso-geral">💡 Informação personalizada para esta unidade.</div>
          <div class="sub-secao">
            <div class="sub-titulo-linha">
              <h3>Gerenciar e Selecionar Itens</h3>
              <div class="acoes-box">
                <button type="button" class="btn-mini" onclick="escolaMarcarLimpar('${tipoChave}')">☑ Marcar/Limpar</button>
                <button type="button" class="btn-mini" onclick="escolaOrdenar(${bIdx}, 'asc')">⬆ A-Z</button>
                <button type="button" class="btn-mini" onclick="escolaOrdenar(${bIdx}, 'desc')">⬇ Z-A</button>
              </div>
            </div>
            <div class="grid-checkboxes" id="escola-grid-${bIdx}">
      `;
      box.itens.forEach((item, iIdx) => {
        html += `
          <div class="checkbox-item">
            <span><input type="checkbox" class="chk-escola-${tipoChave}" value="${item}"> ${item}</span>
            <div class="acoes-item-global">
              <button type="button" class="btn-editar-item" onclick="escolaEditarItem(${bIdx}, ${iIdx})">✏️</button>
              <button type="button" class="btn-excluir-item" onclick="escolaExcluirItem(${bIdx}, ${iIdx})">🗑️</button>
            </div>
          </div>
        `;
      });
      html += `
            </div>
            <div class="input-grupo-add">
              <input type="text" id="escola-input-add-${bIdx}" placeholder="Adicionar novo item...">
              <button type="button" onclick="escolaAdicionarItem(${bIdx})">➕</button>
            </div>
          </div>

          <div class="sub-secao">
            <div class="sub-titulo-linha"><h3>👁️ Pré-visualização</h3></div>
            <div id="escola-prev-${tipoChave}" class="resultado-parcial">Nenhum item selecionado.</div>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button type="button" class="btn-mini" style="background:#2563eb; padding:8px 14px; font-size:13px;" onclick="escolaConfirmarSelecao('${tipoChave}', ${bIdx})">✅ Confirmar Selecionados</button>
            <button type="button" class="btn-mini" style="background:#ef4444; padding:8px 14px; font-size:13px;" onclick="escolaLimparSelecao('${tipoChave}')">🗑️ Limpar Seleção</button>
          </div>

          <div style="margin-top: 16px;">
            <h3 style="color: #60a5fa; font-size: 14px; margin-bottom: 6px;">📋 Tabela de Conferência</h3>
            <div id="escola-tabela-${tipoChave}"><p style="color: #94a3b8; font-size: 12px; font-style: italic;">Nenhum item confirmado.</p></div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;

    estruturaGlobalBoxes.forEach((box) => {
      let tipoChave = box.id || `box_${box}`;
      renderizarTabelaConferenciaEscolaGenerica(tipoChave);
    });
  };

  window.editarTituloBoxEscola = function(bIdx) {
    let atual = estruturaGlobalBoxes[bIdx].titulo;
    let novo = prompt("Novo título:", atual);
    if (novo && novo.trim() !== "") {
      estruturaGlobalBoxes[bIdx].titulo = novo.trim();
      renderizarBoxesEscola();
      mostrarNotificacao("✏️ Título atualizado!");
    }
  };

  window.excluirBoxEscola = function(bIdx) {
    if (confirm("Excluir box?")) {
      estruturaGlobalBoxes.splice(bIdx, 1);
      renderizarBoxesEscola();
      mostrarNotificacao("🗑️ Box excluída!");
    }
  };

  window.criarNovaBoxEscola = function() {
    const input = document.getElementById("input-nova-box-escola");
    const nome = input.value.trim();
    if (!nome) { alert("Digite o nome!"); return; }
    estruturaGlobalBoxes.push({ id: normalizarTexto(nome) + "_" + Date.now(), titulo: nome, itens: ["Exemplo 1"] });
    input.value = "";
    renderizarBoxesEscola();
    mostrarNotificacao("➕ Nova box adicionada!");
  };

  window.escolaMarcarLimpar = function(tipoChave) {
    const checks = document.querySelectorAll(`.chk-escola-${tipoChave}`);
    const todos = Array.from(checks).every(c => c.checked);
    checks.forEach(c => c.checked = !todos);
    atualizarPreviaEscola(tipoChave);
  };

  window.escolaOrdenar = function(bIdx, direcao) {
    estruturaGlobalBoxes[bIdx].itens.sort((a, b) => direcao === 'asc' ? a.localeCompare(b) : b.localeCompare(a));
    renderizarBoxesEscola();
  };

  window.escolaAdicionarItem = function(bIdx) {
    const input = document.getElementById(`escola-input-add-${bIdx}`);
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    if (!estruturaGlobalBoxes[bIdx].itens.includes(val)) {
      estruturaGlobalBoxes[bIdx].itens.push(val);
      renderizarBoxesEscola();
      mostrarNotificacao(`➕ "${val}" adicionado!`);
    }
  };

  window.escolaEditarItem = function(bIdx, iIdx) {
    let atual = estruturaGlobalBoxes[bIdx].itens[iIdx];
    let novo = prompt("Editar item:", atual);
    if (novo && novo.trim() !== "") {
      estruturaGlobalBoxes[bIdx].itens[iIdx] = novo.trim();
      renderizarBoxesEscola();
      mostrarNotificacao("✏️ Atualizado!");
    }
  };

  window.escolaExcluirItem = function(bIdx, iIdx) {
    estruturaGlobalBoxes[bIdx].itens.splice(iIdx, 1);
    renderizarBoxesEscola();
    mostrarNotificacao("🗑️ Removido!");
  };

  window.atualizarPreviaEscola = function(tipoChave) {
    const checks = document.querySelectorAll(`.chk-escola-${tipoChave}:checked`);
    const containerPrev = document.getElementById(`escola-prev-${tipoChave}`);
    if (!containerPrev) return;
    if (checks.length === 0) { containerPrev.innerHTML = "Nenhum item selecionado."; return; }
    let html = "";
    checks.forEach(c => { html += `<label class="tag-selecao">${c.value}</label>`; });
    containerPrev.innerHTML = html;
  };

  window.escolaConfirmarSelecao = function(tipoChave) {
    const checks = document.querySelectorAll(`.chk-escola-${tipoChave}:checked`);
    if (checks.length === 0) { mostrarNotificacao("⚠️ Selecione ao menos um item!"); return; }
    checks.forEach(c => {
      if (!dadosConfirmadosEscola[tipoChave]) dadosConfirmadosEscola[tipoChave] = [];
      if (!dadosConfirmadosEscola[tipoChave].includes(c.value)) dadosConfirmadosEscola[tipoChave].push(c.value);
    });
    document.querySelectorAll(`.chk-escola-${tipoChave}`).forEach(c => c.checked = false);
    atualizarPreviaEscola(tipoChave);
    renderizarTabelaConferenciaEscolaGenerica(tipoChave);
    atualizarResumoFinalConsolidado();
    mostrarNotificacao("✅ Confirmado!");
  };

  window.escolaLimparSelecao = function(tipoChave) {
    document.querySelectorAll(`.chk-escola-${tipoChave}`).forEach(c => c.checked = false);
    dadosConfirmadosEscola[tipoChave] = [];
    atualizarPreviaEscola(tipoChave);
    renderizarTabelaConferenciaEscolaGenerica(tipoChave);
    atualizarResumoFinalConsolidado();
    mostrarNotificacao("🗑️ Seleção limpa.");
  };

  window.removerItemTabelaEscolaGenerica = function(tipoChave, index) {
    dadosConfirmadosEscola[tipoChave].splice(index, 1);
    renderizarTabelaConferenciaEscolaGenerica(tipoChave);
    atualizarResumoFinalConsolidado();
    mostrarNotificacao("🗑️ Removido!");
  };

  window.editarItemTabelaEscolaGenerica = function(tipoChave, index) {
    let atual = dadosConfirmadosEscola[tipoChave][index];
    let novo = prompt("Editar:", atual);
    if (novo && novo.trim() !== "") {
      dadosConfirmadosEscola[tipoChave][index] = novo.trim();
      renderizarTabelaConferenciaEscolaGenerica(tipoChave);
      atualizarResumoFinalConsolidado();
      mostrarNotificacao("✏️ Atualizado!");
    }
  };

  function renderizarTabelaConferenciaEscolaGenerica(tipoChave) {
    const container = tipoChave === 'turmas' ? document.getElementById("tabela-container-turmas") : document.getElementById(`escola-tabela-${tipoChave}`);
    if (!container) return;
    let lista = dadosConfirmadosEscola[tipoChave] || [];
    if (lista.length === 0) {
      container.innerHTML = `<p style="color: #94a3b8; font-size: 12px; font-style: italic;">Nenhum item confirmado.</p>`;
      return;
    }
    let html = `<table class="tabela-conferencia"><thead><tr><th>Item Confirmado</th><th style="width: 120px; text-align: right;">Ações</th></tr></thead><tbody>`;
    lista.forEach((item, idx) => {
      let funcEdit = tipoChave === 'turmas' ? `editarItemTabelaTurma(${idx})` : `editarItemTabelaEscolaGenerica('${tipoChave}', ${idx})`;
      let funcDel = tipoChave === 'turmas' ? `removerItemTabelaTurma(${idx})` : `removerItemTabelaEscolaGenerica('${tipoChave}', ${idx})`;
      html += `<tr><td><strong>${item}</strong></td><td style="text-align: right;"><button type="button" class="btn-acao-tabela btn-editar" onclick="${funcEdit}">✏️</button><button type="button" class="btn-acao-tabela btn-excluir" onclick="${funcDel}">🗑️</button></td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
  }

  window.removerItemTabelaTurma = function(idx) {
    dadosConfirmadosEscola.turmas.splice(idx, 1);
    renderizarTabelaConferenciaEscolaGenerica('turmas');
    atualizarResumoFinalConsolidado();
  };

  window.editarItemTabelaTurma = function(idx) {
    let atual = dadosConfirmadosEscola.turmas[idx];
    let novo = prompt("Editar turma:", atual);
    if (novo && novo.trim() !== "") {
      dadosConfirmadosEscola.turmas[idx] = novo.trim();
      renderizarTabelaConferenciaEscolaGenerica('turmas');
      atualizarResumoFinalConsolidado();
    }
  };

  function atualizarResumoFinalConsolidado() {
    const container = document.getElementById("texto-resumo-escolhas");
    if (!container) return;
    let resumo = `<strong>🏫 Turmas:</strong> ${dadosConfirmadosEscola.turmas?.join(' | ') || 'Nenhuma'}<br>`;
    estruturaGlobalBoxes.forEach(box => {
      let tipoChave = box.id || `box_${box}`;
      let itens = dadosConfirmadosEscola[tipoChave] || [];
      resumo += `<strong>${box.titulo}:</strong> ${itens.join(', ') || 'Nenhum'}<br>`;
    });
    container.innerHTML = resumo;
  }

  document.addEventListener("change", (e) => {
    if (e.target.matches(".chk-numero") || e.target.matches(".chk-letra")) { atualizarPreviaTurmas(); }
    if (e.target.matches("input[type=checkbox]") && e.target.className.includes("chk-escola-")) {
      let tipoChave = e.target.className.replace("chk-escola-", "").trim();
      atualizarPreviaEscola(tipoChave);
    }
  });

  window.marcarLimpar = function(classe) {
    const checks = document.querySelectorAll(`.${classe}`);
    const todos = Array.from(checks).every(c => c.checked);
    checks.forEach(c => c.checked = !todos);
    atualizarPreviaTurmas();
  };

  window.marcarLimparTurma = function(classe) {
    const checks = document.querySelectorAll(`.${classe}`);
    const todos = Array.from(checks).every(c => c.checked);
    checks.forEach(c => c.checked = !todos);
    atualizarPreviaTurmas();
  };

  window.ordenarTurmasLocal = function(tipo, direcao) {
    turmaDadosGlobal[tipo].sort((a, b) => direcao === 'asc' ? a.localeCompare(b, undefined, {numeric: true}) : b.localeCompare(a, undefined, {numeric: true}));
    renderizarTurmasEscola();
  };

  document.getElementById("btn-salvar-isolada")?.addEventListener("click", async (e) => {
    try {
      const configData = {
        escolaNome: escolaUrl,
        tabelasConfirmadas: dadosConfirmadosEscola,
        customBoxes: estruturaGlobalBoxes,
        customTurma: turmaDadosGlobal,
        atualizadoEm: serverTimestamp()
      };
      await setDoc(doc(db, "escolas_configuracoes", normalizarTexto(escolaUrl)), configData);
      animarBotaoSucesso(e.target);
      mostrarNotificacao("✅ Configurações salvas para esta escola!");
      setTimeout(() => { 
        let hashRetorno = retornoAba === "ativacao" ? "#ativacao" : "#escolas";
        window.location.href = `painel.html${hashRetorno}`; 
      }, 1500);
    } catch(err) { mostrarNotificacao("Erro: " + err.message); }
  });

  inicializarEscolaPage();
}

// ==========================================
// TELA DO ALUNO (index.html)
// ==========================================
if (window.location.pathname.includes("index.html") || window.location.pathname.endsWith("/")) {
  let listaQuestoes = [], indiceAtual = 0, respostasUsuario = {};
  let alunoAtual = {}, qtdQ = 10, dadosProvaAtiva = {};
  let timerInterval = null, tempoRestanteSegundos = 0, segundosPassados = 0;
  let avisoTempoMinimoExibido = false;
  let watcherPermissaoInterval = null;

  const selectTurma = document.getElementById("turma-aluno");
  const inputNomeAluno = document.getElementById("nome-aluno");
  const detalhesProvaAtiva = document.getElementById("detalhes-prova-ativa");

  onSnapshot(doc(db, "configuracoes", "prova_ativa"), (docSnap) => {
    if (docSnap.exists()) {
      dadosProvaAtiva = docSnap.data();
      qtdQ = dadosProvaAtiva.quantidadeQuestoes || 10;
      let matsStr = (dadosProvaAtiva.materiasAtivas || []).join(", ");
      let escolaStr = dadosProvaAtiva.escolaAtiva || "N/D";
       
      let tempoMinimo = parseInt(dadosProvaAtiva.tempoMinimoMinutos) || 0;
      let tempoLimite = parseInt(dadosProvaAtiva.tempoLimiteMinutos) || 0;

      let avisoAgendamentoHtml = "";
      if (dadosProvaAtiva.agendamento && dadosProvaAtiva.agendamento > 0) {
        let dataAgendada = new Date(dadosProvaAtiva.agendamento);
        let dataFormatada = dataAgendada.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        avisoAgendamentoHtml = `
          <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
            <span>📅</span>
            <span><strong>Início Agendado:</strong> <span style="color: #facc15; font-size: 14px;">${dataFormatada}</span></span>
          </div>`;
      }

      if (detalhesProvaAtiva) {
        detalhesProvaAtiva.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; align-items: flex-start; gap: 8px;"><span>🏫</span><span><strong>Escola:</strong> ${escolaStr}</span></div>
            <div style="display: flex; align-items: flex-start; gap: 8px;"><span>📅</span><span><strong>Período:</strong> ${dadosProvaAtiva.periodoAtivo || 'Geral'}</span></div>
            <div style="display: flex; align-items: flex-start; gap: 8px;"><span>📚</span><span><strong>Matéria(s):</strong> ${matsStr || 'Geral'}</span></div>
            ${avisoAgendamentoHtml}
            <div style="display: flex; align-items: flex-start; gap: 8px;"><span>🔒</span><span><strong>Exige Token:</strong> ${dadosProvaAtiva.token ? 'Sim' : 'Não'}</span></div>
            <div style="display: flex; align-items: flex-start; gap: 8px;"><span>⏱️</span><span><strong>Tempo Mínimo:</strong> ${tempoMinimo > 0 ? tempoMinimo + ' minutos' : 'Nenhum'}</span></div>
            <div style="display: flex; align-items: flex-start; gap: 8px;"><span>⏳</span><span><strong>Tempo Limite:</strong> ${tempoLimite > 0 ? tempoLimite + ' minutos' : 'Sem limite'}</span></div>
          </div>
        `;
      }

      if (selectTurma) {
        selectTurma.innerHTML = `<option value="" disabled selected>Selecione sua turma...</option>`;
        (dadosProvaAtiva.turmasAtivas || []).forEach(t => {
          selectTurma.innerHTML += `<option value="${t}">${t}</option>`;
        });
      }
    } else {
      if (detalhesProvaAtiva) {
        detalhesProvaAtiva.innerHTML = `<span style="color: #ef4444; font-weight: bold;">⚠️ Nenhuma prova foi liberada pelo professor no momento.</span>`;
      }
    }
  });

  document.getElementById("form-login")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!inputNomeAluno.value.trim() || !selectTurma.value) {
      alert("⚠️ Preencha seu nome e selecione a turma.");
      return;
    }

    const nomeInput = inputNomeAluno.value.trim().toUpperCase();
    const turmaInput = selectTurma.value;
    const idAlunoUnico = obterIdAluno(nomeInput, turmaInput);

    let tempoAgendado = dadosProvaAtiva.agendamento || 0;
    if (tempoAgendado > Date.now()) {
      let dataAgendadaObj = new Date(tempoAgendado);
      let dataFormatadaEspera = dataAgendadaObj.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      alert(`⏳ A prova ainda não está no horário correto!\n\nHorário agendado: ${dataFormatadaEspera}`);
      document.getElementById("form-login").reset();
      return;
    }

    if (dadosProvaAtiva.token && dadosProvaAtiva.token.trim() !== "") {
      let tokenInformado = prompt("🔒 Esta avaliação é protegida por Token.\nDigite a senha fornecida pelo professor:");
      if (tokenInformado !== dadosProvaAtiva.token) {
        alert("❌ Token incorreto! Acesso negado.");
        return;
      }
    }

    try {
      const permissaoDoc = await getDoc(doc(db, "permissoes_alunos", idAlunoUnico));
      if (permissaoDoc.exists() && permissaoDoc.data().podeFazer === false) {
        alert("⚠️ Você já realizou esta avaliação e não pode refazê-la.");
        return;
      }
    } catch (err) {}

    alunoAtual.nome = nomeInput;
    alunoAtual.escola = dadosProvaAtiva.escolaAtiva || "Escola";
    alunoAtual.periodo = dadosProvaAtiva.periodoAtivo || "Geral";
    let materiasAtivas = dadosProvaAtiva.materiasAtivas || ["Geral"];
    alunoAtual.materia = materiasAtivas.join(" / ");
    alunoAtual.turma = turmaInput;
    alunoAtual.id = idAlunoUnico;

    iniciarCarregamentoProva();
  });

  async function iniciarCarregamentoProva() {
    let tempoAgendado = dadosProvaAtiva.agendamento || 0;
    if (tempoAgendado > 0 && tempoAgendado <= Date.now()) {
      segundosPassados = Math.floor((Date.now() - tempoAgendado) / 1000);
    } else {
      segundosPassados = 0;
    }

    try {
      await setDoc(doc(db, "alunos_online", alunoAtual.id), {
        nome: alunoAtual.nome,
        turma: alunoAtual.turma,
        escola: alunoAtual.escola,
        materia: alunoAtual.materia,
        periodo: alunoAtual.periodo,
        questaoAtual: 1,
        totalQuestoes: qtdQ,
        segundosPassados: segundosPassados,
        pontuacao: 0,
        dataInicio: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      });
    } catch(e) {}

    let banco = [];
    try {
      const snap = await getDocs(collection(db, "questoes"));
      snap.forEach(s => banco.push(normalizarDocumentoQuestao(s.data(), s.id)));
    } catch(e) {}

    let materiasAtivas = dadosProvaAtiva.materiasAtivas || ["Geral"];
    let filtradas = [];
    for (const mat of materiasAtivas) {
      const matNorm = normalizarTexto(mat);
      let qMat = banco.filter(q => {
        const catNorm = normalizarTexto(q.categoria);
        return catNorm.includes(matNorm) || matNorm.includes(catNorm);
      });
      filtradas.push(...qMat);
    }

    if (filtradas.length === 0) filtradas = banco;

    let mapaUnicas = new Map();
    filtradas.forEach(q => {
      let chaveUnica = normalizarTexto(q.pergunta);
      if (!mapaUnicas.has(chaveUnica)) mapaUnicas.set(chaveUnica, q);
    });
    let unicasArray = Array.from(mapaUnicas.values());

    for (let i = unicasArray.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [unicasArray[i], unicasArray[j]] = [unicasArray[j], unicasArray[i]];
    }

    listaQuestoes = unicasArray.slice(0, qtdQ).map(q => normalizarDocumentoQuestao(q));

    document.getElementById("badge-escola-ativa").textContent = `🏫 ${alunoAtual.escola} | Turma: ${alunoAtual.turma} | ${alunoAtual.materia}`;
    document.getElementById("tela-login").classList.add("hidden");
    document.getElementById("tela-quiz").classList.remove("hidden");
     
    iniciarCronogerenciamento();
    iniciarMonitoramentoFechamentoRemoto();
    exibirQuestao();
  }

  function iniciarCronogerenciamento() {
    avisoTempoMinimoExibido = false;
    let tempoLimiteMin = parseInt(dadosProvaAtiva.tempoLimiteMinutos) || 0;
    let tempoMinimoMinutos = parseInt(dadosProvaAtiva.tempoMinimoMinutos) || 0;
     
    let tempoLimiteSegundosTotais = tempoLimiteMin > 0 ? tempoLimiteMin * 60 : 0;
    tempoRestanteSegundos = tempoLimiteSegundosTotais > 0 ? Math.max(0, tempoLimiteSegundosTotais - segundosPassados) : 0;

    let cronometroDiv = document.getElementById("relogio-cronometro");
    if (cronometroDiv) {
      cronometroDiv.style.display = "block";
      cronometroDiv.style.background = "#1e293b";
      cronometroDiv.style.border = "1px solid #eab308";
      cronometroDiv.style.color = "#facc15";
      cronometroDiv.style.padding = "8px 12px";
      cronometroDiv.style.borderRadius = "8px";
      cronometroDiv.style.textAlign = "center";
      cronometroDiv.style.marginBottom = "15px";
      cronometroDiv.style.fontWeight = "bold";
      cronometroDiv.style.fontSize = "15px";
    }

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
      segundosPassados++;
      atualizarStatusOnlineFirebase();

      if (tempoMinimoMinutos > 0 && !avisoTempoMinimoExibido) {
        if (segundosPassados >= tempoMinimoMinutos * 60) {
          avisoTempoMinimoExibido = true;
          alert("✅ O tempo mínimo obrigatório foi concluído!");
        }
      }

      if (tempoLimiteMin > 0) {
        if (tempoRestanteSegundos <= 0) {
          clearInterval(timerInterval);
          alert("⏱️ O tempo limite esgotou! A prova será finalizada automaticamente.");
          finalizarProva();
          return;
        }
        tempoRestanteSegundos--;
      }

      let m = Math.floor(segundosPassados / 60);
      let s = segundosPassados % 60;
      let textoRelogio = `⏱️ Tempo Gasto: ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

      if (tempoLimiteMin > 0) {
        let lm = Math.floor(tempoRestanteSegundos / 60);
        let ls = tempoRestanteSegundos % 60;
        textoRelogio += ` | Restante: ${lm.toString().padStart(2, '0')}:${ls.toString().padStart(2, '0')}`;
      }

      if (cronometroDiv) cronometroDiv.textContent = textoRelogio;
    }, 1000);
  }

  function iniciarMonitoramentoFechamentoRemoto() {
    if (watcherPermissaoInterval) clearInterval(watcherPermissaoInterval);
    watcherPermissaoInterval = setInterval(async () => {
      if (!alunoAtual.id) return;
      try {
        const pDoc = await getDoc(doc(db, "permissoes_alunos", alunoAtual.id));
        if (pDoc.exists() && pDoc.data().podeFazer === false) {
          clearInterval(watcherPermissaoInterval);
          if (timerInterval) clearInterval(timerInterval);
          alert("🔒 Sua prova foi encerrada pelo professor.");
          location.reload();
        }
      } catch(e) {}
    }, 3000);
  }

  async function atualizarStatusOnlineFirebase() {
    try {
      const docRef = doc(db, "alunos_online", alunoAtual.id);
      const docSnap = await getDoc(docRef);
       
      let acertosParciais = 0;
      listaQuestoes.forEach((q, idx) => {
        if (respostasUsuario[idx] && respostasUsuario[idx] === q.correta) acertosParciais++;
      });

      let dadosAtualizacao = {
        nome: alunoAtual.nome,
        turma: alunoAtual.turma,
        escola: alunoAtual.escola,
        materia: alunoAtual.materia,
        periodo: alunoAtual.periodo,
        questaoAtual: indiceAtual + 1,
        totalQuestoes: listaQuestoes.length,
        pontuacao: acertosParciais,
        segundosPassados: segundosPassados,
        atualizadoEm: serverTimestamp()
      };

      if (!docSnap.exists() || !docSnap.data().dataInicio) {
        dadosAtualizacao.dataInicio = serverTimestamp();
      }

      await setDoc(docRef, dadosAtualizacao, { merge: true });
    } catch(e) {}
  }

  function exibirQuestao() {
    const q = listaQuestoes[indiceAtual];
    document.getElementById("pergunta-txt").textContent = `${indiceAtual + 1}. ${q.pergunta}`;
    document.getElementById("progresso-txt").textContent = `Questão ${indiceAtual + 1} de ${listaQuestoes.length}`;
     
    atualizarStatusOnlineFirebase();

    const container = document.getElementById("opcoes-container");
    container.innerHTML = "";
    ["A", "B", "C", "D"].forEach((letra, idx) => {
      const btn = document.createElement("button");
      btn.className = "opcao-btn";
      btn.textContent = `${letra}) ${q.opcoes[idx] || ""}`;
      btn.style.width = "100%"; btn.style.padding = "12px 16px"; btn.style.marginBottom = "10px";
      btn.style.textAlign = "left"; btn.style.display = "flex"; btn.style.alignItems = "center";
      btn.style.background = respostasUsuario[indiceAtual] === letra ? "#2563eb" : "#0f172a";
      btn.style.color = "white"; btn.style.border = "1px solid #3b82f6"; btn.style.borderRadius = "8px"; btn.style.cursor = "pointer";
      btn.onclick = () => { respostasUsuario[indiceAtual] = letra; exibirQuestao(); };
      container.appendChild(btn);
    });
    garantirNavegacao();
  }

  function garantirNavegacao() {
    let nav = document.getElementById("nav-quiz");
    if (!nav) {
      nav = document.createElement("div");
      nav.id = "nav-quiz"; nav.style.display = "flex"; nav.style.justifyContent = "space-between"; nav.style.marginTop = "20px";
      nav.innerHTML = `<button id="ant" style="padding:10px 15px; background:#4b5563; color:white; border:none; border-radius:8px;">⬅ Anterior</button>
                       <button id="prox" style="padding:10px 15px; background:#2563eb; color:white; border:none; border-radius:8px;">Próxima ➡</button>
                       <button id="fin" style="padding:10px 15px; background:#22c55e; color:white; border:none; border-radius:8px; display:none;">🏁 Finalizar</button>`;
      document.getElementById("tela-quiz").appendChild(nav);
    }
    document.getElementById("ant").onclick = () => { if(indiceAtual > 0) { indiceAtual--; exibirQuestao(); } };
    document.getElementById("prox").onclick = () => { if(indiceAtual < listaQuestoes.length - 1) { indiceAtual++; exibirQuestao(); } };
    document.getElementById("fin").onclick = tentarFinalizarProva;

    document.getElementById("ant").style.display = indiceAtual === 0 ? "none" : "block";
    document.getElementById("prox").style.display = indiceAtual === listaQuestoes.length - 1 ? "none" : "block";
    document.getElementById("fin").style.display = indiceAtual === listaQuestoes.length - 1 ? "block" : "none";
  }

  function tentarFinalizarProva() {
    let tempoMinimoMinutos = parseInt(dadosProvaAtiva.tempoMinimoMinutos) || 0;
    if (tempoMinimoMinutos > 0) {
      let minutosPassados = segundosPassados / 60;
      if (minutosPassados < tempoMinimoMinutos) {
        let faltamSeg = Math.ceil((tempoMinimoMinutos * 60) - segundosPassados);
        alert(`⚠️ O tempo mínimo é de ${tempoMinimoMinutos} minuto(s). Faltam ${Math.floor(faltamSeg/60)}m ${faltamSeg%60}s.`);
        return;
      }
    }
    finalizarProva();
  }

  async function finalizarProva() {
    if (timerInterval) clearInterval(timerInterval);
    if (watcherPermissaoInterval) clearInterval(watcherPermissaoInterval);
    document.getElementById("tela-quiz").classList.add("hidden");
    document.getElementById("tela-resultado").classList.remove("hidden");

    let acertos = 0;
    let htmlRev = "";
    
    listaQuestoes.forEach((q, idx) => {
      const respAluno = respostasUsuario[idx] || "Não respondida";
      const correta = (respAluno === q.correta);
      if (correta) acertos++;

      let opcoesHtml = "";
      ["A", "B", "C", "D"].forEach((letra, oIdx) => {
        let estiloOpcao = "padding: 6px 10px; margin: 4px 0; border-radius: 4px;";
        let indicador = "";
        
        if (letra === q.correta) {
          estiloOpcao += " background: rgba(34, 197, 94, 0.25); border: 1px solid #22c55e; color: #4ade80; font-weight: bold;";
          indicador = " ⭐ (Resposta Correta)";
        } else if (letra === respAluno && !correta) {
          estiloOpcao += " background: rgba(239, 68, 68, 0.25); border: 1px solid #ef4444; color: #f87171;";
          indicador = " ❌ (Sua Resposta)";
        } else {
          estiloOpcao += " background: rgba(15, 23, 42, 0.5); color: #cbd5e1;";
        }

        opcoesHtml += `<div style="${estiloOpcao}">${letra}) ${q.opcoes[oIdx] || ""}${indicador}</div>`;
      });

      htmlRev += `
        <div class="item-revisao ${correta ? 'correta' : 'incorreta'}">
          <p><strong>Questão ${idx + 1}:</strong> ${q.pergunta}</p>
          <div style="margin-top: 8px;">${opcoesHtml}</div>
          <p style="margin-top: 8px; font-size: 13px;"><strong>Sua resposta:</strong> ${respAluno} | <strong>Status:</strong> ${correta ? '<span style="color:#4ade80;">Correta ✅</span>' : '<span style="color:#ef4444;">Incorreta ❌</span>'}</p>
        </div>
      `;
    });

    let erros = listaQuestoes.length - acertos;
    const nota = listaQuestoes.length > 0 ? ((acertos / listaQuestoes.length) * 10).toFixed(1) : "0.0";
     
    let minGasto = Math.floor(segundosPassados / 60);
    let segGasto = segundosPassados % 60;
    let tempoGastoFormatado = `${minGasto}m ${segGasto}s`;

    document.getElementById("nota-final-txt").textContent = `Nota Proporcional: ${nota} / 10.0 (Tempo: ${tempoGastoFormatado})`;
    document.getElementById("detalhes-acertos-txt").textContent = `Acertos: ${acertos} | Erros: ${erros} (Total de ${listaQuestoes.length} questões)`;
    document.getElementById("container-revisao-resultado").innerHTML = htmlRev;

    try {
      const agora = Date.now();
      await setDoc(doc(db, "avaliacoes", (9999999999999 - agora).toString()), {
        idAluno: alunoAtual.id,
        nome: alunoAtual.nome || "Aluno",
        turma: alunoAtual.turma || "N/D",
        escola: alunoAtual.escola || dadosProvaAtiva.escolaAtiva || "Escola",
        periodo: alunoAtual.periodo || "Geral",
        materia: alunoAtual.materia || "Geral",
        pontuacao: acertos,
        totalQuestoes: listaQuestoes.length,
        tempoGastoSegundos: segundosPassados,
        tempoGastoFormatado: tempoGastoFormatado,
        dataEnvio: serverTimestamp(),
        timestamp: agora
      });
       
      await setDoc(doc(db, "permissoes_alunos", alunoAtual.id), { podeFazer: false }, { merge: true });
      await deleteDoc(doc(db, "alunos_online", alunoAtual.id));

      document.getElementById("status-envio-txt").textContent = "Resultado salvo com sucesso! ✅";
    } catch(e) { document.getElementById("status-envio-txt").textContent = "Erro ao salvar."; }
  }

  document.getElementById("btn-reiniciar")?.addEventListener("click", () => location.reload());
}