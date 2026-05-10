'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from '@/components/AuthProvider'
import AuthGuard from '@/components/AuthGuard'
import Layout from '@/components/Layout'
import IngredientAutocomplete from '@/components/IngredientAutocomplete'

export default function InventoryPage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', quantity: 0, unit: '' })

  useEffect(() => {
    if (!user) return
    loadInventory()
  }, [user])

  const loadInventory = async () => {
    const { data } = await supabase
      .from('inventory')
      .select('id, quantity, unit, ingredients(name, id)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      setItems(data.map((item) => ({
        id: item.id,
        name: item.ingredients?.name || 'Unknown',
        ingredient_id: item.ingredients?.id,
        quantity: item.quantity,
        unit: item.unit,
      })))
    }
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newItem.name.trim() || !newItem.unit) return

    let ingredientId = null

    const { data: existing } = await supabase
      .from('ingredients')
      .select('id')
      .eq('name', newItem.name.trim())
      .eq('user_id', user.id)
      .single()

    if (existing) {
      ingredientId = existing.id
    } else {
      const { data: created } = await supabase
        .from('ingredients')
        .insert({ name: newItem.name.trim(), user_id: user.id })
        .select('id')
        .single()
      ingredientId = created?.id
    }

    if (!ingredientId) return

    const existingInv = items.find((i) => i.ingredient_id === ingredientId && i.unit === newItem.unit)
    if (existingInv) {
      await supabase
        .from('inventory')
        .update({ quantity: existingInv.quantity + newItem.quantity })
        .eq('id', existingInv.id)
    } else {
      await supabase.from('inventory').insert({
        user_id: user.id,
        ingredient_id: ingredientId,
        quantity: newItem.quantity,
        unit: newItem.unit,
      })
    }

    setNewItem({ name: '', quantity: 0, unit: '' })
    setAdding(false)
    loadInventory()
  }

  const handleDelete = async (id) => {
    await supabase.from('inventory').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const handleUpdateQuantity = async (id, newQty) => {
    await supabase
      .from('inventory')
      .update({ quantity: newQty })
      .eq('id', id)
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i))
    )
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <button
            onClick={() => setAdding(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            + Add Item
          </button>
        </div>

        {adding && (
          <div className="bg-white border rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Inventory Item</h3>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <IngredientAutocomplete
                  value={newItem.name}
                  onChange={(val) => setNewItem((prev) => ({ ...prev, name: val }))}
                  placeholder="Ingredient"
                />
              </div>
              <div className="w-24">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={newItem.quantity}
                  onChange={(e) =>
                    setNewItem((prev) => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="Qty"
                  className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="w-24">
                <select
                  value={newItem.unit}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, unit: e.target.value }))}
                  className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Unit</option>
                  {['g', 'ml', 'cup', 'tbsp', 'tsp', 'piece', 'clove', 'oz', 'lb', 'l', 'kg', 'can'].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAdd}
                disabled={!newItem.name || !newItem.unit}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => setAdding(false)}
                className="text-gray-400 hover:text-gray-600 text-sm px-2 py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No items in inventory. Add some ingredients you have on hand.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white border rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-800">{item.name}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateQuantity(item.id, parseFloat(e.target.value) || 0)
                      }
                      className="w-20 border rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-500">{item.unit}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </Layout>
    </AuthGuard>
  )
}
