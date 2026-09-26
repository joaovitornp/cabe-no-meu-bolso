// Cálculos em centavos inteiros. Nenhuma função deste arquivo faz requisições.
export const STORAGE_KEY = 'cabe-no-meu-bolso:v1';
export const MAX_CENTS = 99999999999;
export function parseMoney(value) {
  const raw = String(value ?? '').trim();
  if (!raw) throw new Error('Informe um valor.');
  // BRL: 1.234,56 ou 1234,56; também aceita 1234.56 sem milhar.
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw) && !/^\d+\.\d{1,2}$/.test(raw))
    throw new Error('Use um valor positivo, como 150,00.');
  const normalized = raw.includes(',') ? raw.replaceAll('.', '').replace(',', '.') : (/^\d+\.\d{1,2}$/.test(raw) ? raw : raw.replaceAll('.', ''));
  const cents = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_CENTS) throw new Error('Informe um valor entre R$ 0 e R$ 999.999.999,99.');
  return cents;
}
export const money = cents => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(cents / 100);
export function dateISO(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function tomorrowISO(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1); return dateISO(d);
}
export function daysUntil(value, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Informe a data do próximo pagamento.');
  const [y,m,d] = value.split('-').map(Number);
  const target = new Date(Date.UTC(y,m-1,d));
  if (y < 1000 || target.getUTCFullYear() !== y || target.getUTCMonth() !== m-1 || target.getUTCDate() !== d)
    throw new Error('Informe uma data válida.');
  const days = Math.round((target.getTime() - Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())) / 86400000);
  if (days <= 0) throw new Error('Escolha uma data futura, a partir de amanhã.');
  return days;
}
export function calculate(balance, bills, date, now = new Date()) {
  const available = parseMoney(balance);
  const total = bills.reduce((sum,bill) => {
    if (!String(bill.name ?? '').trim()) throw new Error('Dê um nome para cada conta ou remova a linha vazia.');
    return sum + parseMoney(bill.value);
  },0);
  if (!Number.isSafeInteger(total)) throw new Error('O total das contas é muito alto.');
  const days = daysUntil(date,now), free = available-total;
  // Nunca oferece um limite negativo. O déficit aparece separado.
  return {available, total, free, days, daily:Math.floor(Math.max(0,free)/days), deficit:Math.max(0,-free)};
}
export function simulatePurchase(result,value) {
  const cost = parseMoney(value), after = result.free-cost;
  return {cost, before:result.free, after, beforeDaily:result.daily, afterDaily:Math.floor(Math.max(0,after)/result.days), days:result.days, exceeds:cost>result.free, deficit:Math.max(0,-after)};
}
export const emptyState = () => ({balance:'', paymentDate:'', bills:[], lastPurchase:''});
export function sanitizeState(raw) {
  if (!raw || typeof raw !== 'object') return emptyState();
  const str = (x,n) => typeof x === 'string' ? x.slice(0,n) : '';
  return {balance:str(raw.balance,30),paymentDate:str(raw.paymentDate,10),bills:Array.isArray(raw.bills) ? raw.bills.slice(0,500).map(b=>({name:str(b?.name,80),value:str(b?.value,30)})) : [],lastPurchase:str(raw.lastPurchase,30)};
}
export function readState(storage) {
  try {return {state:sanitizeState(JSON.parse(storage.getItem(STORAGE_KEY))),ok:true};}
  catch {return {state:emptyState(),ok:false};}
}
export function saveState(storage,state) {
  try {storage.setItem(STORAGE_KEY,JSON.stringify(sanitizeState(state)));return true;} catch {return false;}
}
export function clearState(storage) {
  try {storage.removeItem(STORAGE_KEY);return true;} catch {return false;}
}
