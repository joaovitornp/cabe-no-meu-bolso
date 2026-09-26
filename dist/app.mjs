import {calculate,simulatePurchase,parseMoney,money,daysUntil,tomorrowISO,emptyState,readState,saveState,clearState} from './core.mjs';
import {createAnalytics} from './analytics.mjs';
const $ = id => document.getElementById(id);
const analytics = createAnalytics(window,document);
let storage;
try {storage = window.localStorage;} catch {storage = null;}
const restored = readState(storage);
let state = restored.state, result = null, budgetStarted = false, purchaseStarted = false, screen = 'welcome';
let purchaseAutoCompleted = false, sliderUsed = false;
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const purchaseAnimations = new WeakMap();
function storageWarning() { $('storage-message').hidden=false;$('storage-message').textContent='O navegador não permitiu acessar os dados salvos. Você pode continuar, mas os dados desta página podem não ser preservados ao fechar. Para apagar dados antigos, use também as configurações do navegador.'; }
if (!restored.ok) storageWarning();
const persist = () => {if(!saveState(storage,state))storageWarning();};
function show(id) {
  screen=id;
  ['welcome','calculator','results'].forEach(x=>$(x).hidden=x!==id);
  $(id==='welcome'?'welcome-title':id==='calculator'?'calculator-title':'results-title').focus();
  window.scrollTo({top:0,behavior:'instant'});
}
function error(inputId,message) {
  const el=$(inputId); el.setAttribute('aria-invalid',message?'true':'false');
  $(inputId+'-error').textContent=message;
}
function startBudget() {if(!budgetStarted){analytics.track('simulation_started');budgetStarted=true;}}
function startPurchase() {if(!purchaseStarted){analytics.track('purchase_simulation_started');purchaseStarted=true;}}
const purchaseText = cents => (cents/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
function sliderMax() {
  // Inclui até 25% acima do saldo livre para que também seja possível ver o alerta de excesso.
  // No mínimo R$ 200, no máximo R$ 10.000; valores fora da faixa seguem disponíveis no campo.
  return Math.min(1000000,Math.max(20000,Math.ceil(Math.max(0,result?.free ?? 0)*1.25/1000)*1000));
}
function syncPurchaseControls() {
  const maximum=sliderMax();
  $('purchase-slider').max=String(maximum);
  $('purchase-slider-max').textContent=`Arraste de R$ 0,00 até ${money(maximum)}. Use o campo para valores maiores ou centavos.`;
  let cost;
  try {cost=parseMoney($('purchase').value);} catch {cost=0;}
  $('purchase-slider').value=String(Math.min(cost,maximum));
  $('purchase-slider').setAttribute('aria-valuetext',money(Math.min(cost,maximum)));
  $('purchase-slider-value').textContent=money(cost);
  document.querySelectorAll('[data-purchase-cents]').forEach(button=>{
    const active=Number(button.dataset.purchaseCents)===cost && !!$('purchase').value;
    button.classList.toggle('is-active',active);
    button.setAttribute('aria-pressed',String(active));
  });
}
function animatePurchaseValue(el, next) {
  const changed=el.textContent!==next;
  el.textContent=next;
  if(!changed || reducedMotion?.matches || !el.animate)return;
  purchaseAnimations.get(el)?.cancel();
  purchaseAnimations.set(el,el.animate([{opacity:.68,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:160,easing:'ease-out'}));
}
function syncInputs() { $('balance').value=state.balance;$('payment-date').value=state.paymentDate;$('payment-date').min=tomorrowISO();$('purchase').value=state.lastPurchase;renderBills(); }
function billField(label,id,value,kind,index) {
  const field=document.createElement('div');field.className='field';
  const lbl=document.createElement('label');lbl.htmlFor=id;lbl.textContent=label;
  const input=document.createElement('input');input.id=id;input.value=value;input.autocomplete='off';input.required=true;
  input.maxLength=kind==='name'?80:30;
  input.placeholder=kind==='name'?'Ex.: luz':'0,00';
  input.setAttribute('aria-describedby',id+'-error');
  if(kind==='value') input.inputMode='decimal';
  input.addEventListener('input',()=>{state.bills[index][kind]=input.value;startBudget();persist();error(id,'');});
  input.addEventListener('blur',()=>{if(kind==='value')formatInput(input);});
  const err=document.createElement('p');err.id=id+'-error';err.className='field-error';
  field.append(lbl);
  if(kind==='value'){const wrapper=document.createElement('div');wrapper.className='money-input';const prefix=document.createElement('span');prefix.textContent='R$';prefix.setAttribute('aria-hidden','true');wrapper.append(prefix,input);field.append(wrapper);} else field.append(input);
  field.append(err);return field;
}
function renderBills() {
  $('bills').replaceChildren();$('no-bills').hidden=state.bills.length>0;
  state.bills.forEach((bill,index)=>{
    const row=document.createElement('div');row.className='bill-row';
    row.append(billField('Nome da conta',`bill-${index}-name`,bill.name,'name',index),billField('Valor',`bill-${index}-value`,bill.value,'value',index));
    const remove=document.createElement('button');remove.type='button';remove.className='remove-bill';remove.textContent='×';remove.setAttribute('aria-label',`Remover conta ${index+1}`);
    remove.addEventListener('click',()=>{state.bills.splice(index,1);startBudget();persist();renderBills();$('add-bill').focus();});
    row.append(remove);$('bills').append(row);
  });
}
function formatInput(el) {try {el.value=(parseMoney(el.value)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}catch{}}
function validateBudget() {
  $('budget-error').textContent='';let first=null;
  const check=(id,fn)=>{try{fn();error(id,'');}catch(e){error(id,e.message);first??=$(id);}};
  check('balance',()=>parseMoney(state.balance));check('payment-date',()=>daysUntil(state.paymentDate));
  state.bills.forEach((b,i)=>{check(`bill-${i}-name`,()=>{if(!b.name.trim())throw Error('Informe o nome da conta.');});check(`bill-${i}-value`,()=>parseMoney(b.value));});
  if(first){first.focus();$('budget-error').textContent='Confira os campos indicados antes de continuar.';return false;}
  return true;
}
function paintResult() {
  $('daily-value').textContent=money(result.daily);
  $('free-text').textContent=result.free>=0?`Você tem ${money(result.free)} livres até o próximo pagamento.`:'Não há dinheiro livre depois de reservar o valor das contas.';
  $('budget-deficit').hidden=!result.deficit;
  $('budget-deficit').textContent=`Faltam ${money(result.deficit)} para cobrir as contas. Seu limite diário disponível é R$ 0,00.`;
  $('summary-balance').textContent=money(result.available);$('summary-bills').textContent=money(result.total);$('summary-days').textContent=result.days+(result.days===1?' dia':' dias');
  const date=state.paymentDate.split('-').reverse().join('/');
  $('date-summary').textContent=`Próximo pagamento em ${date}. ${result.days===1?'Falta 1 dia':`Faltam ${result.days} dias`}.`;
}
function completeBudget() {
  startBudget(); if(!validateBudget())return false;
  try{result=calculate(state.balance,state.bills,state.paymentDate);}catch(e){$('budget-error').textContent=e.message;return false;}
  persist();paintResult();$('purchase-result').hidden=true;error('purchase','');purchaseStarted=false;purchaseAutoCompleted=false;sliderUsed=false;syncPurchaseControls();
  analytics.track('simulation_completed');show('results');return true;
}
function paintPurchase(p) {
  $('before-daily').textContent=money(p.beforeDaily);
  animatePurchaseValue($('after-daily'),money(p.afterDaily));
  const reduction=Math.max(0,p.beforeDaily-p.afterDaily);
  animatePurchaseValue($('daily-impact'),reduction>0?`Essa compra reduz seu limite diário em ${money(reduction)}.`:'Essa compra não altera seu limite diário.');
  $('before-balance').textContent=money(p.before);$('after-balance').textContent=money(p.after);$('purchase-days').textContent=p.days+(p.days===1?' dia':' dias');
  $('purchase-warning').hidden=!p.exceeds;
  $('purchase-warning').textContent=`Essa compra ultrapassaria o dinheiro disponível até o próximo pagamento. Faltariam ${money(p.deficit)} para cobrir as contas e essa compra.`;
  $('purchase-guidance').textContent=p.exceeds
    ? 'Essa compra ultrapassa o dinheiro livre até o próximo pagamento.'
    : p.beforeDaily>0 && p.afterDaily*2<=p.beforeDaily
      ? 'Essa compra reduz bastante o valor disponível por dia.'
      : `Depois dessa compra, você ainda terá ${money(p.after)} para os próximos ${p.days} ${p.days===1?'dia':'dias'}.`;
  $('purchase-result').hidden=false;
}
function updateLivePurchase() {
  startPurchase();error('purchase','');syncPurchaseControls();
  if(!$('purchase').value.trim()){$('purchase-result').hidden=true;return;}
  try {result=calculate(state.balance,state.bills,state.paymentDate);} catch {show('calculator');validateBudget();return;}
  try {
    const p=simulatePurchase(result,$('purchase').value);
    state.lastPurchase=$('purchase').value;persist();paintResult();paintPurchase(p);
    if(!purchaseAutoCompleted){analytics.track('purchase_simulation_completed');purchaseAutoCompleted=true;}
  } catch {$('purchase-result').hidden=true;}
}
function completePurchase() {
  startPurchase();
  // Recalcula com a data atual, inclusive quando a página fica aberta de um dia para outro.
  try{result=calculate(state.balance,state.bills,state.paymentDate);}catch{show('calculator');validateBudget();return false;}
  try {
    const p=simulatePurchase(result,$('purchase').value);error('purchase','');state.lastPurchase=$('purchase').value;persist();paintResult();paintPurchase(p);syncPurchaseControls();
    analytics.track('purchase_simulation_completed');purchaseAutoCompleted=true;
    $('purchase-result').focus();return true;
  } catch(e){error('purchase',e.message);$('purchase-result').hidden=true;$('purchase').focus();return false;}
}
function resetAll(destination) {
  state=emptyState();result=null;budgetStarted=false;purchaseStarted=false;purchaseAutoCompleted=false;sliderUsed=false;
  if(!clearState(storage))storageWarning();
  syncInputs();syncPurchaseControls();error('balance','');error('payment-date','');error('purchase','');$('budget-error').textContent='';$('purchase-result').hidden=true;show(destination);
}
$('start').addEventListener('click',()=>{analytics.track('click_calcular_agora');show('calculator');});
$('back-home').addEventListener('click',()=>show('welcome'));
$('edit').addEventListener('click',()=>{budgetStarted=false;show('calculator');});
for(const [id,key] of [['balance','balance'],['payment-date','paymentDate']])$(id).addEventListener('input',()=>{state[key]=$(id).value;startBudget();persist();error(id,'');});
$('balance').addEventListener('blur',()=>formatInput($('balance')));
$('purchase').addEventListener('blur',()=>formatInput($('purchase')));
$('add-bill').addEventListener('click',()=>{state.bills.push({name:'',value:''});startBudget();persist();renderBills();$(`bill-${state.bills.length-1}-name`).focus();});
$('budget-form').addEventListener('submit',e=>{e.preventDefault();completeBudget();});
$('purchase').addEventListener('input',updateLivePurchase);
document.querySelectorAll('[data-purchase-cents]').forEach(button=>button.addEventListener('click',()=>{
  analytics.track('quick_value_clicked');$('purchase').value=purchaseText(Number(button.dataset.purchaseCents));updateLivePurchase();
}));
$('purchase-slider').addEventListener('input',()=>{
  if(!sliderUsed){analytics.track('purchase_slider_used');sliderUsed=true;}
  $('purchase').value=purchaseText(Number($('purchase-slider').value));updateLivePurchase();
});
$('purchase-form').addEventListener('submit',e=>{e.preventDefault();completePurchase();});
$('another').addEventListener('click',()=>{analytics.track('click_simular_outra_compra');state.lastPurchase='';$('purchase').value='';persist();purchaseStarted=false;purchaseAutoCompleted=false;sliderUsed=false;$('purchase-result').hidden=true;error('purchase','');syncPurchaseControls();$('purchase').focus();});
$('reset').addEventListener('click',()=>{analytics.track('click_refazer_tudo');resetAll('calculator');$('status-message').textContent='Simulação reiniciada. Preencha um novo orçamento.';});
$('clear-data').addEventListener('click',()=>{analytics.track('click_limpar_dados');resetAll('welcome');$('status-message').textContent='Os dados financeiros foram removidos desta página. Se o armazenamento estiver disponível, também foram apagados deste navegador.';});
$('privacy-open').addEventListener('click',()=>$('privacy-dialog').showModal());
$('privacy-close').addEventListener('click',()=>$('privacy-dialog').close());
$('analytics-consent').hidden=!analytics.ready;
$('analytics-accept').addEventListener('click',()=>{analytics.enable();$('analytics-consent').hidden=true;});
$('analytics-decline').addEventListener('click',()=>{analytics.decline();$('analytics-consent').hidden=true;});
function refreshDay() {
  $('payment-date').min=tomorrowISO();
  if(screen!=='results'||!result)return;
  try{result=calculate(state.balance,state.bills,state.paymentDate);paintResult();syncPurchaseControls();if(!$('purchase-result').hidden)paintPurchase(simulatePurchase(result,state.lastPurchase));}
  catch{show('calculator');validateBudget();}
}
window.addEventListener('focus',refreshDay);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshDay();});
// Checa a virada de dia mesmo se o navegador permanecer aberto em primeiro plano.
setInterval(refreshDay,60000);
syncInputs();
syncPurchaseControls();
