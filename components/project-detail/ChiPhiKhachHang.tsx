'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatVND, formatDate } from '@/lib/utils/format'
import { CustomerCost } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AmountInput } from '@/components/ui/amount-input'
import { ShieldX, Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIES = ['Phí dịch vụ', 'Vật tư', 'Nhân công', 'Thiết bị', 'Vận chuyển', 'Khác']

interface Props {
  projectId: string
  customerCosts: CustomerCost[]
  isAdmin: boolean
  contractValue?: number
}

const emptyForm = {
  description: '',
  amount: '',
  category: 'Phí dịch vụ',
  date: new Date().toISOString().split('T')[0],
  status: 'planned' as 'planned' | 'completed',
  note: '',
}

export default function ChiPhiKhachHang({ projectId, customerCosts, isAdmin, contractValue }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  if (!isAdmin) {
    return (
      <Card className="mt-4">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <ShieldX className="h-16 w-16 text-gray-300" />
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-600">Không có quyền truy cập</p>
            <p className="text-sm text-gray-400 mt-1">Chỉ quản trị viên mới có thể xem thông tin này</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  function openAdd() { setEditId(null); setForm({ ...emptyForm }); setOpen(true) }
  function openEdit(c: CustomerCost) {
    setEditId(c.id)
    setForm({
      description: c.description,
      amount: String(c.amount),
      category: c.category,
      date: c.date,
      status: c.status || 'planned',
      note: c.note || '',
    })
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const payload = {
      project_id: projectId,
      description: form.description,
      amount: parseInt(form.amount.replace(/\D/g, ''), 10) || 0,
      category: form.category,
      date: form.date,
      status: form.status,
      note: form.note || null,
    }
    let error
    if (editId) {
      const res = await supabase.from('customer_costs').update(payload).eq('id', editId)
      error = res.error
    } else {
      const res = await supabase.from('customer_costs').insert(payload)
      error = res.error
    }
    if (error) {
      toast.error('Lỗi: ' + error.message)
    } else {
      toast.success(editId ? 'Đã cập nhật!' : 'Thêm thành công!')
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa chi phí này?')) return
    const supabase = createClient()
    const { error } = await supabase.from('customer_costs').delete().eq('id', id)
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success('Đã xóa!'); router.refresh() }
  }

  const totalPlanned = customerCosts.filter(c => c.status === 'planned').reduce((s, c) => s + (c.amount || 0), 0)
  const totalCompleted = customerCosts.filter(c => c.status === 'completed').reduce((s, c) => s + (c.amount || 0), 0)
  const total = customerCosts.reduce((s, c) => s + (c.amount || 0), 0)

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Chi phí khách hàng</CardTitle>
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Thêm</Button>
        </CardHeader>
        <CardContent>
          {customerCosts.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      {contractValue ? <TableHead className="text-right">%</TableHead> : null}
                      <TableHead>Ghi chú</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerCosts.map(cost => (
                      <TableRow key={cost.id}>
                        <TableCell className="text-sm text-gray-500">{formatDate(cost.date)}</TableCell>
                        <TableCell className="font-medium">{cost.description}</TableCell>
                        <TableCell><span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{cost.category}</span></TableCell>
                        <TableCell>
                          {cost.status === 'completed'
                            ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Đã chi</span>
                            : <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-medium">Kế hoạch</span>
                          }
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatVND(cost.amount)}</TableCell>
                        {contractValue ? (
                          <TableCell className="text-right text-xs text-gray-500">
                            {contractValue > 0 ? ((cost.amount / contractValue) * 100).toFixed(1) + '%' : '—'}
                          </TableCell>
                        ) : null}
                        <TableCell className="text-sm text-gray-500">{cost.note}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(cost)}>
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(cost.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-6 mt-3 pt-3 border-t flex-wrap">
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-0.5">Kế hoạch (còn lại)</p>
                  <p className="font-semibold text-yellow-700">{formatVND(totalPlanned)}</p>
                  {contractValue ? <p className="text-xs text-gray-400">{((totalPlanned/contractValue)*100).toFixed(1)}%</p> : null}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-0.5">Đã chi</p>
                  <p className="font-semibold text-green-700">{formatVND(totalCompleted)}</p>
                  {contractValue ? <p className="text-xs text-gray-400">{((totalCompleted/contractValue)*100).toFixed(1)}%</p> : null}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-0.5">Tổng cộng</p>
                  <p className="font-bold text-lg">{formatVND(total)}</p>
                  {contractValue ? <p className="text-xs text-gray-400">{((total/contractValue)*100).toFixed(1)}%</p> : null}
                </div>
              </div>
            </>
          ) : (
            <p className="text-center py-8 text-gray-500">Chưa có chi phí nào</p>
          )}
        </CardContent>
      </Card>

      {/* Dialog Add/Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Cập nhật chi phí KH' : 'Thêm chi phí khách hàng'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Mô tả *</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required placeholder="Tên chi phí..." />
            </div>
            <AmountInput
              label="Số tiền"
              value={form.amount}
              onChange={v => setForm({ ...form, amount: v })}
              contractValue={contractValue}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Danh mục</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as 'planned' | 'completed' })}>
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
