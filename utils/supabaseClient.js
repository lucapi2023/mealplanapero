import { createClient } from '@supabase/supabase-js'

let _client = null

function getClient() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      if (typeof window === 'undefined') {
        return null
      }
      throw new Error('Supabase URL and Anon Key are required.')
    }
    _client = createClient(url, key)
  }
  return _client
}

export const supabase = new Proxy({}, {
  get(_, prop) {
    const client = getClient()
    if (!client) {
      return (...args) => {
        if (typeof window !== 'undefined') {
          throw new Error('Supabase client not initialized.')
        }
      }
    }
    const value = client[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
  set(_, prop, value) {
    const client = getClient()
    if (client) client[prop] = value
    return true
  }
})
