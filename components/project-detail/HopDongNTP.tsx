'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatVND, formatDate } from '@/lib/utils/format'
import { NtpContract } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

const statusLabels: Record<string, string> = { pending: 'Chờ xử lý', active: 'Đang thực hiện', completed: 'Hoàn thành' }
const statusVariants: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', active: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700' }

interface Props {
  projectId: string
  contracts: NtpContract[]
  isAdmin: boolean
}

const emptyForm = {
  ntp_name: '', contract_amount: '', received_amount: '',
  status: 'pending' as NtpContract['status'], date: new Date().toISOString().split('T')[0], note: '',
}

export default function HopDongNTP({ projectId, contracts, isAdmin }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  function openAdd() { setEditId(null); setForm({ ...emptyForm }); setOpen(true) }
  function openEdit(c: NtpContract) {
    setEditId(c.id)
    setForm({
      ntp_name: c.ntp_name, contract_amount: String(c.contract_amount),
      received_amount: String(c.received_amount), status: c.status, date: c.date, note: c.note || '',
    })
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const payload = {
      project_id: projectId,
      ntp_name: form.ntp_name,
      contract_amount: parseInt(form.contract_amount.replace(/\D/g, ''), 10) || 0,
      received_amount: parseInt(form.received_amount.replace(/\D/g, ''), 10) || 0,
      status: form.status,
      date: form.date,
      note: form.note || null,
    }
    let error
    if (editId) {
      const res = await supabase.from('ntp_contracts').update(payload).eq('id', editId)
      error = res.error
    } else {
      const res = await supabase.from('ntp_contracts').insert(payload)
      error = res.error
    }
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success(editId ? 'Đã cập nhật!' : 'Thêm thành công!'); setOpen(false); router.refresh() }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa hợp đồng này?')) return
    const supabase = createClient()
    const { error } = await supabase.from('ntp_contracts').delete().eq('id', id)
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success('Đã xóa!'); router.refresh() }
  }

  const totalContract = contracts.reduce((s, c) => s + (c.contract_amount || 0), 0)
  const totalReceived = contracts.reduce((s, c) => s + (c.received_amount || 0), 0)

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Hợp đồng Nhà Thầu Phụ (NTP)</CardTitle>
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Thêm HĐ</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editId ? 'Cập nhật hợp đồng' : 'Thêm hợp đồng NTP'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tên NTP *</Label>
                    <Input value={form.ntp_name} onChange={e => setForm({ ...form, ntp_name: e.target.value })} required placeholder="Tên nhà thầu phụ" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Giá trị hợp đồng (VND)</Label>
                      <Input type="number" value={form.contract_amount} onChange={e => setForm({ ...form, contract_amount: e.target.value })} placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tiền đã nhận (VND)</Label>
                      <Input type="number" value={form.received_amount} onChange={e => setForm({ ...form, received_amount: e.target.value })} placeholder="0" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Trạng thái</Label>
                      <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as NtpContract['status'] })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Chờ xử lý</SelectItem>
                          <SelectItem value="active">Đang thực hiện</SelectItem>
                          <SelectItem value="completed">Hoàn thành</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Ngày</Label>
                      <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                    </div>
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
          {contracts.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Tên NTP</TableHead>
                      <TableHead className="text-right">Giá trị HĐ</TableHead>
                      <TableHead className="text-right">Đã nhận</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ghi chú</TableHead>
                      {isAdmin && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm text-gray-500">{formatDate(c.date)}</TableCell>
                        <TableCell className="font-medium">{c.ntp_name}</TableCell>
                        <TableCell className="text-right">{formatVND(c.contract_amount)}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">{formatVND(c.received_amount)}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusVariants[c.status]}`}>
                            {statusLabels[c.status]}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{c.note}</TableCell>
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
                  <p className="text-xs text-gray-500">Tổng giá trị HĐ</p>
                  <p className="font-bold">{formatVND(totalContract)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Tổng đã nhận</p>
                  <p className="font-bold text-green-600">{formatVND(totalReceived)}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center py-8 text-gray-500">Chưa có hợp đồng NTP nào</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
