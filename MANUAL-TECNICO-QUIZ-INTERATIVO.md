# Manual Técnico e de Manutenção --- Quiz Interativo

**Versão de referência:** 07/10/2026\
**Objetivo:** permitir entender, localizar e alterar o sistema com
segurança, mesmo sem conhecimento avançado de programação.

> **Regra principal:** antes de alterar qualquer arquivo, faça uma
> cópia. Nunca apague `backup-local`, relatórios, dados do Firebase ou
> `prova-publicada.json` apenas para "corrigir" um erro.

------------------------------------------------------------------------

# Índice

1.  [Visão geral do sistema](#1-visão-geral-do-sistema)
2.  [Arquivos principais](#2-arquivos-principais)
3.  [Fluxo completo de uma
    avaliação](#3-fluxo-completo-de-uma-avaliação)
4.  [Área do Aluno --- index.html](#4-área-do-aluno--indexhtml)
5.  [Painel do Professor](#5-painel-do-professor)
6.  [Ativação e encerramento da
    prova](#6-ativação-e-encerramento-da-prova)
7.  [Código de acesso](#7-código-de-acesso)
8.  [Bloqueio de segunda tentativa](#8-bloqueio-de-segunda-tentativa)
9.  [Tempo da avaliação](#9-tempo-da-avaliação)
10. [Embaralhamento](#10-embaralhamento)
11. [Resultados e proteção local](#11-resultados-e-proteção-local)
12. [Firebase](#12-firebase)
13. [GitHub Pages e
    prova-publicada.json](#13-github-pages-e-prova-publicadajson)
14. [Demonstrações](#14-demonstrações)
15. [Backups e relatórios](#15-backups-e-relatórios)
16. [Como localizar rapidamente uma
    função](#16-como-localizar-rapidamente-uma-função)
17. [Alterações simples que você pode
    fazer](#17-alterações-simples-que-você-pode-fazer)
18. [O que não alterar sem uma
    cópia](#18-o-que-não-alterar-sem-uma-cópia)
19. [Roteiro de diagnóstico](#19-roteiro-de-diagnóstico)
20. [Checklist antes de usar com os
    alunos](#20-checklist-antes-de-usar-com-os-alunos)

------------------------------------------------------------------------

# 1. Visão geral do sistema

O sistema possui duas áreas principais:

-   **Painel do Professor:** cadastro, banco de questões, ativação,
    monitoramento e relatórios.
-   **Área do Aluno:** identifica a avaliação publicada, valida
    escola/turma/código, executa a prova e envia o resultado.

A arquitetura atual trabalha de forma híbrida:

**Professor → publicação → `prova-publicada.json` → GitHub Pages →
aluno**

e, quando necessário:

**Aluno/Professor ↔ Firebase**

O GitHub Pages distribui a avaliação pública. O Firebase continua
importante para autenticação, monitoramento, armazenamento/sincronização
e dados privados.

O gabarito não deve ser colocado no pacote público da prova.

------------------------------------------------------------------------

# 2. Arquivos principais

## `index.html`

É a **Área do Aluno**.

Nele estão:

-   tela inicial;
-   identificação da escola;
-   código de acesso;
-   nome e turma;
-   carregamento da avaliação;
-   questões e alternativas;
-   cronômetros;
-   finalização;
-   proteção local de resultados;
-   bloqueio de tentativa;
-   retorno automático;
-   demonstração da Área do Aluno.

## `painel.html`

É a estrutura visual principal do **Painel do Professor**.

Contém as abas e elementos que o professor utiliza.

## `app.js`

É uma das partes centrais da lógica do professor.

Em versões atuais do projeto ele participa de operações como ativação,
publicação, relatórios e integração com Firebase.

## `prova-publicada.json`

É um arquivo de **estado de execução**.

Ele informa ao site do aluno se existe uma avaliação publicada.

Exemplo de estado encerrado:

``` json
{
  "ativa": false,
  "questoesPublicas": []
}
```

Quando existe uma avaliação ativa, ele contém os dados públicos
necessários para o aluno receber a prova.

**IMPORTANTE:** não substitua esse arquivo por uma cópia antiga durante
atualizações de código.

## `firestore.rules`

Contém as regras de segurança do Firestore.

Não altere apenas para "fazer funcionar". Uma regra permissiva pode
expor dados privados.

## `.vscode/tasks.json`

Pode conter a automação usada para acompanhar alterações e publicar no
GitHub.

## `backup-local/`

Área reservada aos backups locais.

**Nunca apagar ou substituir automaticamente.**

------------------------------------------------------------------------

# 3. Fluxo completo de uma avaliação

O funcionamento normal é:

1.  O professor abre o projeto no VS Code.
2.  Abre o Painel do Professor publicado no GitHub Pages.
3.  Escolhe escola, matérias, turmas, quantidade de questões e tempos.
4.  Define o código de acesso.
5.  Publica a avaliação.
6.  O sistema atualiza `prova-publicada.json`.
7.  A automação publica a mudança no GitHub.
8.  A Área do Aluno consulta periodicamente o pacote publicado.
9.  A tela mostra qual escola possui avaliação ativa.
10. O aluno informa código, nome e turma.
11. O sistema verifica se aquela tentativa é permitida.
12. A avaliação é carregada.
13. Questões e alternativas são apresentadas.
14. O tempo é acompanhado.
15. O aluno finaliza ou o tempo máximo encerra automaticamente.
16. O resultado é protegido localmente antes/também durante a tentativa
    de envio.
17. O resultado é sincronizado quando possível.
18. A tela de conclusão permanece por alguns segundos.
19. O sistema retorna à tela inicial.

------------------------------------------------------------------------

# 4. Área do Aluno --- `index.html`

Este é atualmente um dos arquivos mais importantes para alterações na
experiência do aluno.

## Como localizar partes importantes

No VS Code pressione:

**Ctrl + F**

e pesquise pelo texto indicado.

### Consulta da prova publicada

Pesquise:

``` text
prova-publicada.json
```

Você encontrará as funções que consultam o pacote publicado.

A consulta usa `cache: "no-store"` e um parâmetro variável na URL para
reduzir o risco de o navegador continuar mostrando uma versão antiga.

### Frequência de atualização

Pesquise:

``` text
5000
```

Existem verificações periódicas da publicação.

`5000` significa aproximadamente **5 segundos**.

Não reduza demais esse valor sem necessidade.

### Retorno após a conclusão

Pesquise:

``` text
15000
```

O valor atual representa aproximadamente **15 segundos** antes do
retorno automático à tela inicial.

Conversão:

``` text
1000 = 1 segundo
5000 = 5 segundos
15000 = 15 segundos
30000 = 30 segundos
```

### Finalização

Pesquise:

``` text
async function finalizarProva
```

Essa função participa do encerramento da avaliação e da preparação/envio
do resultado.

**Não altere essa função apenas para mudar aparência.**

------------------------------------------------------------------------

# 5. Painel do Professor

As áreas principais são:

1.  Cadastro de Escolas
2.  Ativação de Provas
3.  Banco de Questões
4.  Banco de Dados
5.  Monitoramento
6.  Resultados e Relatórios

A demonstração do professor percorre essas áreas sem precisar executar
uma operação real.

## Regra de manutenção

Mudanças visuais devem, sempre que possível, ficar separadas da lógica.

Exemplo:

``` css
/* VISUAL: altera apenas tamanho */
.meu-elemento {
  font-size: 16px;
}
```

é muito mais seguro do que modificar uma função JavaScript de ativação
apenas para mudar a aparência.

------------------------------------------------------------------------

# 6. Ativação e encerramento da prova

A Área do Aluno dá prioridade ao pacote público do GitHub.

No `index.html`, pesquise:

``` text
carregarProvaEstatica
```

e:

``` text
acompanharProvaDaEscola
```

A lógica foi preparada para evitar que um estado antigo do Firebase faça
uma prova encerrada "voltar" a aparecer.

Quando `prova-publicada.json` informa:

``` json
"ativa": false
```

a Área do Aluno deve voltar ao estado de nenhuma avaliação ativa.

------------------------------------------------------------------------

# 7. Código de acesso

Na Área do Aluno, pesquise:

``` text
token-aluno
```

O campo correspondente é o código fornecido pelo professor.

Pesquise também:

``` text
btn-ver-token-aluno
```

Esse é o botão do **olho**, usado para mostrar/ocultar o código.

A cor do olho deve acompanhar o tema para continuar visível no modo
escuro.

## Validação

Pesquise:

``` text
dadosProvaAtiva.token
```

Você encontrará a parte que verifica se a avaliação exige código.

**Cuidado:** não remova a validação somente para facilitar testes. Isso
permitiria iniciar a avaliação sem o código exigido.

------------------------------------------------------------------------

# 8. Bloqueio de segunda tentativa

Esse recurso recebeu atenção especial porque alterar apenas pontuação,
espaços ou formatação do nome não deve ser uma forma simples de repetir
a avaliação.

No `index.html`, pesquise:

``` text
CHAVE_TENTATIVAS_BLOQUEADAS
```

A chave atual é:

``` text
quiz_tentativas_bloqueadas_v1
```

Pesquise também:

``` text
tentativaBloqueadaLocalmente
```

e:

``` text
registrarTentativa
```

ou pelas ocorrências de:

``` text
tentativaIniciada
```

## Como funciona conceitualmente

O sistema cria uma identificação normalizada para comparar tentativas.

Uma boa normalização trata variações simples do nome para impedir
truques como:

``` text
João da Silva
João da Silva.
JOÃO DA SILVA
João   da   Silva
```

como identidades diferentes.

Há proteção local e tentativa de registro central quando a conexão
permite.

### Atenção importante

`localStorage` pertence àquele navegador/computador. Em computadores
diferentes, a proteção realmente central depende do serviço central
estar disponível.

Por isso, não transforme a trava local na única proteção do sistema.

------------------------------------------------------------------------

# 9. Tempo da avaliação

Pesquise:

``` text
tempoLimiteMinutos
```

O sistema também possui compatibilidade com nomes usados anteriormente,
como `tempoMaximoMinutos`.

Pesquise:

``` text
tempoMinimoMinutos
```

para o tempo mínimo.

## Encerramento automático

Pesquise:

``` text
Tempo máximo da avaliação esgotado.
```

Quando o limite é atingido, o sistema chama a finalização
automaticamente.

Evite alterar o cálculo do cronômetro apenas para mudar os textos
mostrados na tela.

------------------------------------------------------------------------

# 10. Embaralhamento

O sistema foi projetado para embaralhar:

-   ordem das questões;
-   ordem das alternativas.

A correção não deve depender apenas da letra visual A, B, C, D ou E,
pois a posição pode mudar.

**Regra:** nunca transforme a letra exibida ao aluno na única referência
da resposta correta.

O pacote público também pode utilizar uma semente de reordenação para
controlar a montagem da prova.

------------------------------------------------------------------------

# 11. Resultados e proteção local

No `index.html`, pesquise:

``` text
CHAVE_ENTREGAS_PENDENTES
```

e:

``` text
guardarEntregaPendente
```

O objetivo é proteger uma entrega quando existe falha momentânea de
conexão.

Pesquise:

``` text
reenviarEntregasPendentes
```

O sistema tenta novamente enviar entregas protegidas.

Há também uma verificação periódica. No código atual existe intervalo
associado ao reenvio.

## Informação importante

O armazenamento local é uma **proteção temporária**, não um servidor
central.

Em computadores aleatórios da escola, não dependa exclusivamente dele
para consolidar resultados.

------------------------------------------------------------------------

# 12. Firebase

O Firebase é usado em partes que precisam de serviço central.

O projeto trabalha com separação entre professor e aluno.

Conceitualmente:

-   professor: autenticação própria;
-   aluno: autenticação anônima;
-   questões privadas/gabarito: protegidos;
-   questões públicas: sem resposta correta;
-   resultados: enviados para armazenamento central quando possível.

## Para economizar cota

Evite:

-   recarregar relatórios repetidamente;
-   criar listeners desnecessários;
-   fazer consultas completas em intervalos muito curtos;
-   testar centenas de vezes sem necessidade.

Quando houver erro de cota, não apague dados como tentativa de correção.

------------------------------------------------------------------------

# 13. GitHub Pages e `prova-publicada.json`

O GitHub Pages é o meio de distribuição pública da avaliação.

A Área do Aluno consulta:

``` text
prova-publicada.json
```

## Regra crítica de atualização

Ao criar ZIPs de correção de código:

**não incluir `prova-publicada.json` para substituição**, salvo se
houver um motivo específico e consciente.

Esse arquivo muda durante a operação diária.

Substituí-lo por uma cópia antiga pode fazer uma prova encerrada
reaparecer ou uma prova ativa desaparecer.

------------------------------------------------------------------------

# 14. Demonstrações

Existem demonstrações para Professor e Aluno.

Elas devem:

-   escurecer moderadamente o restante da página;
-   destacar somente a área explicada;
-   mostrar uma caixa de orientação;
-   acompanhar o elemento destacado;
-   possuir botões claros;
-   não executar ações reais.

Botões esperados:

-   **Pular demonstração**
-   **Próximo**
-   **Concluir** no último passo
-   **Fechar**

## Área do Aluno

Pesquise:

``` text
demo-aluno
```

ou:

``` text
Demonstração da Área do Aluno
```

Os passos atuais incluem explicações sobre avaliação ativa, escola,
código, nome, turma e início da avaliação.

A demonstração **não deve iniciar uma prova nem consumir uma
tentativa**.

## Painel do Professor

Pesquise no projeto por:

``` text
Demonstração do Painel do Professor
```

A demonstração percorre as abas do painel.

Ao concluir, deve retornar ao estado inicial/Home do painel, e não
permanecer em Relatórios.

------------------------------------------------------------------------

# 15. Backups e relatórios

O sistema possui mecanismos de cache/backup para reduzir risco de perda
de visualização do histórico.

## Pasta local

``` text
backup-local/
```

Pode conter subpastas como:

``` text
backup-local/
├── relatorios/
├── configuracoes/
└── banco-questoes/
```

### Regras

-   nunca apagar automaticamente;
-   criar novos backups sem destruir os antigos;
-   não publicar backups escolares no GitHub;
-   não substituir um backup bom por um arquivo vazio.

## Cache do navegador

Relatórios podem existir também no armazenamento local do navegador.

Por isso, navegadores, perfis e origens diferentes podem apresentar
quantidades locais diferentes.

Exemplo:

``` text
127.0.0.1
```

e

``` text
GitHub Pages
```

não compartilham necessariamente o mesmo armazenamento local.

------------------------------------------------------------------------

# 16. Como localizar rapidamente uma função

No VS Code:

**Ctrl + Shift + F** pesquisa em todo o projeto.

Use estes termos:

  Quero localizar         Pesquisar
  ----------------------- -------------------------------
  Publicação pública      `prova-publicada.json`
  Finalização             `finalizarProva`
  Tempo máximo            `tempoLimiteMinutos`
  Código do aluno         `token-aluno`
  Olho do código          `btn-ver-token-aluno`
  Bloqueio de tentativa   `CHAVE_TENTATIVAS_BLOQUEADAS`
  Entrega pendente        `CHAVE_ENTREGAS_PENDENTES`
  Reenvio                 `reenviarEntregasPendentes`
  Demonstração aluno      `demo-aluno`
  Retorno automático      `15000`
  Atualização do pacote   `5000`
  Respostas por texto     `respostasTexto`
  Firebase                `firebase` ou `Firestore`

Essa é a forma mais rápida de encontrar uma área sem precisar saber o
número da linha.

------------------------------------------------------------------------

# 17. Alterações simples que você pode fazer

## Aumentar o tempo da tela de conclusão

Localize:

``` javascript
setTimeout(voltarTelaInicialAluno, 15000);
```

Exemplo para 30 segundos:

``` javascript
setTimeout(voltarTelaInicialAluno, 30000);
```

## Alterar frequência de verificação pública

Localize o intervalo de:

``` javascript
5000
```

Exemplo:

``` javascript
10000
```

significa aproximadamente 10 segundos.

Não use valores extremamente baixos.

## Alterar textos

Você pode pesquisar pelo texto exato mostrado na tela.

Exemplo:

``` text
Avaliação Concluída!
```

e editar somente a frase.

## Alterar aparência

Procure a classe CSS do elemento.

Prefira mudar:

``` css
font-size
padding
margin
width
max-width
background
border
```

sem alterar a lógica JavaScript correspondente.

------------------------------------------------------------------------

# 18. O que não alterar sem uma cópia

Tenha atenção especial com:

``` text
firebase-config.js
firestore.rules
app.js
prova-publicada.json
index.html
painel.html
.vscode/tasks.json
.gitignore
backup-local/
```

Também evite remover funções relacionadas a:

``` text
finalizarProva
salvar/guardar entrega
reenviar entrega
tentativa
correção
autenticação
publicação
```

## Nunca faça como "teste"

-   apagar o banco;
-   apagar relatórios antigos;
-   limpar todos os caches sem backup;
-   tornar todas as regras do Firestore públicas;
-   colocar o gabarito no JSON público;
-   colocar senha do professor no código;
-   apagar `backup-local`.

------------------------------------------------------------------------

# 19. Roteiro de diagnóstico

Quando algo parar de funcionar, não altere várias coisas ao mesmo tempo.

Siga esta ordem:

1.  Veja se o VS Code está aberto no projeto correto.
2.  Veja se a publicação automática está funcionando.
3.  Confira `prova-publicada.json`.
4.  Veja o valor de `"ativa"`.
5.  Confira escola e turmas publicadas.
6.  Abra a Área do Aluno publicada.
7.  Aguarde alguns segundos pela atualização automática.
8.  Se necessário, atualize a página uma vez.
9.  Abra o Console do navegador somente se o problema continuar.
10. Anote a mensagem de erro antes de modificar arquivos.
11. Faça uma única correção.
12. Teste novamente.

### Se a prova continua ativa após encerrar

Primeiro confira:

``` json
"ativa": false
```

em `prova-publicada.json`.

Se já estiver `false`, o problema tende a estar na
publicação/cache/consulta da página, e não na necessidade de apagar
dados.

### Se relatório não aparecer

Não sincronize repetidamente.

Primeiro:

-   confira se o aluno concluiu;
-   aguarde;
-   veja se existe entrega protegida;
-   confira o painel;
-   só então use sincronização quando necessário.

------------------------------------------------------------------------

# 20. Checklist antes de usar com os alunos

Antes da aula:

-   VS Code aberto no projeto correto;
-   automação de publicação funcionando;
-   Painel do Professor acessível;
-   professor autenticado;
-   arquivo de publicação vinculado;
-   escola correta selecionada;
-   matérias corretas;
-   turmas corretas;
-   quantidade correta de questões;
-   tempo mínimo correto;
-   tempo máximo correto;
-   código de acesso definido;
-   prova publicada;
-   Área do Aluno mostrando a escola correta;
-   teste do código de acesso;
-   teste rápido de uma tentativa;
-   monitoramento funcionando;
-   resultado chegando ao relatório.

Depois da aula:

-   encerrar a avaliação;
-   confirmar que a Área do Aluno mostra nenhuma avaliação ativa;
-   conferir resultados;
-   criar backup quando necessário;
-   não apagar dados antigos.

------------------------------------------------------------------------

# Padrão para futuras modificações no código

Nas próximas alterações, prefira comentários neste formato:

``` javascript
// ============================================================
// PASSO: RETORNO AUTOMÁTICO DO ALUNO
// O QUE FAZ:
// Volta para a tela inicial depois da conclusão.
//
// PARA ALTERAR:
// Troque apenas o número de milissegundos.
// 15000 = 15 segundos.
//
// CUIDADO:
// Não remova a chamada de voltarTelaInicialAluno().
// ============================================================
```

Para CSS:

``` css
/* ============================================================
   VISUAL: TAMANHO DO PAINEL
   O QUE ALTERAR: max-width, padding e font-size.
   NÃO ALTERA: Firebase, respostas, nota ou tentativa.
   ============================================================ */
```

Esse padrão ajuda a diferenciar **visual**, **funcionalidade**,
**segurança** e **armazenamento**.

------------------------------------------------------------------------

# Mapa mental final

``` text
PROFESSOR
   │
   ├── painel.html
   ├── app.js
   │
   ├── configura avaliação
   │
   ▼
prova-publicada.json
   │
   ▼
GitHub Pages
   │
   ▼
index.html — ALUNO
   │
   ├── identifica prova
   ├── valida acesso
   ├── controla tentativa
   ├── executa questões
   ├── controla tempo
   ├── protege resultado localmente
   │
   ▼
Firebase / sincronização
   │
   ▼
Painel do Professor
   │
   └── Monitoramento + Resultados + Relatórios
```

------------------------------------------------------------------------

## Regra de ouro

**Funcionando? Faça backup antes de mexer.**

**Problema? Descubra primeiro qual camada falhou: tela, publicação,
GitHub, Firebase, cache ou dados.**

**Nunca apague dados para tentar corrigir um problema de interface.**


---

## Página independente de apresentação — `apresentacao.html` (08/10/2026)

A apresentação institucional é um **arquivo independente**, localizado na raiz do projeto, ao lado de `index.html` e `painel.html`. Foi criada para explicar o Quiz Interativo e oferecer dois acessos: `login.html` (professor) e `index.html` (aluno). Ela **não substitui** a tela inicial do aluno nem altera o painel, o Firebase, a publicação de avaliações ou os relatórios.

### Onde editar no arquivo

- **Nome exibido na aba do navegador:** tag `<title>` dentro de `<head>`.
- **Cores e identidade visual:** variáveis CSS dentro de `:root`, no início de `<style>` (principalmente `--bg`, `--txt`, `--muted` e `--accent`).
- **Menu:** `<nav class="topnav">`.
- **Título principal, texto de abertura e botões:** bloco `<div class="hero" id="inicio">`.
- **Cartões de funcionalidades:** seção `<section id="recursos">`; cada `<article class="card">` representa um cartão.
- **Etapas explicativas:** seção `<section id="como-funciona">`; cada `<div class="step">` é uma etapa.
- **Links de entrada:** seção `<section id="acessos">`, com `href="login.html"` e `href="index.html"`.
- **Layout para celulares:** regras `@media(max-width:800px)` e `@media(max-width:560px)` no CSS.
- **Rodapé:** `<footer class="foot">`.

### Como testar e publicar

1. Guarde cópia do arquivo antes de qualquer alteração.
2. Abra `apresentacao.html` no navegador e confira textos, cartões, cores e largura de tela.
3. Verifique os links de professor e aluno após publicar no GitHub Pages, pois a navegação local pode ter comportamento diferente.
4. Publique somente `apresentacao.html` se a mudança foi exclusivamente na apresentação.
5. Acesse `https://wagnerbizza.github.io/quiz-interativo/apresentacao.html` após a publicação.

**Atenção:** a tag Git `v1.0-estavel` registra o código versionado no momento da criação da tag. Os arquivos `.md` locais que estavam não rastreados no `git status` não foram incluídos nessa tag. Esta documentação foi acrescentada à cópia dos manuais disponível no pacote de trabalho; compare com as versões locais antes de substituí-las para não perder anotações posteriores.


### Alternância entre modo claro e escuro — apresentação

A página `apresentacao.html` possui um botão **Modo claro / Modo escuro** no cabeçalho. A escolha fica salva apenas no navegador por `localStorage` (`quiz-interativo-apresentacao-tema`), sem Firebase e sem alterar as preferências do painel ou da tela do aluno. Se o armazenamento local estiver bloqueado, o botão ainda alterna o tema durante a visita. O padrão inicial é escuro.

**Onde editar:** em `:root` ficam as cores do tema escuro; em `html[data-theme="light"]`, as do claro. O botão é `id="themeToggle"`; a lógica está no `<script>` antes de `</body>`. Ajustes de tamanho e legibilidade das fontes ficam em `body`, `.hero h1`, `.lead`, `.section-title`, `.topnav a` e nas regras `@media`. Ao alterar cores, conferir contraste de textos, cartões, botões, ilustração e versão para celular nos dois temas.

**Segurança:** esta atualização substitui somente `apresentacao.html`; nenhum arquivo de avaliação, painel ou Firebase precisa ser alterado.


### Apresentação: tema escuro como padrão (08/10/2026)

- `apresentacao.html` inicia sempre em **modo escuro**.
- O botão no cabeçalho alterna entre **modo claro** e **modo escuro** durante a visita.
- Ao recarregar a página, o tema volta ao **escuro**; a escolha não é salva no navegador.
- As cores ficam em `:root` (escuro) e `html[data-theme="light"]` (claro).
- Para alterar o tema inicial, localize `apply('dark')` no script final.
- Nenhuma mudança em `index.html`, `painel.html` ou Firebase.
