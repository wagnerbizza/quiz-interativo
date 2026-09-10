// Importações do Firebase SDK v10
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, query, orderBy, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCp40ALB_7lW7mOfX8NZkS8583YR3Khhbw",
  authDomain: "quiz-interativo-8a98c.firebaseapp.com",
  projectId: "quiz-interativo-8a98c",
  storageBucket: "quiz-interativo-8a98c.appspot.com",
  messagingSenderId: "948601017774",
  appId: "1:948601017774:web:bd0e038611ff6d2148643f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const bancoInicialExpansivo = [
  { pergunta: "Qual é a principal função do HTML em uma página Web?", opcoes: ["Estilizar e dar cores aos elementos", "Estruturar o conteúdo e os elementos da página", "Executar lógica de banco de dados no servidor", "Criar animações complexas 3D"], respostaCorreta: "Estruturar o conteúdo e os elementos da página", categoria: "Front-End" },
  { pergunta: "Qual tag HTML semântica é recomendada para o menu principal de navegação?", opcoes: ["<header>", "<section>", "<nav>", "<menu-main>"], respostaCorreta: "<nav>", categoria: "Front-End" },
  { pergunta: "No CSS Flexbox, qual propriedade alinha os itens no eixo principal?", opcoes: ["justify-content", "align-items", "flex-direction", "align-content"], respostaCorreta: "justify-content", categoria: "Front-End" },
  { pergunta: "Qual recurso CSS é utilizado para criar layouts responsivos adaptáveis à tela?", opcoes: ["display: inline", "position: absolute", "float: left", "@media queries"], respostaCorreta: "@media queries", categoria: "Front-End" },
  { pergunta: "Em JavaScript, qual palavra-chave declara uma variável imutável com escopo de bloco?", opcoes: ["var", "const", "let", "static"], respostaCorreta: "const", categoria: "Front-End" },
  { pergunta: "O que caracteriza o Aprendizado de Máquina Supervisionado?", opcoes: ["O algoritmo aprende sem dados", "O modelo aprende por tentativa e erro", "Os dados de treinamento possuem rótulos (respostas corretas)", "O sistema usa dados sem categorias"], respostaCorreta: "Os dados de treinamento possuem rótulos (respostas corretas)", categoria: "IA" },
  { pergunta: "Qual é a principal função de uma Rede Neural Artificial?", opcoes: ["Executar comandos no hardware", "Simular o processamento cerebral humano para identificar padrões", "Substituir bancos de dados", "Compilar código HTML"], respostaCorreta: "Simular o processamento cerebral humano para identificar padrões", categoria: "IA" },
  { pergunta: "No contexto de IAs Generativas, o que representa o termo 'Prompt'?", opcoes: ["A instrução, pergunta ou texto enviado pelo usuário para a IA", "O tempo de resposta do servidor", "O erro de falta de memória da GPU", "A linguagem interna dos robôs"], respostaCorreta: "A instrução, pergunta ou texto enviado pelo usuário para a IA", categoria: "IA" },
  { pergunta: "O que significa uma 'Alucinação' em modelos de linguagem de IA?", opcoes: ["Um vírus no sistema", "Quando a IA gera informação falsa com tom de convicção", "O desligamento por superaquecimento", "A capacidade da IA de sentir emoções"], respostaCorreta: "Quando a IA gera informação falsa com tom de convicção", categoria: "IA" },
  { pergunta: "Qual linguagem é a mais popular para o desenvolvimento de Machine Learning?", opcoes: ["PHP", "C++", "Assembly", "Python"], respostaCorreta: "Python", categoria: "IA" },
  { pergunta: "Qual protocolo da camada de aplicação garante comunicação criptografada na Web?", opcoes: ["HTTP", "FTP", "HTTPS", "DNS"], respostaCorreta: "HTTPS", categoria: "Redes e Nuvem" },
  { pergunta: "Qual modelo de serviço em nuvem fornece uma aplicação pronta para o usuário final via navegador?", opcoes: ["IaaS (Infrastructure as a Service)", "PaaS (Platform as a Service)", "SaaS (Software as a Service)", "FaaS (Function as a Service)"], respostaCorreta: "SaaS (Software as a Service)", categoria: "Redes e Nuvem" },
  { pergunta: "Qual é o principal objetivo de um Firewall em uma infraestrutura de rede?", opcoes: ["Aumentar a velocidade da conexão de internet", "Filtrar e monitorar o tráfego de dados autorizados e bloquear tráfego suspeito", "Armazenar arquivos e bancos de dados dos usuários", "Distribuir endereços IP automaticamente"], respostaCorreta: "Filtrar e monitorar o tráfego de dados autorizados e bloquear tráfego suspeito", categoria: "Redes e Nuvem" },
  { pergunta: "O que caracteriza o ataque cibernético do tipo Phishing?", opcoes: ["Inundar um servidor com acessos falsos até derrubá-lo", "Enganar usuários usando mensagens ou e-mails falsos para roubar credenciais", "Infectar o computador com um vírus que sequestra arquivos", "Descobrir senhas por força bruta"], respostaCorreta: "Enganar usuários usando mensagens ou e-mails falsos para roubar credenciais", categoria: "Redes e Nuvem" },
  { pergunta: "O que é o conceito de Autenticação Multifator (MFA)?", opcoes: ["Utilizar a mesma senha para vários sistemas diferentes", "Exigir dois ou mais fatores de verificação para conceder acesso ao usuário", "Trocar a senha do usuário a cada 24 horas", "Permitir acesso apenas por rede cabeada"], respostaCorreta: "Exigir dois ou mais fatores de verificação para conceder acesso ao usuário", categoria: "Redes e Nuvem" },
  { pergunta: "No framework Scrum, quem é o responsável por priorizar o Backlog do Produto?", opcoes: ["Scrum Master", "Product Owner (PO)", "Development Team", "Stakeholders"], respostaCorreta: "Product Owner (PO)", categoria: "Metodologias Ageis" },
  { pergunta: "O que é uma 'Sprint' no desenvolvimento ágil Scrum?", opcoes: ["Um teste de velocidade do servidor", "Um ciclo de trabalho com tempo delimitado (timebox) para entregar um incremento pronto", "Uma reunião diária de 15 minutos", "Uma etapa de testes de segurança no final do projeto"], respostaCorreta: "Um ciclo de trabalho com tempo delimitado (timebox) para entregar um incremento pronto", categoria: "Metodologias Ageis" },
  { pergunta: "Qual é o foco principal da ferramenta visual Kanban?", opcoes: ["Limitar o trabalho em andamento (WIP) e otimizar o fluxo contínuo de tarefas", "Documentar detalhadamente todas as fases do sistema em PDF", "Substituir reuniões de alinhamento com a equipe", "Gerenciar os salários da equipe de desenvolvimento"], respostaCorreta: "Limitar o trabalho em andamento (WIP) e otimizar o fluxo contínuo de tarefas", categoria: "Metodologias Ageis" },
  { pergunta: "No Manifesto Ágil, qual valor se sobrepõe a 'processos e ferramentas'?", opcoes: ["Documentação abrangente", "Indivíduos e interações", "Negociação de contratos", "Seguir um plano rígido"], respostaCorreta: "Indivíduos e interações", categoria: "Metodologias Ageis" },
  { pergunta: "O que significa a prática de Integração Contínua (CI) na engenharia de software?", opcoes: ["Desenvolver todo o software antes de testar com os clientes", "Automatizar a compilação e os testes do código sempre que uma alteração é enviada", "Trabalhar em turnos ininterruptos de 24 horas", "Utilizar apenas linguagens de programação orientadas a objetos"], respostaCorreta: "Automatizar a compilação e os testes do código sempre que uma alteração é enviada", categoria: "Metodologias Ageis" }
];

function embaralharArray(array) {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// -------------------------------------------------------------
// LÓGICA DO ALUNO (index.html)
// -------------------------------------------------------------
const telaLogin = document.getElementById("tela-login");
const telaQuiz = document.getElementById("tela-quiz");
const telaResultado = document.getElementById("tela-resultado");

if (telaLogin) {
  const inputNome = document.getElementById("nome-aluno");
  const inputTurma = document.getElementById("turma-aluno");
  const btnIniciar = document.getElementById("btn-iniciar");

  const progressoTxt = document.getElementById("progresso-txt");
  const pontosAtuaisTxt = document.getElementById("pontos-atuais");
  const perguntaTitulo = document.getElementById("pergunta-titulo");
  const opcoesContainer = document.getElementById("opcoes-container");
  const btnProxima = document.getElementById("btn-proxima");

  const notaFinalTxt = document.getElementById("nota-final");
  const statusEnvioTxt = document.getElementById("status-envio");

  let questoesProva = [];
  let indiceQuestaoAtual = 0;
  let pontuacao = 0;
  let respostasAluno = [];
  let dadosAluno = { nome: "", turma: "" };

  btnIniciar.addEventListener("click", async () => {
    const nome = inputNome.value.trim();
    const turma = inputTurma.value.trim();

    if (!nome || !turma) {
      alert("Por favor, preencha o Nome e a Turma para iniciar.");
      return;
    }

    btnIniciar.innerText = "Carregando Prova...";
    btnIniciar.disabled = true;

    dadosAluno.nome = nome;
    dadosAluno.turma = turma;

    let config = { qtdQuestoes: 10, embaralhar: true, materia: "TODAS" };
    try {
      const configDoc = await getDoc(doc(db, "configuracoes", "provaAtiva"));
      if (configDoc.exists()) {
        config = configDoc.data();
      }
    } catch (err) {
      console.warn("Usando configuração padrão de prova:", err);
    }

    try {
      const snapshot = await getDocs(collection(db, "questoes"));
      let listaBanco = [];
      snapshot.forEach(docSnap => listaBanco.push(docSnap.data()));

      if (config.materia !== "TODAS") {
        listaBanco = listaBanco.filter(q => q.categoria === config.materia);
      }

      if (listaBanco.length === 0) {
        alert("Nenhuma questão disponível para a matéria selecionada.");
        btnIniciar.innerText = "Iniciar Avaliação 🚀";
        btnIniciar.disabled = false;
        return;
      }

      if (config.embaralhar) {
        listaBanco = embaralharArray(listaBanco);
      }

      const qtdDesejada = Math.min(config.qtdQuestoes, listaBanco.length);
      const selecionadas = listaBanco.slice(0, qtdDesejada);

      questoesProva = selecionadas.map((q) => ({
        pergunta: q.pergunta,
        opcoes: config.embaralhar ? embaralharArray(q.opcoes) : [...q.opcoes],
        respostaCorreta: q.respostaCorreta
      }));

      telaLogin.classList.add("hidden");
      telaQuiz.classList.remove("hidden");
      carregarQuestao();

    } catch (error) {
      console.error("Erro ao carregar prova:", error);
      alert("Erro ao carregar questões.");
      btnIniciar.innerText = "Iniciar Avaliação 🚀";
      btnIniciar.disabled = false;
    }
  });

  function carregarQuestao() {
    btnProxima.classList.add("hidden");
    opcoesContainer.innerHTML = "";

    const q = questoesProva[indiceQuestaoAtual];
    progressoTxt.innerText = `Questão ${indiceQuestaoAtual + 1} de ${questoesProva.length}`;
    perguntaTitulo.innerText = `${indiceQuestaoAtual + 1}. ${q.pergunta}`;

    const letras = ["A", "B", "C", "D"];

    q.opcoes.forEach((opcaoTexto, index) => {
      const btnOpcao = document.createElement("button");
      btnOpcao.classList.add("opcao-btn");
      btnOpcao.innerText = `${letras[index]}) ${opcaoTexto}`;
      btnOpcao.addEventListener("click", () => selecionarResposta(opcaoTexto, btnOpcao));
      opcoesContainer.appendChild(btnOpcao);
    });
  }

  function selecionarResposta(textoSelecionado, elementoClicado) {
    const q = questoesProva[indiceQuestaoAtual];
    const todosBotoes = opcoesContainer.querySelectorAll(".opcao-btn");
    
    todosBotoes.forEach(b => b.style.pointerEvents = "none");

    const acertou = (textoSelecionado === q.respostaCorreta);
    
    if (acertou) {
      elementoClicado.classList.add("correta");
      pontuacao++;
      pontosAtuaisTxt.innerText = pontuacao;
    } else {
      elementoClicado.classList.add("incorreta");
      todosBotoes.forEach(b => {
        if (b.innerText.includes(q.respostaCorreta)) {
          b.classList.add("correta");
        }
      });
    }

    respostasAluno.push({
      questaoNum: indiceQuestaoAtual + 1,
      pergunta: q.pergunta,
      respostaDada: textoSelecionado,
      respostaCerta: q.respostaCorreta,
      acertou: acertou
    });

    if (indiceQuestaoAtual + 1 < questoesProva.length) {
      btnProxima.classList.remove("hidden");
    } else {
      btnProxima.innerText = "Finalizar e Enviar Avaliação 🏆";
      btnProxima.classList.remove("hidden");
    }
  }

  btnProxima.addEventListener("click", () => {
    indiceQuestaoAtual++;
    if (indiceQuestaoAtual < questoesProva.length) {
      carregarQuestao();
    } else {
      finalizarQuiz();
    }
  });

  async function finalizarQuiz() {
    telaQuiz.classList.add("hidden");
    telaResultado.classList.remove("hidden");

    const notaCalculada = parseFloat(((pontuacao / questoesProva.length) * 10).toFixed(1));
    const percentualCalculado = Math.round((pontuacao / questoesProva.length) * 100);

    notaFinalTxt.innerHTML = `
      Acertos: <strong>${pontuacao} de ${questoesProva.length}</strong><br>
      Sua Nota: <span style="font-size: 2rem; color: #38bdf8;">${notaCalculada.toFixed(1)} / 10.0</span> (${percentualCalculado}%)
    `;

    try {
      await addDoc(collection(db, "avaliacoes"), {
        nome: dadosAluno.nome,
        turma: dadosAluno.turma,
        pontuacao: pontuacao,
        totalQuestoes: questoesProva.length,
        notaDez: notaCalculada,
        percentual: percentualCalculado,
        respostas: respostasAluno,
        dataEnvio: serverTimestamp()
      });

      statusEnvioTxt.innerText = "✅ Resposta salva e enviada com sucesso!";
    } catch (error) {
      console.error("Erro ao salvar:", error);
      statusEnvioTxt.innerText = "❌ Erro ao enviar resposta.";
      statusEnvioTxt.style.color = "#ef4444";
    }
  }
}

// -------------------------------------------------------------
// LÓGICA DO PAINEL DO PROFESSOR (painel.html)
// -------------------------------------------------------------
const corpoTabela = document.getElementById("corpo-tabela");

if (corpoTabela) {
  const btnCarregarBanco = document.getElementById("btn-carregar-banco");
  const msgBanco = document.getElementById("msg-banco");

  const btnSalvarConfig = document.getElementById("btn-salvar-config");
  const qtdInput = document.getElementById("qtd-questoes-config");
  const materiaSelect = document.getElementById("materia-filter");
  const embaralharCheck = document.getElementById("embaralhar-check");
  const msgConfig = document.getElementById("msg-config");

  const formNovaQuestao = document.getElementById("form-nova-questao");
  const msgCadastro = document.getElementById("msg-cadastro");
  const btnAtualizar = document.getElementById("btn-atualizar");
  const mediaTurmaTxt = document.getElementById("media-turma-txt");

  const btnImprimir = document.getElementById("btn-imprimir");
  const btnExportar = document.getElementById("btn-exportar");
  const filtroTurmaSelect = document.getElementById("filtro-turma-tabela");

  let todasAvaliacoes = [];

  // MINI CALCULADORA RÁPIDA
  const calcAcertos = document.getElementById("calc-acertos");
  const calcTotal = document.getElementById("calc-total");
  const calcResultadoTxt = document.getElementById("calc-resultado-txt");

  function calcularMediaManual() {
    const acertos = parseFloat(calcAcertos.value) || 0;
    const total = parseFloat(calcTotal.value) || 1;
    if (total <= 0) return;
    const nota = ((acertos / total) * 10).toFixed(1);
    calcResultadoTxt.innerText = `${nota} / 10.0`;
  }

  if (calcAcertos && calcTotal) {
    calcAcertos.addEventListener("input", calcularMediaManual);
    calcTotal.addEventListener("input", calcularMediaManual);
  }

  // IMPRIMIR PDF
  if (btnImprimir) {
    btnImprimir.addEventListener("click", () => window.print());
  }

  // EXPORTAR PARA EXCEL (CSV) FILTRADO POR TURMAS SELECIONADAS
  if (btnExportar) {
    btnExportar.addEventListener("click", () => {
      // Captura todas as opções de turmas selecionadas no <select multiple>
      const turmasSelecionadas = Array.from(filtroTurmaSelect.selectedOptions).map(opt => opt.value);

      const dadosFiltrados = (turmasSelecionadas.length === 0 || turmasSelecionadas.includes("TODAS"))
        ? todasAvaliacoes 
        : todasAvaliacoes.filter(item => turmasSelecionadas.includes(item.turma));

      if (dadosFiltrados.length === 0) {
        alert("Não há registros disponíveis para a(s) turma(s) selecionada(s).");
        return;
      }

      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      csvContent += "Data/Hora;Nome do Aluno;Turma;Acertos;Total Questoes;Nota (0-10);Percentual Acerto\n";

      dadosFiltrados.forEach(row => {
        csvContent += `"${row.data}";"${row.nome}";"${row.turma}";"${row.pontuacao}";"${row.totalQuestoes}";"${row.nota.replace('.', ',')}";"${row.percentual}%"\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      const nomeArquivo = (turmasSelecionadas.length === 0 || turmasSelecionadas.includes("TODAS"))
        ? "Relatorio_Todas_Turmas.csv" 
        : `Relatorio_Turmas_Selecionadas.csv`;

      link.setAttribute("href", encodedUri);
      link.setAttribute("download", nomeArquivo);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // FILTRO DINÂMICO DA TABELA
  if (filtroTurmaSelect) {
    filtroTurmaSelect.addEventListener("change", renderizarTabela);
  }

  function renderizarTabela() {
    // Captura o array contendo os valores de TODAS as turmas marcadas pelo professor
    const turmasSelecionadas = Array.from(filtroTurmaSelect.selectedOptions).map(opt => opt.value);

    // Se "TODAS" estiver selecionada ou nada selecionado, mostra tudo. Caso contrário, filtra pelas turmas escolhidas.
    const dadosExibicao = (turmasSelecionadas.length === 0 || turmasSelecionadas.includes("TODAS"))
      ? todasAvaliacoes 
      : todasAvaliacoes.filter(item => turmasSelecionadas.includes(item.turma));

    corpoTabela.innerHTML = "";

    if (dadosExibicao.length === 0) {
      corpoTabela.innerHTML = `<tr><td colspan="7" style="text-align:center;">Nenhum registro para a(s) turma(s) selecionada(s).</td></tr>`;
      mediaTurmaTxt.innerText = "Média: --";
      return;
    }

    let somaNotas = 0;

    dadosExibicao.forEach((item) => {
      const tr = document.createElement("tr");
      const notaNum = parseFloat(item.nota);
      somaNotas += notaNum;

      const classeNota = notaNum >= 6.0 ? "alta" : "baixa";

      tr.innerHTML = `
        <td>${item.data}</td>
        <td><strong>${item.nome}</strong></td>
        <td>${item.turma}</td>
        <td>${item.pontuacao} / ${item.totalQuestoes}</td>
        <td><span class="badge-nota ${classeNota}">${item.nota}</span></td>
        <td><strong>${item.percentual}%</strong></td>
        <td class="no-print"><small>${item.resumo}</small></td>
      `;

      corpoTabela.appendChild(tr);
    });

    const mediaGeral = (somaNotas / dadosExibicao.length).toFixed(1);
    mediaTurmaTxt.innerText = `Média: ${mediaGeral} / 10.0`;
  }

  async function carregarResultadosProfessor() {
    corpoTabela.innerHTML = `<tr><td colspan="7" style="text-align:center;">Carregando dados...</td></tr>`;

    try {
      const q = query(collection(db, "avaliacoes"), orderBy("dataEnvio", "desc"));
      const querySnapshot = await getDocs(q);

      todasAvaliacoes = [];
      const turmasUnicas = new Set();

      if (querySnapshot.empty) {
        corpoTabela.innerHTML = `<tr><td colspan="7" style="text-align:center;">Nenhuma avaliação realizada ainda.</td></tr>`;
        mediaTurmaTxt.innerText = "Média: --";
        return;
      }

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();

        let dataFormatada = "Recente";
        if (data.dataEnvio) {
          dataFormatada = data.dataEnvio.toDate().toLocaleString("pt-BR");
        }

        const notaNum = data.notaDez !== undefined 
          ? data.notaDez 
          : parseFloat(((data.pontuacao / data.totalQuestoes) * 10).toFixed(1));

        let resumoRespostas = data.respostas ? data.respostas.map((r, i) => 
          `Q${i + 1}: ${r.acertou ? '✅' : '❌'}`
        ).join(" | ") : "N/A";

        if (data.turma) {
          turmasUnicas.add(data.turma);
        }

        todasAvaliacoes.push({
          data: dataFormatada,
          nome: data.nome,
          turma: data.turma || "Sem Turma",
          pontuacao: data.pontuacao,
          totalQuestoes: data.totalQuestoes,
          nota: notaNum.toFixed(1),
          percentual: data.percentual,
          resumo: resumoRespostas
        });
      });

      // Preserva as turmas atualmente selecionadas pelo professor
      const turmasAnteriormenteSelecionadas = Array.from(filtroTurmaSelect.selectedOptions).map(opt => opt.value);
      
      filtroTurmaSelect.innerHTML = `<option value="TODAS">Todas as Turmas</option>`;
      
      Array.from(turmasUnicas).sort().forEach(turma => {
        const opt = document.createElement("option");
        opt.value = turma;
        opt.innerText = `Turma ${turma}`;
        filtroTurmaSelect.appendChild(opt);
      });

      // Remarca as turmas que já estavam selecionadas
      Array.from(filtroTurmaSelect.options).forEach(opt => {
        if (turmasAnteriormenteSelecionadas.includes(opt.value)) {
          opt.selected = true;
        }
      });

      renderizarTabela();

    } catch (error) {
      console.error("Erro ao buscar relatórios:", error);
      corpoTabela.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ef4444;">Erro ao carregar dados.</td></tr>`;
    }
  }

  if (btnCarregarBanco) {
    btnCarregarBanco.addEventListener("click", async () => {
      btnCarregarBanco.disabled = true;
      msgBanco.innerText = "Enviando questões para o Firebase...";
      msgBanco.style.color = "#38bdf8";

      try {
        for (const q of bancoInicialExpansivo) {
          await addDoc(collection(db, "questoes"), q);
        }
        msgBanco.innerText = "✅ Questões carregadas!";
        msgBanco.style.color = "#22c55e";
      } catch (err) {
        msgBanco.innerText = "❌ Erro ao enviar.";
        msgBanco.style.color = "#ef4444";
      } finally {
        btnCarregarBanco.disabled = false;
      }
    });
  }

  async function carregarConfigAtuais() {
    try {
      const configDoc = await getDoc(doc(db, "configuracoes", "provaAtiva"));
      if (configDoc.exists()) {
        const data = configDoc.data();
        qtdInput.value = data.qtdQuestoes || 10;
        materiaSelect.value = data.materia || "TODAS";
        embaralharCheck.checked = data.embaralhar !== undefined ? data.embaralhar : true;
      }
    } catch (err) {
      console.error("Erro ao carregar configurações:", err);
    }
  }
  carregarConfigAtuais();

  btnSalvarConfig.addEventListener("click", async () => {
    btnSalvarConfig.disabled = true;
    msgConfig.innerText = "Salvando...";

    try {
      await setDoc(doc(db, "configuracoes", "provaAtiva"), {
        qtdQuestoes: parseInt(qtdInput.value, 10),
        materia: materiaSelect.value,
        embaralhar: embaralharCheck.checked,
        atualizadoEm: serverTimestamp()
      });

      msgConfig.innerText = "✅ Configuração salva!";
      msgConfig.style.color = "#22c55e";
    } catch (err) {
      msgConfig.innerText = "❌ Erro ao salvar.";
      msgConfig.style.color = "#ef4444";
    } finally {
      btnSalvarConfig.disabled = false;
    }
  });

  formNovaQuestao.addEventListener("submit", async (e) => {
    e.preventDefault();
    msgCadastro.innerText = "Cadastrando...";

    const pergunta = document.getElementById("nova-pergunta").value.trim();
    const opA = document.getElementById("op-a").value.trim();
    const opB = document.getElementById("op-b").value.trim();
    const opC = document.getElementById("op-c").value.trim();
    const opD = document.getElementById("op-d").value.trim();
    const respCorretaLetra = document.getElementById("resp-correta").value;
    const categoria = document.getElementById("categoria-questao").value;

    const opcoes = [opA, opB, opC, opD];
    let respostaCorreta = opA;
    if (respCorretaLetra === "B") respostaCorreta = opB;
    if (respCorretaLetra === "C") respostaCorreta = opC;
    if (respCorretaLetra === "D") respostaCorreta = opD;

    try {
      await addDoc(collection(db, "questoes"), { pergunta, opcoes, respostaCorreta, categoria });
      msgCadastro.innerText = "✅ Questão cadastrada!";
      msgCadastro.style.color = "#22c55e";
      formNovaQuestao.reset();
    } catch (err) {
      msgCadastro.innerText = "❌ Erro ao cadastrar.";
      msgCadastro.style.color = "#ef4444";
    }
  });

  carregarResultadosProfessor();
  btnAtualizar.addEventListener("click", carregarResultadosProfessor);
}