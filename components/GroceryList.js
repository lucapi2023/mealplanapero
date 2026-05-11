'use client'

export default function GroceryList({ ingredients, onClose }) {
  const handleExportPDF = () => {
    const listHtml = ingredients
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((ing) => `<li style="margin-bottom:6px;font-size:14px">
        <input type="checkbox" style="margin-right:8px">
        <strong>${Math.round(ing.amount * 100) / 100} ${ing.unit}</strong> ${ing.name}
      </li>`)
      .join('')

    const html = `<!DOCTYPE html><html><head><title>Shopping List</title>
      <style>body{font-family:-apple-system,sans-serif;padding:20px;max-width:600px;margin:auto}
      h1{font-size:20px;margin-bottom:16px}ul{list-style:none;padding:0}
      @media print{body{padding:0;width:100%}}
      </style></head><body><h1>Shopping List</h1><ul>${listHtml}</ul></body></html>`

    const win = window.open('', '_blank', 'width=600,height=800')
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  const handleExportReminders = () => {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MealPlan//Shopping List//EN']
    ingredients
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((ing) => {
        lines.push('BEGIN:VTODO')
        lines.push(`SUMMARY:${ing.name} - ${Math.round(ing.amount * 100) / 100} ${ing.unit}`)
        lines.push('STATUS:NEEDS-ACTION')
        lines.push('END:VTODO')
      })
    lines.push('END:VCALENDAR')
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mealplan-shopping-list.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white border rounded-lg p-4 mb-4 shadow-sm" id="grocery-list">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">Shopping List</h3>
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
        <>
          <ul className="divide-y mb-4">
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
          <div className="flex gap-2 pt-2 border-t">
            <button
              onClick={handleExportPDF}
              className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700"
            >
              Export PDF
            </button>
            <button
              onClick={handleExportReminders}
              className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded hover:bg-orange-600"
            >
              Export for Reminders
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            PDF opens a printable page. The .ics file can be imported into Apple Reminders.
          </p>
        </>
      )}
    </div>
  )
}
