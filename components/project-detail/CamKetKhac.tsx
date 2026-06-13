'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatVND, formatDate } from '@/lib/utils/format'
import { OtherCommitment } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AmountInput } from '@/components/ui/amount-input'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

const TYPES = ['Môi giới', 'Thầu phụ thứ cấp', 'Chuyên gia', 'Ban bệ KH', 'Phát sinh', 'Khác']
const statusLabels: Record<string, string> = { pending: 'Chưa chi', paid: 'Đã chi' }

interface Props {
  projectId: string
  commitments: OtherCommitment[]
  isAdmin: boolean
  contractValue?: number
}

const emptyForm = {
  type: 'Môi giới', recipient: '', description: '', amount: '', paid_amount: '',
  due_date: '', status: 'pending' as OtherCommitment['status'], note: '',
}

export default function CamKetKhac({ projectId, commitments, isAdmin, contractValue }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  function openAdd() { setEditId(null); setForm({ ...emptyForm }); setOpen(true) }
  function openEdit(c: OtherCommitment) {
    setEditId(c.id)
    setForm({
      type: c.type, recipient: c.recipient || '', description: c.description, amount: String(c.amount),
      paid_amount: String(c.paid_amount), due_date: c.due_date || '', status: c.status, note: c.note || '',
    })
    setOpen(true)
  }

  async function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const payload = {
      project_id: projectId, type: form.type, recipient: form.recipient || null, description: form.description,
      amount: parseInt(form.amount.replace(/\D/g, ''), 10) || 0,
      paid_amount: parseInt(form.paid_amount.replace(/\D/g, ''), 10) || 0,
      due_date: form.due_date || null, status: form.status, note: form.note || null,
    }
    let error
    if (editId) {
      const res = await supabase.from('other_commitments').update(payload).eq('id', editId)
      error = res.error
    } else {
      const res = await supabase.from('other_commitments').insert(payload)
      error = res.error
    }
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success(editId ? 'Đã cập nhật!' : 'Thêm thành công!'); setOpen(false); router.refresh() }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa cam kết này?')) return
    const supabase = createClient()
    const { error } = await supabase.from('other_commitments').delete().eq('id', id)
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success('Đã xóa!'); router.refresh() }
  }

  const totalAmount = commitments.reduce((s, c) => s + (c.amount || 0), 0)
  const totalPaid = commitments.reduce((s, c) => s + (c.paid_amount || 0), 0)
  const totalUnpaid = totalAmount - totalPaid

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Sổ chi Quỹ</CardTitle>
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Thêm</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editId ? 'Cập nhật khoản chi' : 'Thêm khoản chi Quỹ'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Loại *</Label>
                      <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Trạng thái</Label>
                      <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as OtherCommitment['status'] })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Chưa thanh toán</SelectItem>
                          <SelectItem value="paid">Đã thanh toán</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Người nhận *</Label>
                    <Input value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} placeholder="Tên người/đơn vị nhận tiền" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Mô tả</Label>
                    <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <AmountInput label="Cam kết chi" value={form.amount} onChange={v => setForm({ ...form, amount: v })} contractValue={contractValue} />
                  <AmountInput label="Đã chi" value={form.paid_amount} onChange={v => setForm({ ...form, paid_amount: v })} contractValue={contractValue} />
                  <div className="space-y-2">
                    <Label>Hạn thanh toán</Label>
                    <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
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
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {commitments.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loại</TableHead>
                      <TableHead>Người nhận</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead className="text-right">Cam kết chi</TableHead>
                      <TableHead className="text-right">Đã chi</TableHead>
                      <TableHead className="text-right">Còn lại</TableHead>
                      <TableHead>Hạn chi</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      {isAdmin && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commitments.map(c => (
                      <TableRow key={c.id}>
                        <TableCell><span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{c.type}</span></TableCell>
                        <TableCell className="font-medium">{c.recipient || '—'}</TableCell>
                        <TableCell className="text-gray-600">{c.description || '—'}</TableCell>
                        <TableCell className="text-right">{formatVND(c.amount)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatVND(c.paid_amount)}</TableCell>
                        <TableCell className="text-right font-semibold text-orange-600">{formatVND(c.amount - c.paid_amount)}</TableCell>
                        <TableCell className="text-sm text-gray-500">{c.due_date ? formatDate(c.due_date) : '—'}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${c.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {statusLabels[c.status]}
                          </span>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil className="h-4 w-4 text-blue-500" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
                  <p className="text-xs text-gray-500">Tổng cam kết chi</p>
                  <p className="font-bold">{formatVND(totalAmount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Đã chi</p>
                  <p className="font-bold text-green-600">{formatVND(totalPaid)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Còn phải chi</p>
                  <p className="font-bold text-red-600">{formatVND(totalUnpaid)}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center py-8 text-gray-500">Chưa có cam kết nào</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
