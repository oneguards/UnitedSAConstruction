(() => {
  const hosts=['unitedsaconstruction.com','www.unitedsaconstruction.com'];
  if(!hosts.includes(location.hostname)||navigator.doNotTrack==='1'||window.doNotTrack==='1'||navigator.globalPrivacyControl)return;
  const path=location.pathname.replace(/\.html$/,'').replace(/\/$/,'')||'/';
  const page=path==='/index'?'/':path;
  if(!['/','/services','/storm-damage','/our-work','/about','/contact'].includes(page)||!crypto.randomUUID)return;
  try {if(Object.keys(localStorage).some(k=>/^sb-.*-auth-token$/.test(k)))return;}catch{/* Storage may be unavailable. */}
  const key='united-visit';const now=Date.now();let visit;
  try{visit=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
  if(!visit||!visit.id||now-visit.last>30*60*1000)visit={id:crypto.randomUUID(),source:'Direct / unknown'};
  // Carry the original external source through this tab's visit; never send query strings.
  if(!visit.last){try{const source=new URL(document.referrer);if(!hosts.includes(source.hostname))visit.source=source.hostname;}catch{}}
  visit.last=now;try{sessionStorage.setItem(key,JSON.stringify(visit));}catch{}
  const ua=navigator.userAgent;
  const device=/iPad|Tablet/i.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)?'Tablet':/Mobi|Android/i.test(ua)?'Mobile':'Desktop';
  const body=JSON.stringify({id:crypto.randomUUID(),session_id:visit.id,path:page,referrer:visit.source,device});
  fetch('/.netlify/functions/api?track=1',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});
})();
