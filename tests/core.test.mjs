import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,simulatePurchase,parseMoney,daysUntil,money,saveState,readState,clearState,STORAGE_KEY} from '../dist/core.mjs';
import {makeTracker,createAnalytics,EVENTS} from '../dist/analytics.mjs';
const now = new Date(2026,8,25,12);
test('Cenário 1: 500 − 200 / 10 dias; compra de 90',()=>{
 const r=calculate('500',[{name:'Conta',value:'200'}],'2026-10-05',now);
 assert.equal(r.free,30000);assert.equal(r.days,10);assert.equal(r.daily,3000);
 const p=simulatePurchase(r,'90');assert.equal(p.after,21000);assert.equal(p.afterDaily,2100);assert.equal(p.exceeds,false);
});
test('Cenário 2: faltam R$ 100 para cobrir as contas',()=>{
 const r=calculate('300',[{name:'Conta',value:'400'}],'2026-10-05',now);
 assert.equal(r.deficit,10000);assert.equal(r.free,-10000);assert.equal(r.daily,0);
});
test('Cenário 3: compra de 250 excede saldo livre de 200',()=>{
 const p=simulatePurchase(calculate('200',[],'2026-10-05',now),'250');
 assert.equal(p.exceeds,true);assert.equal(p.after,-5000);assert.equal(p.deficit,5000);assert.equal(p.afterDaily,0);
});
test('Moeda brasileira e centavos sem perda de precisão',()=>{
 for(const [s,n] of [['1.234,56',123456],['1234.56',123456],['1.234',123400],['0',0],['0,01',1],[' 50,5 ',5050]])assert.equal(parseMoney(s),n);
 for(const s of ['','-1','-0,01','NaN','Infinity','R$ 10','1e5','1,234','1.2.3','9999999999'])assert.throws(()=>parseMoney(s));
 assert.match(money(123456),/1\.234,56/);
});
test('Data futura obrigatória; valida calendário; sem divisão por zero',()=>{
 for(const s of ['','2026-09-25','2026-09-24','2026-02-30','25/09/2026','2026-13-01'])assert.throws(()=>daysUntil(s,now));
 assert.equal(daysUntil('2026-09-26',now),1);
 assert.equal(daysUntil('2026-09-26',new Date(2026,8,25,23,59)),1);
 assert.equal(daysUntil('2028-03-01',new Date(2028,1,28)),2);
 assert.equal(daysUntil('2026-11-02',new Date(2026,9,31)),2);
});
test('Contas múltiplas, zero, campos obrigatórios e arredondamento conservador',()=>{
 const r=calculate('500',[{name:'Luz',value:'120,50'},{name:'Água',value:'79,50'}],'2026-10-05',now);assert.equal(r.free,30000);
 assert.equal(calculate('0',[],'2026-10-05',now).daily,0);
 const p=simulatePurchase(calculate('200',[],'2026-10-05',now),'200');assert.equal(p.exceeds,false);assert.equal(p.after,0);
 assert.throws(()=>calculate('500',[{name:' ',value:'50'}],'2026-10-05',now));
 assert.throws(()=>calculate('500',[{name:'Luz',value:''}],'2026-10-05',now));
 assert.equal(calculate('1',[],'2026-09-28',now).daily,33);
});
test('localStorage guarda somente os quatro campos e limpa apenas sua própria chave',()=>{
 const map=new Map([['outro-app','preservar']]);const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const state={balance:'500',paymentDate:'2026-10-05',bills:[{name:'Luz',value:'200'}],lastPurchase:'90',extra:'não salvar'};
 assert.equal(saveState(storage,state),true);assert.deepEqual(Object.keys(JSON.parse(map.get(STORAGE_KEY))),['balance','paymentDate','bills','lastPurchase']);
 assert.equal(readState(storage).state.lastPurchase,'90');
 state.lastPurchase='';saveState(storage,state);assert.equal(readState(storage).state.balance,'500');
 clearState(storage);assert.equal(map.has(STORAGE_KEY),false);assert.equal(map.get('outro-app'),'preservar');
 map.set(STORAGE_KEY,'{corrompido');assert.equal(readState(storage).ok,false);
 assert.equal(saveState(null,state),false);assert.equal(clearState(null),false);
});
test('Analytics aceita os onze eventos e descarta payload financeiro e nomes dinâmicos',()=>{
 const sent=[];const track=makeTracker((...args)=>sent.push(args));
 EVENTS.forEach(n=>track(n,{balance:'500',billName:'Luz',purchase:'90'}));
 track('saldo_500');track('Luz');
 assert.equal(sent.length,11);assert.deepEqual(sent,EVENTS.map(x=>[x]));
 assert.doesNotThrow(()=>makeTracker(()=>{throw Error('bloqueador');})('page_view'));
});
test('Sem ID e confirmação de privacidade não há scripts, eventos ou chamadas de rede',()=>{
 const analytics=createAnalytics({},{});assert.equal(analytics.ready,false);
 assert.doesNotThrow(()=>{analytics.track('simulation_completed');analytics.enable();analytics.decline();});
});
