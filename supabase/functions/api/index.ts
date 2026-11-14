import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const DB_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BOOTSTRAP_KEY = Deno.env.get('ADMIN_SETUP_SECRET') || ''
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || ''
const db = createClient(DB_URL, SERVICE_KEY, {auth:{persistSession:false}})
const json=(x:unknown,status=200,origin='')=>new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json', 'Access-Control-Allow-Origin':origin,'Vary':'Origin','Cache-Control':'no-store'}})
const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('')
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('')
const required=(ok:boolean,message:string)=>{if(!ok)throw new Error(message)}
const failDb=({error}:{error:unknown})=>{if(error)throw error}
const clean=(value:unknown,len:number)=>String(value??'').trim().slice(0,len)
const validUrl=(value:string)=>!value||(/^https?:\/\//i.test(value)&&value.length<=2000)
const localDay=(timezone:string)=>{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date())
 const get=(t:string)=>parts.find(p=>p.type===t)?.value||''
 return `${get('year')}-${get('month')}-${get('day')}`
}
const deadlineOpen=(ex:any)=>{
 if(!ex.wish_deadline)return true
 return localDay(ex.exchange_timezone||'America/Mexico_City')<=ex.wish_deadline
}
const safeProductHost=(host:string)=>{
 const known=['amazon.com.mx','amazon.com','mercadolibre.com.mx','mercadolibre.com','lego.com','walmart.com.mx','liverpool.com.mx','costco.com.mx','sears.com.mx','sanborns.com.mx','elpalaciodehierro.com']
 return known.some(h=>host===h||host.endsWith('.'+h))
}
const safeProductUrl=(value:string)=>{
 try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&safeProductHost(u.hostname.toLowerCase())}catch{return false}
}
const unescapeHtml=(s:string)=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&#x27;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')
const meta=(html:string,key:string)=>{
 for(const m of html.matchAll(/<meta\b[^>]*>/gi)){
   const tag=m[0], attrs:Record<string,string>={}
   for(const a of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[a[1].toLowerCase()]=unescapeHtml(a[2]??a[3]??'')
   if(attrs.property===key||attrs.name===key)return attrs.content||''
 }
 return ''
}
async function productPreview(link:string){
 if(!safeProductUrl(link))return {title:'',image_url:null,found:false,reason:'Tienda no compatible para la vista previa automática'}
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),4500)
 try{
  const r=await fetch(link,{redirect:'manual',signal:ctrl.signal,headers:{'Accept':'text/html','User-Agent':'Mozilla/5.0 (compatible; A-Mi-Me-Toco/0.7; metadata preview)'}})
  if(!r.ok||!(r.headers.get('content-type')||'').includes('text/html'))return {title:'',image_url:null,found:false}
  const contentLength=Number(r.headers.get('content-length')||0)
  if(contentLength>512000)return {title:'',image_url:null,found:false}
  const reader=r.body?.getReader();if(!reader)return {title:'',image_url:null,found:false}
  let total=0,parts:Uint8Array[]=[]
  try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>512000)break;parts.push(value)}}finally{await reader.cancel().catch(()=>{})}
  const bytes=new Uint8Array(total>512000?512000:total);let cursor=0;for(const part of parts){const remaining=bytes.length-cursor;if(remaining<=0)break;bytes.set(part.subarray(0,remaining),cursor);cursor+=Math.min(part.length,remaining)}
  const html=new TextDecoder().decode(bytes)
  const title=clean(meta(html,'og:title')||meta(html,'twitter:title'),120)
  let image_url:string|null=null
  try{const possible=new URL(meta(html,'og:image')||meta(html,'twitter:image'),link);if(possible.protocol==='https:'&&!possible.username&&!possible.password)image_url=possible.toString().slice(0,2000)}catch{}
  return {title,image_url,found:!!(title||image_url)}
 }catch{return {title:'',image_url:null,found:false}}finally{clearTimeout(timeout)}
}
const shuffle=<T>(arr:T[]):T[]=>{for(let i=arr.length-1;i>0;i--){const n=new Uint32Array(1);crypto.getRandomValues(n);const j=n[0]%(i+1);[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
function match(ids:string[],blocked:Set<string>){
 const options=ids.map(giver=>({giver,candidates:shuffle(ids.filter(receiver=>receiver!==giver&&!blocked.has(`${giver}|${receiver}`)))}))
 options.sort((a,b)=>a.candidates.length-b.candidates.length)
 const assigned=new Set<string>(), result: {giver:string,receiver:string}[]=[]
 const dfs=(i:number):boolean=>{if(i===options.length)return true;for(const receiver of options[i].candidates){if(assigned.has(receiver))continue;assigned.add(receiver);result.push({giver:options[i].giver,receiver});if(dfs(i+1))return true;result.pop();assigned.delete(receiver)}return false}
 return dfs(0)?result:null
}
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin')||''
 const allowed=ALLOWED_ORIGIN.split(',').map(x=>x.trim()).filter(Boolean)
 const corsOrigin=allowed.includes(origin)?origin:''
 if(req.method==='OPTIONS')return new Response(null,{status:corsOrigin?204:403,headers:{'Access-Control-Allow-Origin':corsOrigin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'}})
 if(req.method!=='POST'||(origin&&!corsOrigin))return json({error:'Acceso denegado'},403,corsOrigin)
 try {
   const {action,data={},token=''}=await req.json()
   if(action==='bootstrap'){
     required(!!BOOTSTRAP_KEY&&clean(data.setup_key,200)===BOOTSTRAP_KEY,'Clave de instalación inválida')
     const {count,error:countError}=await db.from('exchanges').select('*',{count:'exact',head:true});failDb({error:countError})
     required(count===0,'Ya existe un intercambio; la instalación inicial está cerrada')
     const organizerName=clean(data.organizer_name,75),participates=data.participates!==false
     required(organizerName.length>0,'Escribe el nombre del organizador')
     const title=clean(data.title,120),budget=Number(data.budget),event_date=clean(data.event_date,10),join_deadline=clean(data.join_deadline,10)
     required(!!title&&Number.isFinite(budget)&&budget>=0,'Datos del intercambio incorrectos')
     const code=randomToken(),session=randomToken()
     const {data:ex,error:exError}=await db.from('exchanges').insert({title,budget,event_date,join_deadline,wish_deadline:event_date||null,invite_code:code}).select('id').single();failDb({error:exError})
     const r=await db.from('participants').insert({exchange_id:ex.id,name:organizerName,is_admin:true,participates,token_hash:await hash(session)});failDb(r)
     return json({token:session},200,corsOrigin)
   }
   if(action==='invite_preview'){
     const code=clean(data.code,128)
     if(!/^[0-9a-f]{64}$/i.test(code))return json({exchange:null},200,corsOrigin)
     const {data:exchange,error}=await db.from('exchanges').select('title,budget,event_date,join_deadline,drawn').eq('invite_code',code).maybeSingle()
     failDb({error})
     // No participant identities, invitation code or assignments are returned.
     return json({exchange:exchange?{title:exchange.title,budget:exchange.budget,event_date:exchange.event_date}:null},200,corsOrigin)
   }
   if(action==='join'){
     const code=clean(data.code,128), name=clean(data.name,75)
     required(code.length>=32&&name.length>0,'Introduce un nombre y un código de invitación válidos')
     const {data:ex,error}=await db.from('exchanges').select('*').eq('invite_code',code).single();failDb({error})
     required(!ex.drawn,'El sorteo ya se realizó')
     required(!ex.join_deadline||new Date(ex.join_deadline+'T23:59:59Z')>=new Date(),'La inscripción está cerrada')
     const session=randomToken();const {error:joinError}=await db.from('participants').insert({exchange_id:ex.id,name,token_hash:await hash(session)})
     if(joinError){if(joinError.code==='23505')throw new Error('Este nombre ya está registrado. Usa un nombre diferente.');throw joinError}
     return json({token:session},200,corsOrigin)
   }
   required(typeof token==='string'&&/^[0-9a-f]{64}$/.test(token),'Tu enlace de acceso ya no es válido')
   const {data:me,error:meError}=await db.from('participants').select('*').eq('token_hash',await hash(token)).single();failDb({error:meError})
   const exId=me.exchange_id
   const {data:ex,error:exError}=await db.from('exchanges').select('id,title,budget,event_date,join_deadline,invite_code,drawn,wish_deadline,exchange_timezone').eq('id',exId).single();failDb({error:exError})
   if(action==='dashboard'){
     const {data:people,error:pError}=await db.from('participants').select('id,name,is_admin,participates,created_at').eq('exchange_id',exId).order('created_at');failDb({error:pError})
     const ids=people.map(p=>p.id)
     const {data:allWishes,error:wError}=await db.from('wishes').select('*').in('participant_id',ids);failDb({error:wError})
     const myWishes=allWishes.filter(w=>w.participant_id===me.id)
     let assignment=null
     if(ex.drawn&&me.participates){
       const {data:a,error:aError}=await db.from('assignments').select('receiver').eq('giver',me.id).single();failDb({error:aError})
       const target=people.find(p=>p.id===a.receiver)
       assignment={name:target?.name,wishes:allWishes.filter(w=>w.participant_id===a.receiver)}
     }
     const participants=people.map((p,i)=>({id:p.id,name:p.name,is_admin:p.is_admin,participates:p.participates,number:i+1,wish_count:allWishes.filter(w=>w.participant_id===p.id).length}))
     const outEx=me.is_admin?ex:{...ex,invite_code:undefined}
     let exclusions=[]
     if(me.is_admin){const {data,error}=await db.from('exclusions').select('*').eq('exchange_id',exId);failDb({error});exclusions=data}
     return json({wish_edit_open:deadlineOpen(ex),me:{id:me.id,name:me.name,is_admin:me.is_admin,participates:me.participates,number:participants.find(p=>p.id===me.id)?.number},exchange:outEx,participants,wishes:myWishes,assignment,exclusions},200,corsOrigin)
   }
   if(action==='update_organizer_name'){
     required(me.is_admin,'Solo el organizador puede cambiar su nombre')
     const name=clean(data.name,75)
     required(name.length>0,'Escribe un nombre válido')
     const {error}=await db.from('participants').update({name}).eq('id',me.id).eq('exchange_id',exId)
     if(error){if(error.code==='23505')throw new Error('Ya hay un corredor con ese nombre');throw error}
     return json({ok:true},200,corsOrigin)
   }
   if(action==='set_organizer_participation'){
     required(me.is_admin,'Solo el organizador puede modificar esta opción')
     required(!ex.drawn,'No puedes cambiar tu participación después del sorteo')
     required(typeof data.participates==='boolean','Selección inválida')
     failDb(await db.from('participants').update({participates:data.participates}).eq('id',me.id).eq('exchange_id',exId))
     return json({ok:true},200,corsOrigin)
   }
   if(action==='wall'){
     const offset=Math.max(0,Math.min(1000,Number(data.offset)||0))
     const {data:people,error:pError}=await db.from('participants').select('id,name,is_admin,participates').eq('exchange_id',exId).order('name');failDb({error:pError})
     const ids=people.map(p=>p.id)
     const {data:allWishes,error:wError}=ids.length?await db.from('wishes').select('id,participant_id,name,url,notes,image_url,created_at').in('participant_id',ids).order('created_at',{ascending:false}).limit(1000):{data:[],error:null};failDb({error:wError})
     const {data:events,error:eError}=await db.from('wall_events').select('id,participant_id,wish_id,kind,created_at').eq('exchange_id',exId).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+10);failDb({error:eError})
     return json({participants:people.map(p=>({...p,wish_count:allWishes.filter(w=>w.participant_id===p.id).length})),wishes:allWishes,events:events.slice(0,10),has_more:events.length>10,next_offset:offset+10},200,corsOrigin)
   }
   if(action==='preview_product'){
     const url=clean(data.url,2000)
     required(validUrl(url)&&!!url,'Enlace inválido')
     return json(await productPreview(url),200,corsOrigin)
   }
   if(action==='set_wish_deadline'){
     required(me.is_admin,'Solo el organizador puede definir el cierre de listas')
     const deadline=clean(data.date,10)
     required(/^\d{4}-\d{2}-\d{2}$/.test(deadline)&&!Number.isNaN(Date.parse(deadline)),'Fecha no válida')
     required(!ex.event_date||deadline<=ex.event_date,'El cierre no puede ser posterior al día del intercambio')
     required(deadline>=localDay(ex.exchange_timezone||'America/Mexico_City'),'Elige una fecha de hoy o posterior')
     failDb(await db.from('exchanges').update({wish_deadline:deadline}).eq('id',exId))
     return json({ok:true},200,corsOrigin)
   }
   if(action==='update_wish'){
     required(me.participates,'No participas en el intercambio')
     required(deadlineOpen(ex),'Las listas están cerradas para edición')
     const name=clean(data.name,120),url=clean(data.url,2000),notes=clean(data.notes,300)
     required(!!name&&validUrl(url),'Revisa el nombre y enlace')
     const image_url=url?(await productPreview(url)).image_url:null
     const r=await db.from('wishes').update({name,url:url||null,notes,image_url}).eq('id',clean(data.id,100)).eq('participant_id',me.id).select('id');failDb(r)
     required(r.data?.length===1,'Deseo no encontrado')
     return json({ok:true},200,corsOrigin)
   }
   if(action==='add_wish'){
     required(me.participates,'Activa tu participación para crear una wishlist')
     required(deadlineOpen(ex),'Las listas están cerradas para edición')
     const name=clean(data.name,120),url=clean(data.url,2000),notes=clean(data.notes,300)
     required(!!name&&validUrl(url),'Revisa el nombre y enlace')
     const image_url=url?(await productPreview(url)).image_url:null
     const r=await db.from('wishes').insert({participant_id:me.id,name,url:url||null,notes,image_url});failDb(r)
     return json({ok:true},200,corsOrigin)
   }
   if(action==='delete_wish'){
     required(deadlineOpen(ex),'Las listas están cerradas para edición')
     const r=await db.from('wishes').delete().eq('id',clean(data.id,100)).eq('participant_id',me.id);failDb(r)
     return json({ok:true},200,corsOrigin)
   }
   required(me.is_admin,'Solo el organizador puede hacer esto')
   required(!ex.drawn,'El sorteo ya está cerrado')
   if(action==='add_exclusion'||action==='remove_exclusion'){
     if(action==='remove_exclusion')failDb(await db.from('exclusions').delete().eq('id',clean(data.id,100)).eq('exchange_id',exId))
     else {
       const [a,b]=[clean(data.a,100),clean(data.b,100)].sort()
       required(a!==b,'Selecciona dos personas distintas')
       const {data:people,error}=await db.from('participants').select('id').eq('exchange_id',exId).in('id',[a,b]);failDb({error})
       required(people.length===2,'Participantes inválidos')
       failDb(await db.from('exclusions').insert({exchange_id:exId,a,b}))
     }
     return json({ok:true},200,corsOrigin)
   }
   if(action==='simulate_draw'){
     // Read-only feasibility test. No assignments, no writes, no persistent results.
     const {data:people,error:pError}=await db.from('participants').select('id').eq('exchange_id',exId).eq('participates',true);failDb({error:pError})
     required(people.length>=3&&people.length<=100,'La simulación requiere entre 3 y 100 participantes')
     const {data:excluded,error:eError}=await db.from('exclusions').select('a,b').eq('exchange_id',exId);failDb({error:eError})
     const blocked=new Set<string>();for(const e of excluded){blocked.add(`${e.a}|${e.b}`);blocked.add(`${e.b}|${e.a}`)}
     const pairs=match(shuffle(people.map(p=>p.id)),blocked)
     return json({possible:pairs!==null,participant_count:people.length,exclusion_count:excluded.length,message:pairs?'Existe al menos una asignación válida. No se guardó ni publicó ningún resultado.':'No existe una asignación válida con estas exclusiones. No se modificaron los datos.'},200,corsOrigin)
   }
   if(action==='remove_participant'){
     const participantId=clean(data.id,100)
     required(/^[0-9a-f-]{36}$/i.test(participantId),'Identificador inválido')
     const {data:target,error:targetError}=await db.from('participants').select('id,name,is_admin').eq('id',participantId).eq('exchange_id',exId).single();failDb({error:targetError})
     required(!target.is_admin,'No se puede eliminar al organizador')
     required(clean(data.confirm_name,75)===target.name,'Confirma el nombre exacto del participante')
     const {error}=await db.rpc('remove_participant_before_draw',{p_exchange:exId,p_participant:participantId});failDb({error})
     return json({ok:true},200,corsOrigin)
   }
   if(action==='draw'){
     const {data:people,error:pError}=await db.from('participants').select('id').eq('exchange_id',exId).eq('participates',true);failDb({error:pError})
     required(people.length>=3&&people.length<=100,'Se requieren entre 3 y 100 participantes')
     const {data:excluded,error:eError}=await db.from('exclusions').select('a,b').eq('exchange_id',exId);failDb({error:eError})
     const blocked=new Set<string>();for(const e of excluded){blocked.add(`${e.a}|${e.b}`);blocked.add(`${e.b}|${e.a}`)}
     const pairs=match(shuffle(people.map(p=>p.id)),blocked)
     required(pairs!==null,'No hay un sorteo válido con estas exclusiones; modifica las reglas')
     const {error}=await db.rpc('publish_draw',{p_exchange:exId,p_pairs:pairs});failDb({error})
     return json({ok:true},200,corsOrigin)
   }
   throw new Error('Acción no válida')
 }catch(e){const message=e instanceof Error?e.message:'Error inesperado';console.error('API failure:',message);return json({error:message},400,corsOrigin)}
})
