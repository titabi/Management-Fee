'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatVND, formatDate } from '@/lib/utils/format'
import { NtpExpense, NCCItem } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AmountInput } from '@/components/ui/amount-input'
import { Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIES = ['Phát sinh', 'Mua vật tư', 'Thuê CTV', 'Thuê thợ', 'Khác']
const statusLabels: Record<string, string> = { planned: 'Kế hoạch', completed: 'Đã chi' }
const categoryColors: Record<string, string> = {
  'Phát sinh': 'bg-orange-100 text-orange-700',
  'Mua vật tư': 'bg-blue-100 text-blue-700',
  'Thuê CTV': 'bg-purple-100 text-purple-700',
  'Thuê thợ': 'bg-teal-100 text-teal-700',
  'Khác': 'bg-gray-100 text-gray-700',
}

interface Props {
  projectId: string
  expenses: NtpExpense[]
  nccItems: NCCItem[]
  isAdmin: boolean
  contractValue?: number
}

const emptyForm = {
  ncc_item_id: '', category: 'Phát sinh', description: '',
  amount: '', date: new Date().toISOString().split('T')[0],
  status: 'planned' as NtpExpense['status'], note: '',
}

export default function ChiTieuNTP({ projectId, expenses, nccItems, isAdmin, contractValue }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  function openAdd() { setEditId(null); setForm({ ...emptyForm }); setOpen(true) }
  function openEdit(e: NtpExpense) {
    setEditId(e.id)
    setForm({
      ncc_item_id: e.ncc_item_id || '',
      category: e.category,
      description: e.description,
      amount: String(e.amount || 0),
      date: e.date,
      status: e.status,
      note: e.note || '',
    })
    setOpen(true)
  }

  async function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault()
    if (!form.ncc_item_id) { toast.error('Vui lòng chọn NCC'); return }
    setLoading(true)
    const supabase = createClient()
    const amountVal = parseInt(form.amount.replace(/\D/g, ''), 10) || 0
    const payload = {
      project_id: projectId,
      ncc_item_id: form.ncc_item_id || null,
      category: form.category,
      description: form.description,
      amount: amountVal,
      planned_amount: form.status === 'planned' ? amountVal : 0,
      actual_amount: form.status === 'completed' ? amountVal : 0,
      date: form.date,
      status: form.status,
      note: form.note || null,
    }
    let error
    if (editId) {
      const res = await supabase.from('ntp_expenses').update(payload).eq('id', editId)
      error = res.error
    } else {
      const res = await supabase.from('ntp_expenses').insert(payload)
      error = res.error
    }
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success(editId ? 'Đã cập nhật!' : 'Thêm thành công!'); setOpen(false); router.refresh() }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa mục chi tiêu này?')) return
    const supabase = createClient()
    const { error } = await supabase.from('ntp_expenses').delete().eq('id', id)
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success('Đã xóa!'); router.refresh() }
  }

  const totalPlanned = expenses.filter(e => e.status === 'planned').reduce((s, e) => s + (e.amount || 0), 0)
  const totalActual = expenses.filter(e => e.status === 'completed').reduce((s, e) => s + (e.amount || 0), 0)
  const totalAll = totalPlanned + totalActual

  function getNccName(nccId: string | null) {
    if (!nccId) return '—'
    return nccItems.find(n => n.id === nccId)?.name || '—'
  }

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Chi tiêu NTP</CardTitle>
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Thêm</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editId ? 'Cập nhật chi tiêu' : 'Thêm chi tiêu NTP'}</DialogTitle></DialogHeader>
                {nccItems.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Chưa có NCC nào. Vui lòng thêm NCC trước ở tab NCC / NTP.
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Thuộc NCC *</Label>
                      <Select value={form.ncc_item_id} onValueChange={v => setForm({ ...form, ncc_item_id: v })} required>
                        <SelectTrigger><SelectValue placeholder="-- Chọn NCC --" /></SelectTrigger>
                        <SelectContent>
                          {nccItems.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Danh mục *</Label>
                        <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Trạng thái</Label>
                        <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as NtpExpense['status'] })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planned">Kế hoạch</SelectItem>
                            <SelectItem value="completed">Đã chi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Mô tả *</Label>
                      <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                    </div>
                    <AmountInput label="Số tiền" value={form.amount} onChange={v => setForm({ ...form, amount: v })} contractValue={contractValue} required />
                    <div className="space-y-2">
                      <Label>Ngày</Label>
                      <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Ghi chú</Label>
                      <Textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Hủy</Button>
                      <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu'}</Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {nccItems.length === 0 && expenses.length === 0 && (
            <div className="flex items-center gap-2 p-3 mb-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Chưa có NCC nào. Vui lòng thêm NCC trước ở tab NCC / NTP.
            </div>
          )}
          {expenses.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>NCC</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ghi chú</TableHead>
                      {isAdmin && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map(exp => (
                      <TableRow key={exp.id}>
                        <TableCell className="text-sm text-gray-500">{formatDate(exp.date)}</TableCell>
                        <TableCell className="text-sm font-medium text-blue-700">{getNccName(exp.ncc_item_id)}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${categoryColors[exp.category] || 'bg-gray-100 text-gray-700'}`}>
                            {exp.category}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{exp.description}</TableCell>
                        <TableCell className="text-right font-semibold text-gray-800">
                          {formatVND(exp.amount || 0)}
                          {contractValue ? <span className="text-xs text-gray-400 ml-1">({contractValue > 0 ? ((exp.amount || 0) / contractValue * 100).toFixed(1) + '%' : '—'})</span> : null}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${exp.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {statusLabels[exp.status]}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{exp.note}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(exp)}><Pencil className="h-4 w-4 text-blue-500" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(exp.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end mt-3 pt-3 border-t gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Tổng kế hoạch</p>
                  <p className="font-bold text-yellow-600">{formatVND(totalPlanned)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Tổng đã chi</p>
                  <p className="font-bold text-red-600">{formatVND(totalActual)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Tổng cộng</p>
                  <p className="font-bold text-gray-800">{formatVND(totalAll)}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center py-8 text-gray-500">Chưa có chi tiêu nào</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
