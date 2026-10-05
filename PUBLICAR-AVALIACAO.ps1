# Quiz Interativo - Publicação segura no GitHub
# Não contém senha nem token. Usa o Git já autenticado neste computador.
$ErrorActionPreference = "Stop"

$Projeto = Split-Path -Parent $MyInvocation.MyCommand.Path
$Downloads = Join-Path $env:USERPROFILE "Downloads"
$Destino = Join-Path $Projeto "prova-publicada.json"

Write-Host ""
Write-Host "QUIZ INTERATIVO - PUBLICACAO DA AVALIACAO" -ForegroundColor Cyan
Write-Host "Procurando o prova-publicada.json mais recente..." -ForegroundColor Yellow

$Arquivo = Get-ChildItem -Path $Downloads -Filter "prova-publicada*.json" -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $Arquivo) {
    Write-Host ""
    Write-Host "ERRO: nenhum prova-publicada.json foi encontrado em Downloads." -ForegroundColor Red
    Write-Host "Primeiro clique em Ativar, Reembaralhar ou Encerrar no painel." -ForegroundColor Yellow
    Read-Host "Pressione ENTER para fechar"
    exit 1
}

try {
    $json = Get-Content -Raw -Path $Arquivo.FullName | ConvertFrom-Json
} catch {
    Write-Host "ERRO: o arquivo encontrado nao e um JSON valido." -ForegroundColor Red
    Read-Host "Pressione ENTER para fechar"
    exit 1
}

if ($null -eq $json.ativa) {
    Write-Host "ERRO: o arquivo nao parece ser um pacote do Quiz Interativo." -ForegroundColor Red
    Read-Host "Pressione ENTER para fechar"
    exit 1
}

$estado = if ($json.ativa) { "ATIVA" } else { "ENCERRADA" }
Write-Host "Arquivo: $($Arquivo.Name)" -ForegroundColor Gray
Write-Host "Escola: $($json.escolaAtiva)" -ForegroundColor Gray
Write-Host "Estado: $estado" -ForegroundColor Green
Write-Host ""

$confirmacao = Read-Host "Publicar esta configuracao no GitHub? (S/N)"
if ($confirmacao -notmatch '^[Ss]$') {
    Write-Host "Publicacao cancelada. Nenhum arquivo foi alterado." -ForegroundColor Yellow
    exit 0
}

Copy-Item -Path $Arquivo.FullName -Destination $Destino -Force
Set-Location $Projeto

git add -- "prova-publicada.json"
$mudanca = git status --porcelain -- "prova-publicada.json"

if (-not $mudanca) {
    Write-Host "O GitHub ja possui esta mesma configuracao. Nada para enviar." -ForegroundColor Yellow
    Read-Host "Pressione ENTER para fechar"
    exit 0
}

$mensagem = if ($json.ativa) {
    "publicar avaliacao pelo painel"
} else {
    "encerrar avaliacao pelo painel"
}

git commit -m $mensagem
if ($LASTEXITCODE -ne 0) { throw "Falha no git commit." }

git push
if ($LASTEXITCODE -ne 0) { throw "Falha no git push." }

Write-Host ""
Write-Host "PUBLICACAO ENVIADA COM SUCESSO." -ForegroundColor Green
Write-Host "Aguarde o GitHub Pages atualizar e use Ctrl+F5 na pagina do aluno." -ForegroundColor Cyan
Read-Host "Pressione ENTER para fechar"
