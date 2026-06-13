'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface ChartItem {
  name: string
  fullName: string
  tienCo: number
  tienChi: number
}

function formatMillions(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return value.toString()
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-sm mb-2">{payload[0]?.payload?.fullName || label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {new Intl.NumberFormat('vi-VN').format(entry.value)} ₫
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function DashboardChart({ data }: { data: ChartItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={formatMillions} tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => value === 'tienCo' ? 'Tiền có (NTP)' : 'Đã chi'}
        />
        <Bar dataKey="tienCo" name="tienCo" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="tienChi" name="tienChi" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
