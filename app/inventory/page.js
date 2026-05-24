'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from '@/components/AuthProvider'
import AuthGuard from '@/components/AuthGuard'
import Layout from '@/components/Layout'
import IngredientAutocomplete from '@/components/IngredientAutocomplete'

const UNITS = ['g', 'ml', 'cup', 'tbsp', 'tsp', 'piece', 'clove', 'oz', 'lb', 'l', 'kg', 'can']

export default function InventoryPage() {
  const { user, household } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', quantity: 0, unit: '' })

  useEffect(() => {
    if (!user) return
    loadInventory()
  }, [user, household])

  const loadInventory = async () => {
    const { data } = await supabase
      .from('inventory')
      .select('id, quantity, unit, ingredients(name, id)')
      .eq('household_id', household.id)
    if (data) setItems(data.map(item => ({
      id: item.id, name: item.ingredients?.name || 'Unknown',
      ingredient_id: item.ingredients?.id, quantity: item.quantity, unit: item.unit,
    })))
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newItem.name.trim() || !newItem.unit) return
    let ingredientId = null
    const { data: existing } = await supabase.from('ingredients').select('id').eq('name', newItem.name.trim()).eq('household_id', household.id).single()
    if (existing) { ingredientId = existing.id }
    else {
      const { data: created } = await supabase.from('ingredients').insert({ name: newItem.name.trim(), user_id: user.id, household_id: household.id }).select('id').single()
      ingredientId = created?.id
    }
    if (!ingredientId) return
    const existingInv = items.find(i => i.ingredient_id === ingredientId && i.unit === newItem.unit)
    if (existingInv) {
      await supabase.from('inventory').update({ quantity: existingInv.quantity + newItem.quantity }).eq('id', existingInv.id)
    } else {
      await supabase.from('inventory').insert({ user_id: user.id, household_id: household.id, ingredient_id: ingredientId, quantity: newItem.quantity, unit: newItem.unit })
    }
    setNewItem({ name: '', quantity: 0, unit: '' }); setAdding(false); loadInventory()
  }

  const handleDelete = async (id) => {
    await supabase.from('inventory').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleUpdateQuantity = async (id, newQty) => {
    await supabase.from('inventory').update({ quantity: newQty }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i))
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#fff' }}>Inventory</h1>
            <p className="text-sm mt-1" style={{ color: '#666' }}>Track what you have in stock</p>
          </div>
          <button onClick={() => setAdding(true)} className="btn-primary">+ Add Item</button>
        </div>

        {adding && (
          <div className="card mb-4">
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#fff' }}>Add Inventory Item</h3>
            <div className="flex gap-2 items-start">
              <div className="flex-1"><IngredientAutocomplete value={newItem.name} onChange={val => setNewItem(p => ({ ...p, name: val }))} placeholder="Ingredient" /></div>
              <div className="w-24"><input type="number" step="any" min="0" value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))} placeholder="Qty" className="input-field" /></div>
              <div className="w-24">
                <select value={newItem.unit} onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))} className="select-field">
                  <option value="">Unit</option>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <button onClick={handleAdd} disabled={!newItem.name || !newItem.unit} className="btn-primary">Add</button>
              <button onClick={() => setAdding(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10" style={{ color: '#666' }}>Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: '#666' }}>No items in inventory. Add ingredients you have on hand.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="card flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium" style={{ color: '#fff' }}>{item.name}</span>
                  <div className="flex items-center gap-1.5">
                    <input type="number" step="any" min="0" value={item.quantity} onChange={e => handleUpdateQuantity(item.id, parseFloat(e.target.value) || 0)} className="w-20 text-center input-field py-1.5" />
                    <span className="text-xs" style={{ color: '#666' }}>{item.unit}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(item.id)} className="text-xs hover:underline" style={{ color: '#FCA5A5' }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </Layout>
    </AuthGuard>
  )
}
