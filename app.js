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
let alunosOnlineCache = []; // Cache para gerenciar limpeza do tempo real

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("fade-in");
  garantirBancoMinimoQuestoes();
});

document.addEventListener("click", (e) => {
  const link = e.target.closest("a");
  if (link && link.href && link.href.startsWith(window.location.origin) && !link.getAttribute("target")) {
    e.preventDefault();
    const destino = link.href;
    document.body.style.opacity = "0";
    setTimeout(() => { window.location.href = destino; }, 300);
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

function normalizarDocumentoQuestao(d, idDoc = null) {
  let perguntaBruta = d.pergunta || d.questao || d.titulo || "Pergunta Sem Título";
  let perguntaLimpa = perguntaBruta.replace(/\[Técnico\s*\d+\]\s*/gi, "").trim();

  let opcoesBrutas = d.opcoes || d.alternativas || d.respostas || [];
  let letraCorreta = (d.correta || d.resposta || d.correto || "A").toString().trim().toUpperCase();
  
  let textoCorretoOriginal = opcoesBrutas[0];
  if (letraCorreta === 'B') textoCorretoOriginal = opcoesBrutas[1];
  if (letraCorreta === 'C') textoCorretoOriginal = opcoesBrutas[2];
  if (letraCorreta === 'D') textoCorretoOriginal = opcoesBrutas[3];

  let opcoesLimpas = opcoesBrutas.map(op => op.replace(/^[A-D]\)\s*/, "").trim());
  let textoCorretoLimpo = (textoCorretoOriginal || "").replace(/^[A-D]\)\s*/, "").trim();

  let indices = [0, 1, 2, 3];
  indices.sort(() => Math.random() - 0.5);

  let opcoesEmbaralhadas = indices.map(i => opcoesLimpas[i]);
  let novoIndexCorreto = indices.findIndex(i => opcoesLimpas[i] === textoCorretoLimpo);
  if (novoIndexCorreto === -1) novoIndexCorreto = 0;
  let novaLetraCorreta = ["A", "B", "C", "D"][novoIndexCorreto];

  return {
    idDoc: idDoc,
    pergunta: perguntaLimpa,
    opcoes: opcoesEmbaralhadas,
    correta: novaLetraCorreta,
    categoria: d.categoria || d.materia || d.disciplina || "Geral"
  };
}

let estruturaGlobalBoxes = [
  { id: "materias", titulo: "📚 Disciplinas e Matérias", itens: [
    "Inteligência Artificial", 
    "Front-end", 
    "Redes de computadores e seguranca da informação na nuvem", 
    "Processos de desenvolvimento de sistemas e metodologias Ágeis",
    "Matemática", "Língua Portuguesa", "Ciências", "História", "Geografia", "Física", "Química", "Biologia", "Inglês"
  ]},
  { id: "periodos", titulo: "🏫 Períodos e Turnos", itens: ["Manhã", "Tarde", "Noite", "Integral"] },
  { id: "bimestres", titulo: "📅 Bimestres e Semestres", itens: ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"] }
];

let turmaDadosGlobal = {
  numeros: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
  letras: ["A", "B", "C", "D", "E", "F", "G", "H"]
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

async function salvarEstruturaGlobalFirebase() {
  try {
    await setDoc(doc(db, "configuracoes", "estrutura_global_v2"), {
      boxes: estruturaGlobalBoxes,
      turmas: turmaDadosGlobal,
      atualizadoEm: serverTimestamp()
    });
  } catch (e) { console.error(e); }
}

async function garantirBancoMinimoQuestoes() {
  try {
    await carregarEstruturaGlobalFirebase();
    const bancoQuestoesTecnicasExtendido = {
      "Inteligencia Artificial": [
        { p: "O que caracteriza o aprendizado supervisionado em Inteligência Artificial?", ops: ["Dados sem rótulos descobertos automaticamente", "Uso de dados de entrada juntamente com as respostas corretas desejadas", "Tentativa e erro autônoma sem histórico", "Regras fixas de lógica booleana"], c: "B" },
        { p: "Qual é a principal função de uma rede neural artificial?", ops: ["Gerenciar partições físicas de disco rígido", "Compilar códigos de baixo nível", "Processar dados através de camadas de nós para reconhecimento de padrões", "Imprimir relatórios em formato PDF"], c: "C" },
        { p: "O que significa o conceito de Deep Learning?", ops: ["Redes neurais com múltiplas camadas profundas capazes de extrair feições complexas", "Processamento de planilhas eletrônicas gigantescas", "Criptografia de ponta a ponta em redes locais", "Compactação avançada de arquivos de vídeo"], c: "A" }
      ],
      "Front-end": [
        { p: "Qual a principal responsabilidade do CSS em páginas web?", ops: ["Estruturar os textos semânticos", "Controlar a aparência visual, layout, cores e responsividade", "Processar regras de negócio no servidor", "Armazenar dados em banco NoSQL"], c: "B" },
        { p: "O que significa criar um layout responsivo?", ops: ["Carregar páginas instantaneamente", "Adaptar a interface de forma fluida a diferentes tamanhos de tela e dispositivos", "Usar apenas imagens em formato SVG", "Bloquear o uso de mouses e teclados"], c: "B" }
      ],
      "Redes de computadores e seguranca da informação na nuvem": [
        { p: "O que caracteriza o modelo IaaS na computação em nuvem?", ops: ["Locação de infraestrutura básica como servidores virtuais, armazenamento e redes", "Entrega de softwares prontos via navegador", "Ambiente exclusivo para programar sem gerenciar servidores", "Armazenamento local em HDs físicos"], c: "A" }
      ],
      "Processos de desenvolvimento de sistemas e metodologias Ágeis": [
        { p: "O que é uma Sprint no framework Scrum?", ops: ["Um documento com requisitos estáticos", "Um período de tempo curto (time-box) para desenvolver um incremento de produto utilizable", "Reunião final de homologação do cliente", "Cargo de gestão tradicional de projetos"], c: "B" }
      ]
    };

    const snap = await getDocs(collection(db, "questoes"));
    let bancoAtual = [];
    snap.forEach(s => bancoAtual.push(normalizarDocumentoQuestao(s.data(), s.id)));

    for (const [mat, listaBase] of Object.entries(bancoQuestoesTecnicasExtendido)) {
      let qMat = bancoAtual.filter(q => normalizarTexto(q.categoria).includes(normalizarTexto(mat)) || normalizarTexto(mat).includes(normalizarTexto(q.categoria)));
      if (qMat.length < 50) {
        let faltam = 50 - qMat.length;
        for (let i = 0; i < faltam; i++) {
          let baseModelo = listaBase[i % listaBase.length];
          await addDoc(collection(db, "questoes"), {
            materia: mat,
            categoria: mat,
            pergunta: `[Técnico ${i + 1}] ${baseModelo.p}`,
            opcoes: [`A) ${baseModelo.ops[0]}`, `B) ${baseModelo.ops[1]}`, `C) ${baseModelo.ops[2]}`, `D) ${baseModelo.ops[3]}`],
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
    renderizarBoxesGlobais();
    carregarListaEscolas();
    inicializarTabelaResultados();
    inicializarTabelaTempoReal();
    popularSelectMateriasQuestao();
  }

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
        if (escolaEscolhida) { window.location.href = `escola.html?escola=${encodeURIComponent(escolaEscolhida)}`; }
      };
    }
  }

  window.renderizarBoxesGlobais = function() {
    const container = document.getElementById("container-boxes-globais");
    if (!container) return;
    let html = "";
    estruturaGlobalBoxes.forEach((box, bIdx) => {
      html += `
        <div class="bloco-calculadora" data-box-index="${bIdx}">
          <div class="sub-titulo-linha">
            <h3>
              <span>${box.titulo}</span>
              <button type="button" class="btn-editar-item" onclick="editarTituloBoxGlobal(${bIdx})" title="Editar Título">✏️</button>
            </h3>
            <div class="acoes-box">
              <button type="button" class="btn-mini" onclick="painelMarcarLimpar('chk-global-${bIdx}')">☑ Marcar/Limpar</button>
              <button type="button" class="btn-mini" onclick="ordenarBoxGlobal(${bIdx}, 'asc')">⬆ A-Z</button>
              <button type="button" class="btn-mini" onclick="ordenarBoxGlobal(${bIdx}, 'desc')">⬇ Z-A</button>
              <button type="button" class="btn-excluir-item" style="background:#ef4444; color:white; padding:4px 8px; border-radius:4px; font-weight:bold;" onclick="excluirBoxGlobal(${bIdx})" title="Excluir Box">🗑️ Excluir Box</button>
            </div>
          </div>
          <div class="grid-checkboxes" id="grid-global-${bIdx}">
      `;
      box.itens.forEach((item, iIdx) => {
        html += `
          <div class="checkbox-item-global">
            <span><input type="checkbox" class="chk-global-${bIdx}" value="${item}" checked> ${item}</span>
            <div class="acoes-item-global">
              <button type="button" class="btn-editar-item" onclick="editarItemGlobal(${bIdx}, ${iIdx})">✏️</button>
              <button type="button" class="btn-excluir-item" onclick="excluirItemGlobal(${bIdx}, ${iIdx})">🗑️</button>
            </div>
          </div>
        `;
      });
      html += `
          </div>
          <div class="input-grupo-add">
            <input type="text" id="input-add-global-${bIdx}" placeholder="Adicionar novo item...">
            <button type="button" onclick="adicionarItemGlobal(${bIdx})">➕</button>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  };

  window.editarTituloBoxGlobal = function(bIdx) {
    let atual = estruturaGlobalBoxes[bIdx].titulo;
    let novo = prompt("Novo título para esta box:", atual);
    if (novo && novo.trim() !== "") {
      estruturaGlobalBoxes[bIdx].titulo = novo.trim();
      renderizarBoxesGlobais();
      mostrarNotificacao("✏️ Título atualizado!");
    }
  };

  window.excluirBoxGlobal = function(bIdx) {
    if (confirm(`Deseja excluir a box "${estruturaGlobalBoxes[bIdx].titulo}"?`)) {
      estruturaGlobalBoxes.splice(bIdx, 1);
      renderizarBoxesGlobais();
      mostrarNotificacao("🗑️ Box excluída!");
    }
  };

  window.criarNovaBoxGlobal = function() {
    const input = document.getElementById("nova-box-titulo");
    const nome = input.value.trim();
    if (!nome) { alert("⚠️ Digite o nome da nova box!"); return; }
    estruturaGlobalBoxes.push({ id: normalizarTexto(nome) + "_" + Date.now(), titulo: nome, itens: ["Exemplo 1"] });
    input.value = "";
    renderizarBoxesGlobais();
    mostrarNotificacao("➕ Nova box criada!");
  };

  window.painelMarcarLimpar = function(classe) {
    const checks = document.querySelectorAll(`.${classe}`);
    const todos = Array.from(checks).every(c => c.checked);
    checks.forEach(c => c.checked = !todos);
  };

  window.ordenarBoxGlobal = function(bIdx, direcao) {
    estruturaGlobalBoxes[bIdx].itens.sort((a, b) => direcao === 'asc' ? a.localeCompare(b) : b.localeCompare(a));
    renderizarBoxesGlobais();
  };

  window.adicionarItemGlobal = function(bIdx) {
    const input = document.getElementById(`input-add-global-${bIdx}`);
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    if (!estruturaGlobalBoxes[bIdx].itens.includes(val)) {
      estruturaGlobalBoxes[bIdx].itens.push(val);
      renderizarBoxesGlobais();
      mostrarNotificacao(`➕ "${val}" adicionado!`);
    }
  };

  window.editarItemGlobal = function(bIdx, iIdx) {
    let atual = estruturaGlobalBoxes[bIdx].itens[iIdx];
    let novo = prompt("Editar item:", atual);
    if (novo && novo.trim() !== "") {
      estruturaGlobalBoxes[bIdx].itens[iIdx] = novo.trim();
      renderizarBoxesGlobais();
      mostrarNotificacao("✏️ Item atualizado!");
    }
  };

  window.excluirItemGlobal = function(bIdx, iIdx) {
    let removido = estruturaGlobalBoxes[bIdx].itens[iIdx];
    if (confirm(`Excluir "${removido}"?`)) {
      estruturaGlobalBoxes[bIdx].itens.splice(bIdx, 1);
      renderizarBoxesGlobais();
      mostrarNotificacao("🗑️ Item excluído!");
    }
  };

  document.getElementById("btn-salvar-global-definitivo")?.addEventListener("click", async (e) => {
    await salvarEstruturaGlobalFirebase();
    animarBotaoSucesso(e.target);
    await garantirBancoMinimoQuestoes();
    mostrarNotificacao("✅ Configurações gerais salvas e atualizadas!");
  });

  const botoesAba = document.querySelectorAll(".btn-aba");
  const conteudosAba = document.querySelectorAll(".aba-conteudo");
  botoesAba.forEach(btn => {
    btn.addEventListener("click", () => {
      botoesAba.forEach(b => b.classList.remove("active"));
      conteudosAba.forEach(c => c.classList.add("hidden"));
      btn.classList.add("active");
      document.getElementById(btn.getAttribute("data-aba")).classList.remove("hidden");
      if(btn.getAttribute("data-aba") === "aba-questoes") { popularSelectMateriasQuestao(); }
    });
  });

  const inputNomeEscola = document.getElementById("input-nome-escola");
  const inputGestorEscola = document.getElementById("input-gestor-escola");
  const inputCidadeEscola = document.getElementById("input-cidade-escola");
  const inputEscolaIdEditando = document.getElementById("input-escola-id-editando");
  const btnSalvarNovaEscola = document.getElementById("btn-salvar-nova-escola");
  const btnCancelarEdicao = document.getElementById("btn-cancelar-edicao");
  const listaEscolasContainer = document.getElementById("lista-escolas-cadastradas-container");

  const selectEscolaAtivacao = document.getElementById("select-escola-ativacao");
  const containerCalculadoraAtivacao = document.getElementById("container-calculadora-ativacao");
  const gridMateriasAtivacao = document.getElementById("grid-materias-ativacao");
  const selectPeriodoAtivacao = document.getElementById("select-periodo-ativacao");
  const gridTurmasAtivacao = document.getElementById("grid-turmas-ativacao");

  async function carregarListaEscolas() {
    try {
      const snap = await getDocs(collection(db, "escolas_cadastradas"));
      let escolas = [];
      snap.forEach(docSnap => { escolas.push({ idDoc: docSnap.id, ...docSnap.data() }); });
      listaEscolasCache = escolas;
      renderizarSeletorEscolasTopo();

      if (listaEscolasContainer) {
        let htmlCadastradas = "";
        if (escolas.length === 0) {
          htmlCadastradas = `<p style="text-align:center; color:#94a3b8; padding: 10px;">Nenhuma escola cadastrada.</p>`;
        } else {
          escolas.forEach(esc => {
            htmlCadastradas += `
              <div class="card-escola-lista">
                <div>
                  <strong>🏫 ${esc.nome}</strong><br>
                  <span style="font-size: 12px; color: #94a3b8;">Gestor(a): ${esc.gestor || 'N/D'} | Cidade: ${esc.cidade || 'N/D'}</span>
                </div>
                <div class="acoes-escola-card">
                  <a href="escola.html?escola=${encodeURIComponent(esc.nome)}" class="btn-acao" style="background:#2563eb; padding:6px 12px; text-decoration:none; font-size:12px; margin:0;">⚙️ Configurar Escola</a>
                  <button class="btn-editar-escola" data-id="${esc.idDoc}" data-nome="${esc.nome}" data-gestor="${esc.gestor || ''}" data-cidade="${esc.cidade || ''}" style="background:#eab308; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold;">✏️ Editar</button>
                  <button class="btn-excluir-escola" data-id="${esc.idDoc}" data-nome="${esc.nome}" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold;">🗑️ Excluir</button>
                </div>
              </div>
            `;
          });
        }
        listaEscolasContainer.innerHTML = htmlCadastradas;

        document.querySelectorAll(".btn-editar-escola").forEach(btn => {
          btn.onclick = (e) => {
            const b = e.target;
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
            const id = e.target.getAttribute("data-id");
            const nomeEscola = e.target.getAttribute("data-nome");
            if (confirm(`Deseja excluir a escola "${nomeEscola}"?`)) {
              await deleteDoc(doc(db, "escolas_cadastradas", id));
              await deleteDoc(doc(db, "escolas_configuracoes", normalizarTexto(nomeEscola)));
              mostrarNotificacao("🗑️ Escola excluída!");
              carregarListaEscolas();
            }
          };
        });
      }

      if (selectEscolaAtivacao) {
        let htmlOpt = `<option value="" disabled selected>Selecione uma escola para ativar...</option>`;
        escolas.forEach(esc => { htmlOpt += `<option value="${esc.nome}">${esc.nome}</option>`; });
        selectEscolaAtivacao.innerHTML = htmlOpt;
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

  selectEscolaAtivacao?.addEventListener("change", async (e) => {
    const escolaEscolhida = e.target.value;
    const painelResumo = document.getElementById("painel-resumo-escola-ativacao");
    const conteudoResumo = document.getElementById("conteudo-resumo-ativacao");

    try {
      const docSnap = await getDoc(doc(db, "escolas_configuracoes", normalizarTexto(escolaEscolhida)));
      if (docSnap.exists()) {
        const dados = docSnap.data();
        const tab = dados.tabelasConfirmadas || {};
        containerCalculadoraAtivacao.classList.remove("hidden");

        if (painelResumo && conteudoResumo) {
          painelResumo.classList.remove("hidden");
          let htmlResumo = `<strong>🏫 Turmas Confirmadas:</strong> ${tab.turmas?.join(' | ') || 'Nenhuma'}<br>`;
          htmlResumo += `<strong>📚 Matérias Confirmadas:</strong> ${tab.materias?.join(', ') || 'Nenhuma'}<br>`;
          htmlResumo += `<strong>📅 Períodos Confirmados:</strong> ${tab.periodos?.join(', ') || 'Nenhum'}<br>`;
          
          if (dados.customBoxes) {
            dados.customBoxes.forEach(box => {
              let tChave = box.id || `box_${box}`;
              if (tab[tChave] && tab[tChave].length > 0) {
                htmlResumo += `<strong>${box.titulo}:</strong> ${tab[tChave].join(', ')}<br>`;
              }
            });
          }
          conteudoResumo.innerHTML = htmlResumo;
        }

        if (gridMateriasAtivacao) {
          let htmlMat = "";
          (tab.materias || []).forEach(m => {
            htmlMat += `<label class="checkbox-item"><input type="checkbox" class="chk-materia-ativacao" value="${m}" checked> ${m}</label>`;
          });
          gridMateriasAtivacao.innerHTML = htmlMat;
        }

        selectPeriodoAtivacao.innerHTML = "";
        (tab.periodos || []).forEach(p => { selectPeriodoAtivacao.innerHTML += `<option value="${p}">${p}</option>`; });

        if (gridTurmasAtivacao) {
          let htmlTurmas = "";
          (tab.turmas || []).forEach(t => {
            htmlTurmas += `<label class="checkbox-item"><input type="checkbox" class="chk-turma-ativacao" value="${t}" checked> ${t}</label>`;
          });
          gridTurmasAtivacao.innerHTML = htmlTurmas;
        }
      } else {
        containerCalculadoraAtivacao.classList.add("hidden");
        if (painelResumo) painelResumo.classList.add("hidden");
        mostrarNotificacao("⚠️ Configure e confirme os boxes desta escola primeiro.");
      }
    } catch (err) { console.error(err); }
  });

  document.getElementById("btn-publicar-prova-escola")?.addEventListener("click", async (e) => {
    const escolaEscolhida = selectEscolaAtivacao?.value;
    const materiasSelecionadas = Array.from(document.querySelectorAll(".chk-materia-ativacao:checked")).map(c => c.value);
    const periodoEscolhido = selectPeriodoAtivacao?.value;
    const qtdQ = parseInt(document.getElementById("qtd-questoes-ativacao").value) || 10;
    const tempoMin = parseInt(document.getElementById("tempo-prova-ativacao").value) || 0;
    const tempoMinimoConclusao = parseInt(document.getElementById("tempo-minimo-ativacao").value) || 0;
    const turmasSelecionadas = Array.from(document.querySelectorAll(".chk-turma-ativacao:checked")).map(c => c.value);

    if (!escolaEscolhida || materiasSelecionadas.length === 0 || turmasSelecionadas.length === 0) {
      mostrarNotificacao("⚠️ Selecione a escola, ao menos uma matéria e uma turma!");
      return;
    }

    try {
      const dadosPublicacao = {
        escolaAtiva: escolaEscolhida,
        materiasAtivas: materiasSelecionadas,
        periodoAtivo: periodoEscolhido || "Geral",
        quantidadeQuestoes: qtdQ,
        tempoLimiteMinutos: tempoMin,
        tempoMinimoMinutos: tempoMinimoConclusao,
        turmasAtivas: turmasSelecionadas,
        publicadoEm: serverTimestamp()
      };

      await setDoc(doc(db, "configuracoes", "prova_ativa"), dadosPublicacao);
      animarBotaoSucesso(e.target);
      mostrarNotificacao(`✅ Prova integrada ativada com sucesso!`);
    } catch (err) { mostrarNotificacao("Erro ao publicar: " + err.message); }
  });

  function popularSelectMateriasQuestao() {
    const sel = document.getElementById("cad-materia");
    if (!sel) return;
    let materias = [];
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

  function inicializarTabelaResultados() {
    const corpoTabelaResultados = document.getElementById("corpo-tabela");
    if (!corpoTabelaResultados) return;
    onSnapshot(collection(db, "avaliacoes"), (snapshot) => {
      let htmlResultados = "";
      resultadosGlobaisCache = [];
      snapshot.forEach(docSnap => { resultadosGlobaisCache.push(docSnap.data()); });

      resultadosGlobaisCache.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      if (resultadosGlobaisCache.length === 0) {
        corpoTabelaResultados.innerHTML = `<tr><td colspan="10" style="text-align:center; color: #94a3b8;">Nenhum resultado registrado até o momento.</td></tr>`;
        return;
      }

      resultadosGlobaisCache.forEach(res => {
        let dataFormatada = res.dataEnvio?.toDate ? res.dataEnvio.toDate().toLocaleString('pt-BR') : "Data recente";
        let totalQ = res.totalQuestoes || 0;
        let acertos = res.pontuacao || 0;
        let erros = totalQ - acertos;
        let notaCalculada = totalQ > 0 ? ((acertos / totalQ) * 10).toFixed(1) : "0.0";
        let tempoGastoStr = res.tempoGastoFormatado || "N/D";
        
        htmlResultados += `
          <tr>
            <td><span style="background: rgba(34, 197, 94, 0.2); color: #4ade80; padding: 4px 8px; border-radius: 6px; font-weight: bold;">✅ Finalizado</span></td>
            <td>${dataFormatada}</td>
            <td><strong>${res.escola || 'N/D'}</strong></td>
            <td>${res.periodo || 'N/D'}</td>
            <td>${res.nome || 'Aluno'}</td>
            <td>${res.turma || 'N/D'}</td>
            <td>${res.materia || 'Geral'}</td>
            <td><span style="color: #facc15;">⏱️ ${tempoGastoStr}</span></td>
            <td><span style="color: #4ade80;">✅ ${acertos} Acertos</span> / <span style="color: #ef4444;">❌ ${erros} Erros</span></td>
            <td><strong style="color: #60a5fa; font-size: 15px;">${notaCalculada} / 10</strong></td>
          </tr>
        `;
      });
      corpoTabelaResultados.innerHTML = htmlResultados;
    });
  }

  function inicializarTabelaTempoReal() {
    const corpoTabelaTempoReal = document.getElementById("corpo-tabela-tempo-real");
    if (!corpoTabelaTempoReal) return;
    onSnapshot(collection(db, "alunos_online"), (snapshot) => {
      let htmlOnline = "";
      alunosOnlineCache = [];
      snapshot.forEach(docSnap => { 
        alunosOnlineCache.push({ idDoc: docSnap.id, ...docSnap.data() }); 
      });

      if (alunosOnlineCache.length === 0) {
        corpoTabelaTempoReal.innerHTML = `<tr><td colspan="7" style="text-align:center; color: #94a3b8;">Nenhum aluno resolvendo provas no momento.</td></tr>`;
        return;
      }

      alunosOnlineCache.forEach(aluno => {
        let min = Math.floor((aluno.segundosPassados || 0) / 60);
        let seg = (aluno.segundosPassados || 0) % 60;
        let tempoStr = `${min}m ${seg}s`;

        htmlOnline += `
          <tr>
            <td><span style="background: rgba(34, 197, 94, 0.2); color: #4ade80; padding: 4px 8px; border-radius: 6px; font-weight: bold;">🟢 Em andamento</span></td>
            <td><strong>${aluno.escola || 'N/D'}</strong></td>
            <td>${aluno.nome || 'Aluno'}</td>
            <td>${aluno.turma || 'N/D'}</td>
            <td>${aluno.materia || 'Geral'}</td>
            <td><strong style="color: #60a5fa;">Questão ${aluno.questaoAtual || 1} de ${aluno.totalQuestoes || 10}</strong></td>
            <td><span style="color: #facc15;">⏱️ ${tempoStr}</span></td>
          </tr>
        `;
      });
      corpoTabelaTempoReal.innerHTML = htmlOnline;
    });
  }

  // Função para limpar a lista de monitoramento e enviar os registros para o relatório no Firebase
  window.limparEEnviarMonitoramentoParaRelatorio = async function() {
    if (!alunosOnlineCache || alunosOnlineCache.length === 0) {
      alert("⚠️ Não há alunos ativos no monitoramento no momento.");
      return;
    }

    if (!confirm(`Deseja finalizar a prova dos ${alunosOnlineCache.length} aluno(s) ativos, movendo-os para a aba de relatórios?`)) {
      return;
    }

    try {
      for (const aluno of alunosOnlineCache) {
        const agora = Date.now();
        let min = Math.floor((aluno.segundosPassados || 0) / 60);
        let seg = (aluno.segundosPassados || 0) % 60;
        let tempoGastoFormatado = `${min}m ${seg}s`;

        // 1. Salva nos relatórios (avaliacoes)
        await setDoc(doc(db, "avaliacoes", (9999999999999 - agora).toString()), {
          idAluno: aluno.idDoc,
          nome: aluno.nome,
          turma: aluno.turma,
          escola: aluno.escola,
          periodo: aluno.periodo || "Geral",
          materia: aluno.materia || "Geral",
          pontuacao: 0, // Como foi finalizado pelo painel, atribui-se fechamento manual
          totalQuestoes: aluno.totalQuestoes || 10,
          tempoGastoSegundos: aluno.segundosPassados || 0,
          tempoGastoFormatado: tempoGastoFormatado,
          dataEnvio: serverTimestamp(),
          timestamp: agora
        });

        // 2. Bloqueia nova tentativa do aluno
        await setDoc(doc(db, "permissoes_alunos", aluno.idDoc), { podeFazer: false });

        // 3. Remove da lista de monitoramento em tempo real
        await deleteDoc(doc(db, "alunos_online", aluno.idDoc));
      }

      mostrarNotificacao("✅ Alunos removidos do monitoramento e enviados com sucesso para os relatórios!");
    } catch (err) {
      mostrarNotificacao("Erro ao processar: " + err.message);
    }
  };

  window.exportarResultadosCSV = function() {
    if (!resultadosGlobaisCache || resultadosGlobaisCache.length === 0) {
      alert("⚠️ Não há resultados para exportar.");
      return;
    }
    let csvContent = "\uFEFFStatus;Data/Hora;Escola;Período;Aluno;Turma;Matéria;Tempo Gasto;Acertos;Erros;Nota\n";
    resultadosGlobaisCache.forEach(res => {
      let dataFormatada = res.dataEnvio?.toDate ? res.dataEnvio.toDate().toLocaleString('pt-BR') : "Data recente";
      let totalQ = res.totalQuestoes || 0;
      let acertos = res.pontuacao || 0;
      let erros = totalQ - acertos;
      let nota = totalQ > 0 ? ((acertos / totalQ) * 10).toFixed(1) : "0.0";
      let linha = `"Finalizado";"${dataFormatada}";"${res.escola || ''}";"${res.periodo || ''}";"${res.nome || ''}";"${res.turma || ''}";"${res.materia || ''}";"${res.tempoGastoFormatado || ''}";"${acertos}";"${erros}";"${nota}"\n`;
      csvContent += linha;
    });
    let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `resultados_avaliacoes_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  inicializarPainel();
}

// ==========================================
// CONFIGURAÇÃO ESPECÍFICA DA ESCOLA (escola.html)
// ==========================================
if (window.location.pathname.includes("escola.html")) {
  let escolaUrl = "";
  const urlParams = new URLSearchParams(window.location.search);
  escolaUrl = urlParams.get("escola") ? decodeURIComponent(urlParams.get("escola")) : "";

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
      container.innerHTML = "Nenhuma combinação gerada. Selecione números e letras acima.";
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
              <button type="button" class="btn-editar-item" onclick="editarTituloBoxEscola(${bIdx})" title="Editar Título" style="margin-left: 8px;">✏️</button>
            </h2>
            <div class="acoes-box">
              <button type="button" class="btn-excluir-item" style="background:#ef4444; color:white; padding:4px 8px; border-radius:4px; font-weight:bold;" onclick="excluirBoxEscola(${bIdx})">🗑️ Excluir Box</button>
            </div>
          </div>
          <div class="aviso-geral">💡 Informação herdada das Configurações Gerais. Modifique livremente para esta unidade.</div>
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
              <input type="text" id="escola-input-add-${bIdx}" placeholder="Adicionar novo item nesta escola...">
              <button type="button" onclick="escolaAdicionarItem(${bIdx})">➕</button>
            </div>
          </div>

          <div class="sub-secao">
            <div class="sub-titulo-linha">
              <h3>👁️ Pré-visualização</h3>
            </div>
            <div id="escola-prev-${tipoChave}" class="resultado-parcial">Nenhum item selecionado.</div>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button type="button" class="btn-mini" style="background:#2563eb; padding:10px 16px; font-size:14px;" onclick="escolaConfirmarSelecao('${tipoChave}', ${bIdx})">✅ Confirmar Selecionados</button>
            <button type="button" class="btn-mini" style="background:#ef4444; padding:10px 16px; font-size:14px;" onclick="escolaLimparSelecao('${tipoChave}')">🗑️ Limpar Seleção</button>
          </div>

          <div style="margin-top: 20px;">
            <h3 style="color: #60a5fa; font-size: 15px; margin-bottom: 8px;">📋 Tabela de Conferência</h3>
            <div id="escola-tabela-${tipoChave}">
              <p style="color: #94a3b8; font-size: 13px; font-style: italic;">Nenhum item confirmado na tabela final ainda.</p>
            </div>
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
    let novo = prompt("Novo título para esta box nesta escola:", atual);
    if (novo && novo.trim() !== "") {
      estruturaGlobalBoxes[bIdx].titulo = novo.trim();
      renderizarBoxesEscola();
      mostrarNotificacao("✏️ Título atualizado!");
    }
  };

  window.excluirBoxEscola = function(bIdx) {
    if (confirm("Excluir esta box da escola?")) {
      estruturaGlobalBoxes.splice(bIdx, 1);
      renderizarBoxesEscola();
      mostrarNotificacao("🗑️ Box excluída!");
    }
  };

  window.criarNovaBoxEscola = function() {
    const input = document.getElementById("input-nova-box-escola");
    const nome = input.value.trim();
    if (!nome) { alert("Digite o nome da box!"); return; }
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
    mostrarNotificacao("✅ Confirmado na tabela final!");
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
      container.innerHTML = `<p style="color: #94a3b8; font-size: 13px; font-style: italic;">Nenhum item confirmado na tabela final ainda.</p>`;
      return;
    }
    let html = `<table class="tabela-conferencia"><thead><tr><th>Item Confirmado</th><th style="width: 140px; text-align: right;">Ações</th></tr></thead><tbody>`;
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
      setTimeout(() => { window.location.href = "painel.html"; }, 1500);
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

  const selectTurma = document.getElementById("turma-aluno");
  const inputNomeAluno = document.getElementById("nome-aluno");
  const detalhesProvaAtiva = document.getElementById("detalhes-prova-ativa");

  onSnapshot(doc(db, "configuracoes", "prova_ativa"), (docSnap) => {
    if (docSnap.exists()) {
      dadosProvaAtiva = docSnap.data();
      qtdQ = dadosProvaAtiva.quantidadeQuestoes || 10;
      let matsStr = (dadosProvaAtiva.materiasAtivas || []).join(", ");
      let tempoMin = parseInt(dadosProvaAtiva.tempoLimiteMinutos) || 0;
      let tempoMinimo = parseInt(dadosProvaAtiva.tempoMinimoMinutos) || 0;

      if (detalhesProvaAtiva) {
        detalhesProvaAtiva.innerHTML = `
          🏫 <strong>Escola:</strong> ${dadosProvaAtiva.escolaAtiva || 'N/D'}<br>
          📅 <strong>Período:</strong> ${dadosProvaAtiva.periodoAtivo || 'Geral'}<br>
          📚 <strong>Matéria(s):</strong> ${matsStr || 'Geral'}<br>
          ⏱️ <strong>Tempo Mínimo:</strong> ${tempoMinimo > 0 ? tempoMinimo + ' minutos' : 'Nenhum'}<br>
          ⏳ <strong>Tempo Limite:</strong> ${tempoMin > 0 ? tempoMin + ' minutos' : 'Sem limite'}
        `;
      }

      if (selectTurma) {
        selectTurma.innerHTML = `<option value="" disabled selected>Selecione sua turma...</option>`;
        (dadosProvaAtiva.turmasAtivas || []).forEach(t => {
          selectTurma.innerHTML += `<option value="${t}">${t}</option>`;
        });
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

    try {
      const permissaoDoc = await getDoc(doc(db, "permissoes_alunos", idAlunoUnico));
      if (permissaoDoc.exists() && permissaoDoc.data().podeFazer === false) {
        alert("⚠️ Você já realizou esta avaliação e não pode refazê-la.");
        return;
      }
    } catch (err) {
      console.error("Erro ao verificar permissão do aluno:", err);
    }

    alunoAtual.nome = nomeInput;
    alunoAtual.escola = dadosProvaAtiva.escolaAtiva || "Escola";
    alunoAtual.periodo = dadosProvaAtiva.periodoAtivo || "Geral";
    let materiasAtivas = dadosProvaAtiva.materiasAtivas || ["Geral"];
    alunoAtual.materia = materiasAtivas.join(" / ");
    alunoAtual.turma = turmaInput;
    alunoAtual.id = idAlunoUnico;

    let banco = [];
    try {
      const snap = await getDocs(collection(db, "questoes"));
      snap.forEach(s => banco.push(normalizarDocumentoQuestao(s.data(), s.id)));
    } catch(e) {}

    let filtradas = [];
    for (const mat of materiasAtivas) {
      const matNorm = normalizarTexto(mat);
      let qMat = banco.filter(q => {
        const catNorm = normalizarTexto(q.categoria);
        return catNorm.includes(matNorm) || matNorm.includes(catNorm);
      });
      filtradas.push(...qMat);
    }

    if (filtradas.length === 0) {
      for (let i = 1; i <= qtdQ; i++) {
        filtradas.push({
          pergunta: `Questão dinâmica de reforço ${i}: Qual conceito se aplica a esta avaliação?`,
          opcoes: ["Alternativa Correta", "Alternativa Incorreta 1", "Alternativa Incorreta 2", "Alternativa Incorreta 3"],
          correta: "A",
          categoria: "Geral"
        });
      }
    }

    filtradas.sort(() => Math.random() - 0.5);
    listaQuestoes = filtradas.slice(0, qtdQ).map(q => normalizarDocumentoQuestao(q));

    document.getElementById("badge-escola-ativa").textContent = `🏫 ${alunoAtual.escola} | Turma: ${alunoAtual.turma} | ${alunoAtual.materia}`;
    document.getElementById("tela-login").classList.add("hidden");
    document.getElementById("tela-quiz").classList.remove("hidden");
    
    iniciarCronogerenciamento();
    exibirQuestao();
  });

  function iniciarCronogerenciamento() {
    segundosPassados = 0;
    avisoTempoMinimoExibido = false;
    let tempoLimiteMin = parseInt(dadosProvaAtiva.tempoLimiteMinutos) || 0;
    let tempoMinimoMinutos = parseInt(dadosProvaAtiva.tempoMinimoMinutos) || 0;
    tempoRestanteSegundos = tempoLimiteMin > 0 ? tempoLimiteMin * 60 : 0;

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
          alert("✅ O tempo mínimo obrigatório foi concluído! Agora você já pode finalizar a prova quando desejar.");
        }
      }

      if (tempoLimiteMin > 0) {
        if (tempoRestanteSegundos <= 0) {
          clearInterval(timerInterval);
          alert("⏱️ O tempo limite da prova esgotou! A prova será finalizada automaticamente.");
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

      if (cronometroDiv) {
        cronometroDiv.textContent = textoRelogio;
      }
    }, 1000);
  }

  async function atualizarStatusOnlineFirebase() {
    try {
      await setDoc(doc(db, "alunos_online", alunoAtual.id), {
        nome: alunoAtual.nome,
        turma: alunoAtual.turma,
        escola: alunoAtual.escola,
        materia: alunoAtual.materia,
        questaoAtual: indiceAtual + 1,
        totalQuestoes: listaQuestoes.length,
        segundosPassados: segundosPassados,
        atualizadoEm: serverTimestamp()
      });
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
      btn.style.width = "100%"; btn.style.padding = "12px"; btn.style.marginBottom = "10px";
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
        let fm = Math.floor(faltamSeg / 60);
        let fs = faltamSeg % 60;
        alert(`⚠️ O professor determinou um tempo mínimo de ${tempoMinimoMinutos} minuto(s) para entrega.\nFaltam ${fm}m ${fs}s para liberar a finalização.`);
        return;
      }
    }
    finalizarProva();
  }

  async function finalizarProva() {
    if (timerInterval) clearInterval(timerInterval);
    document.getElementById("tela-quiz").classList.add("hidden");
    document.getElementById("tela-resultado").classList.remove("hidden");

    let acertos = 0;
    let htmlRev = "";
    listaQuestoes.forEach((q, idx) => {
      const resp = respostasUsuario[idx] || "X";
      const correta = (resp === q.correta);
      if (correta) acertos++;
      htmlRev += `<div class="item-revisao ${correta ? 'correta' : 'incorreta'}"><p><strong>${idx+1}. ${q.pergunta}</strong></p><p>Sua resposta: ${resp} ${correta ? '✅' : '❌'}</p></div>`;
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
        nome: alunoAtual.nome,
        turma: alunoAtual.turma,
        escola: alunoAtual.escola,
        periodo: alunoAtual.periodo,
        materia: alunoAtual.materia,
        pontuacao: acertos,
        totalQuestoes: listaQuestoes.length,
        tempoGastoSegundos: segundosPassados,
        tempoGastoFormatado: tempoGastoFormatado,
        dataEnvio: serverTimestamp(),
        timestamp: agora
      });
      await setDoc(doc(db, "permissoes_alunos", alunoAtual.id), { podeFazer: false });
      await deleteDoc(doc(db, "alunos_online", alunoAtual.id));

      document.getElementById("status-envio-txt").textContent = "Resultado salvo com sucesso! ✅";
    } catch(e) { document.getElementById("status-envio-txt").textContent = "Erro ao salvar."; }
  }

  document.getElementById("btn-reiniciar")?.addEventListener("click", () => location.reload());
}