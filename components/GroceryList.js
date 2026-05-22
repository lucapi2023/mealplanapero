'use client'

import { useState } from 'react'

export default function GroceryList({ ingredients, onClose }) {
  const [exportType, setExportType] = useState(null)

  const handleExportPDF = () => {
    const listHtml = ingredients
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(ing => `<li style="margin-bottom:6px;font-size:14px;color:#000">
        <input type="checkbox" style="margin-right:8px">
        <strong>${Math.round(ing.amount * 100) / 100} ${ing.unit}</strong> ${ing.name}
      </li>`).join('')

    const html = `<!DOCTYPE html><html><head><title>Shopping List</title>
      <style>body{font-family:Inter,-apple-system,sans-serif;padding:20px;max-width:600px;margin:auto}
      h1{font-size:20px;margin-bottom:16px}ul{list-style:none;padding:0}
      @media print{body{padding:0;width:100%}}
      </style></head><body><h1>Shopping List</h1><ul>${listHtml}</ul></body></html>`
    const win = window.open('', '_blank', 'width=600,height=800')
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  const handleExportReminders = (platform) => {
    const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MealPlan//Shopping List//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:MealPlan Shopping List',
    ]
    ingredients.sort((a, b) => a.name.localeCompare(b.name)).forEach(ing => {
      lines.push('BEGIN:VTODO')
      lines.push(`DTSTART:${now}`)
      lines.push(`SUMMARY:${ing.name} - ${Math.round(ing.amount * 100) / 100} ${ing.unit}`)
      lines.push(`DESCRIPTION:Buy ${Math.round(ing.amount * 100) / 100} ${ing.unit} of ${ing.name}`)
      lines.push('STATUS:NEEDS-ACTION')
      lines.push('PRIORITY:0')
      lines.push('END:VTODO')
    })
    lines.push('END:VCALENDAR')
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'mealplan-shopping-list.ics'
    a.click()
    setExportType(null)

    if (platform === 'android') {
      setTimeout(() => alert('File downloaded. Open with Google Tasks/Keep or any .ics-compatible app to import reminders.'), 500)
    }
  }

  return (
    <div className="rounded-lg border p-4 mb-4 no-print" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Grocery List</h3>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="btn-secondary text-xs">PDF</button>
          {exportType ? (
            <div className="flex gap-1">
              <button onClick={() => handleExportReminders('apple')} className="btn-primary text-xs">Apple</button>
              <button onClick={() => handleExportReminders('android')} className="btn-secondary text-xs">Android</button>
              <button onClick={() => setExportType(null)} className="text-xs" style={{ color: 'var(--text-tertiary)' }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setExportType('choose')} className="btn-secondary text-xs">Reminders</button>
          )}
          <button onClick={onClose} className="text-sm" style={{ color: 'var(--text-tertiary)' }}>✕</button>
        </div>
      </div>
      {ingredients.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No ingredients to show.</p>
      ) : (
        <ul className="divide-y mb-4" style={{ borderColor: 'var(--border)' }}>
          {ingredients.sort((a, b) => a.name.localeCompare(b.name)).map((ing, i) => (
            <li key={i} className="flex items-center gap-2 py-2.5 text-sm">
              <input type="checkbox" style={{ accentColor: 'var(--accent)' }} />
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {Math.round(ing.amount * 100) / 100} {ing.unit}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{ing.name}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        PDF opens a printable page. The .ics file imports into Reminders (Apple) or calendar/task apps (Android).
      </p>
    </div>
  )
}
