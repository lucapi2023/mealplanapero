'use client'

export default function GroceryList({ ingredients, onClose }) {
  return (
    <div className="bg-white border rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">Grocery List</h3>
        <button
          onClick={onClose}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      {ingredients.length === 0 ? (
        <p className="text-sm text-gray-500">No ingredients to show.</p>
      ) : (
        <ul className="divide-y">
          {ingredients
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((ing, i) => (
              <li key={i} className="flex items-center gap-2 py-2 text-sm">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="font-medium text-gray-700">
                  {Math.round(ing.amount * 100) / 100} {ing.unit}
                </span>
                <span className="text-gray-600">{ing.name}</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
