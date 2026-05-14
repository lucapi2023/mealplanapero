import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  console.error('Supabase env vars missing:', { url: !!supabaseUrl, key: !!supabaseAnonKey })
}

export const supabase = createClient(
  supabaseUrl || 'https://oghvlybiodahacdlcxyg.supabase.co',
  supabaseAnonKey || 'sb_publishable__4hZvrkyxAJ2-bVqw6nVWQ_nT5izI1R'
)
