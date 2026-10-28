(() => {
  const banner = document.getElementById('promotion-banner');
  if (!banner) return;
  const make = (tag, text, cls) => { const node=document.createElement(tag); if(text)node.textContent=text;if(cls)node.className=cls;return node; };
  const url = value => {try {const parsed=new URL(value);return parsed.protocol==='https:'?parsed.href:'';}catch{return '';}};
  const dismissed = key => {try{return sessionStorage.getItem(key)==='1';}catch{return false;}};
  const remember = key => {try{sessionStorage.setItem(key,'1');}catch{/* Storage can be disabled. */}};
  let timer, popup;
  function render(items) {
    clearTimeout(timer);popup?.close();popup?.remove();popup=null;banner.replaceChildren();banner.hidden=true;
    const offer=[...items].filter(x=>x.published&&['banner','popup','both'].includes(x.placement)).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||String(b.created_at||'').localeCompare(String(a.created_at||''))||String(a.id).localeCompare(String(b.id)))[0];
    if(!offer)return;
    // Editing the offer creates a new dismissal identity; ordinary navigation does not.
    const key='united-offer:'+JSON.stringify([offer.id,offer.title,offer.description,offer.button_label,offer.url,offer.placement]);
    const content = target => {
      const copy=make('div',null,'promotion-copy');copy.append(make('span','FROM UNITED SA','promotion-eyebrow'),make('h2',offer.title),make('p',offer.description));target.append(copy);
      const href=url(offer.url);if(href&&offer.button_label){const link=make('a',offer.button_label+' ↗','promotion-button');link.href=href;target.append(link);}
    };
    if(offer.placement!=='popup'&&!dismissed(key+':banner')){
      content(banner);const close=make('button','×','promotion-close');close.setAttribute('aria-label','Dismiss promotion banner');close.onclick=()=>{banner.hidden=true;remember(key+':banner');};banner.append(close);banner.hidden=false;
    }
    if(offer.placement==='banner'||dismissed(key+':popup'))return;
    popup=make('dialog',null,'promotion-popup');popup.setAttribute('aria-labelledby','promotion-title');content(popup);popup.querySelector('h2').id='promotion-title';
    const close=make('button','×','promotion-close');close.type='button';close.setAttribute('aria-label','Close promotion');popup.prepend(close);
    let previousFocus;
    const finish=()=>{remember(key+':popup');popup.close();previousFocus?.focus();};
    close.onclick=finish;popup.addEventListener('cancel',event=>{event.preventDefault();finish();});popup.addEventListener('click',event=>{if(event.target===popup){const rect=popup.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)finish();}});
    document.body.append(popup);
    // Do not interrupt a form, another modal, or a background tab.
    const show=()=>{if(document.hidden||document.querySelector('dialog[open]')||document.activeElement?.matches('input,textarea,select')){timer=setTimeout(show,2000);return;}if(typeof popup.showModal!=='function')return;previousFocus=document.activeElement;popup.showModal();remember(key+':popup');close.focus();};
    timer=setTimeout(show,2500);
  }
  window.UnitedPromotions={render};
  fetch('/.netlify/functions/api?public=1&collection=promotions').then(response=>{if(!response.ok)throw Error('Unavailable');return response.json();}).then(data=>render(data.items||[])).catch(()=>{/* A promotion outage must not block the homepage. */});
})();
