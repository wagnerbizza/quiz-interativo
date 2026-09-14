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
  return {
    idDoc: idDoc,
    pergunta: d.pergunta || d.questao || d.titulo || "Pergunta Sem Título",
    opcoes: d.opcoes || d.alternativas || d.respostas || [],
    correta: (d.correta || d.resposta || d.correto || "A").toString().trim().toUpperCase(),
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
    
    // Matrizes completas com 50+ questões técnicas detalhadas
    const bancoQuestoesTecnicasExtendido = {
      "Inteligencia Artificial": [
        { p: "O que caracteriza o aprendizado supervisionado em Inteligência Artificial?", ops: ["Dados sem rótulos descobertos automaticamente", "Uso de dados de entrada juntamente com as respostas corretas desejadas", "Tentativa e erro autônoma sem histórico", "Regras fixas de lógica booleana"], c: "B" },
        { p: "Qual é a principal função de uma rede neural artificial?", ops: ["Gerenciar partições físicas de disco rígido", "Compilar códigos de baixo nível", "Processar dados através de camadas de nós para reconhecimento de padrões", "Imprimir relatórios em formato PDF"], c: "C" },
        { p: "O que significa o conceito de Deep Learning?", ops: ["Redes neurais com múltiplas camadas profundas capazes de extrair feições complexas", "Processamento de planilhas eletrônicas gigantescas", "Criptografia de ponta a ponta em redes locais", "Compactação avançada de arquivos de vídeo"], c: "A" },
        { p: "Qual a finalidade do Processamento de Linguagem Natural (PLN)?", ops: ["Traduzir scripts de banco de dados SQL", "Permitir que computadores compreendan, interpretem e gerem linguagem humana", "Validar sintaxe de arquivos HTML", "Desenhar interfaces gráficas de usuário"], c: "B" },
        { p: "O que avalia o Teste de Turing?", ops: ["A capacidade de uma máquina exibir comportamento inteligente equivalente ou indistinguível do humano", "A velocidade máxima de clock de um processador quântico", "A largura de banda de uma conexão de fibra óptica", "A segurança de sistemas contra ataques de negação de serviço"], c: "A" },
        { p: "Em Machine Learning, o que é o Overfitting?", ops: ["Quando o modelo se ajusta excessivamente aos dados de treino e generaliza mal para novos dados", "Quando o algoritmo roda muito devagar por falta de memória RAM", "Quando a base de dados é muito pequena para análise", "Quando ocorre erro de sintaxe na compilação"], c: "A" },
        { p: "O que é Visão Computacional?", ops: ["Campo focado em permitir que computadores extraiam informações compreensíveis de imagens e vídeos", "Placas de vídeo dedicadas a jogos em 4K", "Monitores com taxa de atualização de 240Hz", "Sistemas operacionais voltados para design gráfico"], c: "A" },
        { p: "O que caracteriza o Aprendizado por Reforço?", ops: ["O agente aprende tomando ações e recebendo recompensas ou punições no ambiente", "O sistema lê livros didáticos automaticamente", "O usuário corrige manualmente cada linha de código gerada", "Ocorre apenas em bancos de dados relacionais"], c: "A" },
        { p: "O que são Algoritmos Genéticos?", ops: ["Técnicas de otimização inspiradas na seleção natural e na evolução biológica", "Vírus de computador que modificam o DNA digital", "Ferramentas de controle de versão de código fonte", "Protocolos de roteamento de pacotes TCP/IP"], c: "A" },
        { p: "O que é aprendizado não supervisionado?", ops: ["Treinamento sem intervenção humana e sem dados rotulados, descobrindo agrupamentos ocultos", "Uso de gabaritos oficiais para correção de provas", "Sistemas supervisionados por um gerente de TI", "Execução de testes unitários automatizados"], c: "A" },
        { p: "Qual a função de uma função de ativação em redes neurais?", ops: ["Introduzir não-linearidade no modelo permitindo aprender padrões complexos", "Ligar ou desligar o computador remotamente", "Aumentar a velocidade do processador central", "Compactar os pesos sinápticos"], c: "A" },
        { p: "O que é o algoritmo KNN (K-Nearest Neighbors)?", ops: ["Um classificador baseado na proximidade dos vizinhos mais próximos no espaço de features", "Um protocolo de criptografia simétrica", "Um framework de desenvolvimento web", "Uma ferramenta de design de banco de dados"], c: "A" },
        { p: "O que é uma Árvore de Decisão em IA?", ops: ["Um modelo preditivo estruturado em nós que representam testes em atributos", "Um organograma corporativo de funcionários", "Uma estrutura de diretórios em servidores Linux", "Um fluxograma de rede de computadores"], c: "A" },
        { p: "O que significa a sigla NLP?", ops: ["Natural Language Processing", "Network Layer Protocol", "New Logic Programming", "Node Link Processor"], c: "A" },
        { p: "O que é o algoritmo K-Means?", ops: ["Um algoritmo de agrupamento (clustering) não supervisionado", "Uma ferramenta de segurança em nuvem", "Um compilador de inteligência artificial", "Um framework mobile"], c: "A" },
        { p: "Qual o papel do conjunto de dados de teste (Test Dataset)?", ops: ["Avaliar o desempenho final e a generalização do modelo treinado de forma imparcial", "Treinar os parâmetros iniciais da rede", "Servir de backup para o banco de produção", "Acelerar o carregamento da aplicação web"], c: "A" },
        { p: "O que é inteligência artificial generativa?", ops: ["Sistemas capazes de criar novos conteúdos como textos, imagens e códigos a partir de prompts", "IAs focadas unicamente em cálculos aritméticos simples", "Robôs industriais de linha de montagem", "Sistemas de controle de tráfego urbano"], c: "A" },
        { p: "O que é uma rede GAN (Generative Adversarial Network)?", ops: ["Duas redes neurais (geradora e discriminadora) que competem entre si para gerar dados realistas", "Um protocolo de segurança corporativa", "Uma arquitetura de banco de dados distribuído", "Um sistema de arquivos em nuvem"], c: "A" },
        { p: "O que é o Gradient Descent (Gradiente Descendente)?", ops: ["Um algoritmo de otimização iterativo usado para minimizar a função de custo do modelo", "Um método para medir a velocidade de download", "Um protocolo de roteamento dinâmico", "Uma ferramenta de limpeza de cache"], c: "A" },
        { p: "O que caracteriza os modelos baseados em Transformers em IA?", ops: ["Uso de mecanismos de atenção para processar sequências de dados em paralelo", "Conversão de energia elétrica em torque mecânico", "Transmissão de dados via rádio frequência", "Estrutura estática baseada em regras fixas"], c: "A" },
        { p: "O que é um Chatbot inteligente?", ops: ["Um programa de computador projetado para simular conversas humanas via texto ou voz", "Um cabo adaptador de rede", "Um roteador Wi-Fi inteligente", "Um antivírus automatizado"], c: "A" },
        { p: "O que significa Bias (Viés) em modelos de Machine Learning?", ops: ["Erros sistemáticos devido a hipóteses incorretas no algoritmo ou preconceitos nos dados", "A velocidade de processamento da CPU", "O consumo de memória da aplicação", "A quantidade de camadas ocultas"], c: "A" },
        { p: "O que é mineração de dados (Data Mining)?", ops: ["Processo de extração de padrões úteis e conhecimento a partir de grandes bases de dados", "Extração física de minérios para fabricação de chips", "Exclusão de arquivos corrompidos", "Formatação de discos rígidos"], c: "A" },
        { p: "O que é reconhecimento de padrões?", ops: ["Capacidade do sistema de identificar regularidades e tendências nos dados", "Conferência de senhas digitadas", "Impressão de etiquetas padronizadas", "Verificação de cabos de rede"], c: "A" },
        { p: "O que é o aprendizado federado?", ops: ["Treinamento de modelos de IA de forma descentralizada preservando a privacidade dos dados locais", "Federação de servidores de internet", "Sistemas de votação eletrônica", "Redes de computadores governamentais"], c: "A" },
        { p: "O que é um modelo preditivo?", ops: ["Um modelo matemático treinado para prever resultados futuros com base em dados históricos", "Um relatório financeiro anual", "Um cronograma de aulas", "Uma ferramenta de previsão do tempo analógica"], c: "A" },
        { p: "O que é visão computacional em tempo real?", ops: ["Processamento de imagens de vídeo instantaneamente para tomada de decisão imediata", "Impressão fotográfica rápida", "Salvamento automático de fotos na nuvem", "Transmissão de TV via satélite"], c: "A" },
        { p: "O que é o aprendizado semi-supervisionado?", ops: ["Abordagem que utiliza uma pequena quantidade de dados rotulados e muitos não rotulados", "Treinamento realizado apenas pela metade do dia", "Sistemas que funcionam sem energia elétrica", "Redes neurais com metade dos neurônios"], c: "A" },
        { p: "O que é Inteligência Artificial Forte (AGI)?", ops: ["Hipotética IA com capacidade cognitiva geral equivalente ou superior à humana em qualquer tarefa", "Um robô de metal altamente resistente", "Um supercomputador militar de grande porte", "Um sistema operacional blindado"], c: "A" },
        { p: "O que são pesos sinápticos em uma rede neural?", ops: ["Parâmetros numéricos ajustados durante o treinamento que determinam a força da conexão entre neurônios", "O peso físico dos servidores em gramas", "A carga da bateria do dispositivo", "O tamanho do arquivo de código"], c: "A" },
        { p: "O que é a função de perda (Loss Function)?", ops: ["Métrica que quantifica o erro entre a previsão do modelo e o valor real esperado", "Controle de arquivos deletados por engano", "Medidor de perda de pacotes de rede", "Relatório de evasão escolar"], c: "A" },
        { p: "O que é o aprendizado por transferência (Transfer Learning)?", ops: ["Reaproveitamento de um modelo pré-treinado em nova tarefa relacionada para acelerar o aprendizado", "Migração de arquivos entre servidores", "Cópia de dados via pendrive", "Transferência bancária automatizada"], c: "A" },
        { p: "O que é um hiperparâmetro em machine learning?", ops: ["Parâmetro externo cuja configuração é definida antes do início do processo de treinamento", "Um parâmetro que muda sozinho na nuvem", "A velocidade máxima do sistema operacional", "Um comando de terminal Linux"], c: "A" },
        { p: "O que caracteriza os sistemas especialistas?", ops: ["Sistemas que emulam o conhecimento e raciocínio humano de um especialista em domínio específico", "Profissionais de TI experientes", "Computadores velhos que funcionam bem", "Manuais de instrução impressos"], c: "A" },
        { p: "O que é robótica inteligente?", ops: ["Integração de IA com sistemas robóticos para percepção, raciocínio e ação autônoma", "Brinquedos de controle remoto", "Linhas de montagem manuais", "Sistemas de automação residencial básica"], c: "A" },
        { p: "O que é a ética em Inteligência Artificial?", ops: ["Estudo e diretrizes para garantir que sistemas de IA sejam justos, seguros, transparentes e sem viés discriminatório", "Regras de vestimenta para programadores", "Direitos autorais de códigos abertos", "Licenciamento de softwares comerciais"], c: "A" },
        { p: "O que é o reconhecimento de voz?", ops: ["Tecnologia que converte a fala humana em texto compreensível por sistemas computucionais", "Gravador de áudio digital", "Caixa de som inteligente", "Microfone sem fio"], c: "A" },
        { p: "O que é clusterização hierárquica?", ops: ["Método de análise de agrupamento que constrói uma hierarquia de clusters", "Organização de pastas em árvore no Windows", "Hierarquia de servidores web", "Organograma de cargos escolares"], c: "A" },
        { p: "O que é o aprendizado ativo?", ops: ["Estratégia onde o algoritmo pode consultar interativamente um usuário para rotular novos dados informativos", "Alunos estudando ativamente na sala de aula", "Sistemas operacionais em execução contínua", "Rotinas de backup executadas ao vivo"], c: "A" },
        { p: "O que é uma rede neural convolucional (CNN)?", ops: ["Rede neural especializada no processamento de dados com grade espacial, como imagens", "Rede de computadores cabeada", "Protocolo de rede seguro", "Sistema de transmissão de energia"], c: "A" },
        { p: "O que é uma rede neural recorrente (RNN)?", ops: ["Rede projetada para processar dados sequenciais, mantendo memória de estados anteriores", "Rede que reinicia sozinha após falhas", "Backup executado recorrentemente", "Sistema de energia ininterrupta"], c: "A" },
        { p: "O que é o ajuste fino (Fine-tuning)?", ops: ["Processo de refinar um modelo pré-treinado em um conjunto de dados específico", "Ajustar o monitor do computador", "Configurar a resolução da tela", "Calibrar o teclado mecânico"], c: "A" },
        { p: "O que é a matriz de confusão em Machine Learning?", ops: ["Tabela usada para avaliar o desempenho de um modelo de classificação (acertos e erros)", "Uma planilha desorganizada de notas", "Relatório de erros de rede", "Logs corrompidos de sistema"], c: "A" },
        { p: "O que significa a métrica Acurácia?", ops: ["Proporção de previsões corretas feitas pelo modelo em relação ao total de casos", "Velocidade de processamento da IA", "Tamanho do arquivo do modelo", "Consumo de energia da GPU"], c: "A" },
        { p: "O que é Inteligência Artificial Fraca (Narrow AI)?", ops: ["Sistemas de IA especializados em realizar tarefas específicas com alto desempenho", "IAs que funcionam com bateria fraca", "Algoritmos lentos e mal otimizados", "Computadores antigos sem placa de vídeo"], c: "A" },
        { p: "O que é o data augmentation (aumento de dados)?", ops: ["Técnica para artificialmente expandir o tamanho do conjunto de dados de treino criando variações", "Aumento da capacidade do HD", "Instalação de mais memória RAM", "Upgrade de servidores em nuvem"], c: "A" },
        { p: "O que é a normalização de dados?", ops: ["Processo de dimensionar os valores numéricos para uma faixa padrão antes do treino", "Deixar o texto em formato normal", "Padronizar nomes de arquivos", "Organizar pastas de projeto"], c: "A" },
        { p: "O que é uma base de conhecimento em IA?", ops: ["Repositório estruturado contendo fatos, regras e informações sobre um domínio", "Uma biblioteca pública de livros", "Um site de pesquisas na web", "Um arquivo de texto simples"], c: "A" },
        { p: "O que é inferência em Inteligência Artificial?", ops: ["Processo de usar um modelo treinado para fazer previsões em novos dados", "Conclusão precipitada de um problema", "Erro de execução de código", "Interrupção forçada de processo"], c: "A" },
        { p: "O que é aprendizado online em IA?", ops: ["Modelo que é atualizado continuamente à medida que novos dados chegam sequencialmente", "Estudar IA através de cursos na internet", "Acessar tutoriais via navegador web", "Conexão de rede ativa"], c: "A" }
      ],
      "Front-end": [
        { p: "Qual a principal responsabilidade do CSS em páginas web?", ops: ["Estruturar os textos semânticos", "Controlar a aparência visual, layout, cores e responsividade", "Processar regras de negócio no servidor", "Armazenar dados em banco NoSQL"], c: "B" },
        { p: "O que significa criar um layout responsivo?", ops: ["Carregar páginas instantaneamente", "Adaptar a interface de forma fluida a diferentes tamanhos de tela e dispositivos", "Usar apenas imagens em formato SVG", "Bloquear o uso de mouses e teclados"], c: "B" },
        { p: "Qual tag HTML é utilizada para importar folhas de estilo CSS externas?", ops: ["<script>", "<link>", "<style>", "<meta>"], c: "B" },
        { p: "O que é o DOM (Document Object Model)?", ops: ["Um banco de dados embarcado", "Uma representação hierárquica em árvore do documento HTML manipulável por scripts", "Um framework JavaScript", "Um protocolo de rede"], c: "B" },
        { p: "Qual propriedade CSS define o espaçamento interno de um elemento?", ops: ["margin", "padding", "border", "spacing"], c: "B" },
        { p: "O que é o Flexbox no CSS?", ops: ["Um modelo de layout unidimensional para alinhar e distribuir itens com facilidade", "Uma biblioteca de animações 3D", "Um compilador de código fonte", "Um gerenciador de pacotes"], c: "A" },
        { p: "Qual é a função primordial do JavaScript no navegador?", ops: ["Adicionar interatividade, dinamismo e lógica de programação do lado do cliente", "Apenas estruturar títulos e parágrafos", "Substituir servidores de banco de dados", "Compilar binários nativos"], c: "A" },
        { p: "O que é o React?", ops: ["Uma biblioteca JavaScript para criação de interfaces de usuário baseadas em componentes", "Um servidor web Apache", "Um sistema operacional mobile", "Um framework backend em PHP"], c: "A" },
        { p: "O que significa CSS Grid Layout?", ops: ["Um sistema de layout bidimensional para linhas e colunas", "Uma ferramenta de testes de unidade", "Um protocolo de transferência web", "Uma tag HTML obsoleta"], c: "A" },
        { p: "O que é AJAX?", ops: ["Técnica para realizar requisições assíncronas ao servidor sem recarregar a página", "Um framework CSS moderno", "Um editor de texto para web", "Uma ferramenta de versionamento"], c: "A" },
        { p: "Qual tag HTML é usada para criar um hiperlink?", ops: ["<a>", "<link>", "<href>", "<url>"], c: "A" },
        { p: "O que significa HTML?", ops: ["HyperText Markup Language", "High Tech Modern Language", "Hyperlink Transfer Media Language", "Home Tool Multi Language"], c: "A" },
        { p: "Qual propriedade CSS altera a cor do texto?", ops: ["color", "background-color", "text-style", "font-color"], c: "A" },
        { p: "O que é o seletor de ID no CSS?", ops: ["Identificado pelo símbolo '#' para estilizar um elemento único específico", "Identificado por '.' para classes globais", "Identificado por '*' para todos os elementos", "Identificado por tags HTML diretas"], c: "A" },
        { p: "O que é o seletor de Classe no CSS?", ops: ["Identificado pelo símbolo '.' para estilizar múltiplos elementos compartilhados", "Identificado por '#' para IDs únicos", "Identificado por '@' para variáveis", "Identificado por '$' para funções"], c: "A" },
        { p: "O que é Semantic HTML (HTML Semântico)?", ops: ["Uso de tags que dão significado estrutural ao conteúdo (ex: <header>, <article>, <footer>)", "Uso apenas de tags <div> para tudo", "Criação de códigos em linguagem de máquina", "Uso de criptografia em formulários"], c: "A" },
        { p: "O que é o LocalStorage no navegador?", ops: ["Um mecanismo de armazenamento web que guarda dados sem data de expiração", "Uma pasta oculta no disco rígido do servidor", "Um banco de dados SQL remoto", "Um cache de imagens temporárias"], c: "A" },
        { p: "O que é o SessionStorage?", ops: ["Armazenamento web que persiste dados apenas durante a sessão da aba aberta", "Armazenamento permanente em nuvem", "Um protocolo de sessão HTTP", "Um framework JavaScript"], c: "A" },
        { p: "O que faz a propriedade CSS 'display: none'?", ops: ["Oculta completamente o elemento da página sem ocupar espaço no layout", "Apenas deixa o elemento transparente", "Move o elemento para o fundo da tela", "Desativa cliques no elemento"], c: "A" },
        { p: "O que é Bootstrap?", ops: ["Um popular framework CSS focado em componentes pré-estilizados e responsividade", "Uma linguagem de programação backend", "Um banco de dados NoSQL", "Um editor de código fonte"], c: "A" },
        { p: "O que é SASS / SCSS?", ops: ["Um pré-processador CSS que adiciona recursos avançados como variáveis e mixins", "Um framework JavaScript", "Um protocolo de rede seguro", "Uma biblioteca de gráficos estatísticos"], c: "A" },
        { p: "O que é o evento 'onclick' em JavaScript?", ops: ["Um manipulador de eventos disparado quando o usuário clica em um elemento", "Um comando para desligar a tela", "Uma função de animação CSS", "Um tipo de dado numérico"], c: "A" },
        { p: "O que é JSON (JavaScript Object Notation)?", ops: ["Um formato leve de intercâmbio de dados baseado em sintaxe de objetos JavaScript", "Uma linguagem de estilização", "Um compilador de código fonte", "Um protocolo de criptografia"], c: "A" },
        { p: "O que é o npm (Node Package Manager)?", ops: ["O gerenciador de pacotes padrão para o ecossistema Node.js e JavaScript", "Um banco de dados relacional", "Um servidor web de alta performance", "Um framework de testes front-end"], c: "A" },
        { p: "O que é uma Single Page Application (SPA)?", ops: ["Uma aplicação web que carrega uma única página HTML e atualiza o conteúdo dinamicamente", "Um site estático de uma única página sem interatividade", "Um documento PDF interativo", "Um aplicativo mobile nativo"], c: "A" },
        { p: "O que faz a propriedade CSS 'position: absolute'?", ops: ["Posiciona o elemento em relação ao seu ancestral mais próximo posicionado", "Mantém o elemento fixo na tela durante a rolagem", "Posiciona o elemento no fluxo normal do documento", "Centraliza automaticamente o elemento"], c: "A" },
        { p: "O que é o Git no desenvolvimento Front-end?", ops: ["Um sistema de controle de versão distribuído para rastrear alterações em códigos", "Um servidor web local", "Uma biblioteca de componentes visuais", "Um editor de texto"], c: "A" },
        { p: "O que são Media Queries no CSS?", ops: ["Técnica de design responsivo que aplica estilos baseados nas características do dispositivo (ex: largura da tela)", "Consultas SQL feitas no navegador", "Funções JavaScript para manipulação de áudio", "Tags HTML para incorporar vídeos"], c: "A" },
        { p: "O que é o método 'addEventListener' em JavaScript?", ops: ["Método para registrar um ouvinte de eventos em um elemento alvo", "Função para somar números", "Comando para criar novas tags HTML", "Método para estilizar elementos CSS"], c: "A" },
        { p: "O que é o framework Vue.js?", ops: ["Um framework JavaScript progressivo para construção de interfaces de usuário", "Um banco de dados em nuvem", "Uma ferramenta de testes unitários", "Um compilador CSS"], c: "A" },
        { p: "O que é TypeScript?", ops: ["Um superconjunto tipado de JavaScript que é compilado para JavaScript puro", "Uma nova linguagem sem relação com JS", "Um banco de dados relacional", "Um framework backend"], c: "A" },
        { p: "O que é o conceito de Componentização?", ops: ["Divisão da interface de usuário em partes independentes, reutilizáveis e isoladas", "Divisão de arquivos em pastas compactadas", "Separação de servidores web", "Isolamento de redes locais"], c: "A" },
        { p: "O que é o Webpack?", ops: ["Um empacotador de módulos JavaScript para aplicações web modernas", "Um servidor de banco de dados", "Um navegador web para desenvolvedores", "Uma ferramenta de design gráfico"], c: "A" },
        { p: "O que é o método 'fetch' em JavaScript?", ops: ["API nativa para realizar requisições HTTP assíncronas via rede", "Método para buscar arquivos no computador local", "Função para atualizar a página", "Comando para apagar dados do navegador"], c: "A" },
        { p: "O que é o arquivo 'package.json'?", ops: ["Arquivo de manifesto que armazena metadados e dependências de um projeto Node.js", "Um documento de texto sem formatação", "Um arquivo de estilos CSS", "Um banco de dados JSON"], c: "A" },
        { p: "O que é o conceito de CSS Reset / Normalize?", ops: ["Técnica para padronizar a aparência padrão de elementos entre diferentes navegadores", "Apagar todo o código CSS escrito", "Reiniciar o servidor web", "Limpar o cache do navegador"], c: "A" },
        { p: "O que faz a propriedade CSS 'z-index'?", ops: ["Controla a ordem de empilhamento (sobreposição) dos elementos no eixo Z", "Define o zoom da página", "Controla o tamanho da fonte", "Alinha o texto verticalmente"], c: "A" },
        { p: "O que é o estado (State) em componentes front-end?", ops: ["Objeto que armazena dados dinâmicos e reativos que determinam o comportamento do componente", "O estado de conexão com a internet", "A localização geográfica do usuário", "O status do servidor backend"], c: "A" },
        { p: "O que é o roteamento no Front-end (Client-side Routing)?", ops: ["Gerenciamento de navegação entre diferentes vistas/páginas no navegador sem recarregar a aplicação", "Roteamento de pacotes de rede TCP/IP", "Configuração de roteadores Wi-Fi", "Direcionamento de e-mails"], c: "A" },
        { p: "O que é um Progressive Web App (PWA)?", ops: ["Aplicação web que utiliza recursos modernos para oferecer experiência semelhante a um app nativo", "Um site antigo em HTML puro", "Um aplicativo exclusivo para Windows", "Um vírus de navegador"], c: "A" },
        { p: "O que é o método 'document.querySelector'?", ops: ["Método JavaScript que retorna o primeiro elemento que corresponde a um seletor CSS especificado", "Uma tag HTML para buscas", "Um comando CSS", "Uma função de banco de dados"], c: "A" },
        { p: "O que é Tailwind CSS?", ops: ["Um framework CSS utilitário focado na composição rápida de designs customizados", "Uma biblioteca de gráficos 3D", "Um compilador JavaScript", "Um servidor web leve"], c: "A" },
        { p: "O que é minificação de código?", ops: ["Processo de remover caracteres desnecessários (espaços, comentários) para reduzir o tamanho dos arquivos", "Encolher o tamanho da fonte na tela", "Reduzir o número de linhas HTML", "Comprimir imagens em JPEG"], c: "A" },
        { p: "O que é o conceito de Acessibilidade (a11y) na web?", ops: ["Práticas para garantir que sites sejam utilizáveis por pessoas com deficiências", "Acesso livre sem senha à internet", "Velocidade de carregamento rápida", "Compatibilidade com celulares antigos"], c: "A" },
        { p: "O que faz a propriedade CSS 'box-sizing: border-box'?", ops: ["Inclui largura de borda e padding nas dimensões totais calculadas do elemento", "Cria uma caixa 3D ao redor do texto", "Esconde as bordas do elemento", "Alinha caixas em formato de grade"], c: "A" },
        { p: "O que é o ciclo de vida de um componente?", ops: ["As fases que um componente atravessa desde sua criação até sua remoção da tela", "O tempo de vida útil do computador", "A validade de um certificado SSL", "O tempo de carregamento da página"], c: "A" },
        { p: "O que é o operador spread (...) em JavaScript?", ops: ["Operador que permite expandir elementos de iteráveis (como arrays) em locais esperados", "Um comando para multiplicar números", "Uma função de estilização CSS", "Um protocolo de rede"], c: "A" },
        { p: "O que são Promises em JavaScript?", ops: ["Objetos que representam a conclusão ou falha de uma operação assíncrona", "Promessas de entrega de software", "Contratos de trabalho digital", "Funções síncronas bloqueantes"], c: "A" },
        { p: "O que é o conceito de Mobile First?", ops: ["Estratégia de design e desenvolvimento priorizando telas de dispositivos móveis antes dos desktops", "Aplicativos móveis feitos em primeiro lugar", "Uso exclusivo de celulares na escola", "Redes móveis 5G"], c: "A" },
        { p: "O que é o Linting de código (ex: ESLint)?", ops: ["Análise estática de código para encontrar e corrigir problemas de estilo e erros", "Limpeza de arquivos temporários", "Compactação de códigos JavaScript", "Atualização de bibliotecas"], c: "A" }
      ],
      "Redes de computadores e seguranca da informação na nuvem": [
        { p: "O que caracteriza o modelo IaaS na computação em nuvem?", ops: ["Locação de infraestrutura básica como servidores virtuais, armazenamento e redes", "Entrega de softwares prontos via navegador", "Ambiente exclusivo para programar sem gerenciar servidores", "Armazenamento local em HDs físicos"], c: "A" },
        { p: "O que representa a Criptografia de Dados na nuvem?", ops: ["Conversão de dados legíveis em formato codificado ilegível sem a chave correta", "Compactação de arquivos grandes para economia de banda", "Exclusão permanente de logs de acesso", "Isolamento físico de cabos de rede"], c: "A" },
        { p: "O que é um Firewall?", ops: ["Dispositivo ou software de segurança que monitora e filtra o tráfego de rede baseado em regras", "Um sistema de arquivos criptografados", "Um cabo de rede blindado de alta velocidade", "Um protocolo de e-mail seguro"], c: "A" },
        { p: "O que significa PaaS em computação em nuvem?", ops: ["Platform as a Service - Plataforma como Serviço", "Protocol as a Secure System", "Private Access Storage", "Public Authentication Service"], c: "A" },
        { p: "Qual a função do protocolo HTTPS?", ops: ["Garantir navegação segura e criptografada entre navegador e servidor web", "Acelerar downloads de arquivos pesados", "Gerenciar endereços IP dinâmicos", "Bloquear vírus em mídias removíveis"], c: "A" },
        { p: "O que é Autenticação de Dois Fatores (2FA)?", ops: ["Camada adicional de segurança exigindo duas formas distintas de verificação no login", "Uso de duas senhas idênticas", "Acesso simultâneo por dois computadores", "Backup duplicado em nuvem"], c: "A" },
        { p: "O que é computação em nuvem (Cloud Computing)?", ops: ["Entrega de serviços de computação pela internet (servidores, armazenamento, banco de dados)", "Armazenamento de dados em disquetes", "Redes locais sem fio (Wi-Fi)", "Servidores sem conexão web"], c: "A" },
        { p: "O que é um ataque de Phishing?", ops: ["Tentativa fraudulenta de obter informações confidenciais fingindo ser entidade confiável", "Invasão direta de roteadores por força bruta", "Queda de servidores por tráfego excessivo", "Roubo físico de servidores"], c: "A" },
        { p: "O que é Backup em nuvem?", ops: ["Cópia de segurança de dados armazenada em servidores remotos acessíveis via internet", "Gravação de dados em CD-R", "Impressão de documentos importantes", "Exclusão de arquivos temporários"], c: "A" },
        { p: "O que significa VPN (Virtual Private Network)?", ops: ["Rede privada virtual que cria túnel criptografado seguro sobre uma rede pública", "Video Player Nativo", "Virtual Processor Node", "Visual Protocol Number"], c: "A" },
        { p: "O que é o modelo SaaS (Software as a Service)?", ops: ["Modelo onde aplicativos completos são fornecidos sob demanda via web", "Locação de servidores virtuais puros", "Plataforma de desenvolvimento de código", "Infraestrutura de rede física"], c: "A" },
        { p: "O que é o endereço IP (Internet Protocol)?", ops: ["Identificador numérico exclusivo atribuído a cada dispositivo conectado a uma rede", "Nome de usuário na rede", "Senha de acesso ao roteador", "Código de barras do computador"], c: "A" },
        { p: "O que faz o protocolo DNS (Domain Name System)?", ops: ["Traduz nomes de domínios legíveis em endereços IP numéricos", "Criptografa e-mails corporativos", "Roteia pacotes entre redes diferentes", "Gerencia senhas de usuários"], c: "A" },
        { p: "O que é um ataque de Negação de Serviço (DDoS)?", ops: ["Sobrecarga intencional de um sistema com tráfego massivo para derrubá-lo", "Roubo de senhas por e-mail falso", "Invasão de firewalls corporativos", "Apagamento remoto de arquivos"], c: "A" },
        { p: "O que é a computação Serverless (Sem Servidor)?", ops: ["Modelo onde o desenvolvedor cria aplicações sem gerenciar servidores diretamente", "Servidores que funcionam sem energia elétrica", "Redes sem cabos ou roteadores", "Computadores sem sistema operacional"], c: "A" },
        { p: "O que é uma Sub-rede (Subnet)?", ops: ["Subdivisão lógica de uma rede maior de computadores", "Uma rede menor que não funciona bem", "Cabo divisor de sinal de internet", "Backup secundário de dados"], c: "A" },
        { p: "O que é o protocolo TCP (Transmission Control Protocol)?", ops: ["Protocolo orientado à conexão que garante a entrega confiável de pacotes de dados", "Protocolo sem garantia de entrega", "Protocolo exclusivo para criptografia", "Protocolo de correio eletrônico"], c: "A" },
        { p: "O que é o protocolo UDP (User Datagram Protocol)?", ops: ["Protocolo simples sem conexão e sem garantia de entrega, focado em velocidade", "Protocolo ultra seguro de banco de dados", "Sistema de arquivos em nuvem", "Gerenciador de endereços IP"], c: "A" },
        { p: "O que é um certificado SSL/TLS?", ops: ["Certificado digital que autentica a identidade de um site e criptografa a conexão", "Licença de uso de software", "Comprovante de pagamento de nuvem", "Garantia de hardware de servidor"], c: "A" },
        { p: "O que é segurança da informação baseada no conceito de Tríade CIA?", ops: ["Confidencialidade, Integridade e Disponibilidade", "Controle, Inspeção e Autenticação", "Criptografia, Inovação e Acesso", "Conexão, Internet e Aplicativos"], c: "A" },
        { p: "O que é um Ransomware?", ops: ["Software malicioso que sequestra dados criptografando-os e exigindo resgate", "Antivírus corporativo gratuito", "Ferramenta de backup em nuvem", "Protocolo de rede seguro"], c: "A" },
        { p: "O que é o conceito de Load Balancer (Balanceador de Carga)?", ops: ["Dispositivo ou serviço que distribui o tráfego de rede entre múltiplos servidores", "Balança para pesar servidores físicos", "Medidor de velocidade de internet", "Controlador de consumo de energia"], c: "A" },
        { p: "O que é uma Zona de Disponibilidade em nuvem?", ops: ["Locais isolados dentro de uma região de nuvem com infraestrutura independente de energia e rede", "Áreas proibidas para acesso de funcionários", "Salas de servidores sem refrigeração", "Redes Wi-Fi públicas"], c: "A" },
        { p: "O que significa a sigla IAM (Identity and Access Management)?", ops: ["Gerenciamento de Identidade e Acesso para controle de permissões de usuários", "Internet Access Monitor", "Internal Audit Module", "Integrated Application Model"], c: "A" },
        { p: "O que é um ataque de força bruta (Brute Force)?", ops: ["Tentativa sistemática de adivinhar senhas testando todas as combinações possíveis", "Invasão física a uma sala de servidores", "Queda de energia em data centers", "Roubo de cabos de fibra"], c: "A" },
        { p: "O que é a computação em nuvem híbrida?", ops: ["Ambiente que combina infraestrutura local (on-premises) com nuvem pública ou privada", "Uso de dois sistemas operacionais simultâneos", "Redes cabeadas e Wi-Fi misturadas", "Uso de servidores de marcas diferentes"], c: "A" },
        { p: "O que é o protocolo DHCP?", ops: ["Protocolo que atribui endereços IP dinamicamente aos dispositivos de uma rede", "Criptografa senhas de acesso", "Gerencia domínios de internet", "Filtra tráfego malicioso"], c: "A" },
        { p: "O que é um ataque de Homem no Meio (MitM)?", ops: ["Interceptação secreta de comunicação entre duas partes por um invasor", "Funcionário que trabalha entre dois departamentos", "Roteador intermediário de alta velocidade", "Backup feito na metade do dia"], c: "A" },
        { p: "O que é a integridade de dados na segurança?", ops: ["Garantir que os dados não foram adulterados ou corrompidos por unauthorized users", "Manter os dados sempre em sigilo", "Garantir acesso ininterrupto aos arquivos", "Compactar dados para economizar espaço"], c: "A" },
        { p: "O que é o modelo de nuvem pública?", ops: ["Serviços de nuvem operados por terceiros oferecendo recursos pela internet pública", "Redes de computadores abertas na escola", "Servidores locais sem senha", "Sistemas operacionais de código aberto"], c: "A" },
        { p: "O que é o modelo de nuvem privada?", ops: ["Infraestrutura de nuvem usada exclusivamente por uma única organização", "Nuvem compartilhada por várias empresas", "Pasta compartilhada em rede local", "Armazenamento em pen drive pessoal"], c: "A" },
        { p: "O que é um arquivo de Log de Auditoria?", ops: ["Registro cronológico de eventos e atividades ocorridas em um sistema ou rede", "Arquivo de texto com músicas", "Manual de instruções do sistema", "Lista de senhas de usuários"], c: "A" },
        { p: "O que é a porta padrão utilizada pelo protocolo HTTPS?", ops: ["Porta 443", "Porta 80", "Porta 21", "Porta 22"], c: "A" },
        { p: "O que é a porta padrão utilizada pelo protocolo HTTP?", ops: ["Porta 80", "Porta 443", "Porta 3306", "Porta 53"], c: "A" },
        { p: "O que faz o protocolo SSH (Secure Shell)?", ops: ["Permite acesso remoto seguro a sistemas através de linha de comando criptografada", "Transfere arquivos de texto sem segurança", "Gerencia endereços IP", "Navega em páginas web"], c: "A" },
        { p: "O que é um Sniffer de rede?", ops: ["Ferramenta para capturar e analisar pacotes de dados que trafegam em uma rede", "Um antivírus de alta potência", "Um cabo de rede defeituoso", "Um roteador sem fio"], c: "A" },
        { p: "O que é virtualização de servidores?", ops: ["Criação de instâncias virtuais de servidores sobre um único hardware físico", "Desligamento de servidores físicos", "Simulação de jogos em rede", "Uso de computadores antigos"], c: "A" },
        { p: "O que é o conceito de Zero Trust (Confiança Zero) em segurança?", ops: ["Modelo que exige verificação rigorosa de identidade para qualquer usuário ou dispositivo, sem confiar em nada por padrão", "Política de não permitir nenhum acesso à rede", "Desativação de todos os firewalls", "Uso de redes sem senha"], c: "A" },
        { p: "O que é um ataque de Malware?", ops: ["Termo genérico para qualquer software malicioso (vírus, spyware, trojan)", "Um erro de compilação de código", "Falha de hardware em servidores", "Queda de conexão de internet"], c: "A" },
        { p: "O que é Disaster Recovery (Recuperação de Desastres)?", ops: ["Plano e conjunto de procedimentos para restaurar a infraestrutura de TI após falhas catastróficas", "Compra de novos computadores queimados", "Formatação de discos rígidos", "Limpeza física de data centers"], c: "A" },
        { p: "O que é um endereço MAC (Media Access Control)?", ops: ["Identificador físico único gravado na placa de rede do dispositivo", "Endereço IP dinâmico", "Senha de rede Wi-Fi", "Nome do computador na rede"], c: "A" },
        { p: "O que é o protocolo FTP?", ops: ["Protocolo de transferência de arquivos entre sistemas em uma rede", "Protocolo de navegação web", "Protocolo de segurança de e-mail", "Protocolo de roteamento IP"], c: "A" },
        { p: "O que é um honeypot em segurança cibernética?", ops: ["Sistema isca configurado para atrair e monitorar invasores cibernéticos", "Um pote de mel para servidores", "Um antivírus gratuito", "Um firewall de alta performance"], c: "A" },
        { p: "O que é a elasticidade na computação em nuvem?", ops: ["Capacidade de expandir ou reduzir automaticamente os recursos computacionais conforme a demanda", "Flexibilidade física dos cabos de rede", "Elasticidade de telas de monitores", "Velocidade de digitação"], c: "A" },
        { p: "O que é criptografia simétrica?", ops: ["Uso da mesma chave secreta tanto para criptografar quanto para descriptografar os dados", "Uso de duas chaves diferentes", "Criptografia sem uso de senhas", "Dados abertos sem proteção"], c: "A" },
        { p: "O que é criptografia assimétrica?", ops: ["Uso de um par de chaves (pública e privada) para criptografia e descriptografia", "Uso de uma única chave secreta", "Criptografia baseada em senhas numéricas", "Sistema sem chaves de acesso"], c: "A" },
        { p: "O que é um ataque de Injeção de SQL (SQL Injection)?", ops: ["Inserção de códigos maliciosos em consultas de banco de dados através de entradas vulneráveis", "Erro de digitação em planilhas", "Falha de conexão com a nuvem", "Roubo de cabos de rede"], c: "A" },
        { p: "O que é o conceito de Patch Management?", ops: ["Processo de gerenciamento, teste e aplicação de atualizações de segurança em softwares", "Remoção de vírus em pendrives", "Conserto físico de placas-mãe", "Instalação de cabos de rede"], c: "A" },
        { p: "O que é a disponibilidade de dados?", ops: ["Garantir que a informação e os sistemas estejam acessíveis aos usuários autorizados sempre que necessário", "Manter os dados em sigilo absoluto", "Impedir cópias de arquivos", "Criptografar senhas complexas"], c: "A" },
        { p: "O que é um roteador em redes de computadores?", ops: ["Dispositivo que encaminha pacotes de dados entre diferentes redes de computadores", "Um cabo de alta velocidade", "Um servidor de arquivos", "Um antivírus de rede"], c: "A" }
      ],
      "Processos de desenvolvimento de sistemas e metodologias Ágeis": [
        { p: "O que é uma Sprint no framework Scrum?", ops: ["Um documento com requisitos estáticos", "Um período de tempo curto (time-box) para desenvolver um incremento de produto utilizable", "Reunião final de homologação do cliente", "Cargo de gestão tradicional de projetos"], c: "B" },
        { p: "Qual o objetivo da etapa de Requisitos no desenvolvimento de sistemas?", ops: ["Escrever código otimizado", "Levantar, analisar e documentar detalhadamente o que o sistema deve fazer e as necessidades do usuário", "Testar a segurança da nuvem", "Comercializar o software no mercado"], c: "B" },
        { p: "O que é o Manifesto Ágil?", ops: ["Conjunto de valores e princípios focados em flexibilidade, colaboração e entrega contínua de valor", "Um contrato jurídico rígido", "Um manual de instalação de servidores", "Uma linguagem de programação"], c: "A" },
        { p: "O que é o Product Backlog no Scrum?", ops: ["Uma lista ordenada de tudo que é necessário no produto", "Um relatório de erros do sistema", "Um contrato assinado pelo cliente", "Um manual de instruções"], c: "A" },
        { p: "Qual a função do Scrum Master?", ops: ["Garantir que o time siga a teoria e práticas do Scrum removendo impedimentos", "Escrever todo o código do sistema", "Definir o preço de venda do software", "Gerenciar o orçamento financeiro"], c: "A" },
        { p: "O que é Integração Contínua (CI)?", ops: ["Prática de mesclar alterações de código em repositório central frequentemente com testes automatizados", "Instalação manual de softwares", "Backup semanal de banco de dados", "Reunião diária de equipe"], c: "A" },
        { p: "O que é uma User Story (História de Usuário)?", ops: ["Descrição curta de uma funcionalidade sob a perspectiva do usuário final", "Um livro de ficção sobre tecnologia", "Um relatório de bugs", "Um diagrama de classes UML"], c: "A" },
        { p: "O que caracteriza a metodologia Cascata (Waterfall)?", ops: ["Fluxo de desenvolvimento sequencial onde cada fase deve ser concluída antes da seguinte", "Entregas diárias de software", "Mudanças constantes de requisitos", "Trabalho remoto descentralizado"], c: "A" },
        { p: "O que é a Daily Scrum?", ops: ["Reunião diária de sincronização do time de desenvolvimento", "Festa de comemoração de entrega", "Auditoria financeira anual", "Treinamento de funcionários"], c: "A" },
        { p: "O que é o Kanban?", ops: ["Método visual de gerenciamento de fluxo de trabalho usando quadros e cartões", "Uma linguagem de banco de dados", "Um antivírus corporativo", "Um protocolo de internet"], c: "A" },
        { p: "O que é o papel do Product Owner (PO) no Scrum?", ops: ["Representar os interesses do cliente, gerenciar e priorizar o Product Backlog", "Desenvolver o código fonte do sistema", "Testar bugs no software", "Conduzir reuniões diárias"], c: "A" },
        { p: "O que é a Retrospectiva da Sprint?", ops: ["Reunião para inspecionar o processo e planejar melhorias para a próxima sprint", "Avaliação de desempenho salarial", "Reunião de vendas com clientes", "Planejamento inicial do projeto"], c: "A" },
        { p: "O que é o Ciclo de Vida de Desenvolvimento de Sistemas (SDLC)?", ops: ["Estrutura que define as etapas para planejar, criar, testar e implantar um sistema de software", "A vida útil de um computador", "O tempo de garantia de um programa", "O ciclo de reuniões da equipe"], c: "A" },
        { p: "O que é Refatoração de Código?", ops: ["Processo de reestruturar código existente sem alterar seu comportamento externo para melhorar sua legibilidade", "Apagar todo o código e reescrevê-lo", "Corrigir bugs críticos de segurança", "Compilar o programa"], c: "A" },
        { p: "O que é o MVP (Minimum Viable Product)?", ops: ["Versão de um novo produto com recursos suficientes para satisfazer os primeiros clientes e validar hipóteses", "O produto final completo com todas as funções", "Um manual de testes unitários", "Um sistema operacional básico"], c: "A" },
        { p: "O que são Testes Unitários?", ops: ["Testes automatizados que verificam pequenas unidades isoladas de código (como funções ou métodos)", "Testes feitos por usuários finais na empresa", "Testes de velocidade de rede", "Testes visuais de design"], c: "A" },
        { p: "O que é o planejamento da Sprint (Sprint Planning)?", ops: ["Evento onde o time define o trabalho da sprint que será realizado", "Planejamento financeiro anual da empresa", "Reunião de demissão de funcionários", "Contratação de novos desenvolvedores"], c: "A" },
        { p: "O que é a revisão da Sprint (Sprint Review)?", ops: ["Reunião ao final da sprint para inspecionar o incremento com os stakeholders e adaptar o backlog", "Revisão de código fonte por colegas", "Inspeção de servidores em nuvem", "Auditoria fiscal"], c: "A" },
        { p: "O que é a modelagem de dados?", ops: ["Processo de criar uma representação visual ou esquemática de um sistema de informação e seus dados", "Criação de gráficos estatísticos", "Modelagem de interfaces visuais", "Design de logotipos"], c: "A" },
        { p: "O que é o desenvolvimento orientado a testes (TDD)?", ops: ["Prática onde os testes automatizados são escritos antes do próprio código de implementação", "Testar o sistema apenas no final", "Não realizar testes de software", "Testar apenas com usuários reais"], c: "A" },
        { p: "O que é um diagrama de casos de uso (UML)?", ops: ["Diagrama que mostra a interação entre o sistema e os atores externos", "Diagrama de circuitos elétricos", "Fluxograma de rede de computadores", "Organograma corporativo"], c: "A" },
        { p: "O que é o débito técnico?", ops: ["Custo implícito de refatoração adicional causada pela escolha de uma solução fácil de implementar agora em vez de usar uma abordagem melhor", "Dívidas financeiras da empresa de software", "Contas de energia dos servidores", "Pagamento de licenças de software"], c: "A" },
        { p: "O que caracteriza metodologias ágeis em oposição aos métodos tradicionais?", ops: ["Maior adaptabilidade a mudanças, entregas frequentes e forte colaboração com o cliente", "Uso obrigatório de burocracia e documentação extensa", "Prazo fixo sem possibilidade de alteração", "Foco exclusivo no contrato inicial"], c: "A" },
        { p: "O que é o conceito de Entrega Contínua (Continuous Delivery)?", ops: ["Abordagem onde o software pode ser liberado para produção a qualquer momento de forma automatizada", "Entrega física de CDs pelo correio", "Envio diário de relatórios em PDF", "Backup diário automatizado"], c: "A" },
        { p: "O que é uma User Persona?", ops: ["Representação fictícia baseada em dados reais do cliente ideal de um produto", "O nome do desenvolvedor chefe", "Uma senha de acesso ao sistema", "Um tipo de erro de sistema"], c: "A" },
        { p: "O que é o diagrama de classes (UML)?", ops: ["Diagrama estrutural que mostra as classes, atributos, operações e relacionamentos do sistema", "Diagrama de fluxo de rede", "Organograma de funcionários", "Cronograma de projeto"], c: "A" },
        { p: "O que é um protótipo de baixa fidelidade?", ops: ["Esboço simples em papel ou wireframe rápido para testar ideias iniciais de layout", "Um sistema completo com erros", "Um programa mal compilado", "Um documento jurídico"], c: "A" },
        { p: "O que é um protótipo de alta fidelidade?", ops: ["Modelo interativo detalhado que se assemelha muito ao produto final em design e comportamento", "Um protótipo antigo e ultrapassado", "Um relatório impresso", "Um documento em PDF"], c: "A" },
        { p: "O que é a estimativa de esforço ágil (Planning Poker)?", ops: ["Técnica de estimativa baseada em consenso usando cartas para pontuar histórias de usuário", "Um jogo de cartas para o intervalo do almoço", "Aposta financeira em projetos", "Sorteio de tarefas entre desenvolvedores"], c: "A" },
        { p: "O que é um Bug em desenvolvimento de sistemas?", ops: ["Um erro, falha ou comportamento inesperado no código do programa", "Um inseto real na sala de servidores", "Um vírus de computador", "Um componente de hardware queimado"], c: "A" },
        { p: "O que é o processo de homologação de um sistema?", ops: ["Validação final do software pelo cliente ou usuário para garantir que atende aos requisitos", "Registro legal da empresa", "Contratação de programadores", "Instalação de cabos de rede"], c: "A" },
        { p: "O que é o gerenciamento de configuração de software?", ops: ["Controle de versões, mudanças e artefatos gerados durante o desenvolvimento", "Configuração de roteadores", "Instalação de sistemas operacionais", "Ajuste de monitores"], c: "A" },
        { p: "O que é o feedback contínuo?", ops: ["Prática de coletar e avaliar opiniões de usuários e da equipe de forma constante para melhorias", "Reclamações diárias de clientes", "Relatórios mensais impressos", "Emails automáticos de erro"], c: "A" },
        { p: "O que é uma ferramenta de versionamento de código (ex: Git)?", ops: ["Sistema que registra alterações em arquivos de código permitindo voltar a versões anteriores", "Um antivírus corporativo", "Um compilador de linguagens", "Um banco de dados web"], c: "A" },
        { p: "O que é a análise de viabilidade de um projeto?", ops: ["Estudo preliminar para avaliar se o projeto é técnica, econômica e operativamente viável", "Análise de erros de código", "Teste de velocidade de servidores", "Auditoria de contas da escola"], c: "A" },
        { p: "O que é a engenharia de software?", ops: ["Aplicação de uma abordagem sistemática, disciplinada e quantificável ao desenvolvimento de software", "Instalação de computadores", "Suporte técnico de hardware", "Venda de licenças comerciais"], c: "A" },
        { p: "O que é um diagrama de atividades (UML)?", ops: ["Diagrama comportamental que ilustra o fluxo de controle de uma atividade para outra", "Gráfico de desempenho físico dos alunos", "Cronograma de aulas", "Organograma de tarefas"], c: "A" },
        { p: "O que é um plano de projeto em metodologias tradicionais?", ops: ["Documento detalhado especificando cronograma, custos, recursos e marcos do projeto", "Um rascunho em papel", "Uma lista de tarefas diárias", "Um contrato verbal"], c: "A" },
        { p: "O que é o controle de qualidade (QA - Quality Assurance)?", ops: ["Processo sistemático para garantir que os padrões de qualidade do software sejam atendidos", "Correção manual de erros pelos alunos", "Vistoria predial da escola", "Instalação de antivírus"], c: "A" },
        { p: "O que é uma ferramenta de gestão de projetos (ex: Jira, Trello)?", ops: ["Software para planejar, acompanhar e gerenciar tarefas e fluxos de trabalho da equipe", "Um editor de textos", "Um banco de dados", "Um servidor web"], c: "A" },
        { p: "O que é a especificação de software?", ops: ["Documentação detalhada das funções, restrições e características que o sistema deve possuir", "Manual de instruções do usuário final", "Contrato de compra e venda", "Relatório de notas escolares"], c: "A" },
        { p: "O que é a programação em par (Pair Programming)?", ops: ["Prática ágil onde dois desenvolvedores trabalham juntos na mesma estação de trabalho", "Dois alunos fazendo provas juntos", "Dois servidores trabalhando em redundância", "Dois monitores conectados ao PC"], c: "A" },
        { p: "O que é o conceito de Fail Fast (Falhar Rápido)?", ops: ["Filosofia de identificar erros e problemas o mais cedo possível no ciclo para corrigi-los sem grande impacto", "Desligar o sistema rapidamente", "Demitir funcionários com pressa", "Cancelar o projeto na primeira falha"], c: "A" },
        { p: "O que é a arquitetura de software?", ops: ["Organização estrutural fundamental de um sistema, incluindo seus componentes e relacionamentos", "Decoração do escritório de TI", "Esquema elétrico da sala de servidores", "Planta baixa da escola"], c: "A" },
        { p: "O que é o escopo do projeto?", ops: ["Definição clara de todos os limites, objetivos, entregáveis e tarefas do projeto", "O tamanho da tela do computador", "O orçamento financeiro total", "O prazo de entrega final"], c: "A" },
        { p: "O que é o gerenciamento de riscos em projetos?", ops: ["Identificação, análise e resposta a eventos incertos que podem afetar o projeto", "Seguro de vida dos funcionários", "Backup de arquivos na nuvem", "Instalação de extintores de incêndio"], c: "A" },
        { p: "O que é o conceito de escalabilidade de sistemas?", ops: ["Capacidade do sistema de lidar com o aumento de carga de trabalho expandindo seus recursos", "Capacidade de mudar de tamanho físico", "Aumento da fonte de energia", "Crescimento da equipe de desenvolvimento"], c: "A" },
        { p: "O que é uma API (Application Programming Interface)?", ops: ["Conjunto de definições e protocolos que permite a comunicação e integração entre diferentes softwares", "Um cabo adaptador de rede", "Um banco de dados relacional", "Um sistema operacional mobile"], c: "A" },
        { p: "O que é o framework Scrum?", ops: ["Um framework ágil leve para gerenciar e resolver problemas complexos em equipes", "Uma linguagem de programação", "Um editor de código fonte", "Um antivírus corporativo"], c: "A" },
        { p: "O que é o ciclo PDCA aplicado a processos?", ops: ["Planejar, Fazer, Checar e Agir (Plan, Do, Check, Act) para melhoria contínua", "Processo de desenvolvimento em cascata", "Protocolo de rede seguro", "Ferramenta de design gráfico"], c: "A" }
      ]
    };

    const snap = await getDocs(collection(db, "questoes"));
    let bancoAtual = [];
    snap.forEach(s => bancoAtual.push(normalizarDocumentoQuestao(s.data(), s.id)));

    // Abastecer automaticamente no Firebase se a matéria tiver menos de 50 questões
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
            opcoes: [
              `A) ${baseModelo.ops[0]}`,
              `B) ${baseModelo.ops[1]}`,
              `C) ${baseModelo.ops[2]}`,
              `D) ${baseModelo.ops[3]}`
            ],
            correta: baseModelo.c,
            criadoEm: serverTimestamp()
          });
        }
      }
    }
  } catch (e) { console.error("Erro ao abastecer banco de questões técnicas:", e); }
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
      estruturaGlobalBoxes[bIdx].itens.splice(iIdx, 1);
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
        corpoTabelaResultados.innerHTML = `<tr><td colspan="9" style="text-align:center; color: #94a3b8;">Nenhum resultado registrado até o momento.</td></tr>`;
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

  window.exportarResultadosCSV = function() {
    if (!resultadosGlobaisCache || resultadosGlobaisCache.length === 0) {
      alert("⚠️ Não há resultados para exportar.");
      return;
    }
    let csvContent = "\uFEFFData/Hora;Escola;Período;Aluno;Turma;Matéria;Tempo Gasto;Acertos;Erros;Nota\n";
    resultadosGlobaisCache.forEach(res => {
      let dataFormatada = res.dataEnvio?.toDate ? res.dataEnvio.toDate().toLocaleString('pt-BR') : "Data recente";
      let totalQ = res.totalQuestoes || 0;
      let acertos = res.pontuacao || 0;
      let erros = totalQ - acertos;
      let nota = totalQ > 0 ? ((acertos / totalQ) * 10).toFixed(1) : "0.0";
      let linha = `"${dataFormatada}";"${res.escola || ''}";"${res.periodo || ''}";"${res.nome || ''}";"${res.turma || ''}";"${res.materia || ''}";"${res.tempoGastoFormatado || ''}";"${acertos}";"${erros}";"${nota}"\n`;
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
          opcoes: ["Alternativa Correta (A)", "Alternativa Incorreta (B)", "Alternativa Incorreta (C)", "Alternativa Incorreta (D)"],
          correta: "A",
          categoria: "Geral"
        });
      }
    }

    filtradas.sort(() => Math.random() - 0.5);
    listaQuestoes = filtradas.slice(0, qtdQ);

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

  function exibirQuestao() {
    const q = listaQuestoes[indiceAtual];
    document.getElementById("pergunta-txt").textContent = `${indiceAtual + 1}. ${q.pergunta}`;
    document.getElementById("progresso-txt").textContent = `Questão ${indiceAtual + 1} de ${listaQuestoes.length}`;
    
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
      document.getElementById("status-envio-txt").textContent = "Resultado salvo com sucesso! ✅";
    } catch(e) { document.getElementById("status-envio-txt").textContent = "Erro ao salvar."; }
  }

  document.getElementById("btn-reiniciar")?.addEventListener("click", () => location.reload());
}