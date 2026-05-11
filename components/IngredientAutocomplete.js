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

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!query || query.length < 1) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('ingredients')
        .select('name')
        .ilike('name', `%${query}%`)
        .eq('household_id', household.id)
        .limit(5)
      if (data) {
        setSuggestions(data.map((d) => d.name))
        setIsOpen(true)
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [query, user.id])

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
        }}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        placeholder={placeholder || 'Ingredient name'}
        className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border rounded-b shadow-lg max-h-36 overflow-y-auto">
          {suggestions.map((name, i) => (
            <li
              key={i}
              className="px-2 py-1 text-sm cursor-pointer hover:bg-blue-50"
              onMouseDown={() => {
                setQuery(name)
                onChange(name)
                setIsOpen(false)
              }}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
