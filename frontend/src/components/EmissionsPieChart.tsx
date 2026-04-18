import { memo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

interface ChartPoint {
  name: string
  value: number
}

interface EmissionsPieChartProps {
  data: ChartPoint[]
}

const COLORS = ['#2979FF', '#00E676', '#0D1B2A', '#6C8DB3']

function EmissionsPieChart({ data }: EmissionsPieChartProps) {
  return (
    <div className="h-64 rounded-xl bg-[#F5F9F7] p-2">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${Number(value ?? 0).toFixed(2)} t CO2/year`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default memo(EmissionsPieChart)
