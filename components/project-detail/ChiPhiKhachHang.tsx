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
import { ShieldX, Plus, Trash2, Pencil, Wallet, TrendingDown, Users, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIES = ['Phí dịch vụ', 'Vật tư', 'Nhân công', 'Thiết bị', 'Vận chuyển', 'Khác']

interface Props {
  projectId: string
  customerCosts: CustomerCost[]
  isAdmin: boolean
  contractValue?: number
  khBudget?: number
  khVeQuy?: number
}

const emptyForm = {
  description: '',
  amount: '',
  category: 'Phí dịch vụ',
  date: new Date().toISOString().split('T')[0],
  status: 'planned' as 'planned' | 'completed',
  note: '',
  customer_name: '',
}

function pct(amount: number, base: number) {
  if (!base || !amount) return null
  return ((amount / base) * 100).toFixed(1) + '%'
}

export default function ChiPhiKhachHang({ projectId, customerCosts, isAdmin, contractValue, khBudget, khVeQuy }: Props) {
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
      customer_name: c.customer_name || '',
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
      customer_name: form.customer_name || null,
    }
    const res = editId
      ? await supabase.from('customer_costs').update(payload).eq('id', editId)
      : await supabase.from('customer_costs').insert(payload)
    if (res.error) toast.error('Lỗi: ' + res.error.message)
    else { toast.success(editId ? 'Đã cập nhật!' : 'Thêm thành công!'); setOpen(false); router.refresh() }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa chi phí này?')) return
    const supabase = createClient()
    const { error } = await supabase.from('customer_costs').delete().eq('id', id)
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success('Đã xóa!'); router.refresh() }
  }

  const cpkh = khBudget || 0
  const daTraKH = customerCosts.filter(c => c.status === 'completed').reduce((s, c) => s + (c.amount || 0), 0)
  const traKHinPlan = customerCosts.filter(c => c.status === 'planned').reduce((s, c) => s + (c.amount || 0), 0)
  const flexKH = cpkh - daTraKH - traKHinPlan
  const veQuy = khVeQuy || 0
  const phaiThu = flexKH - veQuy
  const inQuy = veQuy - daTraKH
  const totalAll = customerCosts.reduce((s, c) => s + (c.amount || 0), 0)

  // Group by customer_name
  const grouped: Record<string, CustomerCost[]> = {}
  for (const cost of customerCosts) {
    const key = cost.customer_name || '(Chưa phân nhóm)'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(cost)
  }
  const groupKeys = Object.keys(grouped).sort()

  return (
    <div className="mt-4 space-y-4">
      {/* Mini Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-purple-700 font-medium">CPKH</p>
            </div>
            <p className="text-lg font-bold text-purple-800">{formatVND(cpkh)}</p>
            {contractValue ? <p className="text-xs text-purple-500 mt-0.5">{pct(cpkh, contractValue)} giá bán</p> : null}
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <p className="text-xs text-red-700 font-medium">Đã Trả KH</p>
            </div>
            <p className="text-lg font-bold text-red-800">{formatVND(daTraKH)}</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-yellow-600" />
              <p className="text-xs text-yellow-700 font-medium">Trả KH in Plan</p>
            </div>
            <p className="text-lg font-bold text-yellow-800">{formatVND(traKHinPlan)}</p>
            <p className="text-xs text-yellow-600 mt-0.5">{customerCosts.length} mục chi phí</p>
          </CardContent>
        </Card>

        <Card className={`border-2 ${flexKH >= 0 ? 'border-blue-200 bg-blue-50' : 'border-red-300 bg-red-50'}`}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-blue-700 font-medium">Flex KH</p>
            </div>
            <p className={`text-lg font-bold ${flexKH >= 0 ? 'text-blue-800' : 'text-red-700'}`}>{formatVND(flexKH)}</p>
            <p className="text-xs text-blue-500 mt-0.5">CPKH − Đã trả − in Plan</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-emerald-500" />
              <p className="text-xs text-emerald-700 font-medium">CPKH về Quỹ</p>
            </div>
            <p className="text-lg font-bold text-emerald-800">{formatVND(veQuy)}</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              <p className="text-xs text-orange-700 font-medium">CPKH phải Thu</p>
            </div>
            <p className={`text-lg font-bold ${phaiThu >= 0 ? 'text-orange-800' : 'text-red-700'}`}>{formatVND(phaiThu)}</p>
            <p className="text-xs text-orange-500 mt-0.5">Flex KH − về Quỹ</p>
          </CardContent>
        </Card>

        <Card className={`border-2 ${inQuy >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <p className="text-xs text-green-700 font-medium">CPKH in Quỹ</p>
            </div>
            <p className={`text-lg font-bold ${inQuy >= 0 ? 'text-green-800' : 'text-red-700'}`}>{formatVND(inQuy)}</p>
            <p className="text-xs text-green-600 mt-0.5">về Quỹ − Đã trả KH</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Chi phí Khách Hàng</CardTitle>
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Thêm</Button>
        </CardHeader>
        <CardContent>
          {customerCosts.length === 0 ? (
            <p className="text-center py-8 text-gray-500">Chưa có chi phí nào</p>
          ) : (
            <div className="space-y-4">
              {groupKeys.map(groupKey => {
                const items = grouped[groupKey]
                const groupTotal = items.reduce((s, c) => s + (c.amount || 0), 0)
                return (
                  <div key={groupKey}>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-sm font-semibold text-gray-700">{groupKey}</span>
                      <span className="text-sm font-bold text-purple-700">{formatVND(groupTotal)}</span>
                    </div>
                    <div className="overflow-x-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ngày</TableHead>
                            <TableHead>Mô tả</TableHead>
                            <TableHead>Danh mục</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead className="text-right">Số tiền</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map(cost => (
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
                              <TableCell className="text-right font-semibold">
                                {formatVND(cost.amount)}
                                {contractValue ? <span className="text-xs text-gray-400 ml-1">({pct(cost.amount, contractValue)})</span> : null}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => openEdit(cost)}><Pencil className="h-4 w-4 text-blue-500" /></Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDelete(cost.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {customerCosts.length > 0 && (
            <div className="flex justify-end gap-6 mt-3 pt-3 border-t flex-wrap">
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-0.5">Trả KH in Plan</p>
                <p className="font-semibold text-yellow-700">{formatVND(traKHinPlan)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-0.5">Đã Trả KH</p>
                <p className="font-semibold text-green-700">{formatVND(daTraKH)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-0.5">Tổng cộng</p>
                <p className="font-bold text-lg">{formatVND(totalAll)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-0.5">Flex KH</p>
                <p className={`font-bold text-lg ${flexKH >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatVND(flexKH)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Cập nhật chi phí KH' : 'Thêm chi phí khách hàng'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tên khách hàng (nhóm)</Label>
              <Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} placeholder="Tên khách hàng để phân nhóm (tuỳ chọn)" />
            </div>
            <div className="space-y-2">
              <Label>Mô tả *</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required placeholder="Tên chi phí..." />
            </div>
            <AmountInput label="Số tiền" value={form.amount} onChange={v => setForm({ ...form, amount: v })} contractValue={contractValue} required />
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
