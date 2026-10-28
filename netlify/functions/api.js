const { createClient } = require('@supabase/supabase-js');
const URL=process.env.SUPABASE_URL, ANON=process.env.SUPABASE_ANON_KEY, SECRET=process.env.SUPABASE_SERVICE_ROLE_KEY;
const json=(status,data)=>({statusCode:status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'same-origin'},body:JSON.stringify(data)});
const collections=['projects','services','social_links','licenses','brands'];
const fields={projects:['title','description','service','location','image_url','image_urls','completed_on','published','sort_order'],services:['name','description','image_url','show_card','published','sort_order'],social_links:['label','platform','url','published','sort_order'],brands:['name','description','image_url','url','published','sort_order'],licenses:['license_number','license_type','state','holder','expires_on','published','sort_order']};
const clean=(name,data)=>Object.fromEntries(fields[name].filter(k=>Object.hasOwn(data,k)).map(k=>[k,data[k]]));
exports.handler=async(event)=>{
 try {
  if(!URL||!ANON||!SECRET)return json(503,{error:'Backend not configured. Set Supabase environment variables in Netlify.'});
  const db=createClient(URL,SECRET,{auth:{persistSession:false}});
  const method=event.httpMethod;
  const path=(event.path||'').split('/').filter(Boolean);
  const name=event.queryStringParameters?.collection||'';
  if(method==='GET'&&event.queryStringParameters?.public==='1'){
    if(!collections.includes(name))return json(400,{error:'Invalid collection'});
    const {data,error}=await db.from(name).select('*').eq('published',true).order('sort_order',{ascending:true});
    return error?json(500,{error:error.message}):json(200,{items:data});
  }
  if(method==='POST'&&event.queryStringParameters?.submit==='1'){
    const body=JSON.parse(event.body||'{}');
    if(body.website)return json(200,{ok:true}); // honeypot
    const nameValue=String(body.name||'').trim(), email=String(body.email||'').trim(),phone=String(body.phone||'').trim(),message=String(body.message||'').trim();
    if(!nameValue||!message||(!email&&!phone)||[nameValue,email,phone,message].some(x=>x.length>5000))return json(400,{error:'Please enter name, message, and email or phone.'});
    const kind=body.kind==='contact'?'contact':'estimate';
    const {error}=await db.from('leads').insert({kind,name:nameValue,email,phone,service:String(body.service||'').slice(0,200),location:String(body.location||'').slice(0,250),message,status:'new'});
    return error?json(500,{error:'Unable to submit right now.'}):json(200,{ok:true});
  }
  const bearer=(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');
  if(!bearer)return json(401,{error:'Login required'});
  const auth=createClient(URL,ANON,{auth:{persistSession:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(bearer);
  if(authError||!user)return json(401,{error:'Invalid session'});
  const {data:allowed}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!allowed)return json(403,{error:'Not an authorized website administrator'});
  if(method==='GET'&&name==='leads'){
    const {data,error}=await db.from('leads').select('*').order('created_at',{ascending:false}).limit(500);
    return error?json(500,{error:error.message}):json(200,{items:data});
  }
  if(method==='GET'&&collections.includes(name)){
    const {data,error}=await db.from(name).select('*').order('sort_order',{ascending:true});
    return error?json(500,{error:error.message}):json(200,{items:data});
  }
  const body=JSON.parse(event.body||'{}');
  if(name==='upload'&&method==='POST'){
    const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};
    if(!Object.hasOwn(types,body.content_type)||!Number.isInteger(body.size)||body.size<1||body.size>10485760)return json(400,{error:'Choose a JPG, PNG, WebP, or AVIF image up to 10 MB.'});
    const objectPath=user.id+'/'+require('node:crypto').randomUUID()+'.'+types[body.content_type];
    const bucket=db.storage.from('project-photos');
    const {data,error}=await bucket.createSignedUploadUrl(objectPath);
    if(error)return json(500,{error:'Photo upload could not be prepared. Please try again.'});
    const {data:publicData}=bucket.getPublicUrl(objectPath);
    return json(200,{path:objectPath,token:data.token,public_url:publicData.publicUrl});
  }
  if(name==='leads'&&method==='PATCH'){
    if(!body.id||!['new','contacted','quoted','won','lost'].includes(body.status))return json(400,{error:'Invalid status'});
    const {error}=await db.from('leads').update({status:body.status,notes:String(body.notes||'').slice(0,5000)}).eq('id',body.id);
    return error?json(500,{error:error.message}):json(200,{ok:true});
  }
  if(!collections.includes(name))return json(400,{error:'Invalid collection'});
  if(method==='POST'||method==='PATCH'){
    const payload=clean(name,body);
    if(name==='projects'){
      if(payload.completed_on==='')payload.completed_on=null;
      if(payload.completed_on!=null&&!/^\d{4}-\d{2}-\d{2}$/.test(payload.completed_on))return json(400,{error:'Choose a valid completion date.'});
      if(Object.hasOwn(payload,'image_urls')){
        if(!Array.isArray(payload.image_urls)||payload.image_urls.length>30||payload.image_urls.some(url=>typeof url!=='string'||!/^https:\/\//i.test(url)))return json(400,{error:'Add up to 30 photos using secure HTTPS image URLs.'});
        payload.image_urls=[...new Set(payload.image_urls)];payload.image_url=payload.image_urls[0]||'';
      }else if(Object.hasOwn(payload,'image_url'))payload.image_urls=payload.image_url?[payload.image_url]:[];
      if(payload.description!=null&&(typeof payload.description!=='string'||payload.description.length>5000))return json(400,{error:'Keep the project description under 5,000 characters.'});
    }
    if(name==='licenses'&&payload.expires_on==='')payload.expires_on=null;
    for(const key of ['image_url','url']){if(payload[key]&&!/^https:\/\//i.test(payload[key]))return json(400,{error:'Links and images must use https://'});}
    if(name==='social_links'&&payload.platform&&!['custom','facebook','google_maps','google_reviews'].includes(payload.platform))return json(400,{error:'Invalid link placement'});
    if(!Object.keys(payload).length)return json(400,{error:'No valid fields'});
    if(name==='social_links'&&payload.url&&!/^https:\/\//i.test(payload.url))return json(400,{error:'Social links must use https://'});
    if(name==='projects'&&payload.image_url&&!/^https:\/\//i.test(payload.image_url))return json(400,{error:'Project image URL must use https://'});
    const result=method==='POST'?await db.from(name).insert(payload).select().single():await db.from(name).update(payload).eq('id',body.id).select().single();
    return result.error?json(400,{error:result.error.message}):json(200,{item:result.data});
  }
  if(method==='DELETE'){
    const {error}=await db.from(name).delete().eq('id',body.id);
    return error?json(400,{error:error.message}):json(200,{ok:true});
  }
  return json(405,{error:'Method not allowed'});
 }catch(err){return json(500,{error:'Request could not be completed.'});}
};
