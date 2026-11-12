/* Leitura e revisão: nenhuma gravação sem confirmação do professor. */
(function(root){'use strict';
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
function limparOpcao(s){return String(s??'').replace(/^[A-Ea-e]\s*[).:\-]\s*/,'').trim()}
function validar(questao,materiaPadrao='Geral',fonte=''){
 if(!questao||typeof questao!=='object'||Array.isArray(questao))return {materia:materiaPadrao,pergunta:'',opcoes:[],correta:'',fonte,erros:['Questão precisa ser um objeto.']};
 const materia=String(questao.materia||questao.categoria||materiaPadrao||'').trim();
 const pergunta=String(questao.pergunta||questao.questao||questao.question||'').trim();
 const raw=questao.opcoes||questao.alternativas||[];const opcoes=Array.isArray(raw)?raw.map(limparOpcao):[];
 let correta=String(questao.correta??questao.gabarito??'').trim().toUpperCase();
 if(typeof questao.correta==='number'&&Number.isInteger(questao.correta))correta='ABCDE'[questao.correta]||'';
 const erros=[];if(!materia)erros.push('Informe a matéria.');if(!pergunta)erros.push('Informe o enunciado.');
 if(opcoes.length!==5||opcoes.some(o=>!o))erros.push('Preencha as cinco alternativas, de A a E.');
 if(new Set(opcoes.map(norm)).size!==opcoes.length)erros.push('Há alternativas repetidas.');
 if(!/^[A-E]$/.test(correta)||'ABCDE'.indexOf(correta)>=opcoes.length)erros.push('O gabarito deve apontar para uma alternativa preenchida.');
 if(pergunta.length>20000||opcoes.some(o=>o.length>10000))erros.push('Conteúdo muito extenso. Divida esta questão.');
 return {materia,pergunta,opcoes,correta,fonte:String(questao.fonte||fonte||'').slice(0,2048),erros};
}
function assinatura(q){const v=validar(q);return JSON.stringify([norm(v.materia),norm(v.pergunta),v.opcoes.map(norm).sort(),norm(v.opcoes['ABCDE'.indexOf(v.correta)]||'')])}
function ler(text,materiaPadrao='Geral',fonte=''){
 if(typeof text!=='string'||text.length>2000000)throw Error('Use um arquivo de texto de até 2 MB.');
 const t=text.trim();if(!t)throw Error('Cole o conteúdo ou selecione um arquivo.');let data;
 if(t.startsWith('{')||t.startsWith('[')){try{data=JSON.parse(t)}catch{throw Error('JSON inválido. Confira vírgulas, aspas e colchetes.')}data=Array.isArray(data)?data:data.questoes;if(!Array.isArray(data))throw Error('O JSON deve conter uma lista ou o campo questoes.');}
 else data=t.split(/\r?\n/).filter(l=>l.trim()).map((linha,i)=>{const p=linha.split('|').map(x=>x.trim());if(p.length===8){const op=p.slice(2,7);if(!op[4])op.pop();return {materia:p[0],pergunta:p[1],opcoes:op,correta:p[7],fonte}}if(p.length===7){const op=p.slice(1,6);if(!op[4])op.pop();return {materia:materiaPadrao,pergunta:p[0],opcoes:op,correta:p[6],fonte}}return {materia:materiaPadrao,pergunta:linha,opcoes:[],correta:'',fonte,_linha:i+1}});
 if(!data.length)throw Error('Nenhuma questão foi encontrada.');if(data.length>100)throw Error('Importe até 100 questões por vez para facilitar a revisão.');return data.map(q=>validar(q,materiaPadrao,fonte));
}
function revisarTexto(text,materiaPadrao,fonte=''){
 const ui=root.QuizInterface;if(!ui)throw Error('A interface ainda está carregando.');let rows;try{rows=ler(text,materiaPadrao,fonte)}catch(err){ui.feedback(err.message);return}const s=ui.safe;
 const d=ui.dialog('Revisar questões antes de importar',`<p class="qi-note">Confira os enunciados e os gabaritos. Abra cada questão para editar, desmarque o que não deseja salvar e confirme ao final.</p><form id="qi-review-form"><div class="qi-actions"><button type="button" class="qi-button" id="qi-select-all">Marcar todas</button><button type="button" class="qi-button" id="qi-select-none">Desmarcar todas</button></div><div id="qi-review-list">${rows.map((q,i)=>`<details class="qi-review-item" data-row="${i}" ${q.erros.length?'open':''}><summary><input type="checkbox" data-select="${i}" checked aria-label="Importar questão ${i+1}"><span>Questão ${i+1} · ${s(q.pergunta.slice(0,75)||'Enunciado ausente')}</span></summary><label>Matéria<input name="materia-${i}" value="${s(q.materia)}" required></label><label>Enunciado<textarea name="pergunta-${i}" rows="3" required>${s(q.pergunta)}</textarea></label>${Array.from({length:5},(_,j)=>`<label>Alternativa ${'ABCDE'[j]}<input name="opcao-${i}-${j}" value="${s(q.opcoes[j]||'')}" required></label>`).join('')}<label>Gabarito<select name="correta-${i}"><option value="">Selecione a resposta correta</option>${'ABCDE'.split('').map(c=>`<option ${q.correta===c?'selected':''}>${c}</option>`).join('')}</select></label><label>Fonte<input name="fonte-${i}" value="${s(q.fonte)}" maxlength="2048"></label><p class="qi-review-error" id="qi-errors-${i}">${s(q.erros.join(' '))}</p><p id="qi-row-status-${i}" class="qi-muted" role="status"></p></details>`).join('')}</div><p id="qi-import-status" role="status" class="qi-muted"></p><div class="qi-actions">
 <button type="button" class="qi-button" id="qi-preview-selection">Visualizar prova</button>
 <button type="button" class="qi-button" id="qi-export-selection">Exportar selecionadas em JSON</button>
 <button type="submit" class="qi-button primary" id="qi-confirm-import">Salvar selecionadas no banco</button>
 </div></form>`);
 const form=d.querySelector('#qi-review-form');form.noValidate=true;d.querySelectorAll('summary input').forEach(e=>e.addEventListener('click',ev=>ev.stopPropagation()));d.querySelector('#qi-select-all').onclick=()=>d.querySelectorAll('[data-select]:not(:disabled)').forEach(e=>e.checked=true);d.querySelector('#qi-select-none').onclick=()=>d.querySelectorAll('[data-select]:not(:disabled)').forEach(e=>e.checked=false);
 function selecionarQuestoes() {
  const dados = new FormData(form);
  const escolhidas = [];
  for (let i = 0; i < rows.length; i++) {
   if (!d.querySelector(`[data-select="${i}"]`).checked) continue;
   const questao = validar({
    materia: dados.get('materia-'+i),
    pergunta: dados.get('pergunta-'+i),
    opcoes: Array.from({length:5}, (_,j) => dados.get(`opcao-${i}-${j}`)),
    correta: dados.get('correta-'+i),
    fonte: dados.get('fonte-'+i)
   });
   d.querySelector('#qi-errors-'+i).textContent = questao.erros.join(' ');
   if (questao.erros.length) d.querySelector(`[data-row="${i}"]`).open = true;
   escolhidas.push({...questao, indiceRevisao:i});
  }
  const status = d.querySelector('#qi-import-status');
  if (!escolhidas.length) status.textContent = 'Marque pelo menos uma questão.';
  else if (escolhidas.some(questao => questao.erros.length)) status.textContent = 'Corrija os itens indicados para continuar.';
  else {
   status.textContent = '';
   return escolhidas;
  }
  return null;
 }
 d.querySelector('#qi-export-selection').onclick = () => {
  const escolhidas = selecionarQuestoes();
  if (!escolhidas) return;
  const questoes = escolhidas.map(({materia,pergunta,opcoes,correta,fonte}) => ({materia,pergunta,opcoes,correta,fonte}));
  ui.download('questoes-selecionadas.json', JSON.stringify({questoes}, null, 2), 'application/json');
  d.querySelector('#qi-import-status').textContent = 'JSON exportado com o gabarito.';
 };
 d.querySelector('#qi-preview-selection').onclick = () => {
  const escolhidas = selecionarQuestoes();
  if (!escolhidas) return;
  const janela = window.open('', '_blank');
  if (!janela) {
   d.querySelector('#qi-import-status').textContent = 'Permita pop-ups para visualizar a prova.';
   return;
  }
  janela.opener = null;
  const questoes = escolhidas.map((q,i) => `<section><h2>${i+1}. ${s(q.pergunta)}</h2><ol type="A">${q.opcoes.map(opcao => `<li>${s(opcao)}</li>`).join('')}</ol></section>`).join('');
  janela.document.write(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Prévia da avaliação</title>
   <style>@page{margin:16mm}body{font:16px/1.45 system-ui;color:#111;margin:2rem auto;padding:0 1rem;max-width:52rem}h1{font-size:1.55rem}h2{font-size:1rem;white-space:pre-wrap}li{margin:.2rem 0;white-space:pre-wrap}section{break-inside:avoid;margin:1.4rem 0}@media print{button{display:none}body{margin:0;padding:0}}</style>
   <button type="button" id="qi-print">Imprimir / Salvar PDF</button><h1>Avaliação</h1>
   <p>Nome: ________________________________ &nbsp; Turma: __________</p>
   <p>Data: ____/____/________</p>${questoes}</html>`);
  janela.document.close();
  janela.document.getElementById('qi-print').onclick = () => janela.print();
 };
 form.onsubmit=async ev=>{
  ev.preventDefault();
  const chosen=selecionarQuestoes();
  if(!chosen)return;
  if(typeof root.quizSalvarQuestoesRevisadas!=='function'){d.querySelector('#qi-import-status').textContent='O painel ainda não está conectado. Aguarde a autenticação e tente novamente.';return}const button=d.querySelector('#qi-confirm-import');button.disabled=true;form.querySelectorAll('input,select,textarea,button').forEach(e=>e.disabled=true);d.querySelector('[data-qi-close]').disabled=true;d.addEventListener('cancel',bloquearEscape);function bloquearEscape(e){e.preventDefault()}try{const r=await root.quizSalvarQuestoesRevisadas(chosen);r.itens.forEach(x=>{d.querySelector('#qi-row-status-'+x.indice).textContent=x.mensagem;const box=d.querySelector(`[data-select="${x.indice}"]`);if(x.ok){box.checked=false;box.dataset.saved='1'}});d.querySelector('#qi-import-status').textContent=`${r.salvas} salva(s), ${r.duplicadas} já existente(s), ${r.falhas} pendente(s). Itens com falha podem ser reenviados.`;}catch(err){d.querySelector('#qi-import-status').textContent='Importação interrompida: '+err.message}finally{form.querySelectorAll('input,select,textarea,button').forEach(e=>e.disabled=false);d.querySelectorAll('[data-saved="1"]').forEach(e=>e.disabled=true);d.querySelector('[data-qi-close]').disabled=false;d.removeEventListener('cancel',bloquearEscape)}};
}
root.QuizBiblioteca={validar,assinatura,ler,revisarTexto};
})(typeof window!=='undefined'?window:globalThis);
