import {GA_MEASUREMENT_ID, PRIVACY_SETTINGS_CONFIRMED} from './analytics-config.mjs';
export const EVENTS = Object.freeze(['page_view','click_calcular_agora','simulation_started','simulation_completed','purchase_simulation_started','purchase_simulation_completed','click_simular_outra_compra','click_refazer_tudo','click_limpar_dados','quick_value_clicked','purchase_slider_used']);
// Aceita SOMENTE nomes fixos. Não aceita payload, texto, valores ou estado do app.
export function makeTracker(send) {
  return name => { if (EVENTS.includes(name)) {try {send(name);} catch { /* Analytics não bloqueia o app. */ }} };
}
export function createAnalytics(win,doc) {
  let enabled = false, declined = false;
  const ready = /^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID) && PRIVACY_SETTINGS_CONFIRMED;
  const queue = ['page_view'];
  const send = name => win.gtag('event',name);
  const track = makeTracker(name => {
    if (enabled) send(name);
    else if (ready && !declined && queue.length < 100) queue.push(name);
  });
  function enable() {
    if (!ready || enabled) return;
    enabled = true;
    win.dataLayer = win.dataLayer || [];
    win.gtag = function(){win.dataLayer.push(arguments);};
    win.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    win.gtag('js',new Date());
    win.gtag('config',GA_MEASUREMENT_ID,{
      send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,
      // Nunca envia query string, hash ou referrer; dados nunca vão para a URL.
      page_location:win.location.origin+win.location.pathname,page_referrer:'',page_title:'Cabe no Meu Bolso?'
    });
    const script = doc.createElement('script');
    script.async = true; script.src = 'https://www.googletagmanager.com/gtag/js?id='+GA_MEASUREMENT_ID;
    doc.head.append(script);
    queue.splice(0).forEach(send);
  }
  function decline() { declined = true; queue.length = 0; }
  return {ready,track,enable,decline};
}
