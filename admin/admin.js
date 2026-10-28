const cfg = window.UNITED_ADMIN_CONFIG;
const status = document.getElementById('status'), panel = document.getElementById('panel');
const sections = {
  reports:{title:'Website Reports',description:'See how people find and explore your website.',singular:'report'},
  promotions: {title:'Promotions',description:'Turn an offer on when you’re ready. Lowest display order wins if several are on.',singular:'promotion'},
  leads: {title:'Leads Inbox',description:'Every conversation starts here.',singular:'request'},
  projects: {title:'Projects',description:'A home for the work you’re proud of.',singular:'project'},
  services: {title:'Services',description:'Show homeowners what your team does best.',singular:'service'},
  social_links: {title:'Social & Google',description:'Help people find you, follow you, and get in touch.',singular:'link'},
  licenses: {title:'Licenses',description:'Keep your credentials current and easy to find.',singular:'license'},
  brands: {title:'Brands',description:'The materials and makers behind your work.',singular:'brand'}
};
const columns = {
  promotions:['title','description','placement','button_label','url','published','sort_order'],
  projects:['title','description','service','location','completed_on','published','sort_order'],
  services:['name','description','image_url','show_card','published','sort_order'],
  social_links:['label','platform','url','published','sort_order'],
  licenses:['license_number','license_type','state','holder','expires_on','published','sort_order'],
  brands:['name','description','image_url','url','published','sort_order']
};
const labels = {placement:'Show offer as',button_label:'Button text',title:'Project name',name:'Name',description:'Description',service:'Service / type of work',location:'City or location',completed_on:'Completed on',image_url:'Image URL',show_card:'Show service card',published:'Published on website',sort_order:'Display order',label:'Link label',platform:'Link placement',url:'Website link',license_number:'License number',license_type:'License type',state:'State',holder:'License holder',expires_on:'Expiration date'};
let client, session, tab='leads', items=[], loadVersion=0, messageTimer;
const el=(tag,text,className)=>{const x=document.createElement(tag);if(text!=null)x.textContent=text;if(className)x.className=className;return x;};
const safeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}};
const dateLabel=value=>{if(!value)return '';const d=new Date(value.length===10?value+'T12:00:00Z':value);return Number.isNaN(d.getTime())?'':d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});};
const photosFor=item=>[...new Set([...(Array.isArray(item.image_urls)?item.image_urls:[]),item.image_url].filter(x=>safeUrl(x)))];
function msg(text,bad=false){clearTimeout(messageTimer);status.textContent=text;status.className='toast'+(bad?' error':'');status.hidden=!text;if(text&&!bad)messageTimer=setTimeout(()=>{status.hidden=true;},5000);}
async function api(collection,method='GET',body,params={}){
  if(!session)throw Error('Please sign in again.');
  const response=await fetch('/.netlify/functions/api?collection='+encodeURIComponent(collection)+'&'+new URLSearchParams(params),{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:body?JSON.stringify(body):undefined});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Request failed. Please try again.');return data;
}
function setLogin(on){document.getElementById('login').hidden=on;document.getElementById('dashboard').hidden=!on;document.getElementById('logout').hidden=!on;document.getElementById('account-email').textContent=session?.user?.email||'United SA Construction';}
async function init(){
  if(!cfg?.supabaseUrl?.startsWith('https://')||!cfg.supabaseAnonKey){msg('Website sign-in is not configured yet.',true);return;}
  client=supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const {data}=await client.auth.getSession();session=data.session;setLogin(!!session);if(session)await load();
  client.auth.onAuthStateChange((_event,s)=>{session=s;setLogin(!!s);if(!s){items=[];panel.replaceChildren();closeEditor();}});
}
document.getElementById('show-password').onclick=()=>{const input=document.getElementById('password'),button=document.getElementById('show-password');input.type=input.type==='password'?'text':'password';button.textContent=input.type==='password'?'Show':'Hide';button.setAttribute('aria-label',input.type==='password'?'Show password':'Hide password');};
document.getElementById('loginForm').onsubmit=async event=>{
  event.preventDefault();const button=event.currentTarget?.querySelector('[type=submit]')||document.querySelector('.login-submit');const errorEl=document.getElementById('login-error');errorEl.hidden=true;button.disabled=true;button.textContent='Signing in…';
  try{const {data,error}=await client.auth.signInWithPassword({email:document.getElementById('email').value.trim(),password:document.getElementById('password').value});if(error)throw error;session=data.session;document.getElementById('password').value='';setLogin(true);await load();}
  catch(error){errorEl.textContent=error.message;errorEl.hidden=false;}
  finally{button.disabled=false;button.textContent='Sign in ↗';}
};
document.getElementById('logout').onclick=async()=>{try{const {error}=await client.auth.signOut();if(error)throw error;session=null;items=[];setLogin(false);closeEditor();msg('You’re signed out.');}catch(error){msg(error.message,true);}};
document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{closeEditor();tab=button.dataset.tab;document.getElementById('search').value='';load();});
document.getElementById('search').oninput=renderRecords;
document.getElementById('filter').onchange=renderRecords;
document.getElementById('add-record').onclick=()=>edit(null);
async function load(){
  const version=++loadVersion;const section=sections[tab];document.getElementById('page-title').textContent=section.title;document.getElementById('breadcrumb').textContent=section.title;document.getElementById('page-description').textContent=section.description;
  document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  document.querySelector('.content-toolbar').hidden=tab==='reports';
  if(tab==='reports'){document.getElementById('summary').replaceChildren();await window.UnitedReports.mount({api,panel,summary:document.getElementById('summary'),active:()=>version===loadVersion&&!!session});return;}
  const add=document.getElementById('add-record');add.hidden=tab==='leads';add.textContent='＋ Add '+section.singular;
  const filter=document.getElementById('filter');filter.replaceChildren(new Option('All '+(tab==='leads'?'requests':'records'),'all'));
  for(const value of tab==='leads'?['new','contacted','quoted','won','lost']:['published','hidden'])filter.add(new Option(value[0].toUpperCase()+value.slice(1),value));
  panel.replaceChildren(el('div','Loading your '+section.title.toLowerCase()+'…','empty-state'));
  try{const result=await api(tab);if(version!==loadVersion)return;items=result.items||[];render();}
  catch(error){if(version!==loadVersion)return;panel.replaceChildren(el('div','Unable to load this section. Please refresh or try again.','empty-state'));msg(error.message,true);}
}
function render(){
  const total=items.length;let cards;
  if(tab==='leads')cards=[['Total requests',total,'Your customer conversations'],['New inquiries',items.filter(x=>x.status==='new').length,'Ready for your next step'],['Projects won',items.filter(x=>x.status==='won').length,'From conversation to construction']];
  else cards=[['Total '+sections[tab].title.toLowerCase(),total,'Everything in this collection'],['Published',items.filter(x=>x.published).length,'Visible on your website'],['Drafts',items.filter(x=>!x.published).length,'Saved for when you’re ready']];
  document.getElementById('summary').replaceChildren(...cards.map(([label,value,note])=>{const c=el('div',null,'summary-card');const top=el('div',label,'summary-top');top.append(el('span','↗'));c.append(top,el('div',String(value).padStart(2,'0'),'summary-value'),el('div',note,'summary-note'));return c;}));
  renderRecords();
}
function renderRecords(){
  const query=document.getElementById('search').value.toLowerCase().trim(),filter=document.getElementById('filter').value;
  const visible=items.filter(x=>(filter==='all'||(tab==='leads'?x.status===filter:(filter==='published')===!!x.published))&&Object.values(x).some(value=>String(value??'').toLowerCase().includes(query)));
  panel.replaceChildren();if(!visible.length){const empty=el('div',null,'empty-state');empty.append(el('span',tab==='leads'?'↙':'◇'),el('h3',items.length?'No matches just yet.':tab==='leads'?'Your next project starts here.':'Make this space yours.'),el('p',items.length?'Try another search or filter.':tab==='leads'?'New website requests will appear here.':'Add your first '+sections[tab].singular+' to get started.'));panel.append(empty);return;}
  const list=el('div',null,tab==='leads'?'lead-list':'record-grid');visible.forEach((item,index)=>list.append(tab==='leads'?leadCard(item):contentCard(item,index)));panel.append(list);
}
function badge(text){return el('span',text[0].toUpperCase()+text.slice(1),'badge '+text);}
function contentCard(item,index){
  const card=el('article',null,'record');const images=tab==='projects'?photosFor(item):[item.image_url].filter(x=>safeUrl(x));
  if(images.length){const visual=el('div',null,'record-visual');const img=el('img');img.src=images[0];img.alt=item.title||item.name||'';img.loading='lazy';visual.append(img);if(tab==='projects')visual.append(el('span',images.length+' photo'+(images.length===1?'':'s'),'photo-count'));card.append(visual);}
  const body=el('div',null,'record-body'),top=el('div',null,'record-top');top.append(el('h3',item.title||item.name||item.label||item.license_number),badge(item.published?'published':'hidden'));body.append(top);
  const meta=tab==='projects'?[item.service,item.location,item.completed_on?'Completed '+dateLabel(item.completed_on):'']:tab==='licenses'?[item.state,item.holder,item.expires_on?'Expires '+dateLabel(item.expires_on):'']:tab==='social_links'?[item.platform?.replaceAll('_',' ')]:tab==='promotions'?[{banner:'Top banner',popup:'Popup',both:'Banner and popup'}[item.placement]]:[];
  if(meta.filter(Boolean).length)body.append(el('p',meta.filter(Boolean).join(' · '),'meta'));
  body.append(el('p',item.description||item.url||item.license_type||'','detail'));
  const actions=el('div',null,'record-actions'),buttons=el('div');buttons.style.display='flex';buttons.style.gap='7px';const editButton=el('button','Edit','secondary');editButton.onclick=()=>edit(item);const remove=el('button','Delete','danger');remove.onclick=async()=>{if(!confirm('Permanently delete this '+sections[tab].singular+'? You can unpublish it instead to keep a draft.'))return;remove.disabled=true;try{await api(tab,'DELETE',{id:item.id});await load();msg('Item deleted.');}catch(error){msg(error.message,true);remove.disabled=false;}};if(tab==='promotions'){const toggle=el('button',item.published?'Turn off':'Turn on','secondary');toggle.setAttribute('aria-label',(item.published?'Turn off ':'Turn on ')+item.title);toggle.onclick=async()=>{toggle.disabled=true;try{await api('promotions','PATCH',{id:item.id,published:!item.published});await load();msg(item.published?'Promotion turned off.':'Promotion turned on.');}catch(error){msg(error.message,true);toggle.disabled=false;}};buttons.append(toggle);}buttons.append(editButton,remove);actions.append(buttons,el('span',String(index+1).padStart(2,'0'),'record-number'));body.append(actions);card.append(body);return card;
}
function leadCard(item){
  const card=el('article',null,'lead-record'),header=el('div',null,'lead-header'),title=el('div',null,'lead-title');title.append(el('h3',item.name),el('div',[item.service,dateLabel(item.created_at)].filter(Boolean).join(' · '),'meta'));header.append(el('span',item.name.slice(0,2).toUpperCase(),'avatar'),title,badge(item.status));card.append(header);
  const contact=el('div',null,'lead-contact');for(const [value,scheme] of [[item.email,'mailto:'],[item.phone,'tel:']]){if(value){const a=el('a',value);a.href=scheme+value;contact.append(a);}}if(item.location)contact.append(el('span',item.location));card.append(contact,el('p',item.message,'detail'));
  const controls=el('div',null,'lead-controls'),select=el('select'),notes=el('textarea');select.setAttribute('aria-label','Status for '+item.name);for(const value of ['new','contacted','quoted','won','lost'])select.add(new Option(value[0].toUpperCase()+value.slice(1),value));select.value=item.status;notes.placeholder='Add private notes…';notes.setAttribute('aria-label','Private notes for '+item.name);notes.value=item.notes||'';const save=el('button','Save lead','primary');save.onclick=async()=>{save.disabled=true;try{await api('leads','PATCH',{id:item.id,status:select.value,notes:notes.value});await load();msg('Lead updated.');}catch(error){msg(error.message,true);save.disabled=false;}};controls.append(select,notes,save);card.append(controls);return card;
}
const dialog=document.getElementById('editor-dialog');let previousFocus;
function closeEditor(){if(dialog.open){if(dialog.close)dialog.close();else dialog.removeAttribute('open');}dialog.replaceChildren();document.body.classList.remove('no-scroll');previousFocus?.focus();}
dialog.addEventListener('cancel',event=>{event.preventDefault();closeEditor();});
function edit(item){
  closeEditor();previousFocus=document.activeElement;const editingTab=tab;const form=el('form');form.id='editor';const head=el('div',null,'editor-header'),titleWrap=el('div');titleWrap.append(el('span',sections[tab].title.toUpperCase(),'eyebrow'));const title=el('h2',(item?'Edit ':'New ')+sections[tab].singular);title.id='editor-title';titleWrap.append(title);const close=el('button','×','close-editor');close.type='button';close.setAttribute('aria-label','Close editor');close.onclick=closeEditor;head.append(titleWrap,close);form.append(head);
  const fields=el('div',null,'editor-fields'),inputs={};const required={promotions:['title'],projects:['title'],services:['name'],social_links:['label','url'],licenses:['license_number'],brands:['name']};
  for(const key of columns[tab]){
    const wide=['title','name','description','image_url','url','license_type'].includes(key);const label=el('label',(tab==='promotions'&&key==='title'?'Offer headline':tab==='promotions'&&key==='published'?'Promotion turned on':labels[key]||key),'field'+(wide?' wide':'')+(['published','show_card'].includes(key)?' toggle':''));let input;
    if(key==='placement'){input=el('select');for(const [value,text] of [['banner','Homepage top banner'],['popup','Homepage popup'],['both','Banner and popup']])input.add(new Option(text,value));input.value=item?.[key]||'banner';}
    else if(key==='platform'){input=el('select');for(const value of ['custom','facebook','google_maps','google_reviews'])input.add(new Option(value.replaceAll('_',' '),value));input.value=item?.[key]||'custom';}
    else if(key==='description'){input=el('textarea');input.value=item?.[key]||'';input.placeholder=tab==='projects'?'A short story about the work, materials, and finished result.':'A little detail goes a long way.';input.maxLength=5000;}
    else{input=el('input');input.type=['published','show_card'].includes(key)?'checkbox':key==='sort_order'?'number':['completed_on','expires_on'].includes(key)?'date':['image_url','url'].includes(key)?'url':'text';if(input.type==='checkbox')input.checked=item?.[key]??(key==='show_card');else input.value=item?.[key]??(key==='sort_order'?0:'');if(input.type==='url')input.placeholder='https://';}
    if(tab==='promotions'&&['title','description','button_label'].includes(key))input.maxLength={title:120,description:600,button_label:60}[key];input.name=key;input.required=(required[tab]||[]).includes(key);label.append(input);if(key==='completed_on')label.append(el('small','Optional. Shown with the project on your website.'));if(key==='sort_order')label.append(el('small','Lower numbers appear first.'));fields.append(label);inputs[key]=input;
  }
  const footer=el('div',null,'editor-footer'),cancel=el('button','Cancel','secondary'),save=el('button','Save changes','primary');cancel.type='button';cancel.onclick=closeEditor;save.type='submit';footer.append(cancel,save);const errorEl=el('p',null,'editor-error');errorEl.setAttribute('role','alert');errorEl.hidden=true;
  let photos=editingTab==='projects'?photosFor(item||{}):[],uploading=false;
  if(editingTab==='projects'){
    const photoEditor=el('div',null,'photo-editor');photoEditor.append(el('h3','Project photos'),el('p','Upload up to 30 photos. The cover photo appears first on your website. JPG, PNG, WebP, or AVIF · up to 10 MB each.'));
    const zone=el('label',null,'upload-zone');zone.append(el('span','↑'),el('strong','Choose photos from your device'),el('small','Select multiple images at once'));const upload=el('input');upload.type='file';upload.multiple=true;upload.accept='image/jpeg,image/png,image/webp,image/avif';upload.setAttribute('aria-label','Upload project photos');zone.append(upload);
    const grid=el('div',null,'photo-grid'),progress=el('p',null,'upload-status');progress.setAttribute('aria-live','polite');
    const redraw=()=>{grid.replaceChildren(...photos.map((url,index)=>{const tile=el('div',null,'photo-tile'),img=el('img');img.src=url;img.alt='Project photo '+(index+1);tile.append(img);if(index===0)tile.append(el('span','COVER','cover-label'));const actions=el('div',null,'photo-actions');const cover=el('button',index===0?'Cover':'Make cover');cover.type='button';cover.disabled=index===0||uploading;cover.onclick=()=>{photos.splice(index,1);photos.unshift(url);redraw();};const remove=el('button','Remove','remove-photo');remove.type='button';remove.disabled=uploading;remove.setAttribute('aria-label','Remove photo '+(index+1));remove.onclick=()=>{photos.splice(index,1);redraw();};actions.append(cover,remove);tile.append(actions);return tile;}));};
    const row=el('div',null,'photo-url-row'),urlInput=el('input'),addUrl=el('button','Add link','secondary');urlInput.type='url';urlInput.placeholder='Or paste an image URL';urlInput.setAttribute('aria-label','External project photo URL');addUrl.type='button';addUrl.onclick=()=>{if(!safeUrl(urlInput.value)){progress.textContent='Enter a complete https:// image URL.';return;}if(photos.length>=30){progress.textContent='This project already has 30 photos.';return;}if(!photos.includes(urlInput.value))photos.push(urlInput.value);urlInput.value='';progress.textContent='Photo added. Save your project to publish it.';redraw();};row.append(urlInput,addUrl);
    upload.onchange=async()=>{
      const files=Array.from(upload.files||[]);if(!files.length)return;
      if(photos.length+files.length>30){progress.textContent='Choose fewer photos. Each project can have up to 30.';upload.value='';return;}
      if(files.some(f=>!['image/jpeg','image/png','image/webp','image/avif'].includes(f.type)||f.size>10485760)){progress.textContent='Use JPG, PNG, WebP, or AVIF files, each 10 MB or smaller.';upload.value='';return;}
      uploading=true;save.disabled=true;upload.disabled=true;addUrl.disabled=true;redraw();let count=0;
      try{for(const file of files){progress.textContent='Uploading photo '+(++count)+' of '+files.length+'…';const signed=await api('upload','POST',{content_type:file.type,size:file.size});const {error}=await client.storage.from('project-photos').uploadToSignedUrl(signed.path,signed.token,file,{contentType:file.type});if(error)throw error;photos.push(signed.public_url);}progress.textContent='Photos uploaded. Save your project when you’re ready.';}
      catch(error){progress.textContent='Upload stopped: '+error.message+' Successfully uploaded photos are kept in this editor.';}
      finally{uploading=false;save.disabled=false;upload.disabled=false;addUrl.disabled=false;upload.value='';redraw();}
    };
    photoEditor.append(zone,grid,row,progress);fields.append(photoEditor);redraw();
  }
  form.append(fields,errorEl,footer);
  form.onsubmit=async event=>{
    event.preventDefault();if(uploading)return;errorEl.hidden=true;save.disabled=true;save.textContent='Saving…';const data={};
    for(const [key,input] of Object.entries(inputs))data[key]=input.type==='checkbox'?input.checked:key==='sort_order'?Number(input.value||0):['completed_on','expires_on'].includes(key)?(input.value||null):input.value;
    if(editingTab==='projects'){data.image_urls=photos;data.image_url=photos[0]||'';}
    try{await api(editingTab,item?'PATCH':'POST',item?{...data,id:item.id}:data);closeEditor();await load();msg('Saved. Your website is up to date.');}
    catch(error){errorEl.textContent=error.message;errorEl.hidden=false;save.disabled=false;save.textContent='Save changes';}
  };
  dialog.replaceChildren(form);document.body.classList.add('no-scroll');if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');form.querySelector('input,textarea,select')?.focus();
}
init();
