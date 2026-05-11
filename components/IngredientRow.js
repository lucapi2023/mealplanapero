'use client'

import IngredientAutocomplete from './IngredientAutocomplete'

const UNITS = ['g', 'ml', 'cup', 'tbsp', 'tsp', 'piece', 'clove', 'oz', 'lb', 'l', 'kg', 'can', 'pinch']

export default function IngredientRow({ ingredient, index, onChange, onRemove }) {
  return (
    <div className="flex gap-2 items-start mb-2">
      <div className="flex-1">
        <IngredientAutocomplete value={ingredient.name} onChange={val => onChange(index, 'name', val)} placeholder="Ingredient" />
      </div>
      <div className="w-20">
        <input type="number" step="any" min="0" value={ingredient.amount}
          onChange={e => onChange(index, 'amount', parseFloat(e.target.value) || 0)}
          placeholder="Qty" className="input-field" />
      </div>
      <div className="w-20">
        <select value={ingredient.unit} onChange={e => onChange(index, 'unit', e.target.value)} className="select-field">
          <option value="">Unit</option>
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <button type="button" onClick={() => onRemove(index)}
        className="text-sm px-1.5 py-1.5 hover:opacity-80 transition-opacity" style={{ color: '#FCA5A5' }} title="Remove ingredient">
        ✕
      </button>
    </div>
  )
}
