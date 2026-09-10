// Importações das bibliotecas do Firebase SDK v10 (padrão modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuração oficial do seu Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCp40ALB_7lW7mOfX8NZkS8583YR3Khhbw",
  authDomain: "quiz-interativo-8a98c.firebaseapp.com",
  projectId: "quiz-interativo-8a98c",
  storageBucket: "quiz-interativo-8a98c.appspot.com",
  messagingSenderId: "948601017774",
  appId: "1:948601017774:web:bd0e038611ff6d2148643f"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// BANCO DE QUESTÕES (20 QUESTÕES: FRONT-END & IA)
// ==========================================
const questoes = [
  // --- MÓDULO: FRONT-END (HTML, CSS, JS) ---
  {
    pergunta: "1. Qual é a principal função do HTML em uma aplicação Web?",
    opcoes: [
      "A) Estilizar elementos visuais e aplicar cores",
      "B) Estruturar o conteúdo e a semântica da página",
      "C) Processar regras de negócios e conexões com banco de dados",
      "D) Gerenciar animações complexas em 3D"
    ],
    correta: 1
  },
  {
    pergunta: "2. Qual tag HTML semântica é recomendada para o menu principal de navegação?",
    opcoes: [
      "A) <menu-main>",
      "B) <header>",
      "C) <nav>",
      "D) <section>"
    ],
    correta: 2
  },
  {
    pergunta: "3. No CSS Flexbox, qual propriedade alinha os itens no eixo principal (horizontal por padrão)?",
    opcoes: [
      "A) align-items",
      "B) justify-content",
      "C) flex-direction",
      "D) align-content"
    ],
    correta: 1
  },
  {
    pergunta: "4. Qual propriedade CSS é utilizada para tornar um layout responsivo adaptável à largura da tela do usuário?",
    opcoes: [
      "A) @media queries",
      "B) display: inline",
      "C) position: absolute",
      "D) float: left"
    ],
    correta: 0
  },
  {
    pergunta: "5. Em JavaScript, qual declaração de variável possui escopo de bloco e não permite reatribuição?",
    opcoes: [
      "A) var",
      "B) let",
      "C) const",
      "D) static"
    ],
    correta: 2
  },
  {
    pergunta: "6. Qual método JavaScript é utilizado para selecionar um elemento do DOM através do seu ID?",
    opcoes: [
      "A) document.getElementByName()",
      "B) document.querySelector('.id')",
      "C) document.getElementById()",
      "D) document.findId()"
    ],
    correta: 2
  },
  {
    pergunta: "7. O que é o DOM (Document Object Model) no desenvolvimento Front-End?",
    opcoes: [
      "A) Uma linguagem de programação para servidores",
      "B) Uma representação em árvore dos elementos HTML da página acessível via script",
      "C) Um banco de dados relacional para navegadores",
      "D) Um framework de estilização CSS"
    ],
    correta: 1
  },
  {
    pergunta: "8. Em JavaScript, qual método de Array cria um novo array com os resultados de uma função aplicada a cada elemento?",
    opcoes: [
      "A) .forEach()",
      "B) .filter()",
      "C) .map()",
      "D) .push()"
    ],
    correta: 2
  },
  {
    pergunta: "9. O que significa a sigla API no contexto do desenvolvimento Web?",
    opcoes: [
      "A) Application Programming Interface",
      "B) Automated Program Integration",
      "C) Advanced Protocol Internet",
      "D) Asynchronous Page Interface"
    ],
    correta: 0
  },
  {
    pergunta: "10. Qual funcionalidade do JavaScript assíncrono é usada para aguardar a resolução de uma Promise de forma legível?",
    opcoes: [
      "A) try / catch",
      "B) async / await",
      "C) import / export",
      "D) setTimeout / setInterval"
    ],
    correta: 1
  },

  // --- MÓDULO: INTELIGÊNCIA ARTIFICIAL ---
  {
    pergunta: "11. O que caracteriza o Aprendizado de Máquina Supervisionado (Supervised Learning)?",
    opcoes: [
      "A) O algoritmo aprende sem nenhum dado de entrada",
      "B) Os dados de treinamento possuem rótulos (respostas corretas) pré-definidos",
      "C) O modelo aprende apenas por tentativa e erro acumulando recompensas",
      "D) O sistema utiliza apenas dados não estruturados e sem categorias"
    ],
    correta: 1
  },
  {
    pergunta: "12. Qual é a principal função de uma Rede Neural Artificial (RNA)?",
    opcoes: [
      "A) Executar comandos diretamente no hardware do computador",
      "B) Simular o funcionamento do cérebro humano para reconhecer padrões complexos",
      "C) Substituir completamente o uso de bancos de dados relacionais",
      "D) Compilar códigos de programação em linguagem de máquina"
    ],
    correta: 1
  },
  {
    pergunta: "13. O que são os LLMs (Large Language Models) como o ChatGPT e o Gemini?",
    opcoes: [
      "A) Softwares de edição gráfica baseados em vetores",
      "B) Modelos de IA treinados com grandes volumes de texto para entender e gerar linguagem natural",
      "C) Sistemas operacionais para servidores de alto desempenho",
      "D) Algoritmos exclusivos para cálculo de planilhas financeiras"
    ],
    correta: 1
  },
  {
    pergunta: "14. No contexto de IAs Generativas, o que significa o termo 'Prompt'?",
    opcoes: [
      "A) O tempo de resposta que o servidor leva para processar a IA",
      "B) A instrução, pergunta ou comando de texto fornecido pelo usuário à IA",
      "C) O erro gerado quando a IA fica sem memória",
      "D) A linguagem de código nativa dos robôs"
    ],
    correta: 1
  },
  {
    pergunta: "15. O que é uma 'Alucinação' no contexto dos modelos de linguagem de Inteligência Artificial?",
    opcoes: [
      "A) Um vírus que infecta os servidores da IA",
      "B) Quando o modelo gera informações falsas ou incorretas com tom de certeza",
      "C) O momento em que a IA desliga automaticamente por superaquecimento",
      "D) A capacidade da IA de sentir emoções humanas"
    ],
    correta: 1
  },
  {
    pergunta: "16. Qual técnica de aprendizado de máquina é baseada na interação com o ambiente através de recompensas e punições?",
    opcoes: [
      "A) Aprendizado Não Supervisionado",
      "B) Aprendizado por Reforço (Reinforcement Learning)",
      "C) Regressão Linear Simples",
      "D) Agrupamento K-Means"
    ],
    correta: 1
  },
  {
    pergunta: "17. O que é o Teste de Turing?",
    opcoes: [
      "A) Um teste de estresse para placas de vídeo e processadores",
      "B) Uma avaliação para medir se uma máquina consegue exibir comportamento inteligente indistinguível de um humano",
      "C) Um método para checar a velocidade da conexão de internet",
      "D) Um teste para identificar erros de sintaxe no código Python"
    ],
    correta: 1
  },
  {
    pergunta: "18. Qual das alternativas representa uma aplicação prática da Visão Computacional?",
    opcoes: [
      "A) Reconhecimento facial e leitura de placas de trânsito em câmeras",
      "B) Envio automático de e-mails de marketing",
      "C) Ordenação de arquivos em pastas locais",
      "D) Compressão de arquivos de áudio MP3"
    ],
    correta: 0
  },
  {
    pergunta: "19. Qual é o objetivo do Overfitting (Sobreajuste) que deve ser evitado durante o treinamento de um modelo de IA?",
    opcoes: [
      "A) O modelo fica rápido demais e consome pouca memória",
      "B) O modelo decora os dados de treino mas falha ao tentar generalizar para novos dados",
      "C) O modelo não consegue aprender nenhum padrão nos dados",
      "D) O modelo apaga os dados antigos para economizar espaço"
    ],
    correta: 1
  },
  {
    pergunta: "20. Qual linguagem de programação é atualmente a mais utilizada no desenvolvimento de modelos de Aprendizado de Máquina e IA?",
    opcoes: [
      "A) PHP",
      "B) Python",
      "C) C++",
      "D) Assembly"
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
  
  todosBotoes.forEach(b => b.style.pointerEvents = "none");

  const acertou = (indiceSelecionado === q.correta);
  
  if (acertou) {
    elementoClicado.classList.add("correta");
    pontuacao++;
    pontosAtuaisTxt.innerText = pontuacao;
  } else {
    elementoClicado.classList.add("incorreta");
    todosBotoes[q.correta].classList.add("correta");
  }

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

      let dataFormatada = "Recente";
      if (data.dataEnvio) {
        dataFormatada = data.dataEnvio.toDate().toLocaleString("pt-BR");
      }

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

if (corpoTabela) {
  carregarResultadosProfessor();
  if (btnAtualizar) {
    btnAtualizar.addEventListener("click", carregarResultadosProfessor);
  }
}