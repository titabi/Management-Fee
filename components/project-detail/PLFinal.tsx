'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatVND, formatDate } from '@/lib/utils/format'
import { PLSummary, NCCItem, CustomerCost, NtpExpense } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AmountInput } from '@/components/ui/amount-input'
import { Upload, Save, FileSpreadsheet, PenLine, Plus, Trash2, Pencil } from 'lucide-react'
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

type InputMode = 'manual' | 'excel'

function pct(amount: number, base: number) {
  if (!base || !amount) return null
  return ((amount / base) * 100).toFixed(1) + '%'
}

const CATEGORIES_KH = ['Phí dịch vụ', 'Vật tư', 'Nhân công', 'Thiết bị', 'Vận chuyển', 'Khác']

export default function PLFinal({ projectId, plSummary, nccItems, customerCosts, ntpExpenses, isAdmin }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('manual')

  // Main P/L fields
  const [contractValue, setContractValue] = useState(String(plSummary?.contract_value || ''))
  const [p11Profit, setP11Profit] = useState(String(plSummary?.p11_profit || ''))
  const [nccBudget, setNccBudget] = useState(String(plSummary?.ncc_budget || ''))
  const [khBudget, setKhBudget] = useState(String(plSummary?.kh_budget || ''))
  const [note, setNote] = useState(plSummary?.note || '')
  const [excelFileName, setExcelFileName] = useState(plSummary?.excel_file_name || '')
  const [excelSheets, setExcelSheets] = useState<Record<string, (string | number)[][]> | null>(null)

  // NCC dialog state
  const [nccDialogOpen, setNccDialogOpen] = useState(false)
  const [editNccId, setEditNccId] = useState<string | null>(null)
  const [nccForm, setNccForm] = useState({ name: '', contract_amount: '', received_amount: '', status: 'pending', note: '' })

  // KH dialog state
  const [khDialogOpen, setKhDialogOpen] = useState(false)
  const [editKhId, setEditKhId] = useState<string | null>(null)
  const [khForm, setKhForm] = useState({ description: '', amount: '', category: 'Phí dịch vụ', date: new Date().toISOString().split('T')[0], status: 'planned', note: '', customer_name: '' })

  const cvNum = parseInt(contractValue.replace(/\D/g, ''), 10) || 0

  function getNtpTotalForNcc(nccId: string) {
    return ntpExpenses.filter(e => e.ncc_item_id === nccId).reduce((s, e) => s + (e.amount || 0), 0)
  }

  const totalNccContract = nccItems.reduce((s, n) => s + (n.contract_amount || 0), 0)
  const totalNtpAll = ntpExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const totalCustomerCosts = customerCosts.reduce((s, c) => s + (c.amount || 0), 0)
  const controlNcc = totalNccContract - totalNtpAll
  const controlKH = (plSummary?.kh_budget || 0) - totalCustomerCosts
  const totalManage = controlKH + controlNcc

  // Excel upload
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

  // Save pl_summary only
  async function handleSave() {
    setLoading(true)
    const supabase = createClient()
    const plPayload = {
      project_id: projectId,
      contract_value: parseInt(contractValue.replace(/\D/g, ''), 10) || 0,
      p11_profit: parseInt(p11Profit.replace(/\D/g, ''), 10) || 0,
      ncc_budget: parseInt(nccBudget.replace(/\D/g, ''), 10) || 0,
      kh_budget: parseInt(khBudget.replace(/\D/g, ''), 10) || 0,
      note: note || null,
      excel_file_name: excelFileName || null,
      updated_at: new Date().toISOString(),
    }
    const res = plSummary
      ? await supabase.from('pl_summary').update(plPayload).eq('id', plSummary.id)
      : await supabase.from('pl_summary').insert(plPayload)
    if (res.error) toast.error('Lỗi lưu P/L: ' + res.error.message)
    else { toast.success('Đã lưu P/L Final!'); router.refresh() }
    setLoading(false)
  }

  // NCC CRUD
  function openAddNcc() { setEditNccId(null); setNccForm({ name: '', contract_amount: '', received_amount: '', status: 'pending', note: '' }); setNccDialogOpen(true) }
  function openEditNcc(item: NCCItem) {
    setEditNccId(item.id)
    setNccForm({ name: item.name, contract_amount: String(item.contract_amount), received_amount: String(item.received_amount), status: item.status, note: item.note || '' })
    setNccDialogOpen(true)
  }
  async function handleNccSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const payload = {
      project_id: projectId,
      name: nccForm.name,
      contract_amount: parseInt(nccForm.contract_amount.replace(/\D/g, ''), 10) || 0,
      received_amount: parseInt(nccForm.received_amount.replace(/\D/g, ''), 10) || 0,
      status: nccForm.status,
      note: nccForm.note || null,
    }
    const res = editNccId
      ? await supabase.from('ncc_items').update(payload).eq('id', editNccId)
      : await supabase.from('ncc_items').insert(payload)
    if (res.error) toast.error('Lỗi: ' + res.error.message)
    else { toast.success(editNccId ? 'Đã cập nhật NCC!' : 'Thêm NCC thành công!'); setNccDialogOpen(false); router.refresh() }
    setLoading(false)
  }
  async function handleDeleteNcc(id: string) {
    if (!confirm('Xóa NCC này?')) return
    const supabase = createClient()
    const { error } = await supabase.from('ncc_items').delete().eq('id', id)
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success('Đã xóa!'); router.refresh() }
  }

  // KH CRUD
  function openAddKh() { setEditKhId(null); setKhForm({ description: '', amount: '', category: 'Phí dịch vụ', date: new Date().toISOString().split('T')[0], status: 'planned', note: '', customer_name: '' }); setKhDialogOpen(true) }
  function openEditKh(c: CustomerCost) {
    setEditKhId(c.id)
    setKhForm({ description: c.description, amount: String(c.amount), category: c.category, date: c.date, status: c.status, note: c.note || '', customer_name: c.customer_name || '' })
    setKhDialogOpen(true)
  }
  async function handleKhSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const payload = {
      project_id: projectId,
      description: khForm.description,
      amount: parseInt(khForm.amount.replace(/\D/g, ''), 10) || 0,
      category: khForm.category,
      date: khForm.date,
      status: khForm.status,
      note: khForm.note || null,
      customer_name: khForm.customer_name || null,
    }
    const res = editKhId
      ? await supabase.from('customer_costs').update(payload).eq('id', editKhId)
      : await supabase.from('customer_costs').insert(payload)
    if (res.error) toast.error('Lỗi: ' + res.error.message)
    else { toast.success(editKhId ? 'Đã cập nhật!' : 'Thêm thành công!'); setKhDialogOpen(false); router.refresh() }
    setLoading(false)
  }
  async function handleDeleteKh(id: string) {
    if (!confirm('Xóa chi phí này?')) return
    const supabase = createClient()
    const { error } = await supabase.from('customer_costs').delete().eq('id', id)
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success('Đã xóa!'); router.refresh() }
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Input Section */}
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

            {/* Main fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AmountInput label="Giá trị HĐ trước VAT" value={contractValue} onChange={setContractValue} />
              <AmountInput label="Lợi nhuận P11" value={p11Profit} onChange={setP11Profit} contractValue={cvNum} />
              <AmountInput label="Chi phí NCC/NTP (P/L Budget)" value={nccBudget} onChange={setNccBudget} contractValue={cvNum} />
              <AmountInput label="Chi phí Khách Hàng (KH Budget)" value={khBudget} onChange={setKhBudget} contractValue={cvNum} />
            </div>
            <p className="text-xs text-gray-500 -mt-1">
              💡 &quot;Về Quỹ&quot; nay được nhập theo từng dòng NCC (tab NCC/NTP) và từng dòng CPKH (tab Chi phí KH).
            </p>

            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Ghi chú thêm..." />
            </div>

            <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Đang lưu...' : 'Lưu P/L Final'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          { label: 'Giá trị HĐ', value: plSummary?.contract_value || 0, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Lợi nhuận P11', value: plSummary?.p11_profit || 0, color: (plSummary?.p11_profit || 0) >= 0 ? 'text-green-700' : 'text-red-700', bg: (plSummary?.p11_profit || 0) >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200' },
          { label: 'CP NCC (Budget)', value: plSummary?.ncc_budget || 0, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
          { label: 'CP KH (Budget)', value: plSummary?.kh_budget || 0, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
          { label: 'Control NCC', value: controlNcc, color: controlNcc >= 0 ? 'text-blue-700' : 'text-red-700', bg: controlNcc >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200' },
          { label: 'Control KH', value: controlKH, color: controlKH >= 0 ? 'text-blue-700' : 'text-red-700', bg: controlKH >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200' },
          { label: 'Tổng Manage', value: totalManage, color: totalManage >= 0 ? 'text-blue-800' : 'text-red-700', bg: 'bg-blue-100 border-blue-300' },
        ].map((item, i) => (
          <Card key={i} className={`border ${item.bg}`}>
            <CardContent className="pt-3 pb-2">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className={`text-sm font-bold ${item.color}`}>{formatVND(item.value)}</p>
              {plSummary?.contract_value && item.value !== 0 ? (
                <p className="text-xs text-gray-400 mt-0.5">{pct(Math.abs(item.value), plSummary.contract_value)}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* NCC Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold text-orange-700">NCC / Nhà Thầu Phụ</CardTitle>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={openAddNcc}>
              <Plus className="h-3 w-3 mr-1" /> Thêm NCC
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {nccItems.length === 0 ? (
            <p className="text-center py-4 text-gray-400 text-sm">Chưa có NCC nào</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên NCC</TableHead>
                      <TableHead className="text-right">Giá trị HĐ</TableHead>
                      <TableHead className="text-right">Tiền đã chi</TableHead>
                      <TableHead className="text-right">Tiền KH</TableHead>
                      <TableHead className="text-right">Tiền control</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      {isAdmin && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nccItems.map(ncc => {
                      const ntpTotal = getNtpTotalForNcc(ncc.id)
                      const ntpPlanned = ntpExpenses.filter(e => e.ncc_item_id === ncc.id && e.status === 'planned').reduce((s, e) => s + (e.amount || 0), 0)
                      const control = ncc.contract_amount - ntpTotal
                      return (
                        <TableRow key={ncc.id}>
                          <TableCell className="font-medium">
                            {ncc.name}
                            {ncc.note && <p className="text-xs text-gray-400 italic">{ncc.note}</p>}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatVND(ncc.contract_amount)}</TableCell>
                          <TableCell className="text-right text-red-600">{formatVND(ntpTotal - ntpPlanned)}</TableCell>
                          <TableCell className="text-right text-yellow-600">{formatVND(ntpPlanned)}</TableCell>
                          <TableCell className={`text-right font-bold ${control >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatVND(control)}</TableCell>
                          <TableCell className="text-right text-xs text-gray-500">
                            {cvNum ? pct(ncc.contract_amount, cvNum) : '—'}
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditNcc(ncc)}><Pencil className="h-3.5 w-3.5 text-blue-500" /></Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteNcc(ncc.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-6 mt-3 pt-3 border-t">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Tổng HĐ NCC</p>
                  <p className="font-bold text-orange-700">{formatVND(totalNccContract)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Tổng chi NTP</p>
                  <p className="font-bold text-red-600">{formatVND(totalNtpAll)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Tiền control NCC</p>
                  <p className={`font-bold ${controlNcc >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatVND(controlNcc)}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Chi phí KH Section */}
      {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-purple-700">Chi phí Khách Hàng</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">KH Budget: {formatVND(plSummary?.kh_budget || 0)}</p>
            </div>
            <Button size="sm" variant="outline" onClick={openAddKh}>
              <Plus className="h-3 w-3 mr-1" /> Thêm mục
            </Button>
          </CardHeader>
          <CardContent>
            {customerCosts.length === 0 ? (
              <p className="text-center py-4 text-gray-400 text-sm">Chưa có chi phí nào</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mô tả</TableHead>
                        <TableHead>Khách hàng</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Số tiền</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead>Ngày</TableHead>
                        {isAdmin && <TableHead></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerCosts.map(cost => (
                        <TableRow key={cost.id}>
                          <TableCell className="font-medium">{cost.description}</TableCell>
                          <TableCell className="text-sm text-gray-500">{cost.customer_name || '—'}</TableCell>
                          <TableCell>
                            {cost.status === 'completed'
                              ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Đã chi</span>
                              : <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-medium">Kế hoạch</span>
                            }
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatVND(cost.amount)}</TableCell>
                          <TableCell className="text-right text-xs text-gray-500">
                            {cvNum ? pct(cost.amount, cvNum) : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">{formatDate(cost.date)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditKh(cost)}><Pencil className="h-3.5 w-3.5 text-blue-500" /></Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteKh(cost.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end gap-6 mt-3 pt-3 border-t">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Tổng chi phí KH</p>
                    <p className="font-bold text-purple-700">{formatVND(totalCustomerCosts)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Tiền control KH</p>
                    <p className={`font-bold ${controlKH >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatVND(controlKH)}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* NCC Dialog */}
      <Dialog open={nccDialogOpen} onOpenChange={setNccDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editNccId ? 'Cập nhật NCC' : 'Thêm NCC'}</DialogTitle></DialogHeader>
          <form onSubmit={handleNccSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tên NCC *</Label>
              <Input value={nccForm.name} onChange={e => setNccForm({ ...nccForm, name: e.target.value })} required placeholder="Tên nhà cung cấp" />
            </div>
            <AmountInput label="Giá trị HĐ" value={nccForm.contract_amount} onChange={v => setNccForm({ ...nccForm, contract_amount: v })} contractValue={cvNum} />
            <AmountInput label="Đã thanh toán" value={nccForm.received_amount} onChange={v => setNccForm({ ...nccForm, received_amount: v })} contractValue={cvNum} />
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select value={nccForm.status} onValueChange={v => setNccForm({ ...nccForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Chờ xử lý</SelectItem>
                  <SelectItem value="active">Đang thực hiện</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ghi chú theo dõi</Label>
              <Textarea value={nccForm.note} onChange={e => setNccForm({ ...nccForm, note: e.target.value })} rows={2} placeholder="NCC cần theo dõi đặc biệt..." />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setNccDialogOpen(false)}>Hủy</Button>
              <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* KH Dialog */}
      <Dialog open={khDialogOpen} onOpenChange={setKhDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editKhId ? 'Cập nhật chi phí KH' : 'Thêm chi phí KH'}</DialogTitle></DialogHeader>
          <form onSubmit={handleKhSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tên khách hàng (nhóm)</Label>
              <Input value={khForm.customer_name} onChange={e => setKhForm({ ...khForm, customer_name: e.target.value })} placeholder="Tuỳ chọn" />
            </div>
            <div className="space-y-2">
              <Label>Mô tả *</Label>
              <Input value={khForm.description} onChange={e => setKhForm({ ...khForm, description: e.target.value })} required placeholder="Tên chi phí..." />
            </div>
            <AmountInput label="Số tiền" value={khForm.amount} onChange={v => setKhForm({ ...khForm, amount: v })} contractValue={cvNum} required />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Danh mục</Label>
                <Select value={khForm.category} onValueChange={v => setKhForm({ ...khForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES_KH.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select value={khForm.status} onValueChange={v => setKhForm({ ...khForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Kế hoạch</SelectItem>
                    <SelectItem value="completed">Đã chi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ngày</Label>
              <Input type="date" value={khForm.date} onChange={e => setKhForm({ ...khForm, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea value={khForm.note} onChange={e => setKhForm({ ...khForm, note: e.target.value })} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setKhDialogOpen(false)}>Hủy</Button>
              <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
