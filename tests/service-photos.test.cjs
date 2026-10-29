const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict'),vm=require('vm');
const tick=()=>new Promise(r=>setTimeout(r,0));
(async()=>{
const existing={id:'service-1',name:'Roofing',description:'Original description',image_url:'https://unitedsaconstruction.com/assets/roof-sheathing.jpg',show_card:true,published:true,sort_order:0};
const d=new JSDOM(fs.readFileSync('admin/index.html','utf8'),{url:'https://unitedsaconstruction.com/admin/',runScripts:'outside-only'}),w=d.window;let saved,fail=false,uploadCount=0,signedRequest,bucket;
w.UNITED_ADMIN_CONFIG={supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'public'};
w.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'approved'}}}),onAuthStateChange(){}},storage:{from:name=>{bucket=name;return {uploadToSignedUrl:async()=>{uploadCount++;return {error:fail?Error('Network stopped'):null}}}}}})};
w.fetch=async(url,opts)=>{const collection=new URL(url,w.location.origin).searchParams.get('collection');if(collection==='upload'){signedRequest=JSON.parse(opts.body);return {ok:true,json:async()=>({bucket:'service-photos',path:'admin/new.jpg',token:'signed-token',public_url:'https://example.supabase.co/storage/v1/object/public/service-photos/admin/new.jpg'})};}if(opts.method==='PATCH'||opts.method==='POST')saved=JSON.parse(opts.body);return {ok:true,json:async()=>({items:collection==='services'?[existing]:[]})};};
w.eval(fs.readFileSync('admin/admin.js','utf8'));await tick();w.document.querySelector('[data-tab=services]').click();await tick();
const open=()=>{[...w.document.querySelectorAll('#panel button')].find(x=>x.textContent==='Edit').click();return w.document.querySelector('#editor');};
let form=open();assert.equal(form.querySelector('.service-photo-preview').src,existing.image_url);await form.onsubmit({preventDefault(){}});assert.equal(saved.image_url,existing.image_url);await tick();
async function upload(form,type='image/jpeg',size=3){const input=form.querySelector('[aria-label="Upload service photo"]');const file=new w.File(['pic'],'photo.jpg',{type});Object.defineProperty(file,'size',{value:size});Object.defineProperty(input,'files',{value:[file],configurable:true});await input.onchange();}
form=open();await upload(form);assert.equal(signedRequest.collection,'services');assert.equal(bucket,'service-photos');assert.match(form.querySelector('[name=image_url]').value,/service-photos/);assert(!form.querySelector('[type=submit]').disabled);await form.onsubmit({preventDefault(){}});assert.equal(saved.id,existing.id);assert.match(saved.image_url,/service-photos/);await tick();
form=open();fail=true;await upload(form);assert.equal(form.querySelector('[name=image_url]').value,existing.image_url);assert.match(form.querySelector('.upload-status').textContent,/kept/);const count=uploadCount;await upload(form,'image/svg+xml');await upload(form,'image/jpeg',10485761);assert.equal(uploadCount,count);form.querySelector('.close-editor').click();fail=false;
// Uploading then cancelling never changes the stored service.
form=open();saved=null;await upload(form);form.querySelector('.close-editor').click();assert.equal(saved,null);
w.document.querySelector('#add-record').click();form=w.document.querySelector('#editor');assert(form.querySelector('.service-photo-preview').hidden);form.querySelector('[name=name]').value='New service';await upload(form);await form.onsubmit({preventDefault(){}});assert.equal(saved.name,'New service');assert.match(saved.image_url,/service-photos/);assert.equal(saved.id,undefined);d.window.close();
// Real public renderer preserves original photo and uses replacement on both public pages.
for(const name of ['index','services']){const page=new JSDOM(fs.readFileSync(name+'.html','utf8'),{url:'https://unitedsaconstruction.com/'+name,runScripts:'outside-only'});let service={...existing};page.window.fetch=async url=>({ok:true,json:async()=>({items:url.endsWith('services')?[service]:[]})});const code=fs.readFileSync('assets/site-data.js','utf8');page.window.eval(code);await tick();assert.equal(page.window.document.querySelector('#cards img').src,existing.image_url);service={...service,image_url:'https://example.com/replacement.jpg'};page.window.eval(code);await tick();assert.equal(page.window.document.querySelector('#cards img').src,service.image_url);page.window.close();}
let allowed=true,selectedBucket;
const query={select(){return this},eq(){return this},maybeSingle:async()=>({data:allowed?{user_id:'owner'}:null})};
const database={
 from:()=>query,
 auth:{getUser:async()=>({data:{user:{id:'owner'}}})},
 storage:{from:name=>{
   selectedBucket=name;
   return {createSignedUploadUrl:async()=>({data:{token:'signed'}}),getPublicUrl:path=>({data:{publicUrl:'https://example.com/'+path}})};
 }}
};
const context={exports:{},process:{env:{SUPABASE_URL:'url',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'secret'}},require:name=>name==='node:crypto'?require('node:crypto'):{createClient:()=>database}};
vm.runInNewContext(fs.readFileSync('netlify/functions/api.js','utf8'),context);
const event={httpMethod:'POST',headers:{authorization:'Bearer test'},queryStringParameters:{collection:'upload'},body:JSON.stringify({collection:'services',content_type:'image/jpeg',size:100})};assert.equal((await context.exports.handler({...event,headers:{}})).statusCode,401);allowed=false;assert.equal((await context.exports.handler(event)).statusCode,403);allowed=true;let result=await context.exports.handler(event);assert.equal(result.statusCode,200);assert.equal(selectedBucket,'service-photos');assert.equal(JSON.parse(result.body).bucket,'service-photos');
result=await context.exports.handler({...event,body:JSON.stringify({content_type:'image/jpeg',size:100})});assert.equal(result.statusCode,200);assert.equal(selectedBucket,'project-photos');
for(const body of [{collection:'private-secrets',content_type:'image/jpeg',size:100},{collection:'services',content_type:'image/svg+xml',size:100},{collection:'services',content_type:'image/jpeg',size:10485761}])assert.equal((await context.exports.handler({...event,body:JSON.stringify(body)})).statusCode,400);
console.log('Service photos: preserve existing image, signed upload/preview/save, new services, cancel/error/invalid files, public rendering, admin authorization and target isolation passed');
})().catch(e=>{console.error(e);process.exitCode=1});
