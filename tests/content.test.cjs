const {JSDOM}=require('jsdom');
const fs=require('fs');const assert=require('node:assert/strict');const vm=require('vm');
const root=require('node:path').resolve(__dirname,'..')+'/';
const source=fs.readFileSync(root+'assets/site-data.js','utf8');
const seed=JSON.parse(fs.readFileSync(root+'supabase/existing-content.json'));
const tick=()=>new Promise(r=>setTimeout(r,0));
async function page(name,data=seed,fail=false){
 const dom=new JSDOM(fs.readFileSync(root+name+'.html','utf8'),{url:'https://unitedsaconstruction.com/'+name,runScripts:'outside-only'});
 dom.window.fetch=async url=>({ok:!fail,json:async()=>({items:data[new URL(url,'https://unitedsaconstruction.com').searchParams.get('collection')]||[]})});
 dom.window.console.warn=()=>{};dom.window.eval(source);await tick();return dom;
}
(async()=>{
 for(const name of ['index','services']){
  const d=await page(name);const doc=d.window.document;
  assert.equal(doc.querySelectorAll('#cards article').length,6);assert.equal(doc.querySelectorAll('.brand-tile').length,4);assert.equal(doc.querySelectorAll('#managed-services').length,0);d.window.close();
 }
 let d=await page('our-work');assert.equal(d.window.document.querySelectorAll('#projects figure').length,6);assert.equal(d.window.document.querySelectorAll('#managed-projects').length,1);d.window.close();
 d=await page('contact');assert.equal(d.window.document.querySelectorAll('#service option').length,9);assert.match(d.window.document.querySelector('.license-credentials').textContent,/GC-42968/);d.window.close();
 const edited=structuredClone(seed);edited.services[0].name='Edited roofing';edited.projects[0].title='Edited project';edited.licenses[0].license_number='EDIT-1';edited.brands[0].name='Edited brand';edited.social_links[1].url='https://example.com/maps';edited.social_links[2].url='https://example.com/reviews';
 d=await page('index',edited);assert.match(d.window.document.querySelector('#cards h3').textContent,/Edited roofing/);assert.match(d.window.document.querySelector('.brand-tile').textContent,/Edited brand/);assert.equal(d.window.document.querySelector('[data-social-platform="google_reviews"]').href,'https://example.com/reviews');d.window.close();
 d=await page('contact',edited);assert.match(d.window.document.querySelector('.license-credentials').textContent,/EDIT-1/);assert.equal(d.window.document.querySelector('[data-social-platform="google_maps"]').href,'https://example.com/maps');d.window.close();
 d=await page('our-work',edited);assert.match(d.window.document.querySelector('#projects figcaption').textContent,/Edited project/);d.window.close();
 const empty={services:[],projects:[],licenses:[],social_links:[],brands:[]};
 d=await page('index',empty);assert.equal(d.window.document.querySelectorAll('#cards article').length,0);assert.equal(d.window.document.querySelectorAll('.brand-tile').length,0);assert(d.window.document.querySelector('[data-social-platform]').hidden);assert.equal(d.window.document.querySelectorAll('footer .social-links a').length,0);d.window.close();
 d=await page('contact',empty);assert(d.window.document.querySelector('.license-credentials').hidden);assert.equal(d.window.document.querySelectorAll('#service option').length,1);d.window.close();
 d=await page('index',seed,true);assert.equal(d.window.document.querySelectorAll('#cards article').length,6);assert.equal(d.window.document.querySelectorAll('.brand-tile').length,4);d.window.close();
 console.log('Public pages: import counts, edits, shared links, unpublishing, API outage fallback passed');
 // Exercise the real admin editor with a simulated approved session/API.
 const admin=new JSDOM(fs.readFileSync(root+'admin/index.html','utf8'),{url:'https://unitedsaconstruction.com/admin/',runScripts:'outside-only'});const w=admin.window;
 w.UNITED_ADMIN_CONFIG={supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'public-test'};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'test-session'}}}),onAuthStateChange:()=>{}}})};
 let saved;w.fetch=async(url,options)=>{const collection=new URL(url,'https://example.com').searchParams.get('collection');if(options.method==='PATCH')saved=JSON.parse(options.body);return {ok:true,json:async()=>({items:(seed[collection]||[]).map((x,i)=>({...x,id:'test-'+i}))})}};
 w.eval(fs.readFileSync(root+'admin/admin.js','utf8'));await tick();
 for(const collection of ['services','projects','social_links','licenses','brands']){
  w.document.querySelector('[data-tab="'+collection+'"]').click();await tick();
  assert.equal(w.document.querySelectorAll('#panel article').length,seed[collection].length);
  [...w.document.querySelectorAll('#panel button')].find(x=>x.textContent==='Edit').click();
  const form=w.document.getElementById('editor');assert(form);
  if(collection==='licenses')form.querySelector('input[type=date]').value='';
  await form.onsubmit({preventDefault(){}});await tick();
  assert.equal(saved.id,'test-0');if(collection==='licenses')assert.equal(saved.expires_on,null);
 }
 admin.window.close();console.log('Admin dashboard: existing records and edit/save across all five collections passed');
 // Verify real API authorization and brand field handling with mocked transport.
 let allowed=true,captured;const query={select(){return this},eq(){return this},order(){return Promise.resolve({data:seed.brands})},maybeSingle:async()=>({data:allowed?{user_id:'owner'}:null}),insert(payload){captured=payload;return this},single:async()=>({data:captured})};
 const sandbox={exports:{},process:{env:{SUPABASE_URL:'url',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'secret'}},require:()=>({createClient:()=>({from:()=>query,auth:{getUser:async()=>({data:{user:{id:'owner'}}})}})})};
 vm.runInNewContext(fs.readFileSync(root+'netlify/functions/api.js','utf8'),sandbox);
 const event={httpMethod:'POST',queryStringParameters:{collection:'brands'},headers:{authorization:'Bearer test'},body:JSON.stringify({name:'New brand',image_url:'https://example.com/logo.png',published:true,unexpected:'blocked'})};
 let result=await sandbox.exports.handler({...event,headers:{}});assert.equal(result.statusCode,401);
 allowed=false;result=await sandbox.exports.handler(event);assert.equal(result.statusCode,403);
 allowed=true;result=await sandbox.exports.handler(event);assert.equal(result.statusCode,200);assert.equal(captured.unexpected,undefined);
 result=await sandbox.exports.handler({...event,body:JSON.stringify({name:'Bad',url:'javascript:alert(1)'})});assert.equal(result.statusCode,400);
 console.log('Backend: admin-only brand writes, field allowlist and unsafe URL rejection passed');
})().catch(error=>{console.error(error);process.exitCode=1});
