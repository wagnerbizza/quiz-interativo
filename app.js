// CÓDIGO COMPLETO E SINCRONIZADO: app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc,
  getDocs, 
  deleteDoc,
  setDoc, 
  doc, 
  getDoc,
  onSnapshot,
  serverTimestamp
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

// Exibição de Popups / Toasts
function mostrarNotificacao(mensagem, tipo = "sucesso") {
  const toast = document.getElementById("toast-notification");
  if (!toast) {
    alert(mensagem);
    return;
  }
  toast.textContent = mensagem;
  toast.className = tipo === "erro" ? "erro" : "sucesso";
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 3500);
}

// Geração de ID do aluno sem barras e caracteres especiais
function obterIdAluno(nome, turma) {
  const norm = (str) => str ? str.toUpperCase().trim().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_") : "ANONIMO";
  return `${norm(nome)}_${norm(turma)}`;
}

function formatarDataRegistro(dataBruta) {
  if (!dataBruta) return "Agora";
  if (dataBruta.toDate && typeof dataBruta.toDate === "function") {
    return dataBruta.toDate().toLocaleString("pt-BR");
  }
  if (typeof dataBruta === "string" || typeof dataBruta === "number") {
    const parsed = new Date(dataBruta);
    return isNaN(parsed.getTime()) ? "Agora" : parsed.toLocaleString("pt-BR");
  }
  return "Agora";
}

function normalizarTexto(txt) {
  if (!txt) return "";
  return txt.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function normalizarDocumentoQuestao(d, idDoc = null) {
  return {
    idDoc: idDoc,
    pergunta: d.pergunta || d.questao || d.titulo || "Pergunta Sem Título",
    opcoes: d.opcoes || d.alternativas || d.respostas || [],
    correta: (d.correta || d.resposta || d.correto || "A").toString().trim().toUpperCase(),
    categoria: d.categoria || d.materia || d.disciplina || "Geral",
    modalidade: d.modalidade || "Ensino Regular"
  };
}

// Matérias organizadas por Modalidade
const MATERIAS_POR_MODALIDADE = {
  "Ensino Regular": ["Matemática", "Português", "História", "Geografia", "Física", "Química", "Biologia", "Inglês"],
  "Ensino Técnico (Desenvolvimento de Sistemas)": [
    "Programação Front-End", 
    "Processos de Desenvolvimento de Software e Metodologias Ágeis", 
    "Redes de Computadores e Segurança da Informação na Nuvem", 
    "Inteligência Artificial"
  ],
  "Programação Alura": ["Programação Alura"]
};

// BANCO DE QUESTÕES EXPANDIDO (Com mais de 30 questões focadas em Python e Google Colab)
const BANCO_SEEMENTE_QUESTOES = [
  // --- Programação Alura: Python e Google Colab (Mais de 30 Questões) ---
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "No Google Colab, em qual estrutura o código executável e os textos explicativos são organizados?", opcoes: ["Pastas e diretórios locais", "Blocos de notas (Jupyter Notebooks divididos em células)", "Planilhas do Excel", "Arquivos de texto compactados (.zip)"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Qual função nativa do Python é utilizada para exibir dados (como textos e variáveis) na tela?", opcoes: ["echo()", "console.log()", "print()", "write()"], correta: "C" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Como se declara uma lista em Python?", opcoes: ["Usando chaves: {} (ex: minha_lista = {1, 2, 3})", "Usando colchetes: [] (ex: minha_lista = [1, 2, 3])", "Usando parênteses: () (ex: minha_lista = (1, 2, 3))", "Usando aspas: \"\" (ex: minha_lista = \"1, 2, 3\")"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Qual é a principal vantagem de utilizar o Google Colab para programar em Python em projetos de dados e IA?", opcoes: ["Funciona sem internet e não precisa de navegador", "Permite executar código na nuvem utilizando GPUs e TPUs sem instalação prévia", "Cria sites em HTML automaticamente", "Substitui totalmente a linguagem Java"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Em Python, qual estrutura de repetição é ideal para iterar sobre os elementos de uma lista?", opcoes: ["for", "repeat...until", "switch", "if...else"], correta: "A" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "No Google Colab, qual atalho de teclado é comumente utilizado para executar a célula ativa atual?", opcoes: ["Ctrl + Alt + Delete", "Shift + Enter", "Ctrl + S", "Alt + F4"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Como se define uma função personalizada em Python?", opcoes: ["function minha_funcao():", "def minha_funcao():", "create funcao minha_funcao():", "func minha_funcao():"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Qual comando do Google Colab permite instalar bibliotecas externas do Python via gerenciador de pacotes?", opcoes: ["!pip install nome_biblioteca", "install nome_biblioteca", "import nome_biblioteca", "download nome_biblioteca"], correta: "A" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "O que o operador aritmético '**' realiza em Python?", opcoes: ["Calcula a raiz quadrada", "Realiza potenciação (exponenciação)", "Multiplica por dois", "Faz divisão inteira"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Qual tipo de dado em Python representa valores verdadeiro (True) ou falso (False)?", opcoes: ["int", "str", "bool", "float"], correta: "C" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Como se cria um comentário de uma única linha em códigos Python?", opcoes: ["// Este é um comentário", "/* Este é um comentário */", "# Este é um comentário", "<!-- Este é um comentário -->"], correta: "C" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Qual função do Python retorna o número de itens (tamanho) de uma lista ou string?", opcoes: ["count()", "size()", "len()", "length()"], correta: "C" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "No Google Colab, qual tipo de célula você deve adicionar se quiser apenas escrever textos formatados em Markdown sem executar código?", opcoes: ["Célula de Código", "Célula de Texto / Markdown", "Célula de Script", "Célula de Variável"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Qual método é utilizado para adicionar um novo elemento ao final de uma lista em Python?", opcoes: ["add()", "append()", "push()", "insert()"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Como é feita a estrutura de decisão condicional básica em Python?", opcoes: ["if / else", "when / then", "case / switch", "check / otherwise"], correta: "A" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "O que significa dizer que Python possui tipagem dinâmica?", opcoes: ["As variáveis mudam de valor sozinhas", "Não é necessário declarar explicitamente o tipo de dado da variável ao criá-la", "O código roda mais rápido que C++", "Só aceita números inteiros"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Qual biblioteca padrão do Python é frequentemente utilizada para trabalhar com operações matemáticas avançadas (como raízes e o número pi)?", opcoes: ["math", "random", "sys", "datetime"], correta: "A" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Em um bloco de código Python, como o interpretador identifica quais linhas pertencem a uma estrutura (como um if ou um for)?", opcoes: ["Por chaves {}", "Por ponto e vírgula no final", "Por indentação (espaços ou tabulação)", "Por parênteses ()"], correta: "C" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Como se lê um valor digitado pelo usuário via teclado em Python?", opcoes: ["read()", "input()", "scanf()", "get()"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "No Google Colab, onde os arquivos salvos temporariamente pelo seu código ficam armazenados durante a sessão?", opcoes: ["No disco rígido físico do seu computador pessoal", "Em um ambiente de máquina virtual baseado em Linux na nuvem do Google", "Diretamente na lixeira do Windows", "No servidor da sua escola"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Qual operador lógico em Python retorna True apenas se AMBAS as condições comparadas forem verdadeiras?", opcoes: ["or", "not", "and", "xor"], correta: "C" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Como se cria um dicionário em Python (estrutura de chave e valor)?", opcoes: ["Usando colchetes: {} com vírgulas", "Usando chaves: {} com pares de chave e valor separados por dois-pontos (:)", "Usando parênteses: ()", "Usando tags HTML"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Qual função do Python gera uma sequência numérica progressiva, muito usada em laços for?", opcoes: ["sequence()", "range()", "loop()", "number()"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "No Google Colab, qual botão permite conectar o seu notebook a um servidor na nuvem com recursos computacionais?", opcoes: ["Botão 'Conectar' (Connect)", "Botão 'Imprimir'", "Botão 'Salvar como PDF'", "Botão 'Ajuda'"], correta: "A" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Qual estrutura de repetição em Python executa um bloco de código enquanto uma condição lógica permanecer verdadeira?", opcoes: ["for", "while", "repeat", "looping"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "O que o comando 'import pandas as pd' faz em um script Python no Google Colab?", opcoes: ["Exclui a biblioteca pandas", "Importa a biblioteca pandas e define um apelido (alias) 'pd' para facilitar o uso", "Instala o pandas automaticamente sem internet", "Cria uma tabela no Excel"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Qual é o resultado da expressão em Python: `print(type(10.5))`?", opcoes: ["<class 'int'>", "<class 'str'>", "<class 'float'>", "<class 'bool'>"], correta: "C" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Como se acessa o primeiro elemento de uma lista em Python chamada `minha_lista`?", opcoes: ["minha_lista[1]", "minha_lista[0]", "minha_lista.first()", "minha_lista[-1]"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "O que acontece se você tentar dividir um número por zero em Python?", opcoes: ["O programa retorna zero", "O programa retorna infinito", "Ocorre um erro de exceção do tipo ZeroDivisionError", "O Google Colab reinicia automaticamente"], correta: "C" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "No Google Colab, qual menu permite reiniciar o ambiente de execução e apagar todas as variáveis da memória?", opcoes: ["Arquivo > Novo Notebook", "Ambiente de execução (Runtime) > Reiniciar sessão (Restart session)", "Inserir > Célula de código", "Ferramentas > Configurações"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Qual método de string em Python converte todos os caracteres de um texto para letras maiúsculas?", opcoes: ["toUpper()", "upper()", "capitalizeAll()", "UCASE()"], correta: "B" },
  { modalidade: "Programação Alura", categoria: "Programação Alura", pergunta: "Como se verifica se um elemento específico existe dentro de uma lista em Python?", opcoes: ["usando o operador 'in' (ex: if item in lista)", "usando a função search(item)", "usando o comando find()", "usando o operador 'is'"], correta: "A" },

  // --- Ensino Técnico (Desenvolvimento de Sistemas) ---
  { modalidade: "Ensino Técnico (Desenvolvimento de Sistemas)", categoria: "Programação Front-End", pergunta: "Qual tag HTML5 é utilizada para definir uma seção de navegação principal?", opcoes: ["<nav>", "<section>", "<header>", "<aside>"], correta: "A" },
  { modalidade: "Ensino Técnico (Desenvolvimento de Sistemas)", categoria: "Programação Front-End", pergunta: "Qual propriedade CSS altera a cor de fundo de um elemento?", opcoes: ["color", "background-color", "border-color", "fill"], correta: "B" },
  { modalidade: "Ensino Técnico (Desenvolvimento de Sistemas)", categoria: "Programação Front-End", pergunta: "Qual comando JS exibe uma mensagem de alerta no navegador?", opcoes: ["console.log()", "document.write()", "alert()", "print()"], correta: "C" },
  { modalidade: "Ensino Técnico (Desenvolvimento de Sistemas)", categoria: "Processos de Desenvolvimento de Software e Metodologias Ágeis", pergunta: "No framework Scrum, quem é o principal responsável por priorizar o Backlog do Produto?", opcoes: ["Scrum Master", "Product Owner (PO)", "Desenvolvedor Lead", "Gerente de Projeto"], correta: "B" },
  { modalidade: "Ensino Técnico (Desenvolvimento de Sistemas)", categoria: "Processos de Desenvolvimento de Software e Metodologias Ágeis", pergunta: "O que é uma 'Sprint' no desenvolvimento ágil Scrum?", opcoes: ["Um teste de estresse do servidor", "Um ciclo de tempo delimitado onde um trabalho é concluído", "Uma reunião diária de 5 minutos", "A fase final de entrega do projeto"], correta: "B" },
  { modalidade: "Ensino Técnico (Desenvolvimento de Sistemas)", categoria: "Redes de Computadores e Segurança da Informação na Nuvem", pergunta: "Qual protocolo é utilizado para navegação web segura utilizando criptografia?", opcoes: ["HTTP", "FTP", "HTTPS", "SMTP"], correta: "C" },
  { modalidade: "Ensino Técnico (Desenvolvimento de Sistemas)", categoria: "Inteligência Artificial", pergunta: "O que caracteriza uma 'Alucinação' em um modelo de linguagem (LLM)?", opcoes: ["Resposta falsa gerada com aparência de correta", "Um vírus de computador", "Superaquecimento do servidor", "Desligamento automático da máquina"], correta: "A" },

  // --- Ensino Regular ---
  { modalidade: "Ensino Regular", categoria: "Matemática", pergunta: "Qual o valor da raiz quadrada de 144?", opcoes: ["10", "11", "12", "14"], correta: "C" },
  { modalidade: "Ensino Regular", categoria: "Matemática", pergunta: "Qual é a fórmula da área de um círculo de raio r?", opcoes: ["2 * pi * r", "pi * r ao quadrado", "4 * pi * r", "base * altura"], correta: "B" },
  { modalidade: "Ensino Regular", categoria: "Português", pergunta: "Qual das palavras abaixo é um substantivo abstrato?", opcoes: ["Cadeira", "Saudade", "Lápis", "Carro"], correta: "B" },
  { modalidade: "Ensino Regular", categoria: "História", pergunta: "Em que ano ocorreu a Proclamação da República no Brasil?", opcoes: ["1822", "1889", "1500", "1930"], correta: "B" },
  { modalidade: "Ensino Regular", categoria: "Geografia", pergunta: "Qual é o maior bioma brasileiro em extensão territorial?", opcoes: ["Cerrado", "Mata Atlântica", "Amazônia", "Caatinga"], correta: "C" },
  { modalidade: "Ensino Regular", categoria: "Física", pergunta: "Qual é a unidade de medida oficial da força no Sistema Internacional (SI)?", opcoes: ["Joule", "Newton", "Watt", "Pascal"], correta: "B" },
  { modalidade: "Ensino Regular", categoria: "Química", pergunta: "Qual é o símbolo químico do elemento Ouro?", opcoes: ["Ag", "Au", "Pb", "Fe"], correta: "B" },
  { modalidade: "Ensino Regular", categoria: "Biologia", pergunta: "Qual organela celular é responsável pela respiração celular e produção de energia (ATP)?", opcoes: ["Ribossomo", "Complexo de Golgi", "Mitocôndria", "Lisossomo"], correta: "C" },
  { modalidade: "Ensino Regular", categoria: "Inglês", pergunta: "Qual a tradução correta da frase 'She is reading a book'?", opcoes: ["Ela comprou um livro", "Ela está lendo um livro", "Ela leu um livro", "Ela quer um livro"], correta: "B" }
];

async function semearBancoSeEstiverVazio() {
  try {
    const snap = await getDocs(collection(db, "questoes"));
    if (snap.empty) {
      for (const q of BANCO_SEEMENTE_QUESTOES) {
        await addDoc(collection(db, "questoes"), {
          ...q,
          dataCriacao: new Date()
        });
      }
    }
  } catch (e) {
    console.error("Erro ao popular semente do banco:", e);
  }
}

semearBancoSeEstiverVazio();

// ==========================================
// LÓGICA DO PAINEL DO PROFESSOR (painel.html)
// ==========================================
if (window.location.pathname.includes("painel.html")) {

  const gridLetrasAZ = document.getElementById("grid-letras-az");
  if (gridLetrasAZ) {
    let htmlAZ = "";
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(letra => {
      htmlAZ += `
        <label class="checkbox-item compacto">
          <input type="checkbox" class="chk-letra" value="${letra}"> TURMA ${letra}
        </label>
      `;
    });
    gridLetrasAZ.innerHTML = htmlAZ;
  }

  const botoesAba = document.querySelectorAll(".btn-aba");
  const conteudosAba = document.querySelectorAll(".aba-conteudo");

  botoesAba.forEach(btn => {
    btn.addEventListener("click", () => {
      botoesAba.forEach(b => b.classList.remove("active"));
      conteudosAba.forEach(c => c.classList.add("hidden"));

      btn.classList.add("active");
      const targetAba = btn.getAttribute("data-aba");
      document.getElementById(targetAba).classList.remove("hidden");
    });
  });

  const chksModalidade = document.querySelectorAll(".chk-modalidade");
  const grupoTecnico = document.getElementById("grupo-materias-tecnico");
  const grupoRegular = document.getElementById("grupo-materias-regular");
  const grupoAlura = document.getElementById("grupo-materias-alura");

  function atualizarExibicaoMateriasAtivacao() {
    const selecoes = Array.from(chksModalidade).filter(c => c.checked).map(c => c.value);

    if (grupoTecnico) grupoTecnico.style.display = selecoes.includes("Ensino Técnico (Desenvolvimento de Sistemas)") ? "block" : "none";
    if (grupoRegular) grupoRegular.style.display = selecoes.includes("Ensino Regular") ? "block" : "none";
    if (grupoAlura) grupoAlura.style.display = selecoes.includes("Programação Alura") ? "block" : "none";
  }

  chksModalidade.forEach(chk => chk.addEventListener("change", atualizarExibicaoMateriasAtivacao));
  atualizarExibicaoMateriasAtivacao();

  const cadModalidade = document.getElementById("cad-modalidade");
  const cadMateria = document.getElementById("cad-materia");

  function atualizarSelectMateriasCadastro() {
    if (!cadModalidade || !cadMateria) return;
    const mod = cadModalidade.value;
    const lista = MATERIAS_POR_MODALIDADE[mod] || [];

    cadMateria.innerHTML = "";
    lista.forEach(mat => {
      const opt = document.createElement("option");
      opt.value = mat;
      opt.textContent = mat;
      cadMateria.appendChild(opt);
    });
  }

  cadModalidade?.addEventListener("change", atualizarSelectMateriasCadastro);
  atualizarSelectMateriasCadastro();

  const formCadQuestao = document.getElementById("form-cadastrar-questao");
  const corpoTabela = document.getElementById("corpo-tabela");
  const btnImprimir = document.getElementById("btn-imprimir");
  
  const filtroTurmaSelect = document.getElementById("filtro-turma-tabela");
  const filtroModalidadeSelect = document.getElementById("filtro-modalidade-tabela");
  const filtroDataSelect = document.getElementById("filtro-data-tabela");
  const mediaTurmaTxt = document.getElementById("media-turma-txt");

  const listaQuestoesContainer = document.getElementById("lista-questoes-banco");
  const totalQuestoesCount = document.getElementById("total-questoes-count");
  const btnRecarregarBancoQ = document.getElementById("btn-recarregar-banco-q");
  const btnSalvarAtivacao = document.getElementById("btn-salvar-ativacao");

  const btnRecarregarPainel = document.getElementById("btn-recarregar-painel");
  const btnAtualizarTabelaRes = document.getElementById("btn-atualizar-tabela-res");

  btnRecarregarPainel?.addEventListener("click", () => {
    mostrarNotificacao("🔄 Recarregando o painel...", "sucesso");
    setTimeout(() => window.location.reload(), 500);
  });

  btnAtualizarTabelaRes?.addEventListener("click", () => {
    renderizarTabelaFiltrada();
    mostrarNotificacao("📊 Tabela de resultados atualizada!", "sucesso");
  });

  let dadosResultadosGerais = [];

  function escutarResultadosEmTempoReal() {
    if (!corpoTabela) return;

    onSnapshot(collection(db, "avaliacoes"), (snapshot) => {
      dadosResultadosGerais = [];
      const turmasEncontradas = new Set();
      const modalidadesEncontradas = new Set();

      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        const nomeFinal = d.nome || d.nomeAluno || "Aluno Sem Nome";
        const turmaFinal = (d.turma || "Sem Turma").toUpperCase().trim();
        const modalidadeFinal = d.modalidade || "Geral";
        
        let timestampMs = d.timestamp || 0;
        if (d.dataEnvio && typeof d.dataEnvio.toMillis === "function") {
          timestampMs = d.dataEnvio.toMillis();
        }

        dadosResultadosGerais.push({
          idDoc: docSnap.id,
          nomeAluno: nomeFinal,
          turma: turmaFinal,
          materia: d.materia || "Geral",
          modalidade: modalidadeFinal,
          pontuacao: d.pontuacao !== undefined ? d.pontuacao : 0,
          totalQuestoes: d.totalQuestoes || 10,
          dataEnvio: d.dataEnvio,
          timestampMs: timestampMs,
          idAluno: d.idAluno || obterIdAluno(nomeFinal, turmaFinal)
        });

        if (turmaFinal && turmaFinal !== "SEM TURMA") turmasEncontradas.add(turmaFinal);
        if (modalidadeFinal) modalidadesEncontradas.add(modalidadeFinal);
      });

      dadosResultadosGerais.sort((a, b) => b.timestampMs - a.timestampMs);

      if (filtroTurmaSelect) {
        const valorAtual = filtroTurmaSelect.value;
        filtroTurmaSelect.innerHTML = `<option value="TODAS">Todas as Turmas</option>`;
        Array.from(turmasEncontradas).sort().forEach(t => {
          const opt = document.createElement("option");
          opt.value = t;
          opt.textContent = t;
          filtroTurmaSelect.appendChild(opt);
        });
        filtroTurmaSelect.value = valorAtual || "TODAS";
        filtroTurmaSelect.onchange = renderizarTabelaFiltrada;
      }

      if (filtroModalidadeSelect) {
        const valorAtualMod = filtroModalidadeSelect.value;
        filtroModalidadeSelect.innerHTML = `<option value="TODAS">Todas as Modalidades</option>`;
        Array.from(modalidadesEncontradas).sort().forEach(m => {
          const opt = document.createElement("option");
          opt.value = m;
          opt.textContent = m;
          filtroModalidadeSelect.appendChild(opt);
        });
        filtroModalidadeSelect.value = valorAtualMod || "TODAS";
        filtroModalidadeSelect.onchange = renderizarTabelaFiltrada;
      }

      if (filtroDataSelect) {
        filtroDataSelect.onchange = renderizarTabelaFiltrada;
      }

      renderizarTabelaFiltrada();
    });
  }

  function renderizarTabelaFiltrada() {
    if (!corpoTabela) return;

    const turmaSelecionada = filtroTurmaSelect ? filtroTurmaSelect.value : "TODAS";
    const modalidadeSelecionada = filtroModalidadeSelect ? filtroModalidadeSelect.value : "TODAS";
    const periodoSelecionado = filtroDataSelect ? filtroDataSelect.value : "TODOS";

    const agora = new Date();
    const hojeInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();

    const inicioSemana = new Date(agora);
    inicioSemana.setDate(agora.getDate() - agora.getDay());
    inicioSemana.setHours(0, 0, 0, 0);

    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime();

    const filtrados = dadosResultadosGerais.filter(d => {
      const bateTurma = (turmaSelecionada === "TODAS" || d.turma === turmaSelecionada);
      const bateModalidade = (modalidadeSelecionada === "TODAS" || d.modalidade === modalidadeSelecionada);

      let bateData = true;
      if (periodoSelecionado === "HOJE") {
        bateData = d.timestampMs >= hojeInicio;
      } else if (periodoSelecionado === "SEMANA") {
        bateData = d.timestampMs >= inicioSemana.getTime();
      } else if (periodoSelecionado === "MES") {
        bateData = d.timestampMs >= inicioMes;
      }

      return bateTurma && bateModalidade && bateData;
    });

    if (filtrados.length === 0) {
      corpoTabela.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">Nenhum registro encontrado para estes filtros.</td></tr>`;
      if (mediaTurmaTxt) mediaTurmaTxt.textContent = "Média da Seleção: --";
      return;
    }

    let somaNotas = 0;
    let html = "";

    filtrados.forEach(d => {
      const notaCalculada = ((d.pontuacao / d.totalQuestoes) * 10).toFixed(1);
      somaNotas += parseFloat(notaCalculada);
      
      const corTextoNota = notaCalculada >= 6.0 ? "#22c55e" : "#ef4444";

      html += `
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="vertical-align: middle; padding: 12px 8px;">${formatarDataRegistro(d.dataEnvio)}</td>
          <td style="vertical-align: middle; padding: 12px 8px;"><strong>${d.nomeAluno}</strong></td>
          <td style="vertical-align: middle; padding: 12px 8px;"><strong>${d.turma}</strong></td>
          <td style="vertical-align: middle; padding: 12px 8px;">${d.modalidade}</td>
          <td style="vertical-align: middle; padding: 12px 8px;">${d.materia}</td>
          <td style="text-align: center; vertical-align: middle; padding: 12px 8px;">
            <div style="font-size: 16px; font-weight: bold; color: ${corTextoNota}; line-height: 1.2;">
              ${notaCalculada}
            </div>
            <div style="font-size: 12px; color: ${corTextoNota}; opacity: 0.85;">
              (${d.pontuacao}/${d.totalQuestoes})
            </div>
          </td>
          <td class="no-print" style="text-align: center; vertical-align: middle; padding: 12px 8px;">
            <button class="btn-liberar-aluno" data-id="${d.idAluno}" style="background-color: #22c55e; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; transition: opacity 0.2s;">
              🔓 Autorizar Refazer
            </button>
          </td>
        </tr>
      `;
    });

    corpoTabela.innerHTML = html;

    if (mediaTurmaTxt) {
      mediaTurmaTxt.textContent = `Média da Seleção: ${(somaNotas / filtrados.length).toFixed(1)} / 10.0 (${filtrados.length} aluno(s))`;
    }

    document.querySelectorAll(".btn-liberar-aluno").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const targetId = e.target.getAttribute("data-id");
        try {
          await setDoc(doc(db, "permissoes_alunos", targetId), {
            podeFazer: true,
            autorizadoEm: new Date().toISOString()
          });
          mostrarNotificacao("✅ Aluno autorizado a refazer a prova!", "sucesso");
        } catch (err) {
          mostrarNotificacao("Erro ao autorizar: " + err.message, "erro");
        }
      });
    });
  }

  btnSalvarAtivacao?.addEventListener("click", async () => {
  const selectEscola = document.getElementById("select-escola-ativa");
  const inputNovaEscola = document.getElementById("input-nova-escola");
  
  // Pega a escola digitada ou a selecionada no select
  const escolaAtual = (inputNovaEscola?.value.trim() || selectEscola?.value || "Geral").trim();

  const qtdQ = parseInt(document.getElementById("qtd-questoes-ativa").value) || 10;
  const materiasSelecionadas = Array.from(document.querySelectorAll(".chk-materia:checked")).map(cb => cb.value);
  const modalidadesSelecionadas = Array.from(document.querySelectorAll(".chk-modalidade:checked")).map(cb => cb.value);

  const anosSelecionados = Array.from(document.querySelectorAll(".chk-ano:checked")).map(cb => cb.value);
  const letrasSelecionadas = Array.from(document.querySelectorAll(".chk-letra:checked")).map(cb => cb.value);

  const turmasCompletas = [];
  anosSelecionados.forEach(ano => {
    letrasSelecionadas.forEach(letra => {
      turmasCompletas.push(`${ano} - TURMA ${letra}`);
    });
  });

  if (modalidadesSelecionadas.length === 0) {
    mostrarNotificacao("⚠️ Selecione pelo menos uma modalidade!", "erro");
    return;
  }

  if (materiasSelecionadas.length === 0) {
    mostrarNotificacao("⚠️ Selecione pelo menos uma matéria!", "erro");
    return;
  }

  if (turmasCompletas.length === 0) {
    mostrarNotificacao("⚠️ Selecione pelo menos um Ano e uma Letra de Turma!", "erro");
    return;
  }

  try {
    const dadosConfig = {
      escolaAtiva: escolaAtual,
      quantidadeQuestoes: qtdQ,
      materiasAtivas: materiasSelecionadas,
      modalidadesAtivas: modalidadesSelecionadas,
      turmasAtivas: turmasCompletas,
      atualizadoEm: serverTimestamp()
    };

    // Salva globalmente e cria um registro próprio para a escola escolhida
    await setDoc(doc(db, "configuracoes", "prova_ativa"), dadosConfig, { merge: true });
    await setDoc(doc(db, "escolas_configuracoes", normalizarTexto(escolaAtual)), dadosConfig, { merge: true });

    mostrarNotificacao(`✅ Configurações salvas para "${escolaAtual}" com sucesso!`, "sucesso");
  } catch (e) {
    mostrarNotificacao("Erro ao salvar: " + e.message, "erro");
  }
});
  formCadQuestao?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const modalidade = document.getElementById("cad-modalidade").value;
    const categoria = document.getElementById("cad-materia").value;
    const pergunta = document.getElementById("cad-pergunta").value.trim();
    const opA = document.getElementById("cad-op-a").value.trim();
    const opB = document.getElementById("cad-op-b").value.trim();
    const opC = document.getElementById("cad-op-c").value.trim();
    const opD = document.getElementById("cad-op-d").value.trim();
    const correta = document.getElementById("cad-correta").value;

    try {
      await addDoc(collection(db, "questoes"), {
        modalidade: modalidade,
        categoria: categoria,
        pergunta: pergunta,
        opcoes: [opA, opB, opC, opD],
        correta: correta,
        dataCriacao: new Date()
      });

      mostrarNotificacao("✅ Questão cadastrada no banco de dados!", "sucesso");
      formCadQuestao.reset();
      atualizarSelectMateriasCadastro();
      carregarQuestoesDoBanco();
    } catch (error) {
      mostrarNotificacao("Erro ao cadastrar: " + error.message, "erro");
    }
  });

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
          <div class="item-questao" style="border-bottom: 1px solid #374151; padding: 10px 0;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span style="background:#2563eb; color:white; padding:2px 8px; border-radius:4px; font-size:12px;">${q.modalidade}</span>
                <span style="background:#0284c7; color:white; padding:2px 8px; border-radius:4px; font-size:12px; margin-left:4px;">${q.categoria}</span>
              </div>
              <button class="btn-deletar-q" data-id="${q.idDoc}" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">🗑️ Excluir</button>
            </div>
            <strong style="display:block; margin-top:6px;">${q.pergunta}</strong>
            <div style="font-size: 12px; margin-top: 4px; color: #9ca3af;">Correta: <strong>${q.correta}</strong></div>
          </div>
        `;
      });

      if (totalQuestoesCount) totalQuestoesCount.textContent = count;
      listaQuestoesContainer.innerHTML = count === 0 ? `<p style="text-align:center;">Nenhuma questão cadastrada.</p>` : html;

      document.querySelectorAll(".btn-deletar-q").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          if (confirm("Deseja apagar esta questão?")) {
            await deleteDoc(doc(db, "questoes", e.target.getAttribute("data-id")));
            mostrarNotificacao("🗑️ Questão excluída!", "sucesso");
            carregarQuestoesDoBanco();
          }
        });
      });
    } catch (err) {
      listaQuestoesContainer.innerHTML = `<p style="color:#ef4444; text-align:center;">Erro ao carregar banco.</p>`;
    }
  }

  btnRecarregarBancoQ?.addEventListener("click", () => {
    carregarQuestoesDoBanco();
    mostrarNotificacao("🔄 Lista de questões atualizada!", "sucesso");
  });

  btnImprimir?.addEventListener("click", () => window.print());

  escutarResultadosEmTempoReal();
  carregarQuestoesDoBanco();
}

// ==========================================
// LÓGICA DA TELA DO ALUNO (index.html)
// ==========================================
if (window.location.pathname.includes("index.html") || window.location.pathname.endsWith("/")) {

  let listaQuestoes = [];
  let indiceAtual = 0;
  let respostasUsuario = {};
  let alunoAtual = { nome: "", turma: "", materia: "", modalidade: "", id: "" };
  let materiasLiberadasAtuais = [];
  let modalidadesLiberadasAtuais = [];
  let quantidadeQuestoesConfigurada = 10;

  const telaLogin = document.getElementById("tela-login");
  const telaQuiz = document.getElementById("tela-quiz");
  const telaResultado = document.getElementById("tela-resultado");
  const formLogin = document.getElementById("form-login");

  const perguntaTxt = document.getElementById("pergunta-txt");
  const opcoesContainer = document.getElementById("opcoes-container");
  const progressoTxt = document.getElementById("progresso-txt");

  const notaFinalTxt = document.getElementById("nota-final-txt");
  const detalhesAcertosTxt = document.getElementById("detalhes-acertos-txt");
  const statusEnvioTxt = document.getElementById("status-envio-txt");
  const containerRevisao = document.getElementById("container-revisao-resultado");
  const btnReiniciar = document.getElementById("btn-reiniciar");

  const avisoAtivasContainer = document.getElementById("aviso-avaliacoes-ativas");
  const displayMateriaAtiva = document.getElementById("display-materia-ativa");
  const displayEnsinoAtivo = document.getElementById("display-ensino-ativo");
  const selectTurmaAluno = document.getElementById("turma-aluno");

  function escutarAtivacoesProfessor() {
    onSnapshot(doc(db, "configuracoes", "prova_ativa"), (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        materiasLiberadasAtuais = d.materiasAtivas || [];
        modalidadesLiberadasAtuais = d.modalidadesAtivas || [];
        quantidadeQuestoesConfigurada = d.quantidadeQuestoes || 10;
        const turmas = d.turmasAtivas || [];

        if (avisoAtivasContainer) {
          if (materiasLiberadasAtuais.length > 0) {
            let htmlAviso = `📢 <strong>Avaliação Liberada:</strong><br>`;
            htmlAviso += `• <strong>Quantidade de Questões:</strong> ${quantidadeQuestoesConfigurada}<br>`;
            if (modalidadesLiberadasAtuais.length > 0) htmlAviso += `• <strong>Modalidade:</strong> ${modalidadesLiberadasAtuais.join(" / ")}<br>`;
            htmlAviso += `• <strong>Matérias:</strong> ${materiasLiberadasAtuais.join(", ")}`;
            
            avisoAtivasContainer.innerHTML = htmlAviso;
            avisoAtivasContainer.style.display = "block";
          } else {
            avisoAtivasContainer.innerHTML = `⚠️ Nenhuma avaliação foi liberada pelo professor ainda.`;
            avisoAtivasContainer.style.display = "block";
          }
        }

        if (displayEnsinoAtivo) {
          displayEnsinoAtivo.textContent = modalidadesLiberadasAtuais.length > 0 ? modalidadesLiberadasAtuais.join(" / ") : "Ensino Regular";
        }

        if (displayMateriaAtiva) {
          displayMateriaAtiva.textContent = materiasLiberadasAtuais.length > 0 ? materiasLiberadasAtuais.join(" + ") : "Aguardando liberação...";
        }

        if (selectTurmaAluno) {
          const valorTurmaSel = selectTurmaAluno.value;
          selectTurmaAluno.innerHTML = `<option value="" disabled selected>Selecione sua turma</option>`;
          
          const listaTurmasExibir = turmas.length > 0 ? turmas : [
            "1º ANO - TURMA A", "1º ANO - TURMA B"
          ];

          listaTurmasExibir.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.toUpperCase();
            opt.textContent = t.toUpperCase();
            selectTurmaAluno.appendChild(opt);
          });
          selectTurmaAluno.value = valorTurmaSel || "";
        }
      }
    });
  }

  formLogin?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (materiasLiberadasAtuais.length === 0) {
      alert("⚠️ Nenhuma avaliação foi liberada pelo professor até o momento.");
      return;
    }

    alunoAtual.nome = document.getElementById("nome-aluno").value.trim().toUpperCase();
    alunoAtual.turma = selectTurmaAluno ? selectTurmaAluno.value.toUpperCase() : "";
    alunoAtual.materia = materiasLiberadasAtuais.join(" + ");
    alunoAtual.modalidade = modalidadesLiberadasAtuais.length > 0 ? modalidadesLiberadasAtuais.join(" / ") : "Ensino Regular";
    alunoAtual.id = obterIdAluno(alunoAtual.nome, alunoAtual.turma);

    if (!alunoAtual.turma) {
      alert("Por favor, selecione a sua Turma.");
      return;
    }

    try {
      const permDoc = await getDoc(doc(db, "permissoes_alunos", alunoAtual.id));
      if (permDoc.exists() && permDoc.data().podeFazer === false) {
        alert("⛔ Você já concluiu esta prova! Solicite autorização ao seu professor no painel para refazer.");
        return;
      }
    } catch (err) {}

    let bancoBruto = [];
    try {
      const snapshot = await getDocs(collection(db, "questoes"));
      snapshot.forEach(docSnap => {
        bancoBruto.push(normalizarDocumentoQuestao(docSnap.data(), docSnap.id));
      });
    } catch (error) {}

    const materiasNorm = materiasLiberadasAtuais.map(m => normalizarTexto(m));

    let questoesFiltradas = bancoBruto.filter(q => {
      const catNorm = normalizarTexto(q.categoria);
      return materiasNorm.some(mNorm => 
        catNorm === mNorm || 
        catNorm.includes(mNorm) || 
        mNorm.includes(catNorm)
      );
    });

    if (questoesFiltradas.length === 0) {
      const sementesNormalizadas = BANCO_SEEMENTE_QUESTOES.map(q => normalizarDocumentoQuestao(q));
      questoesFiltradas = sementesNormalizadas.filter(q => {
        const catNorm = normalizarTexto(q.categoria);
        return materiasNorm.some(mNorm => catNorm === mNorm || catNorm.includes(mNorm) || mNorm.includes(catNorm));
      });
    }

    if (questoesFiltradas.length === 0) {
      alert(`⚠️ Nenhuma questão encontrada para a matéria: ${alunoAtual.materia}. Verifique o cadastro no Banco de Questões do Painel.`);
      return;
    }

    questoesFiltradas.sort(() => Math.random() - 0.5);

    listaQuestoes = questoesFiltradas.slice(0, quantidadeQuestoesConfigurada);
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
      <button id="btn-anterior-quiz" type="button" style="background-color: #4b5563; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: bold;">⬅ Anterior</button>
      <button id="btn-proxima-quiz" type="button" style="background-color: #2563eb; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: bold;">Próxima ➡</button>
      <button id="btn-finalizar-quiz" type="button" style="background-color: #22c55e; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: bold;">🏁 Finalizar Prova</button>
    `;

    document.getElementById("btn-anterior-quiz").onclick = () => { if (indiceAtual > 0) { indiceAtual--; exibirQuestao(); } };
    document.getElementById("btn-proxima-quiz").onclick = () => { if (indiceAtual < listaQuestoes.length - 1) { indiceAtual++; exibirQuestao(); } };
    document.getElementById("btn-finalizar-quiz").onclick = () => { finalizarProva(); };
  }

  function atualizarControlesNavegacao() {
    const btnAnt = document.getElementById("btn-anterior-quiz");
    const btnProx = document.getElementById("btn-proxima-quiz");
    const btnFin = document.getElementById("btn-finalizar-quiz");

    if (btnAnt) {
      btnAnt.disabled = (indiceAtual === 0);
      btnAnt.style.opacity = (indiceAtual === 0) ? "0.5" : "1";
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

  function exibirQuestao() {
    opcoesContainer.innerHTML = "";

    const q = listaQuestoes[indiceAtual];
    perguntaTxt.textContent = `${indiceAtual + 1}. ${q.pergunta}`;
    progressoTxt.textContent = `Questão ${indiceAtual + 1} de ${listaQuestoes.length}`;

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

      if (respostaFeita === letra) {
        btn.style.backgroundColor = "#2563eb";
        btn.style.color = "#ffffff";
        btn.style.fontWeight = "bold";
      } else {
        btn.style.backgroundColor = "transparent";
        btn.style.color = "#ffffff";
      }

      btn.onclick = () => {
        respostasUsuario[indiceAtual] = letra;
        exibirQuestao();
      };

      opcoesContainer.appendChild(btn);
    });

    atualizarControlesNavegacao();
  }

  async function finalizarProva() {
    telaQuiz.classList.add("hidden");
    telaResultado.classList.remove("hidden");

    let acertos = 0;
    const letras = ["A", "B", "C", "D"];
    let htmlRevisao = "";

    listaQuestoes.forEach((q, idx) => {
      const respAlunoLetra = respostasUsuario[idx] || "Não Respondeu";
      const ehCorreta = (respAlunoLetra === q.correta);
      if (ehCorreta) acertos++;

      const idxCorreta = letras.indexOf(q.correta);
      const textoOpcaoCorreta = idxCorreta !== -1 ? q.opcoes[idxCorreta] : q.correta;

      const idxAluno = letras.indexOf(respAlunoLetra);
      const textoOpcaoAluno = idxAluno !== -1 ? q.opcoes[idxAluno] : respAlunoLetra;

      htmlRevisao += `
        <div class="item-revisao ${ehCorreta ? 'correta' : 'incorreta'}" style="background: #1e293b; padding: 12px; margin-bottom: 10px; border-radius: 8px; border-left: 5px solid ${ehCorreta ? '#22c55e' : '#ef4444'};">
          <p><strong>${idx + 1}. ${q.pergunta}</strong></p>
          <div style="font-size: 14px; margin-top: 5px; color: ${ehCorreta ? '#4ade80' : '#fca5a5'};">
            Sua Resposta: <strong>${respAlunoLetra}</strong> ${respAlunoLetra !== "Não Respondeu" ? '- ' + textoOpcaoAluno : ''} ${ehCorreta ? '✅' : '❌'}
          </div>
          ${!ehCorreta ? `<div style="font-size: 14px; margin-top: 3px; color: #4ade80;">Resposta Correta: <strong>${q.correta}</strong> - ${textoOpcaoCorreta}</div>` : ''}
        </div>
      `;
    });

    

    const total = listaQuestoes.length;
    const nota = ((acertos / total) * 10).toFixed(1);

    notaFinalTxt.textContent = `Nota: ${nota} / 10.0`;
    detalhesAcertosTxt.textContent = `Você acertou ${acertos} de ${total} questões.`;

    if (containerRevisao) containerRevisao.innerHTML = htmlRevisao;

    try {
      statusEnvioTxt.textContent = "Salvando resultado...";

      const agora = new Date();
      const idInvertido = (9999999999999 - agora.getTime()).toString();

      await setDoc(doc(db, "avaliacoes", idInvertido), {
        idAluno: alunoAtual.id,
        nome: alunoAtual.nome,
        turma: alunoAtual.turma,
        materia: alunoAtual.materia,
        modalidade: alunoAtual.modalidade,
        pontuacao: acertos,
        totalQuestoes: total,
        dataEnvio: serverTimestamp(),
        timestamp: agora.getTime()
      });

      await setDoc(doc(db, "permissoes_alunos", alunoAtual.id), {
        podeFazer: false,
        ultimoAcesso: agora.toISOString()
      });

      statusEnvioTxt.textContent = "Respostas salvas e enviadas ao professor! ✅";
    } catch (error) {
      statusEnvioTxt.textContent = "Erro ao enviar resultado: " + error.message;
    }
  }

  btnReiniciar?.addEventListener("click", () => {
    telaResultado.classList.add("hidden");
    telaLogin.classList.remove("hidden");
  });

  escutarAtivacoesProfessor();
}

// --- LÓGICA EXCLUSIVA PARA A TELA DO ALUNO ---
async function carregarDadosIniciaisAluno() {
  const selectTurmaAluno = document.getElementById("turma-aluno");
  const spanEscolaAviso = document.getElementById("txt-escola-aviso");
  const badgeEscolaQuiz = document.getElementById("badge-escola-ativa");
  
  try {
    // 1. Busca qual é a escola ativa global definida no painel do professor
    const docGlobal = await getDoc(doc(db, "configuracoes", "prova_ativa"));
    if (!docGlobal.exists()) return;

    const escolaAtiva = docGlobal.data().escolaAtiva || "EE José Lins do Rego";
    
    // 2. Preenche o nome da escola na tela de login (nos avisos)
    if (spanEscolaAviso) {
      spanEscolaAviso.textContent = escolaAtiva;
    }

    // 3. Preenche o crachá da escola na tela do quiz/prova
    if (badgeEscolaQuiz) {
      badgeEscolaQuiz.textContent = `🏫 ${escolaAtiva}`;
    }

    // 4. Busca as turmas e configurações específicas salvas para essa escola
    const docEscola = await getDoc(doc(db, "escolas_configuracoes", normalizarTexto(escolaAtiva)));
    const dadosConfig = docEscola.exists() ? docEscola.data() : docGlobal.data();

    // 5. Preenche o select de turmas do aluno APENAS com as turmas daquela escola
    if (selectTurmaAluno) {
      selectTurmaAluno.innerHTML = `<option value="" disabled selected>Selecione sua Turma...</option>`;
      
      if (dadosConfig.turmasAtivas && Array.isArray(dadosConfig.turmasAtivas)) {
        dadosConfig.turmasAtivas.forEach(turma => {
          const opt = document.createElement("option");
          opt.value = turma;
          opt.textContent = turma;
          selectTurmaAluno.appendChild(opt);
        });
      }
    }
  } catch (e) {
    console.error("Erro ao carregar dados da escola para o aluno:", e);
    if (spanEscolaAviso) spanEscolaAviso.textContent = "Erro ao carregar escola";
    if (badgeEscolaQuiz) badgeEscolaQuiz.textContent = "Erro na escola";
  }
}

// Executa automaticamente ao carregar a página
window.addEventListener("DOMContentLoaded", carregarDadosIniciaisAluno);