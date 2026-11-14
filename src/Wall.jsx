import React, {useEffect,useMemo,useState} from 'react'
import {Gift,Users,Activity,Search,ExternalLink,ArrowLeft,ChevronDown,RefreshCw} from 'lucide-react'
import {api} from './api'

function Picture({src,name}){
 const [broken,setBroken]=useState(false)
 useEffect(()=>setBroken(false),[src])
 return <div className="wall-photo">{src&&!broken?<img src={src} alt={name} referrerPolicy="no-referrer" loading="lazy" onError={()=>setBroken(true)}/>:<Gift size={27}/>}</div>
}
const when=(s)=>new Date(s).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'})
export default function Wall({version,me}){
 const [view,setView]=useState('activity'),[data,setData]=useState(null),[events,setEvents]=useState([]),[offset,setOffset]=useState(0),[more,setMore]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[person,setPerson]=useState(''),[search,setSearch]=useState(''),[filter,setFilter]=useState('all')
 const load=async(reset=false)=>{setLoading(true);setError('');try{const result=await api('wall',{offset:reset?0:offset});setData(result);setEvents(prev=>reset?result.events:[...prev,...result.events]);setOffset(result.next_offset);setMore(result.has_more)}catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{load(true)},[version])
 const people=data?.participants||[],wishes=data?.wishes||[]
 const byId=Object.fromEntries(people.map(p=>[p.id,p]))
 const available=useMemo(()=>wishes.filter(w=>(filter==='all'||w.participant_id===filter)&&`${w.name} ${w.notes||''} ${byId[w.participant_id]?.name||''}`.toLowerCase().includes(search.toLowerCase())),[wishes,filter,search,data])
 const selected=people.find(p=>p.id===person)
 const grouped=useMemo(()=>{const valid=events.filter(e=>e.kind==='joined'||wishes.some(w=>w.id===e.wish_id));const out=[];for(const e of valid){const last=out[out.length-1];if(last&&e.kind==='wish_added'&&last.kind==='wish_added'&&last.participant_id===e.participant_id&&Math.abs(new Date(last.created_at)-new Date(e.created_at))<5*60000){last.entries.push(e);continue}out.push({...e,entries:[e]})}return out},[events,wishes])
 const card=(w)=> <div className="wall-wish" key={w.id}><Picture src={w.image_url} name={w.name}/><div className="wall-wish-details"><b>{w.name}</b>{w.notes&&<p>{w.notes}</p>}{w.url&&<a href={w.url} target="_blank" rel="noopener noreferrer">Ver producto <ExternalLink size={13}/></a>}</div></div>
 return <section className="wall-main panel"><div className="panel-heading"><span className="step">EL MURO DEL INTERCAMBIO</span><h2>El Muro <Users size={21}/></h2><p>Descubre las ideas y novedades de tu grupo. Las asignaciones del sorteo son privadas.</p></div>
 {error&&<div className="error" role="alert">{error}</div>}
 {person?<><button className="secondary wall-back" onClick={()=>setPerson('')}><ArrowLeft size={16}/> Volver al muro</button><h3>Lista de {selected?.name||'participante'}</h3><p>{wishes.filter(w=>w.participant_id===person).length} deseos</p><div className="wall-wish-list">{wishes.filter(w=>w.participant_id===person).map(card)}{!wishes.some(w=>w.participant_id===person)&&<p className="wall-empty">Sin deseos todavía.</p>}</div></>:<>
 <div className="wall-tabs" role="tablist" aria-label="Secciones del muro">{[['activity','Actividad',Activity],['wishes','Deseos',Gift],['people','Participantes',Users]].map(([id,label,Icon])=><button key={id} role="tab" aria-selected={view===id} className={view===id?'selected':''} onClick={()=>setView(id)}><Icon size={16}/>{label}</button>)}</div>
 {view==='activity'&&<><div className="wall-section-title"><h3>Actividad reciente</h3><button onClick={()=>load(true)} className="secondary" disabled={loading}><RefreshCw size={14}/> Actualizar</button></div>{grouped.map(ev=>{const p=byId[ev.participant_id],related=ev.entries.map(x=>wishes.find(w=>w.id===x.wish_id)).filter(Boolean);return <article className="wall-event" key={ev.id}><div className="wall-event-heading"><div className="wall-avatar">{(p?.name||'?')[0]}</div><div><b>{p?.name||'Participante'} {ev.kind==='joined'?'se unió':ev.kind==='wish_updated'?'actualizó su lista':ev.entries.length>1?`agregó ${ev.entries.length} deseos`:'agregó un deseo'}</b><small>{when(ev.created_at)}</small></div></div>{related.length>0&&<div className="wall-related">{related.slice(0,3).map(card)}{related.length>3&&<small>Y {related.length-3} deseos más.</small>}</div>}{p&&<button className="wall-text-link" onClick={()=>setPerson(p.id)}>Ver lista de {p.name}</button>}</article>})}{!loading&&!grouped.length&&<p className="wall-empty">Todavía no hay actividad.</p>}{more&&<button className="secondary wall-more" onClick={()=>load(false)} disabled={loading}><ChevronDown size={16}/>{loading?'Cargando...':'Ver más'}</button>}</>}
 {view==='wishes'&&<><div className="wall-filters"><label className="wall-search"><Search size={17}/><input aria-label="Buscar deseos" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar regalos o personas"/></label><select aria-label="Filtrar por participante" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos los participantes</option>{people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div><small className="wall-counter">{available.length} deseos</small><div className="wall-catalog">{available.map(w=><div className="wall-catalog-card" key={w.id}>{card(w)}<button className="wall-text-link" onClick={()=>setPerson(w.participant_id)}>De {byId[w.participant_id]?.name||'participante'} →</button></div>)}</div>{available.length===0&&<p className="wall-empty">No hay deseos que coincidan.</p>}</>}
 {view==='people'&&<div className="wall-people">{people.map(p=><button className="wall-person" key={p.id} onClick={()=>setPerson(p.id)}><div className="wall-avatar">{p.name[0]}</div><b>{p.name}{p.id===me.id?' (tú)':''}</b><small>{p.wish_count?`${p.wish_count} deseos`:'Sin deseos'}</small></button>)}</div>}
 </>}
 </section>
}
