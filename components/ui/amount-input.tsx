'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AmountInputProps {
  label: string
  value: string
  onChange: (val: string) => void
  contractValue?: number
  required?: boolean
  placeholder?: string
}

export function AmountInput({ label, value, onChange, contractValue, required, placeholder = '0' }: AmountInputProps) {
  const pct = contractValue && contractValue > 0 && value
    ? ((parseInt(value) / contractValue) * 100).toFixed(2)
    : ''

  function handlePctChange(p: string) {
    if (!contractValue || contractValue <= 0) return
    const pctNum = parseFloat(p)
    if (!isNaN(pctNum)) {
      onChange(String(Math.round(pctNum / 100 * contractValue)))
    } else {
      onChange('')
    }
  }

  return (
    <div className="space-y-1">
      <Label>{label}{required && ' *'}</Label>
      <div className="flex gap-2 items-center">
        <Input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="flex-1"
        />
        {contractValue && contractValue > 0 ? (
          <div className="flex items-center gap-1 min-w-[90px]">
            <Input
              type="number"
              value={pct}
              onChange={e => handlePctChange(e.target.value)}
              placeholder="0.00"
              className="w-16 text-sm"
              step="0.01"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        ) : null}
      </div>
      {contractValue && contractValue > 0 && (
        <p className="text-xs text-gray-400">% tính trên {new Intl.NumberFormat('vi-VN').format(contractValue)} ₫</p>
      )}
    </div>
  )
}
