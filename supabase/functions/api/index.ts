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
     const title=clean(data.title,120),budget=Number(data.budget),event_date=clean(data.event_date,10),join_deadline=clean(data.join_deadline,10)
     required(!!title&&Number.isFinite(budget)&&budget>=0,'Datos del intercambio incorrectos')
     const code=randomToken(),session=randomToken()
     const {data:ex,error:exError}=await db.from('exchanges').insert({title,budget,event_date,join_deadline,invite_code:code}).select('id').single();failDb({error:exError})
     const r=await db.from('participants').insert({exchange_id:ex.id,name:'Organizador',is_admin:true,token_hash:await hash(session)});failDb(r)
     return json({token:session},200,corsOrigin)
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
   const {data:ex,error:exError}=await db.from('exchanges').select('id,title,budget,event_date,join_deadline,invite_code,drawn').eq('id',exId).single();failDb({error:exError})
   if(action==='dashboard'){
     const {data:people,error:pError}=await db.from('participants').select('id,name,is_admin,created_at').eq('exchange_id',exId).order('created_at');failDb({error:pError})
     const ids=people.map(p=>p.id)
     const {data:allWishes,error:wError}=await db.from('wishes').select('*').in('participant_id',ids);failDb({error:wError})
     const myWishes=allWishes.filter(w=>w.participant_id===me.id)
     let assignment=null
     if(ex.drawn){
       const {data:a,error:aError}=await db.from('assignments').select('receiver').eq('giver',me.id).single();failDb({error:aError})
       const target=people.find(p=>p.id===a.receiver)
       assignment={name:target?.name,wishes:allWishes.filter(w=>w.participant_id===a.receiver)}
     }
     const participants=people.map((p,i)=>({id:p.id,name:p.name,is_admin:p.is_admin,number:i+1,wish_count:allWishes.filter(w=>w.participant_id===p.id).length}))
     const outEx=me.is_admin?ex:{...ex,invite_code:undefined}
     let exclusions=[]
     if(me.is_admin){const {data,error}=await db.from('exclusions').select('*').eq('exchange_id',exId);failDb({error});exclusions=data}
     return json({me:{id:me.id,name:me.name,is_admin:me.is_admin,number:participants.find(p=>p.id===me.id)?.number},exchange:outEx,participants,wishes:myWishes,assignment,exclusions},200,corsOrigin)
   }
   if(action==='add_wish'){
     const name=clean(data.name,120),url=clean(data.url,2000),notes=clean(data.notes,300),price=Number(data.price||0)
     required(!!name&&validUrl(url)&&price>=0&&Number.isFinite(price)&&price<=10000000,'Revisa el nombre, enlace y precio')
     const r=await db.from('wishes').insert({participant_id:me.id,name,url:url||null,price,notes});failDb(r)
     return json({ok:true},200,corsOrigin)
   }
   if(action==='delete_wish'){
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
   if(action==='draw'){
     const {data:people,error:pError}=await db.from('participants').select('id').eq('exchange_id',exId);failDb({error:pError})
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
