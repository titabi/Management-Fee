'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatVND } from '@/lib/utils/format'
import { PLSummary, NCCItem, CustomerCost, NtpExpense } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, Save, FileSpreadsheet, PenLine, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

interface Props {
  projectId: string
  plSummary: PLSummary | null
  nccItems: NCCItem[]
  customerCosts: CustomerCost[]
  ntpExpenses: NtpExpense[]
  isAdmin: boolean
}

interface NccRow { id?: string; name: string; contract_amount: string; received_amount: string; status: string; note: string }
interface KhRow  { id?: string; description: string; amount: string; category: string; note: string }

type InputMode = 'manual' | 'excel'

function pct(amount: number, base: number) {
  if (!base || !amount) return null
  return ((amount / base) * 100).toFixed(1) + '%'
}

export default function PLFinal({ projectId, plSummary, nccItems, customerCosts, ntpExpenses, isAdmin }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('manual')

  // Main P/L fields
  const [contractValue, setContractValue] = useState(String(plSummary?.contract_value || ''))
  const [p11Profit, setP11Profit] = useState(String(plSummary?.p11_profit || ''))
  const [note, setNote] = useState(plSummary?.note || '')
  const [excelFileName, setExcelFileName] = useState(plSummary?.excel_file_name || '')
  const [excelSheets, setExcelSheets] = useState<Record<string, (string | number)[][]> | null>(null)

  // NCC rows in form
  const [nccRows, setNccRows] = useState<NccRow[]>(
    nccItems.length > 0
      ? nccItems.map(n => ({ id: n.id, name: n.name, contract_amount: String(n.contract_amount), received_amount: String(n.received_amount), status: n.status, note: n.note || '' }))
      : [{ name: '', contract_amount: '', received_amount: '', status: 'pending', note: '' }]
  )

  // Chi phí KH rows in form
  const [khRows, setKhRows] = useState<KhRow[]>(
    customerCosts.length > 0
      ? customerCosts.map(c => ({ id: c.id, description: c.description, amount: String(c.amount), category: c.category, note: c.note || '' }))
      : [{ description: '', amount: '', category: 'Phí dịch vụ', note: '' }]
  )

  const cvNum = parseInt(contractValue.replace(/\D/g, ''), 10) || 0

  const totalCustomerCosts = customerCosts.reduce((s, c) => s + (c.amount || 0), 0)
  const totalNccContract = nccItems.reduce((s, n) => s + (n.contract_amount || 0), 0)
  const totalNtpActual = ntpExpenses.reduce((s, e) => s + (e.actual_amount || 0), 0)

  function getNtpTotalForNcc(nccId: string) {
    return ntpExpenses.filter(e => e.ncc_item_id === nccId).reduce((s, e) => s + (e.actual_amount || 0), 0)
  }

  // ─── NCC row handlers ───
  function addNccRow() { setNccRows(r => [...r, { name: '', contract_amount: '', received_amount: '', status: 'pending', note: '' }]) }
  function removeNccRow(i: number) { setNccRows(r => r.filter((_, idx) => idx !== i)) }
  function updateNccRow(i: number, field: keyof NccRow, val: string) {
    setNccRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  // ─── KH row handlers ───
  function addKhRow() { setKhRows(r => [...r, { description: '', amount: '', category: 'Phí dịch vụ', note: '' }]) }
  function removeKhRow(i: number) { setKhRows(r => r.filter((_, idx) => idx !== i)) }
  function updateKhRow(i: number, field: keyof KhRow, val: string) {
    setKhRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  // ─── Excel upload ───
  async function handleFileUpload(evt: React.ChangeEvent<HTMLInputElement>) {
    const file = evt.target.files?.[0]
    if (!file) return
    try {
      const ab = await file.arrayBuffer()
      const wb = XLSX.read(ab, { type: 'array' })
      const sheets: Record<string, (string | number)[][]> = {}
      wb.SheetNames.forEach(name => {
        sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' }) as (string | number)[][]
      })
      const first = sheets[wb.SheetNames[0]]
      if (first) {
        for (const row of first) {
          const s = row.map(c => String(c).toLowerCase()).join(' ')
          if (s.includes('giá trị hđ') || s.includes('contract value')) {
            const v = row.find(c => typeof c === 'number' && c > 0)
            if (v !== undefined) setContractValue(String(v))
          }
          if (s.includes('lợi nhuận') || s.includes('profit') || s.includes('p11')) {
            const v = row.find(c => typeof c === 'number' && c !== 0)
            if (v !== undefined) setP11Profit(String(v))
          }
        }
      }
      setExcelFileName(file.name)
      setExcelSheets(sheets)
      toast.success(`Đã đọc file: ${file.name}`)
    } catch (err) {
      toast.error('Không thể đọc file Excel: ' + (err as Error).message)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  // ─── Save all ───
  async function handleSave() {
    setLoading(true)
    const supabase = createClient()

    // 1. Upsert pl_summary
    const plPayload = {
      project_id: projectId,
      contract_value: parseInt(contractValue.replace(/\D/g, ''), 10) || 0,
      p11_profit: parseInt(p11Profit.replace(/\D/g, ''), 10) || 0,
      note: note || null,
      excel_file_name: excelFileName || null,
      updated_at: new Date().toISOString(),
    }
    const plRes = plSummary
      ? await supabase.from('pl_summary').update(plPayload).eq('id', plSummary.id)
      : await supabase.from('pl_summary').insert(plPayload)
    if (plRes.error) { toast.error('Lỗi lưu P/L: ' + plRes.error.message); setLoading(false); return }

    // 2. Upsert NCC rows (only rows with a name)
    const validNcc = nccRows.filter(r => r.name.trim())
    for (const row of validNcc) {
      const nccPayload = {
        project_id: projectId,
        name: row.name.trim(),
        contract_amount: parseInt(row.contract_amount.replace(/\D/g, ''), 10) || 0,
        received_amount: parseInt(row.received_amount.replace(/\D/g, ''), 10) || 0,
        status: row.status,
        note: row.note || null,
      }
      if (row.id) {
        await supabase.from('ncc_items').update(nccPayload).eq('id', row.id)
      } else {
        await supabase.from('ncc_items').insert(nccPayload)
      }
    }

    // 3. Upsert Chi phí KH rows (only rows with description)
    const validKh = khRows.filter(r => r.description.trim())
    for (const row of validKh) {
      const khPayload = {
        project_id: projectId,
        description: row.description.trim(),
        amount: parseInt(row.amount.replace(/\D/g, ''), 10) || 0,
        category: row.category || 'Phí dịch vụ',
        note: row.note || null,
        date: new Date().toISOString().split('T')[0],
      }
      if (row.id) {
        await supabase.from('customer_costs').update(khPayload).eq('id', row.id)
      } else {
        await supabase.from('customer_costs').insert(khPayload)
      }
    }

    toast.success('Đã lưu P/L Final + NCC + Chi phí KH!')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="mt-4 space-y-4">
      {/* ── Input Section ── */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">Nhập liệu P/L Final</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant={inputMode === 'manual' ? 'default' : 'outline'} onClick={() => setInputMode('manual')}>
                  <PenLine className="h-4 w-4 mr-1" /> Nhập tay
                </Button>
                <Button size="sm" variant={inputMode === 'excel' ? 'default' : 'outline'} onClick={() => setInputMode('excel')}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Upload Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Excel upload */}
            {inputMode === 'excel' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" /> Chọn file Excel (.xlsx, .xls)
                  </Button>
                  {excelFileName && (
                    <span className="text-sm text-green-700 font-medium flex items-center gap-1">
                      <FileSpreadsheet className="h-4 w-4" />{excelFileName}
                    </span>
                  )}
                </div>
                {excelSheets && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Xem trước (10 hàng đầu):</p>
                    <div className="overflow-x-auto border rounded-md max-h-48">
                      <table className="text-xs w-full">
                        <tbody>
                          {(excelSheets[Object.keys(excelSheets)[0]] || []).slice(0, 10).map((row, ri) => (
                            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {row.slice(0, 8).map((cell, ci) => (
                                <td key={ci} className="border px-2 py-1 max-w-[150px] truncate">{String(cell)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-blue-600">Các giá trị tìm thấy đã điền vào form bên dưới. Kiểm tra trước khi lưu.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Giá trị HĐ & P11 ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Giá trị HĐ trước VAT (VND)</Label>
                <Input type="number" value={contractValue} onChange={e => setContractValue(e.target.value)} placeholder="0" />
                {cvNum > 0 && <p className="text-xs text-blue-500">{formatVND(cvNum)} — 100%</p>}
              </div>
              <div className="space-y-1">
                <Label>Lợi nhuận P11 (VND)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={p11Profit} onChange={e => setP11Profit(e.target.value)} placeholder="0" />
                  {cvNum > 0 && parseInt(p11Profit) > 0 && (
                    <Badge variant="outline" className="whitespace-nowrap text-green-700 border-green-300">
                      {pct(parseInt(p11Profit), cvNum)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* ── NCC / NTP section ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-orange-700">🏗️ NCC / Nhà Thầu Phụ</Label>
                <Button size="sm" variant="outline" onClick={addNccRow}>
                  <Plus className="h-3 w-3 mr-1" /> Thêm NCC
                </Button>
              </div>
              <div className="space-y-2 rounded-md border p-3 bg-orange-50">
                {nccRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4 space-y-1">
                      {i === 0 && <Label className="text-xs">Tên NCC</Label>}
                      <Input
                        placeholder="Tên nhà thầu phụ"
                        value={row.name}
                        onChange={e => updateNccRow(i, 'name', e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      {i === 0 && <Label className="text-xs">Giá trị HĐ (VND)</Label>}
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0"
                          value={row.contract_amount}
                          onChange={e => updateNccRow(i, 'contract_amount', e.target.value)}
                          className="text-sm h-8"
                        />
                        {cvNum > 0 && parseInt(row.contract_amount) > 0 && (
                          <span className="absolute -bottom-4 left-0 text-xs text-orange-600">
                            {pct(parseInt(row.contract_amount), cvNum)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-3 space-y-1">
                      {i === 0 && <Label className="text-xs">Đã nhận (VND)</Label>}
                      <Input
                        type="number"
                        placeholder="0"
                        value={row.received_amount}
                        onChange={e => updateNccRow(i, 'received_amount', e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      {i === 0 && <Label className="text-xs">&nbsp;</Label>}
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-600" onClick={() => removeNccRow(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {nccRows.some(r => cvNum > 0 && parseInt(r.contract_amount) > 0) && (
                  <p className="text-xs text-gray-400 mt-3">* % tính trên giá trị HĐ trước VAT</p>
                )}
              </div>
            </div>

            {/* ── Chi phí KH section ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-purple-700">👥 Chi phí Khách Hàng</Label>
                <Button size="sm" variant="outline" onClick={addKhRow}>
                  <Plus className="h-3 w-3 mr-1" /> Thêm mục
                </Button>
              </div>
              <div className="space-y-2 rounded-md border p-3 bg-purple-50">
                {khRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5 space-y-1">
                      {i === 0 && <Label className="text-xs">Mô tả</Label>}
                      <Input
                        placeholder="Tên chi phí..."
                        value={row.description}
                        onChange={e => updateKhRow(i, 'description', e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      {i === 0 && <Label className="text-xs">Danh mục</Label>}
                      <select
                        className="w-full border rounded-md text-sm h-8 px-2 bg-white"
                        value={row.category}
                        onChange={e => updateKhRow(i, 'category', e.target.value)}
                      >
                        <option>Phí dịch vụ</option>
                        <option>Vật tư</option>
                        <option>Nhân công</option>
                        <option>Khác</option>
                      </select>
                    </div>
                    <div className="col-span-3 space-y-1">
                      {i === 0 && <Label className="text-xs">Số tiền (VND)</Label>}
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0"
                          value={row.amount}
                          onChange={e => updateKhRow(i, 'amount', e.target.value)}
                          className="text-sm h-8"
                        />
                        {cvNum > 0 && parseInt(row.amount) > 0 && (
                          <span className="absolute -bottom-4 left-0 text-xs text-purple-600">
                            {pct(parseInt(row.amount), cvNum)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1">
                      {i === 0 && <Label className="text-xs">&nbsp;</Label>}
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-600" onClick={() => removeKhRow(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Ghi chú thêm..." />
            </div>

            <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Đang lưu...' : 'Lưu tất cả (P/L + NCC + Chi phí KH)'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-blue-700 font-medium mb-1">💰 Giá trị HĐ trước VAT</p>
            <p className="text-xl font-bold text-blue-800">{formatVND(plSummary?.contract_value || 0)}</p>
            <p className="text-xs text-blue-500 mt-1">= 100% giá bán</p>
          </CardContent>
        </Card>

        <Card className={`border-2 ${(plSummary?.p11_profit || 0) >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium mb-1 text-gray-600">📈 Lợi nhuận P11</p>
            <p className={`text-xl font-bold ${(plSummary?.p11_profit || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatVND(plSummary?.p11_profit || 0)}
            </p>
            {plSummary?.contract_value ? (
              <p className="text-xs text-gray-500 mt-1">{pct(plSummary.p11_profit, plSummary.contract_value)} trên giá bán</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-purple-700 font-medium">👥 Chi phí Khách Hàng</p>
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Tự động</Badge>
            </div>
            <p className="text-xl font-bold text-purple-800">{formatVND(totalCustomerCosts)}</p>
            {plSummary?.contract_value ? (
              <p className="text-xs text-purple-500 mt-1">{pct(totalCustomerCosts, plSummary.contract_value)} trên giá bán</p>
            ) : <p className="text-xs text-purple-500 mt-1">{customerCosts.length} mục</p>}
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-orange-700 font-medium">🏗️ Chi phí NCC</p>
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Tự động</Badge>
            </div>
            <p className="text-xl font-bold text-orange-800">{formatVND(totalNccContract)}</p>
            {plSummary?.contract_value ? (
              <p className="text-xs text-orange-500 mt-1">{pct(totalNccContract, plSummary.contract_value)} trên giá bán</p>
            ) : <p className="text-xs text-orange-500 mt-1">{nccItems.length} NCC</p>}
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-red-700 font-medium">💵 Tổng chi NTP thực tế</p>
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Tự động</Badge>
            </div>
            <p className="text-xl font-bold text-red-800">{formatVND(totalNtpActual)}</p>
            {plSummary?.contract_value ? (
              <p className="text-xs text-red-500 mt-1">{pct(totalNtpActual, plSummary.contract_value)} trên giá bán</p>
            ) : <p className="text-xs text-red-500 mt-1">{ntpExpenses.length} mục</p>}
          </CardContent>
        </Card>
      </div>

      {!isAdmin && plSummary?.note && (
        <div className="p-3 bg-gray-50 rounded border text-sm text-gray-600">
          <span className="font-medium">Ghi chú: </span>{plSummary.note}
        </div>
      )}

      {/* ── NCC Summary Table ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bảng tổng hợp NCC / Nhà Thầu Phụ</CardTitle>
        </CardHeader>
        <CardContent>
          {nccItems.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên NCC</TableHead>
                      <TableHead className="text-right">Giá trị HĐ</TableHead>
                      <TableHead className="text-right">% giá bán</TableHead>
                      <TableHead className="text-right">Tổng chi NTP</TableHead>
                      <TableHead className="text-right">Chênh lệch</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nccItems.map(ncc => {
                      const ntpTotal = getNtpTotalForNcc(ncc.id)
                      const diff = ncc.contract_amount - ntpTotal
                      const statusLabels: Record<string, string> = { pending: 'Chờ xử lý', active: 'Đang TH', completed: 'Hoàn thành' }
                      const statusColors: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', active: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700' }
                      return (
                        <TableRow key={ncc.id}>
                          <TableCell className="font-medium">{ncc.name}</TableCell>
                          <TableCell className="text-right">{formatVND(ncc.contract_amount)}</TableCell>
                          <TableCell className="text-right text-orange-600 font-medium">
                            {plSummary?.contract_value ? pct(ncc.contract_amount, plSummary.contract_value) : '—'}
                          </TableCell>
                          <TableCell className="text-right text-red-600">{formatVND(ntpTotal)}</TableCell>
                          <TableCell className={`text-right font-semibold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatVND(diff)}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[ncc.status] || ''}`}>
                              {statusLabels[ncc.status] || ncc.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end mt-3 pt-3 border-t gap-6 flex-wrap">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Tổng giá trị HĐ NCC</p>
                  <p className="font-bold text-orange-700">{formatVND(totalNccContract)}</p>
                  {plSummary?.contract_value && <p className="text-xs text-orange-500">{pct(totalNccContract, plSummary.contract_value)} giá bán</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Tổng chi NTP</p>
                  <p className="font-bold text-red-600">{formatVND(nccItems.reduce((s, n) => s + getNtpTotalForNcc(n.id), 0))}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center py-8 text-gray-500">Chưa có NCC nào. Thêm NCC ở phần nhập liệu bên trên hoặc tab NCC / NTP.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
