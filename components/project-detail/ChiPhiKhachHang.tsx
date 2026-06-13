'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatVND, formatDate } from '@/lib/utils/format'
import { CustomerCost } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ShieldX, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIES = ['Phí dịch vụ', 'Vật tư', 'Nhân công', 'Thiết bị', 'Vận chuyển', 'Khác']

interface Props {
  projectId: string
  customerCosts: CustomerCost[]
  isAdmin: boolean
}

export default function ChiPhiKhachHang({ projectId, customerCosts, isAdmin }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'Phí dịch vụ',
    date: new Date().toISOString().split('T')[0],
    note: '',
  })

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('customer_costs').insert({
      project_id: projectId,
      description: form.description,
      amount: parseInt(form.amount.replace(/\D/g, ''), 10) || 0,
      category: form.category,
      date: form.date,
      note: form.note || null,
    })
    if (error) {
      toast.error('Lỗi: ' + error.message)
    } else {
      toast.success('Thêm chi phí thành công!')
      setOpen(false)
      setForm({ description: '', amount: '', category: 'Phí dịch vụ', date: new Date().toISOString().split('T')[0], note: '' })
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

  const total = customerCosts.reduce((s, c) => s + (c.amount || 0), 0)

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Chi phí khách hàng</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Thêm</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Thêm chi phí khách hàng</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Mô tả *</Label>
                  <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Số tiền (VND) *</Label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Danh mục</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
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
        </CardHeader>
        <CardContent>
          {customerCosts.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
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
                      <TableCell className="text-right font-semibold">{formatVND(cost.amount)}</TableCell>
                      <TableCell className="text-sm text-gray-500">{cost.note}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(cost.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end mt-3 pt-3 border-t">
                <div className="text-right">
                  <span className="text-sm text-gray-600">Tổng cộng: </span>
                  <span className="font-bold text-lg">{formatVND(total)}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center py-8 text-gray-500">Chưa có chi phí nào</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
