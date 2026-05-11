'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from './AuthProvider'

export default function IngredientAutocomplete({ value, onChange, placeholder }) {
  const { user, household } = useAuth()
  const [query, setQuery] = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    function handleClickOutside(e) { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false) }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!query || query.length < 1) { setSuggestions([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase.from('ingredients').select('name')
        .ilike('name', `%${query}%`).eq('household_id', household.id).limit(5)
      if (data) { setSuggestions(data.map(d => d.name)); setIsOpen(true) }
    }, 150)
    return () => clearTimeout(timer)
  }, [query, household.id])

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value) }}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        placeholder={placeholder || 'Ingredient name'}
        className="input-field"
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full rounded-b-md shadow-lg max-h-36 overflow-y-auto" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
          {suggestions.map((name, i) => (
            <li key={i} className="px-3 py-2 text-sm cursor-pointer hover:bg-[#252525] transition-colors" style={{ color: '#929292' }}
              onMouseDown={() => { setQuery(name); onChange(name); setIsOpen(false) }}>
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
