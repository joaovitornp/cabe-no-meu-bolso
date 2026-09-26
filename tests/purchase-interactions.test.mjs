import test from 'node:test';
import assert from 'node:assert/strict';
import {tomorrowISO,STORAGE_KEY} from '../dist/core.mjs';
import {EVENTS} from '../dist/analytics.mjs';

test('campo, atalhos e slider atualizam o mesmo resultado sem navegar nem recarregar',async()=>{
  const elements=new Map();
  function element(id='') {
    const handlers=new Map(),attrs=new Map(),classes=new Set();
    return {id,value:'',textContent:'',hidden:false,dataset:{},max:'',
      classList:{toggle(name,active){active?classes.add(name):classes.delete(name);},contains:name=>classes.has(name)},
      setAttribute:(name,value)=>attrs.set(name,value),getAttribute:name=>attrs.get(name),
      addEventListener:(name,fn)=>handlers.set(name,fn),fire(name){handlers.get(name)?.({preventDefault(){}});},
      focus(){},replaceChildren(){},append(){},animate:null,
    };
  }
  const get=id=>{if(!elements.has(id))elements.set(id,element(id));return elements.get(id);};
  const quicks=[2000,5000,10000,20000].map(cents=>{
    const button=element();button.dataset.purchaseCents=String(cents);return button;
  });
  const map=new Map();let scrolls=0;
  const original={window:globalThis.window,document:globalThis.document,setInterval:globalThis.setInterval};
  globalThis.document={getElementById:get,querySelectorAll:()=>quicks,addEventListener(){},visibilityState:'visible'};
  globalThis.window={localStorage:{getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)},
    location:{origin:'https://example.test',pathname:'/'},addEventListener(){},scrollTo(){scrolls++;},matchMedia:()=>({matches:true})};
  globalThis.setInterval=()=>0;
  try {
    await import('../dist/app.mjs');
    get('start').fire('click');
    get('balance').value='300';get('balance').fire('input');
    const payment=new Date();payment.setDate(payment.getDate()+10);
    const date=`${payment.getFullYear()}-${String(payment.getMonth()+1).padStart(2,'0')}-${String(payment.getDate()).padStart(2,'0')}`;
    get('payment-date').value=date;get('payment-date').fire('input');
    get('budget-form').fire('submit');
    assert.equal(get('calculator').hidden,true);
    assert.equal(get('results').hidden,false);
    assert.equal(get('daily-value').textContent,'R$ 30,00');
    assert.equal(get('purchase-slider').max,'38000');

    get('purchase-slider').value='0';get('purchase-slider').fire('input');
    assert.equal(get('after-daily').textContent,'R$ 30,00');
    assert.equal(get('after-balance').textContent,'R$ 300,00');
    assert.equal(get('purchase-slider-value').textContent,'R$ 0,00');

    get('purchase-slider').value='9000';get('purchase-slider').fire('input');
    assert.equal(get('purchase').value,'90,00');
    assert.equal(get('after-daily').textContent,'R$ 21,00');
    assert.equal(get('after-balance').textContent,'R$ 210,00');
    assert.match(get('daily-impact').textContent,/R\$ 9,00/);

    get('purchase-slider').value='15000';get('purchase-slider').fire('input');
    assert.equal(get('after-daily').textContent,'R$ 15,00');
    assert.match(get('purchase-guidance').textContent,/reduz bastante/);

    quicks[1].fire('click');
    assert.equal(get('purchase').value,'50,00');
    assert.equal(get('after-daily').textContent,'R$ 25,00');
    assert.equal(quicks[1].getAttribute('aria-pressed'),'true');

    get('purchase').value='350';get('purchase').fire('input');
    assert.equal(get('after-daily').textContent,'R$ 0,00');
    assert.equal(get('after-balance').textContent,'-R$ 50,00');
    assert.equal(get('purchase-warning').hidden,false);
    assert.match(get('purchase-guidance').textContent,/ultrapassa o dinheiro livre/);
    assert.equal(get('results').hidden,false);
    assert.equal(scrolls,2); // apenas as duas transições originais de tela

    get('another').fire('click');
    assert.equal(get('purchase').value,'');
    assert.equal(get('purchase-result').hidden,true);
    assert.equal(JSON.parse(map.get(STORAGE_KEY)).balance,'300');
    assert.equal(JSON.parse(map.get(STORAGE_KEY)).lastPurchase,'');
  } finally {
    globalThis.window=original.window;globalThis.document=original.document;globalThis.setInterval=original.setInterval;
  }
});

test('novos eventos são nomes fixos e não levam valores financeiros',()=>{
  assert.ok(EVENTS.includes('quick_value_clicked'));
  assert.ok(EVENTS.includes('purchase_slider_used'));
  assert.equal(EVENTS.length,11);
});
