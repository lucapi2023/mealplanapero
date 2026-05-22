'use client'

import { useState } from 'react'
import { getCategory, CATEGORY_ORDER } from '@/utils/categories'

export default function GroceryList({ ingredients, onClose }) {
  const [exportType, setExportType] = useState(null)

  const grouped = {}
  ingredients.forEach(ing => {
    const cat = getCategory(ing.name)
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(ing)
  })

  CATEGORY_ORDER.forEach(cat => {
    if (grouped[cat]) grouped[cat].sort((a, b) => a.name.localeCompare(b.name))
  })

  const handleExportPDF = () => {
    let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Shopping List</title>' +
      '<style>@page{size:A4 landscape;margin:12mm}' +
      'body{font-family:Inter,-apple-system,sans-serif;font-size:11px;margin:0;color:#000}' +
      'h1{font-size:18px;margin-bottom:8px}' +
      'h3{font-size:13px;margin:10px 0 4px;padding-bottom:2px;border-bottom:1px solid #ccc}' +
      'ul{list-style:none;padding:0;margin:0;columns:2;column-gap:20px}' +
      'li{padding:2px 0;break-inside:avoid}' +
      'input[type=checkbox]{margin-right:6px;accent-color:#059669}' +
      '</style></head><body><h1>Shopping List</h1>'

    CATEGORY_ORDER.forEach(cat => {
      if (!grouped[cat] || grouped[cat].length === 0) return
      html += `<h3>${cat.charAt(0).toUpperCase() + cat.slice(1)}</h3><ul>`
      grouped[cat].forEach(ing => {
        html += `<li><input type="checkbox">${ing.name} <strong>${Math.round(ing.amount * 100) / 100} ${ing.unit}</strong></li>`
      })
      html += '</ul>'
    })
    html += '</body></html>'

    const win = window.open('', '_blank', 'width=1000,height=700')
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  const handleExportReminders = (platform) => {
    const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MealPlan//Shopping//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Shopping List']
    ingredients.sort((a, b) => a.name.localeCompare(b.name)).forEach(ing => {
      const summary = `${ing.name} - ${Math.round(ing.amount * 100) / 100} ${ing.unit}`
      const cat = getCategory(ing.name)
      lines.push('BEGIN:VTODO')
      lines.push(`CREATED:${now}`)
      lines.push(`DTSTART:${now}`)
      lines.push(`SUMMARY:${summary}`)
      lines.push(`DESCRIPTION:Category: ${cat}`)
      lines.push('STATUS:NEEDS-ACTION')
      lines.push('PRIORITY:0')
      lines.push('END:VTODO')
    })
    lines.push('END:VCALENDAR')
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'mealplan-shopping.ics'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setExportType(null)
    if (platform === 'android') {
      setTimeout(() => alert('File downloaded. Open with Google Tasks, TickTick, or any .ics-compatible app.'), 300)
    }
  }

  if (ingredients.length === 0) {
    return (
      <div className="rounded-lg border p-4 mb-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Grocery List</h3>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No ingredients to show. Generate a meal plan first.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4 mb-4 no-print" id="grocery-list" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Grocery List</h3>
        <div className="flex items-center gap-2 flex-wrap">
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
          {onClose && <button onClick={onClose} className="text-sm" style={{ color: 'var(--text-tertiary)' }}>✕</button>}
        </div>
      </div>

      {CATEGORY_ORDER.map(cat => {
        if (!grouped[cat] || grouped[cat].length === 0) return null
        return (
          <div key={cat} className="mb-3">
            <h4 className="text-xs font-semibold mb-2 px-1 py-0.5 rounded inline-block" style={{ color: 'var(--accent)', background: 'var(--bg-hover)' }}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </h4>
            <ul className="space-y-1">
              {grouped[cat].map((ing, i) => (
                <li key={i} className="flex items-center gap-2 py-1 text-sm">
                  <input type="checkbox" style={{ accentColor: 'var(--accent)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{ing.name}</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {Math.round(ing.amount * 100) / 100} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      <p className="text-xs mt-3" style={{ color: 'var(--text-tertiary)' }}>
        PDF opens a print-ready page (A4 landscape). .ics imports into Apple Reminders or Android task apps.
      </p>
    </div>
  )
}
