import React, {useEffect,useState} from 'react'
import {api} from './api'
import {Gift, Send, Mail, PackageCheck, LockKeyhole, CheckCircle, Clock, AlertCircle} from 'lucide-react'

export default function GiftTasks({drawn, participates, version=0}){
  const [state,setState]=useState(null)
  const [draft,setDraft]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [confirm,setConfirm]=useState('')
  const [notice,setNotice]=useState('')
  const load=async()=>{
    if(!drawn||!participates)return
    const result=await api('gift_status')
    setState(result)
    setDraft(result.outgoing?.message||'')
  }
  useEffect(()=>{let active=true;if(drawn&&participates){api('gift_status').then(result=>{if(active){setState(result);setDraft(result.outgoing?.message||'')}}).catch(e=>{if(active)setError(e.message)})}return()=>{active=false}},[drawn,participates,version])
  const run=async(action,data={})=>{setBusy(true);setError('');setNotice('');try{await api(action,data);await load();setConfirm('');setNotice(action==='gift_save_message'?'Mensaje guardado':action==='gift_mark_sent'?'Envío confirmado':'Recepción confirmada')}catch(e){setError(e.message)}finally{setBusy(false)}}
  if(!participates)return null
  if(!drawn)return <section className="panel gift-tasks"><h2>Mis tareas</h2><p><LockKeyhole size={17}/> Las tareas de entrega estarán disponibles después del sorteo.</p></section>
  const outgoing=state?.outgoing||{}
  const incoming=state?.incoming||{}
  const written=!!outgoing.message
  const sent=!!outgoing.sent_at
  const received=!!incoming.received_at
  const locked=!!outgoing.received_at&&written
  const count=Number(written)+Number(sent)+Number(received)
  return <section className="panel gift-tasks" aria-labelledby="gift-tasks-title">
    <div className="gift-tasks-heading"><div><span className="step">UN REGALO, UNAS PALABRAS</span><h2 id="gift-tasks-title">Mis tareas</h2><p>Escribe tu mensaje, registra tu entrega y confirma cuando recibas tu regalo.</p></div><strong>{count}/3</strong></div>
    <div className="gift-tasks-progress" role="progressbar" aria-valuenow={count} aria-valuemin={0} aria-valuemax={3} aria-label="Tareas completadas"><div style={{width:`${count/3*100}%`}}/></div>
    {error&&<p className="gift-task-error" role="alert"><AlertCircle size={16}/>{error}</p>}
    {notice&&<p className="gift-task-ok" role="status"><CheckCircle size={16}/>{notice}</p>}
    {!state?<p>Cargando tareas...</p>:<>
      <article className="gift-task-card">
        <h3>{written?<CheckCircle size={19}/>:<Mail size={19}/>} 1. Mensaje obligatorio {written?'· Guardado':'· Pendiente'}</h3>
        <p>Un mensaje de 30 a 1,000 caracteres para la persona que te tocó. Lo leerá cuando confirme la recepción.</p>
        <label htmlFor="gift-message">Tu mensaje privado</label>
        <textarea id="gift-message" rows="5" maxLength={1000} value={draft} disabled={locked||busy} placeholder="Escríbele unas palabras personales..." onChange={e=>setDraft(e.target.value)}/>
        <div className="gift-task-row"><small>{draft.trim().length}/1000 caracteres · mínimo 30</small>{locked&&<small><LockKeyhole size={14}/> Mensaje revelado: edición cerrada</small>}</div>
        {!locked&&<button className="primary" disabled={busy||draft.trim().length<30||draft.trim().length>1000||draft.trim()===outgoing.message} onClick={()=>run('gift_save_message',{message:draft})}>Guardar mensaje</button>}
      </article>
      <article className="gift-task-card">
        <h3>{sent?<CheckCircle size={19}/>:<Send size={19}/>} 2. Marcar mi regalo como enviado {sent?'· Completado':'· Pendiente'}</h3>
        <p>Úsalo también si entregaste tu regalo personalmente. No muestra tu identidad a quien lo recibe.</p>
        {sent?<p className="gift-task-ok"><CheckCircle size={16}/> Envío confirmado</p>:confirm==='sent'?<div className="gift-task-confirm"><b>¿Confirmas que ya enviaste o entregaste tu regalo?</b><div className="gift-task-row"><button className="primary" disabled={busy} onClick={()=>run('gift_mark_sent')}>Sí, confirmar envío</button><button className="secondary" disabled={busy} onClick={()=>setConfirm('')}>Cancelar</button></div></div>:<button className="secondary" disabled={busy} onClick={()=>setConfirm('sent')}>Ya envié mi regalo</button>}
      </article>
      <article className="gift-task-card">
        <h3>{received?<CheckCircle size={19}/>:<PackageCheck size={19}/>} 3. Confirmar que recibí mi regalo {received?'· Completado':'· Pendiente'}</h3>
        <p>Confirma únicamente cuando lo tengas contigo. Esta acción es irreversible y desbloquea el mensaje que te escribieron.</p>
        {!received&&(confirm==='received'?<div className="gift-task-confirm"><b>¿Confirmas que ya recibiste tu regalo?</b><p>Una vez confirmado no podrás deshacer la recepción.</p><div className="gift-task-row"><button className="primary" disabled={busy} onClick={()=>run('gift_confirm_received')}>Sí, confirmo la recepción</button><button className="secondary" disabled={busy} onClick={()=>setConfirm('')}>Cancelar</button></div></div>:<button className="secondary" disabled={busy} onClick={()=>setConfirm('received')}>Ya recibí mi regalo</button>)}
        {received&&(incoming.message?<div className="gift-message-revealed"><h3><Mail size={20}/> ¡Tienes un mensaje especial!</h3><p>{incoming.message}</p><small>— Tu amigo secreto</small></div>:<div className="gift-task-confirm"><Clock size={18}/> Tu amigo secreto aún no escribe su mensaje. Aparecerá aquí cuando lo guarde.</div>)}
        {!received&&incoming.sent_at&&<div className="gift-task-info"><Gift size={17}/> Tu regalo fue marcado como enviado, pero aún puedes esperar a recibirlo.</div>}
      </article>
    </>}
  </section>
}

export function GiftAdminProgress({drawn,version=0}){
  const [summary,setSummary]=useState(null)
  useEffect(()=>{let active=true;if(drawn){api('gift_status').then(x=>{if(active)setSummary(x.admin||null)}).catch(()=>{})}return()=>{active=false}},[drawn,version])
  if(!drawn)return null
  return <div className="gift-admin-progress"><h3>Progreso de regalos y mensajes</h3>{summary?<><p><b>{summary.messages_written} / {summary.total}</b> mensajes escritos · <b>{summary.sent}</b> enviados · <b>{summary.received}</b> recibidos</p>{summary.pending_names?.length>0&&<p className="fine">Pendientes de mensaje: {summary.pending_names.join(', ')}</p>}<small>No se muestran mensajes, destinatarios ni asignaciones.</small></>:<p className="fine">Consulta los avances desde el panel del organizador.</p>}</div>
}
