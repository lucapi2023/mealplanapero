'use client'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEAL_TYPES = ['lunch', 'dinner']
const PROTEIN_TYPES = ['meat', 'fish', 'vegetarian', 'vegan', 'any']

const COLORS = {
  meat: { bg: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.4)', text: '#FCA5A5', label: 'Meat' },
  fish: { bg: 'rgba(59,130,246,0.2)', border: 'rgba(59,130,246,0.4)', text: '#93C5FD', label: 'Fish' },
  vegetarian: { bg: 'rgba(34,197,94,0.2)', border: 'rgba(34,197,94,0.4)', text: '#86EFAC', label: 'Veg' },
  vegan: { bg: 'rgba(16,185,129,0.2)', border: 'rgba(16,185,129,0.4)', text: '#6EE7B7', label: 'Vegan' },
  any: { bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.25)', text: '#9CA3AF', label: 'Any' },
}

export default function MealScheduleGrid({ schedule, onChange, activeMeals, planDays }) {
  const scheduleData = schedule || {}
  const mealTypes = activeMeals === 2 ? MEAL_TYPES : activeMeals >= 3 ? ['lunch', 'dinner'] : ['dinner']
  const visibleDays = DAYS.slice(0, planDays || 7)
  const dayIndices = visibleDays.map((_, i) => i)

  const getValue = (dayIdx, mealType) => {
    const day = scheduleData[dayIdx]
    if (!day) return 'any'
    return day[mealType] || 'any'
  }

  const setValue = (dayIdx, mealType, value) => {
    const next = { ...scheduleData }
    if (!next[dayIdx]) next[dayIdx] = {}
    next[dayIdx] = { ...next[dayIdx], [mealType]: value }
    if (Object.keys(next[dayIdx]).length === 0) delete next[dayIdx]
    onChange(next)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th className="py-2 px-3 text-left text-xs font-medium" style={{ color: '#666', width: 100 }}>Day</th>
            {mealTypes.map(mt => (
              <th key={mt} className="py-2 px-3 text-center text-xs font-medium" style={{ color: '#666' }}>
                {mt === 'lunch' ? 'Lunch' : 'Dinner'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleDays.map((day, idx) => (
            <tr key={day} className="border-t" style={{ borderColor: '#2A2A2A' }}>
              <td className="py-2 px-3">
                <span className="text-sm font-medium" style={{ color: '#fff' }}>{day.slice(0, 3)}</span>
              </td>
              {mealTypes.map(mt => {
                const val = getValue(dayIndices[idx], mt)
                const col = COLORS[val]
                return (
                  <td key={mt} className="py-1.5 px-2">
                    <div className="relative inline-block w-full">
                      <select
                        value={val}
                        onChange={e => setValue(dayIndices[idx], mt, e.target.value)}
                        className="w-full appearance-none rounded-md px-3 py-2 text-xs font-medium cursor-pointer text-center transition-colors"
                        style={{
                          background: col.bg,
                          border: `1px solid ${col.border}`,
                          color: col.text,
                          outline: 'none',
                        }}
                      >
                        {PROTEIN_TYPES.map(pt => (
                          <option key={pt} value={pt} style={{ background: '#1A1A1A', color: COLORS[pt].text }}>
                            {COLORS[pt].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t" style={{ borderColor: '#2A2A2A' }}>
        {PROTEIN_TYPES.map(pt => (
          <div key={pt} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: COLORS[pt].bg, border: `1px solid ${COLORS[pt].border}` }}></span>
            <span className="text-xs" style={{ color: COLORS[pt].text }}>{COLORS[pt].label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
