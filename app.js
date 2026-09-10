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
// BANCO DE QUESTÕES (20 QUESTÕES: FRONT-END E IA)
// ==========================================
const bancoQuestoesOriginal = [
  // --- FRONT-END ---
  {
    pergunta: "Qual é a principal função do HTML em uma página Web?",
    opcoes: [
      "Estilizar e dar cores aos elementos",
      "Estruturar o conteúdo e os elementos da página",
      "Executar lógica de banco de dados no servidor",
      "Criar animações complexas 3D"
    ],
    respostaCorreta: "Estruturar o conteúdo e os elementos da página"
  },
  {
    pergunta: "Qual tag HTML semântica é recomendada para o menu principal de navegação?",
    opcoes: [
      "<header>",
      "<section>",
      "<nav>",
      "<menu-main>"
    ],
    respostaCorreta: "<nav>"
  },
  {
    pergunta: "No CSS Flexbox, qual propriedade alinha os itens no eixo principal (horizontal por padrão)?",
    opcoes: [
      "justify-content",
      "align-items",
      "flex-direction",
      "align-content"
    ],
    respostaCorreta: "justify-content"
  },
  {
    pergunta: "Qual recurso CSS é utilizado para criar layouts responsivos que se adaptam ao tamanho da tela?",
    opcoes: [
      "display: inline",
      "position: absolute",
      "float: left",
      "@media queries"
    ],
    respostaCorreta: "@media queries"
  },
  {
    pergunta: "Em JavaScript, qual palavra-chave declara uma variável com escopo de bloco e valor imutável?",
    opcoes: [
      "var",
      "const",
      "let",
      "static"
    ],
    respostaCorreta: "const"
  },
  {
    pergunta: "Qual método JavaScript é utilizado para selecionar um elemento HTML diretamente pelo seu ID?",
    opcoes: [
      "document.querySelector('.id')",
      "document.getElementByName()",
      "document.getElementById()",
      "document.findId()"
    ],
    respostaCorreta: "document.getElementById()"
  },
  {
    pergunta: "O que é o DOM (Document Object Model) no desenvolvimento Web?",
    opcoes: [
      "Uma representação em árvore dos elementos HTML acessível via JavaScript",
      "Uma linguagem de programação para servidores web",
      "Um banco de dados relacional acoplado ao navegador",
      "Um framework de estilização CSS para páginas dinâmicas"
    ],
    respostaCorreta: "Uma representação em árvore dos elementos HTML acessível via JavaScript"
  },
  {
    pergunta: "Em JavaScript, qual método de Array cria um novo array transformando cada um dos elementos?",
    opcoes: [
      ".forEach()",
      ".filter()",
      ".push()",
      ".map()"
    ],
    respostaCorreta: ".map()"
  },
  {
    pergunta: "O que significa a sigla API no contexto de desenvolvimento de software?",
    opcoes: [
      "Application Programming Interface",
      "Automated Program Integration",
      "Advanced Protocol Internet",
      "Asynchronous Page Interface"
    ],
    respostaCorreta: "Application Programming Interface"
  },
  {
    pergunta: "Qual estrutura do JavaScript assíncrono permite aguardar a resposta de uma Promise com código limpo?",
    opcoes: [
      "try / catch",
      "async / await",
      "import / export",
      "setTimeout / setInterval"
    ],
    respostaCorreta: "async / await"
  },

  // --- INTELIGÊNCIA ARTIFICIAL ---
  {
    pergunta: "O que caracteriza o Aprendizado de Máquina Supervisionado (Supervised Learning)?",
    opcoes: [
      "O algoritmo aprende sem nenhum dado de entrada",
      "O modelo é treinado apenas por tentativa e erro",
      "Os dados de treinamento possuem rótulos (respostas corretas)",
      "O sistema utiliza apenas dados sem categorias prévias"
    ],
    respostaCorreta: "Os dados de treinamento possuem rótulos (respostas corretas)"
  },
  {
    pergunta: "Qual é a principal função de uma Rede Neural Artificial (RNA)?",
    opcoes: [
      "Executar comandos diretamente na placa-mãe",
      "Simular o processamento cerebral humano para identificar padrões",
      "Substituir a necessidade de utilizar banco de dados",
      "Compilar arquivos HTML e CSS em código de máquina"
    ],
    respostaCorreta: "Simular o processamento cerebral humano para identificar padrões"
  },
  {
    pergunta: "O que são os LLMs (Large Language Models) como o ChatGPT e o Gemini?",
    opcoes: [
      "Programas de edição gráfica baseados em vetores",
      "Sistemas operacionais para servidores em nuvem",
      "Algoritmos voltados para cálculo estatístico de planilhas",
      "Modelos treinados com vastos textos para processar e gerar linguagem natural"
    ],
    respostaCorreta: "Modelos treinados com vastos textos para processar e gerar linguagem natural"
  },
  {
    pergunta: "No contexto de IAs Generativas, o que representa o termo 'Prompt'?",
    opcoes: [
      "A instrução, pergunta ou texto enviado pelo usuário para a IA",
      "O tempo de resposta do servidor em milissegundos",
      "O erro de falta de memória da placa gráfica",
      "A linguagem secreta utilizada entre robôs"
    ],
    respostaCorreta: "A instrução, pergunta ou texto enviado pelo usuário para a IA"
  },
  {
    pergunta: "O que significa uma 'Alucinação' em um modelo de Inteligência Artificial?",
    opcoes: [
      "Um vírus detectado no código da aplicação",
      "Quando a IA gera uma informação falsa com tom de convicção",
      "O desligamento automático por superaquecimento do processador",
      "A capacidade do sistema de simular sentimentos reais"
    ],
    respostaCorreta: "Quando a IA gera uma informação falsa com tom de convicção"
  },
  {
    pergunta: "Qual tipo de aprendizado utiliza um sistema de recompensas e punições para treinar o agente?",
    opcoes: [
      "Aprendizado Não Supervisionado",
      "Regressão Linear",
      "Aprendizado por Reforço (Reinforcement Learning)",
      "Agrupamento K-Means"
    ],
    respostaCorreta: "Aprendizado por Reforço (Reinforcement Learning)"
  },
  {
    pergunta: "O que avalia o clássico Teste de Turing?",
    opcoes: [
      "Se uma máquina consegue exibir comportamento inteligente indistinguível de um humano",
      "A velocidade máxima de processamento de um chip",
      "A estabilidade de uma rede local sem fio",
      "A taxa de erros em códigos Python"
    ],
    respostaCorreta: "Se uma máquina consegue exibir comportamento inteligente indistinguível de um humano"
  },
  {
    pergunta: "Qual das opções representa uma aplicação prática de Visão Computacional?",
    opcoes: [
      "Disparo automático de e-mails em lote",
      "Ordenação alfabética de arquivos de texto",
      "Reconhecimento facial e leitura de placas de trânsito por câmeras",
      "Compactação de áudio no formato MP3"
    ],
    respostaCorreta: "Reconhecimento facial e leitura de placas de trânsito por câmeras"
  },
  {
    pergunta: "O que é o Overfitting (Sobreajuste) em um modelo de Aprendizado de Máquina?",
    opcoes: [
      "Quando o modelo aprende tão rápido que economiza memória",
      "Quando o modelo decora os dados de treino mas erra em dados novos",
      "Quando a IA não consegue identificar nenhum padrão nos dados",
      "Quando o banco de dados apaga registros antigos"
    ],
    respostaCorreta: "Quando o modelo decora os dados de treino mas erra em dados novos"
  },
  {
    pergunta: "Qual linguagem de programação é a mais popular no desenvolvimento de modelos de Aprendizado de Máquina?",
    opcoes: [
      "PHP",
      "C++",
      "Assembly",
      "Python"
    ],
    respostaCorreta: "Python"
  }
];

// Funções para Embaralhar (Algoritmo Fisher-Yates)
function embaralharArray(array) {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Estado da Aplicação
let questoesEmbaralhadas = [];
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

    // 🎲 EMBARALHA AS QUESTÕES E AS OPÇÕES AO INICIAR
    questoesEmbaralhadas = embaralharArray(bancoQuestoesOriginal).map((q, index) => {
      return {
        idOriginal: index + 1,
        pergunta: q.pergunta,
        opcoes: embaralharArray(q.opcoes),
        respostaCorreta: q.respostaCorreta
      };
    });

    telaLogin.classList.add("hidden");
    telaQuiz.classList.remove("hidden");

    carregarQuestao();
  });
}

// Carrega Questão Atual
function carregarQuestao() {
  btnProxima.classList.add("hidden");
  opcoesContainer.innerHTML = "";

  const q = questoesEmbaralhadas[indiceQuestaoAtual];
  progressoTxt.innerText = `Questão ${indiceQuestaoAtual + 1} de ${questoesEmbaralhadas.length}`;
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

// Lógica de Seleção de Resposta
function selecionarResposta(textoSelecionado, elementoClicado) {
  const q = questoesEmbaralhadas[indiceQuestaoAtual];
  const todosBotoes = opcoesContainer.querySelectorAll(".opcao-btn");
  
  todosBotoes.forEach(b => b.style.pointerEvents = "none");

  const acertou = (textoSelecionado === q.respostaCorreta);
  
  if (acertou) {
    elementoClicado.classList.add("correta");
    pontuacao++;
    pontosAtuaisTxt.innerText = pontuacao;
  } else {
    elementoClicado.classList.add("incorreta");
    
    // Destaca o botão que contém a resposta correta
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

  if (indiceQuestaoAtual + 1 < questoesEmbaralhadas.length) {
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
    if (indiceQuestaoAtual < questoesEmbaralhadas.length) {
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

  notaFinalTxt.innerText = `${pontuacao} / ${questoesEmbaralhadas.length}`;

  try {
    await addDoc(collection(db, "avaliacoes"), {
      nome: dadosAluno.nome,
      turma: dadosAluno.turma,
      pontuacao: pontuacao,
      totalQuestoes: questoesEmbaralhadas.length,
      percentual: Math.round((pontuacao / questoesEmbaralhadas.length) * 100),
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

      let resumoRespostas = data.respostas ? data.respostas.map((r, i) => 
        `Q${i + 1}: ${r.acertou ? '✅' : '❌'}`
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