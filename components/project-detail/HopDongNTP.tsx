'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatVND } from '@/lib/utils/format'
import { NccItem, NtpExpense } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

const statusLabels: Record<string, string> = { pending: 'Chờ xử lý', active: 'Đang thực hiện', completed: 'Hoàn thành' }
const statusVariants: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
}

interface Props {
  projectId: string
  nccItems: NccItem[]
  ntpExpenses: NtpExpense[]
  isAdmin: boolean
}

const emptyForm = {
  name: '',
  contract_amount: '',
  received_amount: '',
  status: 'pending' as NccItem['status'],
  note: '',
}

export default function HopDongNTP({ projectId, nccItems, ntpExpenses, isAdmin }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  function openAdd() { setEditId(null); setForm({ ...emptyForm }); setOpen(true) }
  function openEdit(item: NccItem) {
    setEditId(item.id)
    setForm({
      name: item.name,
      contract_amount: String(item.contract_amount),
      received_amount: String(item.received_amount),
      status: item.status,
      note: item.note || '',
    })
    setOpen(true)
  }

  function getNtpTotalForNcc(nccId: string) {
    return ntpExpenses
      .filter(e => e.ncc_item_id === nccId)
      .reduce((s, e) => s + (e.actual_amount || 0), 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const payload = {
      project_id: projectId,
      name: form.name,
      contract_amount: parseInt(form.contract_amount.replace(/\D/g, ''), 10) || 0,
      received_amount: parseInt(form.received_amount.replace(/\D/g, ''), 10) || 0,
      status: form.status,
      note: form.note || null,
    }
    let error
    if (editId) {
      const res = await supabase.from('ncc_items').update(payload).eq('id', editId)
      error = res.error
    } else {
      const res = await supabase.from('ncc_items').insert(payload)
      error = res.error
    }
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success(editId ? 'Đã cập nhật!' : 'Thêm thành công!'); setOpen(false); router.refresh() }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa NCC này? Các chi tiêu NTP liên kết sẽ bị bỏ liên kết.')) return
    const supabase = createClient()
    const { error } = await supabase.from('ncc_items').delete().eq('id', id)
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success('Đã xóa!'); router.refresh() }
  }

  const totalContract = nccItems.reduce((s, c) => s + (c.contract_amount || 0), 0)
  const totalReceived = nccItems.reduce((s, c) => s + (c.received_amount || 0), 0)

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">NCC / Nhà Thầu Phụ</CardTitle>
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Thêm NCC</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editId ? 'Cập nhật NCC' : 'Thêm NCC / Nhà Thầu Phụ'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tên NCC *</Label>
                    <Input
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      required
                      placeholder="Tên nhà cung cấp / nhà thầu phụ"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Giá trị HĐ (VND)</Label>
                      <Input
                        type="number"
                        value={form.contract_amount}
                        onChange={e => setForm({ ...form, contract_amount: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Đã thanh toán (VND)</Label>
                      <Input
                        type="number"
                        value={form.received_amount}
                        onChange={e => setForm({ ...form, received_amount: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Trạng thái</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as NccItem['status'] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Chờ xử lý</SelectItem>
                        <SelectItem value="active">Đang thực hiện</SelectItem>
                        <SelectItem value="completed">Hoàn thành</SelectItem>
                      </SelectContent>
                    </Select>
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
          {nccItems.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên NCC</TableHead>
                      <TableHead className="text-right">Giá trị HĐ</TableHead>
                      <TableHead className="text-right">Đã thanh toán</TableHead>
                      <TableHead className="text-right">Tổng chi NTP</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ghi chú</TableHead>
                      {isAdmin && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nccItems.map(item => {
                      const ntpTotal = getNtpTotalForNcc(item.id)
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right">{formatVND(item.contract_amount)}</TableCell>
                          <TableCell className="text-right text-green-600 font-semibold">{formatVND(item.received_amount)}</TableCell>
                          <TableCell className="text-right text-red-600">{formatVND(ntpTotal)}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusVariants[item.status]}`}>
                              {statusLabels[item.status]}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">{item.note}</TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                                  <Pencil className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end mt-3 pt-3 border-t gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Tổng giá trị HĐ</p>
                  <p className="font-bold">{formatVND(totalContract)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Tổng đã thanh toán</p>
                  <p className="font-bold text-green-600">{formatVND(totalReceived)}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center py-8 text-gray-500">Chưa có NCC nào</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
