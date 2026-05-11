'use client'

export default function GroceryList({ ingredients, onClose }) {
  const handleExportPDF = () => {
    const listHtml = ingredients
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(ing => `<li style="margin-bottom:6px;font-size:14px;color:#fff">
        <input type="checkbox" style="margin-right:8px;accent-color:#3ECF8E">
        <strong>${Math.round(ing.amount * 100) / 100} ${ing.unit}</strong> ${ing.name}
      </li>`).join('')

    const html = `<!DOCTYPE html><html><head><title>Shopping List</title>
      <style>body{font-family:Inter,-apple-system,sans-serif;padding:20px;max-width:600px;margin:auto;background:#0B0D0E;color:#fff}
      h1{font-size:20px;margin-bottom:16px;color:#fff}ul{list-style:none;padding:0}
      @media print{body{padding:0;width:100%;background:#fff;color:#000}h1{color:#000}li{color:#000}}
      </style></head><body><h1>Shopping List</h1><ul>${listHtml}</ul></body></html>`
    const win = window.open('', '_blank', 'width=600,height=800')
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  const handleExportReminders = () => {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MealPlan//Shopping List//EN']
    ingredients.sort((a, b) => a.name.localeCompare(b.name)).forEach(ing => {
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
    <div className="rounded-lg border p-4 mb-4" style={{ background: '#141414', borderColor: '#2A2A2A' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold" style={{ color: '#fff' }}>Grocery List</h3>
        <button onClick={onClose} className="text-sm hover:opacity-80" style={{ color: '#666' }}>✕</button>
      </div>
      {ingredients.length === 0 ? (
        <p className="text-sm" style={{ color: '#666' }}>No ingredients to show.</p>
      ) : (
        <>
          <ul className="divide-y mb-4" style={{ borderColor: '#2A2A2A' }}>
            {ingredients.sort((a, b) => a.name.localeCompare(b.name)).map((ing, i) => (
              <li key={i} className="flex items-center gap-2 py-2.5 text-sm">
                <input type="checkbox" style={{ accentColor: '#3ECF8E' }} />
                <span className="font-medium" style={{ color: '#fff' }}>
                  {Math.round(ing.amount * 100) / 100} {ing.unit}
                </span>
                <span style={{ color: '#929292' }}>{ing.name}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 pt-3 border-t" style={{ borderColor: '#2A2A2A' }}>
            <button onClick={handleExportPDF} className="btn-primary text-xs">PDF</button>
            <button onClick={handleExportReminders} className="btn-secondary text-xs">Reminders (.ics)</button>
          </div>
          <p className="text-xs mt-2" style={{ color: '#666' }}>
            PDF opens a printable page. The .ics file imports into Apple Reminders.
          </p>
        </>
      )}
    </div>
  )
}
