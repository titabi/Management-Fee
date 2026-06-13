'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatVND, formatDate } from '@/lib/utils/format'
import { NccItem, NtpExpense } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AmountInput } from '@/components/ui/amount-input'
import { Plus, Trash2, Pencil, ChevronDown, ChevronRight, BarChart3, TrendingDown, Wallet, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIES = ['Phát sinh', 'Mua vật tư', 'Thuê CTV', 'Thuê thợ', 'Khác']
const statusLabels: Record<string, string> = { pending: 'Chờ xử lý', active: 'Đang thực hiện', completed: 'Hoàn thành' }
const statusVariants: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
}
const categoryColors: Record<string, string> = {
  'Phát sinh': 'bg-orange-100 text-orange-700',
  'Mua vật tư': 'bg-blue-100 text-blue-700',
  'Thuê CTV': 'bg-purple-100 text-purple-700',
  'Thuê thợ': 'bg-teal-100 text-teal-700',
  'Khác': 'bg-gray-100 text-gray-700',
}

interface Props {
  projectId: string
  nccItems: NccItem[]
  ntpExpenses: NtpExpense[]
  isAdmin: boolean
  contractValue?: number
  nccVeQuy?: number
}

const emptyNccForm = {
  name: '',
  contract_amount: '',
  received_amount: '',
  status: 'pending' as NccItem['status'],
  note: '',
}

const emptyExpForm = {
  ncc_item_id: '',
  category: 'Phát sinh',
  description: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  status: 'planned' as NtpExpense['status'],
  note: '',
}

function pct(amount: number, base: number) {
  if (!base || !amount) return null
  return ((amount / base) * 100).toFixed(1) + '%'
}

export default function HopDongNTP({ projectId, nccItems, ntpExpenses, isAdmin, contractValue, nccVeQuy }: Props) {
  const router = useRouter()
  const [expandedNcc, setExpandedNcc] = useState<Set<string>>(new Set())
  const [nccDialogOpen, setNccDialogOpen] = useState(false)
  const [expDialogOpen, setExpDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editNccId, setEditNccId] = useState<string | null>(null)
  const [editExpId, setEditExpId] = useState<string | null>(null)
  const [nccForm, setNccForm] = useState({ ...emptyNccForm })
  const [expForm, setExpForm] = useState({ ...emptyExpForm })

  function toggleNcc(id: string) {
    setExpandedNcc(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function getExpensesForNcc(nccId: string) {
    return ntpExpenses.filter(e => e.ncc_item_id === nccId)
  }

  function getNtpTotalForNcc(nccId: string) {
    return getExpensesForNcc(nccId).reduce((s, e) => s + (e.amount || 0), 0)
  }

  function getNtpPlannedForNcc(nccId: string) {
    return getExpensesForNcc(nccId).filter(e => e.status === 'planned').reduce((s, e) => s + (e.amount || 0), 0)
  }

  function getNtpCompletedForNcc(nccId: string) {
    return getExpensesForNcc(nccId).filter(e => e.status === 'completed').reduce((s, e) => s + (e.amount || 0), 0)
  }

  // NCC CRUD
  function openAddNcc() { setEditNccId(null); setNccForm({ ...emptyNccForm }); setNccDialogOpen(true) }
  function openEditNcc(item: NccItem) {
    setEditNccId(item.id)
    setNccForm({
      name: item.name,
      contract_amount: String(item.contract_amount),
      received_amount: String(item.received_amount),
      status: item.status,
      note: item.note || '',
    })
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
    if (!confirm('Xóa NCC này? Các chi tiêu liên kết sẽ bị bỏ liên kết.')) return
    const supabase = createClient()
    const { error } = await supabase.from('ncc_items').delete().eq('id', id)
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success('Đã xóa NCC!'); router.refresh() }
  }

  // Expense CRUD
  function openAddExp(nccId: string) {
    setEditExpId(null)
    setExpForm({ ...emptyExpForm, ncc_item_id: nccId })
    setExpDialogOpen(true)
  }
  function openEditExp(exp: NtpExpense) {
    setEditExpId(exp.id)
    setExpForm({
      ncc_item_id: exp.ncc_item_id || '',
      category: exp.category,
      description: exp.description,
      amount: String(exp.amount || 0),
      date: exp.date,
      status: exp.status,
      note: exp.note || '',
    })
    setExpDialogOpen(true)
  }

  async function handleExpSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const amountVal = parseInt(expForm.amount.replace(/\D/g, ''), 10) || 0
    const payload = {
      project_id: projectId,
      ncc_item_id: expForm.ncc_item_id || null,
      category: expForm.category,
      description: expForm.description,
      amount: amountVal,
      planned_amount: expForm.status === 'planned' ? amountVal : 0,
      actual_amount: expForm.status === 'completed' ? amountVal : 0,
      date: expForm.date,
      status: expForm.status,
      note: expForm.note || null,
    }
    const res = editExpId
      ? await supabase.from('ntp_expenses').update(payload).eq('id', editExpId)
      : await supabase.from('ntp_expenses').insert(payload)
    if (res.error) toast.error('Lỗi: ' + res.error.message)
    else { toast.success(editExpId ? 'Đã cập nhật!' : 'Thêm thành công!'); setExpDialogOpen(false); router.refresh() }
    setLoading(false)
  }

  async function handleDeleteExp(id: string) {
    if (!confirm('Xóa chi tiêu này?')) return
    const supabase = createClient()
    const { error } = await supabase.from('ntp_expenses').delete().eq('id', id)
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success('Đã xóa!'); router.refresh() }
  }

  // Dashboard calculations
  const totalNccContract = nccItems.reduce((s, c) => s + (c.contract_amount || 0), 0)
  const totalNtpAll = ntpExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const totalNtpPlanned = ntpExpenses.filter(e => e.status === 'planned').reduce((s, e) => s + (e.amount || 0), 0)
  const totalNtpCompleted = ntpExpenses.filter(e => e.status === 'completed').reduce((s, e) => s + (e.amount || 0), 0)
  const totalControlNcc = totalNccContract - totalNtpAll
  const flexNcc = totalControlNcc
  const veQuy = nccVeQuy || 0
  const nccPhaiThu = totalNccContract - veQuy
  const nccInQuy = veQuy - totalNtpCompleted

  return (
    <div className="mt-4 space-y-4">
      {/* Mini Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              <p className="text-xs text-orange-700 font-medium">Tổng GT NCC</p>
            </div>
            <p className="text-lg font-bold text-orange-800">{formatVND(totalNccContract)}</p>
            {contractValue ? <p className="text-xs text-orange-500 mt-0.5">{pct(totalNccContract, contractValue)} giá bán</p> : null}
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <p className="text-xs text-red-700 font-medium">Đã trả NCC</p>
            </div>
            <p className="text-lg font-bold text-red-800">{formatVND(totalNtpCompleted)}</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-yellow-600" />
              <p className="text-xs text-yellow-700 font-medium">Trả NCC in Plan</p>
            </div>
            <p className="text-lg font-bold text-yellow-800">{formatVND(totalNtpPlanned)}</p>
            <p className="text-xs text-yellow-600 mt-0.5">{ntpExpenses.length} mục chi tiêu</p>
          </CardContent>
        </Card>

        <Card className={`border-2 ${flexNcc >= 0 ? 'border-blue-200 bg-blue-50' : 'border-red-300 bg-red-50'}`}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-blue-700 font-medium">Flex NCC</p>
            </div>
            <p className={`text-lg font-bold ${flexNcc >= 0 ? 'text-blue-800' : 'text-red-700'}`}>{formatVND(flexNcc)}</p>
            <p className="text-xs text-blue-500 mt-0.5">GT NCC − Đã trả − in Plan</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-emerald-500" />
              <p className="text-xs text-emerald-700 font-medium">NCC về Quỹ</p>
            </div>
            <p className="text-lg font-bold text-emerald-800">{formatVND(veQuy)}</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-purple-700 font-medium">NCC Phải thu</p>
            </div>
            <p className={`text-lg font-bold ${nccPhaiThu >= 0 ? 'text-purple-800' : 'text-red-700'}`}>{formatVND(nccPhaiThu)}</p>
            <p className="text-xs text-purple-500 mt-0.5">GT NCC − về Quỹ</p>
          </CardContent>
        </Card>

        <Card className={`border-2 ${nccInQuy >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <p className="text-xs text-green-700 font-medium">NCC in Quỹ</p>
            </div>
            <p className={`text-lg font-bold ${nccInQuy >= 0 ? 'text-green-800' : 'text-red-700'}`}>{formatVND(nccInQuy)}</p>
            <p className="text-xs text-green-600 mt-0.5">về Quỹ − Đã trả NCC</p>
          </CardContent>
        </Card>
      </div>

      {/* NCC List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Danh sách NCC / Nhà Thầu Phụ</CardTitle>
          {isAdmin && (
            <Button size="sm" onClick={openAddNcc}>
              <Plus className="h-4 w-4 mr-1" /> Thêm NCC
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {nccItems.length === 0 ? (
            <p className="text-center py-8 text-gray-500">Chưa có NCC nào</p>
          ) : (
            <div className="space-y-3">
              {nccItems.map(item => {
                const ntpTotal = getNtpTotalForNcc(item.id)
                const ntpPlanned = getNtpPlannedForNcc(item.id)
                const ntpCompleted = getNtpCompletedForNcc(item.id)
                const control = item.contract_amount - ntpTotal
                const exps = getExpensesForNcc(item.id)
                const isExpanded = expandedNcc.has(item.id)

                return (
                  <div key={item.id} className="border rounded-lg overflow-hidden">
                    {/* NCC Header Row */}
                    <div
                      className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                      onClick={() => toggleNcc(item.id)}
                    >
                      <button className="text-gray-400 shrink-0">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm">{item.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusVariants[item.status]}`}>
                            {statusLabels[item.status]}
                          </span>
                          {item.note && (
                            <span className="text-xs text-gray-500 italic">&quot;{item.note}&quot;</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-4 items-center shrink-0 flex-wrap justify-end">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-500">Giá trị HĐ</p>
                          <p className="text-sm font-semibold text-orange-700">{formatVND(item.contract_amount)}</p>
                          {contractValue ? <p className="text-xs text-gray-400">{pct(item.contract_amount, contractValue)}</p> : null}
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-500">Đã chi</p>
                          <p className="text-sm font-semibold text-red-600">{formatVND(ntpCompleted)}</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-500">Kế hoạch</p>
                          <p className="text-sm font-semibold text-yellow-600">{formatVND(ntpPlanned)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Tiền control</p>
                          <p className={`text-sm font-bold ${control >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatVND(control)}</p>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditNcc(item)}>
                              <Pencil className="h-3.5 w-3.5 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteNcc(item.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded sub-expenses */}
                    {isExpanded && (
                      <div className="p-3 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Chi tiêu NTP</p>
                          {isAdmin && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAddExp(item.id)}>
                              <Plus className="h-3 w-3 mr-1" /> Thêm chi tiêu
                            </Button>
                          )}
                        </div>
                        {exps.length === 0 ? (
                          <p className="text-center py-4 text-gray-400 text-sm">Chưa có chi tiêu nào</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="text-xs">
                                  <TableHead className="py-2">Mô tả</TableHead>
                                  <TableHead className="py-2">Danh mục</TableHead>
                                  <TableHead className="py-2 text-right">Số tiền</TableHead>
                                  <TableHead className="py-2">Trạng thái</TableHead>
                                  <TableHead className="py-2">Ngày</TableHead>
                                  {isAdmin && <TableHead className="py-2"></TableHead>}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {exps.map(exp => (
                                  <TableRow key={exp.id} className="text-sm">
                                    <TableCell className="py-2 font-medium">{exp.description}</TableCell>
                                    <TableCell className="py-2">
                                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${categoryColors[exp.category] || 'bg-gray-100 text-gray-700'}`}>
                                        {exp.category}
                                      </span>
                                    </TableCell>
                                    <TableCell className="py-2 text-right font-semibold">
                                      {formatVND(exp.amount || 0)}
                                      {contractValue ? <span className="text-xs text-gray-400 ml-1">({pct(exp.amount || 0, contractValue)})</span> : null}
                                    </TableCell>
                                    <TableCell className="py-2">
                                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${exp.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {exp.status === 'completed' ? 'Đã chi' : 'Kế hoạch'}
                                      </span>
                                    </TableCell>
                                    <TableCell className="py-2 text-gray-500 text-xs">{formatDate(exp.date)}</TableCell>
                                    {isAdmin && (
                                      <TableCell className="py-2">
                                        <div className="flex gap-1">
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditExp(exp)}>
                                            <Pencil className="h-3 w-3 text-blue-500" />
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteExp(exp.id)}>
                                            <Trash2 className="h-3 w-3 text-red-500" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                        <div className="flex justify-end gap-4 mt-2 pt-2 border-t text-sm">
                          <span className="text-gray-500">Tổng chi: <span className="font-bold text-red-600">{formatVND(ntpTotal)}</span></span>
                          <span className="text-gray-500">Tiền control: <span className={`font-bold ${control >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatVND(control)}</span></span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* NCC Dialog */}
      <Dialog open={nccDialogOpen} onOpenChange={setNccDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editNccId ? 'Cập nhật NCC' : 'Thêm NCC / Nhà Thầu Phụ'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNccSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tên NCC *</Label>
              <Input value={nccForm.name} onChange={e => setNccForm({ ...nccForm, name: e.target.value })} required placeholder="Tên nhà cung cấp / nhà thầu phụ" />
            </div>
            <AmountInput label="Giá trị HĐ" value={nccForm.contract_amount} onChange={v => setNccForm({ ...nccForm, contract_amount: v })} contractValue={contractValue} />
            <AmountInput label="Đã thanh toán" value={nccForm.received_amount} onChange={v => setNccForm({ ...nccForm, received_amount: v })} contractValue={contractValue} />
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select value={nccForm.status} onValueChange={v => setNccForm({ ...nccForm, status: v as NccItem['status'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Chờ xử lý</SelectItem>
                  <SelectItem value="active">Đang thực hiện</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ghi chú theo dõi đặc biệt</Label>
              <Textarea value={nccForm.note} onChange={e => setNccForm({ ...nccForm, note: e.target.value })} rows={2} placeholder="NCC cần theo dõi đặc biệt..." />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setNccDialogOpen(false)}>Hủy</Button>
              <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={expDialogOpen} onOpenChange={setExpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editExpId ? 'Cập nhật chi tiêu' : 'Thêm chi tiêu NTP'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExpSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Thuộc NCC</Label>
              <Select value={expForm.ncc_item_id} onValueChange={v => setExpForm({ ...expForm, ncc_item_id: v })}>
                <SelectTrigger><SelectValue placeholder="-- Chọn NCC --" /></SelectTrigger>
                <SelectContent>
                  {nccItems.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Danh mục</Label>
                <Select value={expForm.category} onValueChange={v => setExpForm({ ...expForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select value={expForm.status} onValueChange={v => setExpForm({ ...expForm, status: v as NtpExpense['status'] })}>
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
              <Input value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} required placeholder="Mô tả chi tiêu..." />
            </div>
            <AmountInput label="Số tiền" value={expForm.amount} onChange={v => setExpForm({ ...expForm, amount: v })} contractValue={contractValue} required />
            <div className="space-y-2">
              <Label>Ngày</Label>
              <Input type="date" value={expForm.date} onChange={e => setExpForm({ ...expForm, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea value={expForm.note} onChange={e => setExpForm({ ...expForm, note: e.target.value })} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setExpDialogOpen(false)}>Hủy</Button>
              <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
