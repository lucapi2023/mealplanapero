import { createClient } from '@supabase/supabase-js'

let _client = null

function getClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  return _client
}

export const supabase = new Proxy({}, {
  get(_, prop) {
    const client = getClient()
    const value = client[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
  set(_, prop, value) {
    getClient()[prop] = value
    return true
  }
})
