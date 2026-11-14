import React,{useEffect,useState} from 'react'
import {MapPin,LockKeyhole,Truck,Send,Trash2,CheckCircle2,Copy,AlertCircle,Loader2} from 'lucide-react'
import {api} from './api'

const categories=['Casa','Oficina','Familiar','Punto de entrega','Otro']
const blank={recipient_name:'',kind:'Casa',address_text:'',notes:''}

export default function Delivery({version,onUpdate,onError}){
 const [state,setState]=useState(null),[form,setForm]=useState(blank),[saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 useEffect(()=>{let active=true;api('delivery_status').then(r=>{if(active){setState(r);setForm(r.own?{recipient_name:r.own.recipient_name,kind:r.own.kind,address_text:r.own.address_text,notes:r.own.notes||''}:blank)}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[version])
 const mutate=async(action,data)=>{setSaving(true);setError('');setMessage('');try{await api(action,data);setMessage(action==='save_delivery_address'?'Dirección guardada':'Dirección eliminada');await onUpdate()}catch(e){setError(e.message);onError?.(e)}finally{setSaving(false)}}
 return <div className="panel delivery-panel"><span className="step">ENTREGA PRIVADA</span><h2><MapPin size={22}/> Mi dirección de entrega</h2><p>Registra tu casa, oficina, domicilio alternativo o punto de paquetería. La dirección es opcional y solo podrá verla quien te regala, después del sorteo.</p>
 {state?.needs_address&&<div className="delivery-request-notice" role="status"><AlertCircle size={21}/><div><b>Tu amigo secreto necesita tu dirección</b><small>Te pidió un destino para enviar tu regalo. No se revela quién hizo la solicitud.</small></div></div>}
 {error&&<div className="error" role="alert">{error}</div>}{message&&<div className="notice" role="status"><CheckCircle2 size={18}/>{message}</div>}
 {!state&&!error?<p>Cargando tus datos privados...</p>:<div className="delivery-form">
 <label>Nombre de quien recibe<input maxLength={100} value={form.recipient_name} onChange={e=>setForm({...form,recipient_name:e.target.value})} placeholder="Nombre para el envío"/></label>
 <label>Tipo de dirección<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}>{categories.map(x=><option key={x}>{x}</option>)}</select></label>
 <label>Dirección completa<textarea rows={4} maxLength={1000} value={form.address_text} onChange={e=>setForm({...form,address_text:e.target.value})} placeholder="Calle, número, colonia, CP, ciudad, estado, país o datos del punto de entrega"/></label>
 <label>Referencias adicionales (opcional)<textarea rows={2} maxLength={300} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Indicaciones para la paquetería"/></label>
 <div className="delivery-actions"><button className="primary" disabled={saving||!form.recipient_name.trim()||form.address_text.trim().length<10} onClick={()=>mutate('save_delivery_address',form)}>{saving?<Loader2 className="spin" size={17}/>:<MapPin size={17}/>} Guardar dirección</button>{state?.own&&<button className="secondary" disabled={saving} onClick={()=>{if(window.confirm('¿Eliminar tu dirección de entrega? La persona que te regala dejará de verla.'))mutate('delete_delivery_address')}}><Trash2 size={16}/> Eliminar dirección</button>}</div>
 <small className="delivery-hint"><LockKeyhole size={15}/> Esta dirección nunca aparece en El Muro ni en el panel del organizador. Puedes editarla incluso después del cierre de deseos.</small>
 </div>}
 </div>
}

export function DeliveryRecipient({refresh,onError}){
 const [state,setState]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 useEffect(()=>{let active=true;api('delivery_status').then(x=>{if(active)setState(x)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[])
 const ask=async()=>{setBusy(true);setError('');try{await api('request_delivery_address');setNotice('Solicitud anónima enviada. Tu amigo secreto verá el aviso al abrir la aplicación.')}catch(e){setError(e.message);onError?.(e)}finally{setBusy(false)}}
 const copy=async()=>{const a=state?.target?.address;if(!a)return;try{await navigator.clipboard.writeText([a.recipient_name,a.address_text,a.notes].filter(Boolean).join('\n'));setNotice('Dirección copiada')}catch{setError('No se pudo copiar automáticamente')}}
 if(!state?.target)return null
 const a=state.target.address
 return <div className="delivery-recipient"><h3><Truck size={20}/> Entrega del regalo</h3>{a?<><p>Dirección compartida por {state.target.name}, visible únicamente para ti.</p><div className="delivery-address"><b>{a.recipient_name}</b><span>{a.kind}</span><span className="delivery-pre">{a.address_text}</span>{a.notes&&<small>{a.notes}</small>}</div><button className="secondary" onClick={copy}><Copy size={16}/> Copiar dirección</button></>:<><p>{state.target.name} todavía no registra una dirección. Si vas a enviar el regalo, puedes solicitarla anónimamente. Si lo entregarás en persona, no necesitas hacerlo.</p><button className="secondary" disabled={busy||!!notice} onClick={ask}><Send size={16}/> Solicitar dirección anónimamente</button></>}{error&&<p className="delivery-error" role="alert">{error}</p>}{notice&&<p className="delivery-success" role="status">{notice}</p>}</div>
}
