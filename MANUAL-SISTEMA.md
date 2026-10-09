# Manual técnico e de manutenção — Sistema de Avaliações

> Objetivo: permitir estudar o projeto e localizar rapidamente os pontos mais comuns de alteração manual.
> Regra de segurança: faça uma cópia do arquivo antes de editar e **não apague `backup-local` nem `prova-publicada.json`** durante atualizações de código.

## Índice
1. Visão geral
2. Arquivos principais
3. Fluxo de publicação
4. Área do aluno
5. Painel do professor
6. Demonstrações guiadas
7. Como alterar o layout manualmente
8. Código de acesso
9. Cronômetros e encerramento
10. Monitoramento
11. Resultados e relatórios
12. Backup local
13. GitHub Pages
14. Firebase
15. Diagnóstico rápido
16. Checklist antes de publicar
17. Mapa de busca no código

## 1. Visão geral
O sistema usa o GitHub Pages para entregar a interface e o pacote público da avaliação. O Firebase é usado nas funções que precisam de autenticação, monitoramento e armazenamento/sincronização de resultados. O navegador mantém proteções e caches locais para reduzir perda de dados e leituras desnecessárias.

## 2. Arquivos principais
- `index.html`: Área do Aluno, entrada, prova, cronômetro e envio/proteção do resultado.
- `painel.html`: estrutura visual do Painel do Professor.
- `app.js`: lógica principal do professor, ativação, relatórios, cache e integração Firebase.
- `prova-publicada.json`: estado público atual da avaliação. É arquivo de operação; não substitua por uma cópia antiga durante atualizações.
- `firestore.rules`: regras de acesso ao Firestore.
- `.vscode/tasks.json`: automação usada no fluxo de publicação.
- `backup-local/`: backups do usuário. Não apagar automaticamente.

## 3. Fluxo de publicação
1. Professor configura e ativa a avaliação.
2. O sistema atualiza `prova-publicada.json`.
3. A automação do VS Code envia a alteração ao GitHub.
4. O GitHub Pages disponibiliza o novo pacote.
5. A Área do Aluno verifica periodicamente o pacote público.
6. Ao encerrar, `ativa` passa para `false`; a Área do Aluno bloqueia a avaliação.

## 4. Área do aluno
Arquivo: `index.html`.

Procure pelos comentários `[AJUSTE MANUAL 01]`, `[AJUSTE MANUAL 02]` e `[AJUSTE MANUAL 03]`.
Eles foram adicionados para indicar os pontos seguros de ajuste de tamanho, demonstração e textos.

Não altere IDs como `btn-iniciar-prova`, `btn-ver-token-aluno` ou IDs dos campos sem revisar também o JavaScript que os utiliza.

## 5. Painel do professor
Arquivo: `painel.html` para estrutura e aparência; `app.js` para a maior parte da lógica.

Procure `[AJUSTE MANUAL 10]` e `[AJUSTE MANUAL 11]` para a demonstração do professor.

## 6. Demonstrações guiadas
As duas telas possuem botão `❔ Demonstração`.

Aluno:
`const DEMO_ALUNO_ATIVA = true;`

Professor:
`const DEMO_PROFESSOR_ATIVA = true;`

Troque `true` por `false` para ocultar a demonstração sem apagar o código. O usuário pode usar **Pular demonstração**, **Próximo/Concluir** ou **Fechar**.

Os textos ficam nos arrays `passosDemoAluno` e `passosDemoProfessor`.

## 7. Como alterar o layout manualmente
Use Ctrl+F no VS Code e procure `AJUSTE MANUAL`.

Valores mais comuns:
- `max-width`: largura máxima.
- `padding`: espaço dentro de um bloco.
- `margin`: espaço fora de um bloco.
- `gap`: distância entre itens.
- `font-size`: tamanho da fonte.
- `grid-template-columns`: quantidade/tamanho de colunas.
- `@media`: regras aplicadas conforme a largura da tela.

Faça uma alteração por vez, salve e teste em 100% de zoom.

## 8. Código de acesso
O professor define o código na ativação. O aluno informa o código e a validação ocorre ao iniciar. O botão de olho apenas mostra/oculta o conteúdo digitado.

Atenção: se o código estiver armazenado em texto simples no pacote público, ele é uma barreira de sala de aula, não um segredo forte. Uma evolução futura é publicar somente um hash.

## 9. Cronômetros e encerramento
A avaliação pode ter tempo mínimo e máximo. O tempo máximo dispara finalização automática. O encerramento pelo professor também publica o estado inativo; a Área do Aluno consulta esse estado periodicamente.

## 10. Monitoramento
O monitoramento mostra alunos em atividade. Quando a avaliação termina, o aluno deve sair da lista ativa. Evite adicionar consultas contínuas amplas ao Firestore, pois isso aumenta leituras.

## 11. Resultados e relatórios
Os relatórios usam cache local e sincronização com Firebase. A lógica foi desenhada para preservar o histórico local e mesclar novos resultados em vez de substituir uma coleção maior por uma menor.

Antes de alterar cache/relatórios, faça um backup.

## 12. Backup local
Use os botões de backup/restauração do painel. Arquivos em `backup-local` são dados do usuário e não devem ser apagados automaticamente.

## 13. GitHub Pages
O GitHub Pages hospeda a interface pública. Um `git push` concluído não significa que a página mudou no mesmo segundo; pode existir um pequeno atraso de publicação/cache.

## 14. Firebase
Professor usa autenticação por e-mail/senha; aluno usa autenticação anônima nas funções necessárias. O gabarito deve permanecer privado. Evite expor o campo de resposta correta em arquivos públicos.

## 15. Diagnóstico rápido
- Aluno não vê prova: confira `prova-publicada.json` e o campo `ativa`.
- Professor encerrou mas aluno continua ativo: confira se o pacote público já contém `ativa:false`.
- Campo do aluno apaga: procure rotinas periódicas que reconstruam o formulário.
- Resultado não aparece: confira cache local antes de fazer sincronizações repetidas.
- Git mostra aviso CRLF/LF: no Windows, isso normalmente é aviso de final de linha, não falha de publicação.

## 16. Checklist antes de publicar
- JavaScript sem erro de sintaxe.
- Testar em 100% de zoom.
- Código errado bloqueia.
- Código correto entra.
- Nome e turma não apagam.
- Tempo máximo encerra.
- Encerramento do professor chega ao aluno.
- Resultado aparece no relatório.
- `backup-local` preservado.
- `prova-publicada.json` operacional não foi substituído por arquivo antigo.

## 17. Mapa de busca no código
No VS Code use Ctrl+Shift+F e procure:
- `AJUSTE MANUAL` — pontos documentados para manutenção.
- `DEMO_ALUNO_ATIVA` — liga/desliga demonstração do aluno.
- `DEMO_PROFESSOR_ATIVA` — liga/desliga demonstração do professor.
- `tempoLimiteMinutos` — limite máximo.
- `prova-publicada.json` — publicação pública.
- `sincronizarRelatorios` — sincronização de relatórios.
- `backup` — rotinas de cópia/restauração.
- `onSnapshot` — atualizações em tempo real.
- `finalizarProva` — encerramento da avaliação do aluno.

---
Sugestão de manutenção: registre cada mudança importante em comentário próximo ao trecho alterado, com data e objetivo. Evite remover código antigo ou dados apenas para “limpar”; primeiro confirme que não é necessário para compatibilidade ou histórico.

## 18. Acabamento da tela inicial do aluno em 100%

Procure no `index.html` por `[AJUSTE MANUAL 04]`.

Esse bloco controla o acabamento vertical da entrada do aluno sem alterar a lógica da avaliação. Ele foi criado para tentar manter **título, informações da prova, escola, código, nome, turma e botão Iniciar** visíveis em 100% de zoom.

Se futuramente precisar ganhar alguns pixels:
- reduza `margin-bottom` para aproximar blocos;
- reduza `padding-top`/`padding-bottom` para diminuir espaços internos;
- altere `height` dos campos em passos pequenos, por exemplo de `36px` para `34px`;
- evite diminuir `font-size` antes de testar os espaçamentos.

Há uma regra separada para telas com menos de `760px` de altura. Isso permite compactar monitores menores sem prejudicar telas maiores.


## 19. Demonstração guiada do Painel do Professor

Procure no `painel.html` por `[AJUSTE MANUAL 12]` e `[AJUSTE MANUAL 13]`.

A demonstração agora possui um destaque azul que aponta a área correspondente a cada passo. Ela pode navegar entre as abas para ensinar a localização das funções, mas foi preparada para **não executar ações operacionais** como publicar, excluir, sincronizar ou encerrar avaliações.

Cada item de `passosDemoProfessor` possui:
- `titulo`: título do passo;
- `texto`: explicação mostrada;
- `seletor`: elemento da tela a destacar;
- `hash`: aba que deve ser mostrada.

Para alterar um texto, edite somente `titulo` ou `texto`.
Para mudar o elemento destacado, altere `seletor`.
Para desligar toda a demonstração, use `DEMO_PROFESSOR_ATIVA = false`.

Se uma aba mudar de ID/hash no futuro, atualize também o `hash` correspondente no roteiro.


### 19.1 — Como a demonstração troca as abas
A demonstração do professor usa o atributo `data-aba` dos botões reais do painel. Cada passo informa o ID da tela, por exemplo `aba-questoes`. A função `abrirAbaDaDemonstracao()` localiza o botão `.btn-aba[data-aba="..."]` e usa a navegação normal do sistema. Depois, `destacarConteudoDemo()` contorna o bloco completo da aba em azul.

Para alterar manualmente um passo, procure em `painel.html` por `[AJUSTE MANUAL 14]` e edite o campo `aba` do item correspondente. Não use botões de Publicar, Excluir, Sincronizar ou Encerrar como alvo da demonstração.


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
