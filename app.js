import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc,
  setDoc, 
  doc, 
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCp40ALB_7lW7mOfX8NZkS8583YR3Khhbw",
  authDomain: "quiz-interativo-8a98c.firebaseapp.com",
  databaseURL: "https://quiz-interativo-8a98c-default-rtdb.firebaseio.com",
  projectId: "quiz-interativo-8a98c",
  storageBucket: "quiz-interativo-8a98c.firebasestorage.app",
  messagingSenderId: "948601017774",
  appId: "1:948601017774:web:bd0e038611ff6d2148643f"
};

// Inicialização
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper Utilities
function obterIdAluno(nome, turma) {
  const norm = (str) => str ? str.toLowerCase().trim().replace(/\s+/g, "_") : "anonimo";
  return `${norm(nome)}_${norm(turma)}`;
}

function extrairTime(valorData) {
  if (!valorData) return 0;
  if (typeof valorData === "string") {
    const parsed = Date.parse(valorData);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof valorData === "number") return valorData;
  if (valorData.seconds) return valorData.seconds * 1000;
  if (valorData.toDate && typeof valorData.toDate === "function") return valorData.toDate().getTime();
  return 0;
}

function formatarDataRegistro(dataBruta) {
  if (!dataBruta) return "Sem registro";
  const time = extrairTime(dataBruta);
  if (time === 0) return typeof dataBruta === "string" ? dataBruta : "Data Antiga";
  return new Date(time).toLocaleString("pt-BR");
}

function normalizarTexto(txt) {
  if (!txt) return "";
  return txt.toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizarDocumentoQuestao(d, idDoc = null) {
  return {
    idDoc: idDoc,
    pergunta: d.pergunta || d.questao || d.titulo || "Pergunta Sem Título",
    opcoes: d.opcoes || d.alternativas || d.respostas || [],
    correta: (d.correta || d.resposta || d.correto || "A").toString().trim().toUpperCase(),
    categoria: d.categoria || d.materia || d.disciplina || "Geral"
  };
}

// =========================================================================
// PAINEL DO PROFESSOR (painel.html)
// =========================================================================
if (window.location.pathname.includes("painel.html")) {
  
  const formCadQuestao = document.getElementById("form-cadastrar-questao");
  const msgSucessoQuestao = document.getElementById("msg-sucesso-questao");
  const msgErroQuestao = document.getElementById("msg-erro-questao");

  const formConfigProva = document.getElementById("form-config-prova");
  const msgSucessoConfig = document.getElementById("msg-sucesso-config");

  const corpoTabela = document.getElementById("corpo-tabela");
  const btnAtualizar = document.getElementById("btn-atualizar");
  const btnImprimir = document.getElementById("btn-imprimir");
  const btnExportar = document.getElementById("btn-exportar");
  const filtroTurmaSelect = document.getElementById("filtro-turma-tabela");
  const mediaTurmaTxt = document.getElementById("media-turma-txt");

  const listaQuestoesContainer = document.getElementById("lista-questoes-banco");
  const totalQuestoesCount = document.getElementById("total-questoes-count");
  const btnRecarregarBancoQ = document.getElementById("btn-recarregar-banco-q");

  let dadosResultadosGerais = [];
  let dadosFiltradosAtuais = [];

  // CARREGAR CONFIGURAÇÕES ATUAIS DO FIRESTORE NO PAINEL
  async function carregarConfiguracoesPainel() {
    try {
      const docRef = doc(db, "configuracoes", "prova_ativa");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const inputQtd = document.getElementById("cfg-qtd-questoes");
        const selectMateria = document.getElementById("cfg-materia-ativa");
        const chkEmbaralhar = document.getElementById("cfg-embaralhar");

        if (inputQtd && data.qtdQuestoes) inputQtd.value = data.qtdQuestoes;
        if (selectMateria && data.materia) selectMateria.value = data.materia;
        if (chkEmbaralhar && data.embaralhar !== undefined) chkEmbaralhar.checked = data.embaralhar;
      }
    } catch (err) {
      console.warn("Erro ao ler configuracoes no painel:", err);
    }
  }

  // CADASTRO DE QUESTÕES NO FIRESTORE
  formCadQuestao?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btnSalvar = document.getElementById("btn-salvar-questao");
    btnSalvar.disabled = true;
    btnSalvar.textContent = "Salvando...";

    if (msgSucessoQuestao) msgSucessoQuestao.style.display = "none";
    if (msgErroQuestao) msgErroQuestao.style.display = "none";

    const categoria = document.getElementById("cad-materia").value;
    const pergunta = document.getElementById("cad-pergunta").value.trim();
    const opA = document.getElementById("cad-op-a").value.trim();
    const opB = document.getElementById("cad-op-b").value.trim();
    const opC = document.getElementById("cad-op-c").value.trim();
    const opD = document.getElementById("cad-op-d").value.trim();
    const correta = document.getElementById("cad-correta").value;

    const novaQuestao = {
      categoria: categoria,
      materia: categoria,
      pergunta: pergunta,
      questao: pergunta,
      opcoes: [opA, opB, opC, opD],
      alternativas: [opA, opB, opC, opD],
      correta: correta,
      resposta: correta,
      dataCriacao: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "questoes"), novaQuestao);

      if (msgSucessoQuestao) {
        msgSucessoQuestao.style.display = "block";
        setTimeout(() => { msgSucessoQuestao.style.display = "none"; }, 4000);
      }

      formCadQuestao.reset();
      carregarQuestoesDoBanco();
    } catch (error) {
      console.error("Erro ao salvar questão:", error);
      if (msgErroQuestao) {
        msgErroQuestao.textContent = "❌ Erro ao salvar questão: " + error.message;
        msgErroQuestao.style.display = "block";
      }
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.textContent = "Salvar Questão no Banco 💾";
    }
  });

  // CARREGAR E EXIBIR QUESTÕES DO FIRESTORE NO PAINEL
  async function carregarQuestoesDoBanco() {
    if (!listaQuestoesContainer) return;

    listaQuestoesContainer.innerHTML = `<p style="text-align:center;">⏳ Buscando questões...</p>`;

    try {
      const snapshot = await getDocs(collection(db, "questoes"));
      let html = "";
      let count = 0;

      snapshot.forEach(docSnap => {
        count++;
        const q = normalizarDocumentoQuestao(docSnap.data(), docSnap.id);

        html += `
          <div class="item-questao">
            <div class="item-questao-header">
              <span class="tag-materia">${q.categoria}</span>
              <button class="btn-deletar-q" data-id="${q.idDoc}">🗑️ Excluir</button>
            </div>
            <strong>${q.pergunta}</strong>
            <div style="font-size: 12px; margin-top: 6px; color: #9ca3af;">
              Correta: <strong>${q.correta}</strong>
            </div>
          </div>
        `;
      });

      if (totalQuestoesCount) totalQuestoesCount.textContent = count;

      if (count === 0) {
        listaQuestoesContainer.innerHTML = `<p style="text-align:center;">Nenhuma questão cadastrada ainda.</p>`;
      } else {
        listaQuestoesContainer.innerHTML = html;

        document.querySelectorAll(".btn-deletar-q").forEach(btn => {
          btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            if (confirm("Tem certeza que deseja apagar esta questão do banco?")) {
              try {
                await deleteDoc(doc(db, "questoes", id));
                carregarQuestoesDoBanco();
              } catch (err) {
                alert("Erro ao deletar: " + err.message);
              }
            }
          });
        });
      }

    } catch (err) {
      console.error("Erro ao listar questões:", err);
      listaQuestoesContainer.innerHTML = `<p style="color:#ef4444; text-align:center;">Erro ao carregar banco de questões.</p>`;
    }
  }

  btnRecarregarBancoQ?.addEventListener("click", carregarQuestoesDoBanco);

  // SALVAR CONFIGURAÇÕES DA PROVA
  formConfigProva?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btnSalvarCfg = document.getElementById("btn-salvar-config");
    btnSalvarCfg.disabled = true;

    const qtd = parseInt(document.getElementById("cfg-qtd-questoes").value) || 10;
    const materia = document.getElementById("cfg-materia-ativa").value;
    const embaralhar = document.getElementById("cfg-embaralhar").checked;

    try {
      await setDoc(doc(db, "configuracoes", "prova_ativa"), {
        qtdQuestoes: qtd,
        materia: materia,
        embaralhar: embaralhar,
        atualizadoEm: new Date().toISOString()
      });

      if (msgSucessoConfig) {
        msgSucessoConfig.style.display = "block";
        setTimeout(() => { msgSucessoConfig.style.display = "none"; }, 4000);
      }
    } catch (error) {
      alert("❌ Erro ao salvar configurações: " + error.message);
    } finally {
      btnSalvarCfg.disabled = false;
    }
  });

  // CARREGAR RESULTADOS
  function popularSelectTurmas(selectElem, turmasDoBanco) {
    if (!selectElem) return;
    
    selectElem.innerHTML = `<option value="TODAS">Todas as Turmas (Visão Geral)</option>`;
    Array.from(turmasDoBanco).sort().forEach(turma => {
      const opt = document.createElement("option");
      opt.value = turma;
      opt.textContent = turma;
      selectElem.appendChild(opt);
    });
  }

  async function carregarResultados() {
    if (!corpoTabela) return;
    corpoTabela.innerHTML = `<tr><td colspan="8" style="text-align:center;">⏳ Buscando avaliações...</td></tr>`;

    try {
      const snapshot = await getDocs(collection(db, "avaliacoes"));
      dadosResultadosGerais = [];
      const turmasEncontradas = new Set();

      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        dadosResultadosGerais.push({ idDoc: docSnap.id, ...d });
        if (d.turma) turmasEncontradas.add(d.turma);
      });

      dadosResultadosGerais.sort((a, b) => extrairTime(b.dataEnvio || b.data) - extrairTime(a.dataEnvio || a.data));

      if (filtroTurmaSelect) {
        popularSelectTurmas(filtroTurmaSelect, turmasEncontradas);
        filtroTurmaSelect.onchange = renderizarTabelaFiltrada;
      }

      renderizarTabelaFiltrada();
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      corpoTabela.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#ef4444;">❌ Erro ao carregar: ${error.message}</td></tr>`;
    }
  }

  function renderizarTabelaFiltrada() {
    if (!corpoTabela) return;

    const turmaSelecionada = filtroTurmaSelect ? filtroTurmaSelect.value : "TODAS";

    dadosFiltradosAtuais = dadosResultadosGerais.filter(d => {
      if (turmaSelecionada === "TODAS" || !turmaSelecionada) return true;
      return d.turma === turmaSelecionada;
    });

    if (dadosFiltradosAtuais.length === 0) {
      corpoTabela.innerHTML = `<tr><td colspan="8" style="text-align:center;">Nenhum resultado encontrado.</td></tr>`;
      if (mediaTurmaTxt) mediaTurmaTxt.textContent = "Média: --";
      return;
    }

    let somaNotas = 0;
    let html = "";

    dadosFiltradosAtuais.forEach(d => {
      const pontuacao = parseInt(d.pontuacao) || 0;
      const totalQ = parseInt(d.totalQuestoes) || 10;
      const notaCalculada = ((pontuacao / totalQ) * 10).toFixed(1);
      somaNotas += parseFloat(notaCalculada);

      const classeBadge = notaCalculada >= 6.0 ? "alta" : "baixa";
      const dataExibicao = formatarDataRegistro(d.dataEnvio || d.data);
      const nomeAluno = d.nomeAluno || d.nome || "Aluno Sem Nome";
      const idAluno = d.idAluno || obterIdAluno(nomeAluno, d.turma);
      const percentual = d.porcentagem !== undefined ? d.porcentagem : Math.round((pontuacao / totalQ) * 100);

      html += `
        <tr>
          <td>${dataExibicao}</td>
          <td><strong>${nomeAluno}</strong></td>
          <td>${d.turma || "N/A"}</td>
          <td>${pontuacao} / ${totalQ}</td>
          <td><span class="badge-nota ${classeBadge}">${notaCalculada}</span></td>
          <td>${percentual}%</td>
          <td><small>${d.materia || "Misto"}</small></td>
          <td class="no-print">
            <button class="btn-liberar-aluno" data-id="${idAluno}" style="background-color: #22c55e; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;">
              🔓 Autorizar
            </button>
          </td>
        </tr>
      `;
    });

    corpoTabela.innerHTML = html;

    document.querySelectorAll(".btn-liberar-aluno").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const targetId = e.target.getAttribute("data-id");
        try {
          e.target.disabled = true;
          e.target.textContent = "⏳ Autorizando...";
          
          await setDoc(doc(db, "permissoes_alunos", targetId), {
            podeFazer: true,
            autorizadoEm: new Date().toISOString()
          });

          alert("✅ Aluno liberado para refazer a prova!");
          e.target.textContent = "✅ Autorizado";
        } catch (err) {
          alert("❌ Erro ao autorizar: " + err.message);
          e.target.disabled = false;
          e.target.textContent = "🔓 Autorizar";
        }
      });
    });

    if (mediaTurmaTxt) {
      mediaTurmaTxt.textContent = `Média: ${(somaNotas / dadosFiltradosAtuais.length).toFixed(1)} / 10.0`;
    }
  }

  btnAtualizar?.addEventListener("click", carregarResultados);
  btnImprimir?.addEventListener("click", () => window.print());

  btnExportar?.addEventListener("click", () => {
    const dadosExportar = dadosFiltradosAtuais.length > 0 ? dadosFiltradosAtuais : dadosResultadosGerais;

    if (dadosExportar.length === 0) return alert("Sem dados para exportar.");

    let csvContent = "data:text/csv;charset=utf-8,Data/Hora,Nome,Turma,Pontos,Total,Percentual,Materia\n";
    dadosExportar.forEach(d => {
      csvContent += `"${d.dataEnvio || ''}","${d.nomeAluno || ''}","${d.turma || ''}",${d.pontuacao || 0},${d.totalQuestoes || 10},${d.porcentagem || 0},"${d.materia || ''}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Resultados_Quiz.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  carregarConfiguracoesPainel();
  carregarResultados();
  carregarQuestoesDoBanco();
}

// =========================================================================
// ÁREA DO ALUNO (index.html)
// =========================================================================
if (window.location.pathname.includes("index.html") || window.location.pathname.endsWith("/")) {

  let listaQuestoes = [];
  let indiceAtual = 0;
  let respostasUsuario = {};
  let alunoAtual = { nome: "", turma: "", materia: "", id: "" };

  const telaLogin = document.getElementById("tela-login");
  const telaQuiz = document.getElementById("tela-quiz");
  const telaResultado = document.getElementById("tela-resultado");
  const formLogin = document.getElementById("form-login");

  const perguntaTxt = document.getElementById("pergunta-txt");
  const opcoesContainer = document.getElementById("opcoes-container");
  const progressoTxt = document.getElementById("progresso-txt");
  const pontosTxt = document.getElementById("pontos-txt");

  const notaFinalTxt = document.getElementById("nota-final-txt");
  const detalhesAcertosTxt = document.getElementById("detalhes-acertos-txt");
  const statusEnvioTxt = document.getElementById("status-envio-txt");
  const btnReiniciar = document.getElementById("btn-reiniciar");

  formLogin?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const elemMateriaSelect = document.getElementById("materia-select");

    alunoAtual.nome = document.getElementById("nome-aluno").value.trim();
    alunoAtual.turma = document.getElementById("turma-aluno").value.trim();
    alunoAtual.materia = elemMateriaSelect ? elemMateriaSelect.value : "TODAS";
    alunoAtual.id = obterIdAluno(alunoAtual.nome, alunoAtual.turma);

    try {
      const permDoc = await getDoc(doc(db, "permissoes_alunos", alunoAtual.id));
      if (permDoc.exists() && permDoc.data().podeFazer === false) {
        alert("⛔ Você já realizou esta prova! Solicite a liberação do professor para refazer.");
        return;
      }
    } catch (err) {
      console.warn("Permissão não verificada:", err);
    }

    let configProva = { qtdQuestoes: 10, embaralhar: true, materia: "TODAS" };

    try {
      const configDoc = await getDoc(doc(db, "configuracoes", "prova_ativa"));
      if (configDoc.exists()) {
        const d = configDoc.data();
        configProva.qtdQuestoes = parseInt(d.qtdQuestoes) || 10;
        configProva.embaralhar = d.embaralhar ?? true;
        if (d.materia) configProva.materia = d.materia;
      }
    } catch (configErr) {
      console.warn("Usando configurações padrão:", configErr);
    }

    let bancoBruto = [];

    try {
      const snapshot = await getDocs(collection(db, "questoes"));
      snapshot.forEach(docSnap => {
        bancoBruto.push(normalizarDocumentoQuestao(docSnap.data(), docSnap.id));
      });
    } catch (error) {
      console.warn("Erro ao ler questões do Firestore:", error);
    }

    // Se o professor fixou uma matéria na configuração, ela prevalece sobre a escolha do aluno
    const materiaAlvo = (configProva.materia && configProva.materia !== "TODAS") 
      ? configProva.materia 
      : alunoAtual.materia;

    const matNorm = normalizarTexto(materiaAlvo);

    let questoesFiltradas = bancoBruto.filter(q => {
      if (matNorm === "todas" || matNorm.includes("misto") || matNorm === "") return true;
      const catNorm = normalizarTexto(q.categoria);
      return catNorm.includes(matNorm) || matNorm.includes(catNorm);
    });

    if (questoesFiltradas.length === 0) {
      questoesFiltradas = bancoBruto;
    }

    if (configProva.embaralhar) {
      questoesFiltradas.sort(() => Math.random() - 0.5);
    }

    // Aplica o limite exato definido nas configurações do painel
    const limite = Math.min(configProva.qtdQuestoes, questoesFiltradas.length);
    listaQuestoes = questoesFiltradas.slice(0, limite);

    if (listaQuestoes.length === 0) {
      alert("⚠️ Nenhuma questão cadastrada encontrada para esta matéria!");
      return;
    }

    respostasUsuario = {};
    indiceAtual = 0;

    garantirControlesNavegacao();

    telaLogin.classList.add("hidden");
    telaQuiz.classList.remove("hidden");

    exibirQuestao();
  });

  function garantirControlesNavegacao() {
    let containerAcoes = document.getElementById("controles-navegacao-quiz");
    
    if (!containerAcoes) {
      containerAcoes = document.createElement("div");
      containerAcoes.id = "controles-navegacao-quiz";
      containerAcoes.style.display = "flex";
      containerAcoes.style.justifyContent = "space-between";
      containerAcoes.style.marginTop = "20px";
      containerAcoes.style.gap = "10px";

      telaQuiz.appendChild(containerAcoes);
    }

    containerAcoes.innerHTML = `
      <button id="btn-anterior-quiz" type="button" style="background-color: #4b5563; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: bold;">
        ⬅ Anterior
      </button>
      <button id="btn-proxima-quiz" type="button" style="background-color: #2563eb; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: bold;">
        Próxima ➡
      </button>
      <button id="btn-finalizar-quiz" type="button" style="background-color: #22c55e; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: bold;">
        🏁 Finalizar Prova
      </button>
    `;

    document.getElementById("btn-anterior-quiz").onclick = () => {
      if (indiceAtual > 0) {
        indiceAtual--;
        exibirQuestao();
      }
    };

    document.getElementById("btn-proxima-quiz").onclick = () => {
      if (indiceAtual < listaQuestoes.length - 1) {
        indiceAtual++;
        exibirQuestao();
      }
    };

    document.getElementById("btn-finalizar-quiz").onclick = () => {
      const respondidas = Object.keys(respostasUsuario).length;
      const total = listaQuestoes.length;

      if (respondidas < total) {
        if (!confirm(`Você respondeu ${respondidas} de ${total} questões. Deseja finalizar assim mesmo?`)) return;
      } else {
        if (!confirm("Deseja enviar suas respostas e finalizar a prova?")) return;
      }

      finalizarProva();
    };
  }

  function exibirQuestao() {
    opcoesContainer.innerHTML = "";

    const q = listaQuestoes[indiceAtual];
    perguntaTxt.textContent = `${indiceAtual + 1}. ${q.pergunta}`;
    progressoTxt.textContent = `Questão ${indiceAtual + 1} de ${listaQuestoes.length}`;
    
    if (pontosTxt) {
      pontosTxt.textContent = `Respondidas: ${Object.keys(respostasUsuario).length} / ${listaQuestoes.length}`;
    }

    const letras = ["A", "B", "C", "D"];
    const respostaFeita = respostasUsuario[indiceAtual];

    q.opcoes.forEach((opcaoTexto, idx) => {
      const letra = letras[idx];
      const btn = document.createElement("button");
      btn.className = "opcao-btn";
      btn.textContent = `${letra}) ${opcaoTexto}`;
      
      btn.style.width = "100%";
      btn.style.padding = "12px 16px";
      btn.style.marginBottom = "10px";
      btn.style.borderRadius = "8px";
      btn.style.border = "1px solid #3b82f6";
      btn.style.cursor = "pointer";
      btn.style.textAlign = "left";

      if (respostaFeita !== undefined) {
        if (letra === q.correta) {
          btn.classList.add("correta-revelada");
          btn.textContent += "  ✅ (Correta)";
        } else if (respostaFeita === letra && respostaFeita !== q.correta) {
          btn.classList.add("incorreta");
          btn.textContent += "  ❌ (Sua Escolha)";
        } else {
          btn.style.opacity = "0.5";
          btn.style.backgroundColor = "transparent";
          btn.style.color = "#ffffff";
        }
      } else {
        btn.style.backgroundColor = "transparent";
        btn.style.color = "#ffffff";

        btn.onclick = () => {
          respostasUsuario[indiceAtual] = letra;
          exibirQuestao();
        };
      }

      opcoesContainer.appendChild(btn);
    });

    const btnAnt = document.getElementById("btn-anterior-quiz");
    const btnProx = document.getElementById("btn-proxima-quiz");
    const btnFin = document.getElementById("btn-finalizar-quiz");

    if (btnAnt) {
      btnAnt.disabled = (indiceAtual === 0);
      btnAnt.style.opacity = (indiceAtual === 0) ? "0.5" : "1";
      btnAnt.style.cursor = (indiceAtual === 0) ? "not-allowed" : "pointer";
    }

    const ehUltimaQuestao = (indiceAtual === listaQuestoes.length - 1);

    if (ehUltimaQuestao) {
      if (btnProx) btnProx.style.display = "none";
      if (btnFin) btnFin.style.display = "inline-block";
    } else {
      if (btnProx) btnProx.style.display = "inline-block";
      if (btnFin) btnFin.style.display = "none";
    }
  }

  async function finalizarProva() {
    telaQuiz.classList.add("hidden");
    telaResultado.classList.remove("hidden");

    let acertos = 0;
    listaQuestoes.forEach((q, idx) => {
      if (respostasUsuario[idx] === q.correta) acertos++;
    });

    const total = listaQuestoes.length;
    const nota = ((acertos / total) * 10).toFixed(1);
    const porcentagem = Math.round((acertos / total) * 100);

    notaFinalTxt.textContent = `Nota: ${nota} / 10.0`;
    detalhesAcertosTxt.textContent = `Você acertou ${acertos} de ${total} questões (${porcentagem}%).`;

    try {
      statusEnvioTxt.textContent = "Salvando resultado...";

      await addDoc(collection(db, "avaliacoes"), {
        idAluno: alunoAtual.id,
        nomeAluno: alunoAtual.nome,
        nome: alunoAtual.nome,
        turma: alunoAtual.turma,
        materia: alunoAtual.materia,
        pontuacao: acertos,
        totalQuestoes: total,
        porcentagem: porcentagem,
        dataEnvio: new Date().toISOString()
      });

      await setDoc(doc(db, "permissoes_alunos", alunoAtual.id), {
        podeFazer: false,
        ultimoAcesso: new Date().toISOString()
      });

      statusEnvioTxt.textContent = "Respostas enviadas com sucesso! ✅";
    } catch (error) {
      console.error("Erro ao salvar resultado:", error);
      statusEnvioTxt.textContent = "Erro ao enviar resultado: " + error.message;
    }
  }

  btnReiniciar?.addEventListener("click", () => {
    telaResultado.classList.add("hidden");
    telaLogin.classList.remove("hidden");
  });
}