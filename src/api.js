const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
export const configured = Boolean(url && anon && !url.includes('YOUR_PROJECT'))
export const getToken = () => localStorage.getItem('secret_runner_token') || ''
export const setToken = token => localStorage.setItem('secret_runner_token',token)
export const clearToken = () => localStorage.removeItem('secret_runner_token')
export async function api(action, data = {}, token = getToken()) {
  if (!configured) throw new Error('Falta configurar Supabase. Revisa el archivo README.md.')
  const response = await fetch(`${url}/functions/v1/api`, {
    method: 'POST', headers: {'Content-Type':'application/json', 'apikey':anon, 'Authorization':`Bearer ${anon}`},
    body: JSON.stringify({action, data, token})
  })
  let payload
  try { payload = await response.json() } catch { throw new Error('El servidor no devolvió una respuesta válida.') }
  if (!response.ok || payload.error) throw new Error(payload.error || `Error HTTP ${response.status}`)
  return payload
}

// Admin sessions are stored only on this device, never in the invite link.
const ADMIN_SESSIONS_KEY = 'a_mi_me_toco_admin_sessions_v09'
export function listAdminSessions(){
  try {const saved=JSON.parse(localStorage.getItem(ADMIN_SESSIONS_KEY)||'[]');return Array.isArray(saved)?saved.filter(x=>/^[0-9a-f]{64}$/.test(x.token)).slice(0,30):[]}catch{return []}
}
export function rememberAdminSession(exchange,token=getToken()){
  if(!exchange?.id||!/^[0-9a-f]{64}$/.test(token))return listAdminSessions()
  const items=listAdminSessions().filter(x=>x.exchangeId!==exchange.id && x.token!==token)
  const updated=[{exchangeId:exchange.id,title:exchange.title||'Intercambio',token},...items].slice(0,30)
  localStorage.setItem(ADMIN_SESSIONS_KEY,JSON.stringify(updated))
  return updated
}
export function forgetAdminSessions(){localStorage.removeItem(ADMIN_SESSIONS_KEY)}
