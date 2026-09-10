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
// BANCO DE QUESTÕES (20 QUESTÕES COM ALTERNATIVAS EMBARALHADAS)
// ==========================================
const questoes = [
  // --- FRONT-END ---
  {
    pergunta: "1. Qual é a principal função do HTML em uma página Web?",
    opcoes: [
      "A) Estilizar e dar cores aos elementos",
      "B) Estruturar o conteúdo e os elementos da página",
      "C) Executar lógica de banco de dados no servidor",
      "D) Criar animações complexas 3D"
    ],
    correta: 1 // B
  },
  {
    pergunta: "2. Qual tag HTML semântica é recomendada para o menu principal de navegação?",
    opcoes: [
      "A) <header>",
      "B) <section>",
      "C) <nav>",
      "D) <menu-main>"
    ],
    correta: 2 // C
  },
  {
    pergunta: "3. No CSS Flexbox, qual propriedade alinha os itens no eixo principal (horizontal por padrão)?",
    opcoes: [
      "A) justify-content",
      "B) align-items",
      "C) flex-direction",
      "D) align-content"
    ],
    correta: 0 // A
  },
  {
    pergunta: "4. Qual recurso CSS é utilizado para criar layouts responsivos que se adaptam ao tamanho da tela?",
    opcoes: [
      "A) display: inline",
      "B) position: absolute",
      "C) float: left",
      "D) @media queries"
    ],
    correta: 3 // D
  },
  {
    pergunta: "5. Em JavaScript, qual palavra-chave declara uma variável com escopo de bloco e valor imutável?",
    opcoes: [
      "A) var",
      "B) const",
      "C) let",
      "D) static"
    ],
    correta: 1 // B
  },
  {
    pergunta: "6. Qual método JavaScript é utilizado para selecionar um elemento HTML diretamente pelo seu ID?",
    opcoes: [
      "A) document.querySelector('.id')",
      "B) document.getElementByName()",
      "C) document.getElementById()",
      "D) document.findId()"
    ],
    correta: 2 // C
  },
  {
    pergunta: "7. O que é o DOM (Document Object Model) no desenvolvimento Web?",
    opcoes: [
      "A) Uma representação em árvore dos elementos HTML acessível via JavaScript",
      "B) Uma linguagem de programação para servidores web",
      "C) Um banco de dados relacional acoplado ao navegador",
      "D) Um framework de estilização CSS para páginas dinâmicas"
    ],
    correta: 0 // A
  },
  {
    pergunta: "8. Em JavaScript, qual método de Array cria um novo array transformando cada um dos elementos?",
    opcoes: [
      "A) .forEach()",
      "B) .filter()",
      "C) .push()",
      "D) .map()"
    ],
    correta: 3 // D
  },
  {
    pergunta: "9. O que significa a sigla API no contexto de desenvolvimento de software?",
    opcoes: [
      "A) Application Programming Interface",
      "B) Automated Program Integration",
      "C) Advanced Protocol Internet",
      "D) Asynchronous Page Interface"
    ],
    correta: 0 // A
  },
  {
    pergunta: "10. Qual estrutura do JavaScript assíncrono permite aguardar a resposta de uma Promise com código limpo?",
    opcoes: [
      "A) try / catch",
      "B) async / await",
      "C) import / export",
      "D) setTimeout / setInterval"
    ],
    correta: 1 // B
  },

  // --- INTELIGÊNCIA ARTIFICIAL ---
  {
    pergunta: "11. O que caracteriza o Aprendizado de Máquina Supervisionado (Supervised Learning)?",
    opcoes: [
      "A) O algoritmo aprende sem nenhum dado de entrada",
      "B) O modelo é treinado apenas por tentativa e erro",
      "C) Os dados de treinamento possuem rótulos (respostas corretas)",
      "D) O sistema utiliza apenas dados sem categorias prévias"
    ],
    correta: 2 // C
  },
  {
    pergunta: "12. Qual é a principal função de uma Rede Neural Artificial (RNA)?",
    opcoes: [
      "A) Executar comandos diretamente na placa-mãe",
      "B) Simular o processamento cerebral humano para identificar padrões",
      "C) Substituir a necessidade de utilizar banco de dados",
      "D) Compilar arquivos HTML e CSS em código de máquina"
    ],
    correta: 1 // B
  },
  {
    pergunta: "13. O que são os LLMs (Large Language Models) como o ChatGPT e o Gemini?",
    opcoes: [
      "A) Programas de edição gráfica baseados em vetores",
      "B) Sistemas operacionais para servidores em nuvem",
      "C) Algoritmos voltados para cálculo estatístico de planilhas",
      "D) Modelos treinados com vastos textos para processar e gerar linguagem natural"
    ],
    correta: 3 // D
  },
  {
    pergunta: "14. No contexto de IAs Generativas, o que representa o termo 'Prompt'?",
    opcoes: [
      "A) A instrução, pergunta ou texto enviado pelo usuário para a IA",
      "B) O tempo de resposta do servidor em milissegundos",
      "C) O erro de falta de memória da placa gráfica",
      "D) A linguagem secreta utilizada entre robôs"
    ],
    correta: 0 // A
  },
  {
    pergunta: "15. O que significa uma 'Alucinação' em um modelo de Inteligência Artificial?",
    opcoes: [
      "A) Um vírus detectado no código da aplicação",
      "B) Quando a IA gera uma informação falsa com tom de convicção",
      "C) O desligamento automático por superaquecimento do processador",
      "D) A capacidade do sistema de simular sentimentos reais"
    ],
    correta: 1 // B
  },
  {
    pergunta: "16. Qual tipo de aprendizado utiliza um sistema de recompensas e punições para treinar o agente?",
    opcoes: [
      "A) Aprendizado Não Supervisionado",
      "B) Regressão Linear",
      "C) Aprendizado por Reforço (Reinforcement Learning)",
      "D) Agrupamento K-Means"
    ],
    correta: 2 // C
  },
  {
    pergunta: "17. O que avalia o clássico Teste de Turing?",
    opcoes: [
      "A) Se uma máquina consegue exibir comportamento inteligente indistinguível de um humano",
      "B) A velocidade máxima de processamento de um chip",
      "C) A estabilidade de uma rede local sem fio",
      "D) A taxa de erros em códigos Python"
    ],
    correta: 0 // A
  },
  {
    pergunta: "18. Qual das opções representa uma aplicação prática de Visão Computacional?",
    opcoes: [
      "A) Disparo automático de e-mails em lote",
      "B) Ordenação alfabética de arquivos de texto",
      "C) Reconhecimento facial e leitura de placas de trânsito por câmeras",
      "D) Compactação de áudio no formato MP3"
    ],
    correta: 2 // C
  },
  {
    pergunta: "19. O que é o Overfitting (Sobreajuste) em um modelo de Aprendizado de Máquina?",
    opcoes: [
      "A) Quando o modelo aprende tão rápido que economiza memória",
      "B) Quando o modelo decora os dados de treino mas erra em dados novos",
      "C) Quando a IA não consegue identificar nenhum padrão nos dados",
      "D) Quando o banco de dados apaga registros antigos"
    ],
    correta: 1 // B
  },
  {
    pergunta: "20. Qual linguagem de programação é a mais popular no desenvolvimento de modelos de Aprendizado de Máquina?",
    opcoes: [
      "A) PHP",
      "B) C++",
      "C) Assembly",
      "D) Python"
    ],
    correta: 3 // D
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