// Importações das bibliotecas do Firebase SDK v10 (padrão modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 🔴 COPIE E COLE AQUI A SUA CONFIGURAÇÃO DO FIREBASE CONSOLE:
const firebaseConfig = {
  apiKey: "AIzaSyCp40ALB_7lW7mOfX8NZkS8583YR3Khhbw",
  authDomain: "quiz-interativo-8a98c.firebaseapp.com",
  projectId: "quiz-interativo-8a98c",
  storageBucket: "quiz-interativo-8a98c.firebasestorage.app",
  messagingSenderId: "948601017774",
  appId: "1:948601017774:web:bd0e038611ff6d2148643f"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// BANCO DE QUESTÕES DA AVALIAÇÃO
// (Altere com suas perguntas e respostas)
// ==========================================
const questoes = [
  {
    pergunta: "1. Qual é a principal função do HTML em uma página Web?",
    opcoes: [
      "A) Estilizar e dar cores aos elementos",
      "B) Estruturar o conteúdo e os elementos da página",
      "C) Executar lógica de banco de dados no servidor",
      "D) Criar animações complexas 3D"
    ],
    correta: 1 // Índice da resposta correta (0 = A, 1 = B, 2 = C, 3 = D)
  },
  {
    pergunta: "2. Qual tag HTML é utilizada para importar um arquivo de script JavaScript?",
    opcoes: [
      "A) <js>",
      "B) <javascript>",
      "C) <script>",
      "D) <link>"
    ],
    correta: 2
  },
  {
    pergunta: "3. No Git, qual comando é utilizado para salvar as alterações localmente com uma mensagem?",
    opcoes: [
      "A) git push",
      "B) git commit -m \"mensagem\"",
      "C) git add .",
      "D) git checkout"
    ],
    correta: 1
  }
];

// Estado da Aplicação
let indiceQuestaoAtual = 0;
let pontuacao = 0;
let respostasAluno = [];
let dadosAluno = { nome: "", turma: "" };

// Elementos DOM - Quiz
const telaLogin = document.getElementById("tela-login");
const telaQuiz = document.getElementById("tela-quiz");
const telaResultado = document.getElementById("tela-resultado");

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

// Elementos DOM - Painel Professor
const corpoTabela = document.getElementById("corpo-tabela");
const btnAtualizar = document.getElementById("btn-atualizar");

// Event Listener para Iniciar
if (btnIniciar) {
  btnIniciar.addEventListener("click", () => {
    const nome = inputNome.value.trim();
    const turma = inputTurma.value.trim();

    if (!nome || !turma) {
      alert("Por favor, preencha o Nome e a Turma antes de começar.");
      return;
    }

    dadosAluno.nome = nome;
    dadosAluno.turma = turma;

    telaLogin.classList.add("hidden");
    telaQuiz.classList.remove("hidden");

    carregarQuestao();
  });
}

// Carrega Questão Atual
function carregarQuestao() {
  btnProxima.classList.add("hidden");
  opcoesContainer.innerHTML = "";

  const q = questoes[indiceQuestaoAtual];
  progressoTxt.innerText = `Questão ${indiceQuestaoAtual + 1} de ${questoes.length}`;
  perguntaTitulo.innerText = q.pergunta;

  q.opcoes.forEach((opcao, index) => {
    const btnOpcao = document.createElement("button");
    btnOpcao.classList.add("opcao-btn");
    btnOpcao.innerText = opcao;
    btnOpcao.addEventListener("click", () => selecionarResposta(index, btnOpcao));
    opcoesContainer.appendChild(btnOpcao);
  });
}

// Lógica de Seleção de Resposta
function selecionarResposta(indiceSelecionado, elementoClicado) {
  const q = questoes[indiceQuestaoAtual];
  const todosBotoes = opcoesContainer.querySelectorAll(".opcao-btn");
  
  // Desabilita botões após escolher
  todosBotoes.forEach(b => b.style.pointerEvents = "none");

  const acertou = (indiceSelecionado === q.correta);
  
  if (acertou) {
    elementoClicado.classList.add("correta");
    pontuacao++;
    pontosAtuaisTxt.innerText = pontuacao;
  } else {
    elementoClicado.classList.add("incorreta");
    // Destaca a correta
    todosBotoes[q.correta].classList.add("correta");
  }

  // Registra a resposta dada pelo aluno
  respostasAluno.push({
    questao: indiceQuestaoAtual + 1,
    respostaDada: indiceSelecionado,
    correta: q.correta,
    acertou: acertou
  });

  if (indiceQuestaoAtual + 1 < questoes.length) {
    btnProxima.classList.remove("hidden");
  } else {
    btnProxima.innerText = "Finalizar e Enviar Avaliação 🏆";
    btnProxima.classList.remove("hidden");
  }
}

// Botão Próxima ou Finalizar
if (btnProxima) {
  btnProxima.addEventListener("click", () => {
    indiceQuestaoAtual++;
    if (indiceQuestaoAtual < questoes.length) {
      carregarQuestao();
    } else {
      finalizarQuiz();
    }
  });
}

// Finalização e Salvamento no Firebase Firestore
async function finalizarQuiz() {
  telaQuiz.classList.add("hidden");
  telaResultado.classList.remove("hidden");

  notaFinalTxt.innerText = `${pontuacao} / ${questoes.length}`;

  try {
    // Salva no Firestore na coleção "avaliacoes"
    await addDoc(collection(db, "avaliacoes"), {
      nome: dadosAluno.nome,
      turma: dadosAluno.turma,
      pontuacao: pontuacao,
      totalQuestoes: questoes.length,
      percentual: Math.round((pontuacao / questoes.length) * 100),
      respostas: respostasAluno,
      dataEnvio: serverTimestamp()
    });

    statusEnvioTxt.innerText = "✅ Resposta salva e enviada com sucesso ao professor!";
  } catch (error) {
    console.error("Erro ao salvar no Firebase:", error);
    statusEnvioTxt.innerText = "❌ Erro ao enviar resposta. Verifique a conexão com a internet.";
    statusEnvioTxt.style.color = "#ef4444";
  }
}

// ==========================================
// LÓGICA DO PAINEL DO PROFESSOR (painel.html)
// ==========================================
async function carregarResultadosProfessor() {
  if (!corpoTabela) return;

  corpoTabela.innerHTML = `<tr><td colspan="6" style="text-align:center;">Carregando dados...</td></tr>`;

  try {
    const q = query(collection(db, "avaliacoes"), orderBy("dataEnvio", "desc"));
    const querySnapshot = await getDocs(q);

    corpoTabela.innerHTML = "";

    if (querySnapshot.empty) {
      corpoTabela.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhuma avaliação realizada ainda.</td></tr>`;
      return;
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const tr = document.createElement("tr");

      // Formatação da Data
      let dataFormatada = "Recente";
      if (data.dataEnvio) {
        dataFormatada = data.dataEnvio.toDate().toLocaleString("pt-BR");
      }

      // Detalhes das respostas (ex: Q1: ✅ | Q2: ❌)
      let resumoRespostas = data.respostas ? data.respostas.map(r => 
        `Q${r.questao}: ${r.acertou ? '✅' : '❌'}`
      ).join(" | ") : "N/A";

      tr.innerHTML = `
        <td>${dataFormatada}</td>
        <td><strong>${data.nome}</strong></td>
        <td>${data.turma}</td>
        <td>${data.pontuacao} / ${data.totalQuestoes}</td>
        <td><strong>${data.percentual}%</strong></td>
        <td><small>${resumoRespostas}</small></td>
      `;

      corpoTabela.appendChild(tr);
    });
  } catch (error) {
    console.error("Erro ao buscar relatórios:", error);
    corpoTabela.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444;">Erro ao carregar os dados.</td></tr>`;
  }
}

// Inicia busca se estiver na página do painel
if (corpoTabela) {
  carregarResultadosProfessor();
  if (btnAtualizar) {
    btnAtualizar.addEventListener("click", carregarResultadosProfessor);
  }
}