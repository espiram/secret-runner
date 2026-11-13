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
