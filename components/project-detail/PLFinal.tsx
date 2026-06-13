'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatVND, formatDate } from '@/lib/utils/format'
import { PlEntry } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  projectId: string
  entries: PlEntry[]
  isAdmin: boolean
}

const emptyForm = { category: '', revenue: '', cost: '', note: '', date: new Date().toISOString().split('T')[0] }

export default function PLFinal({ projectId, entries, isAdmin }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  function openAdd() { setEditId(null); setForm({ ...emptyForm }); setOpen(true) }
  function openEdit(e: PlEntry) {
    setEditId(e.id)
    setForm({ category: e.category, revenue: String(e.revenue), cost: String(e.cost), note: e.note || '', date: e.date })
    setOpen(true)
  }

  async function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const payload = {
      project_id: projectId, category: form.category,
      revenue: parseInt(form.revenue.replace(/\D/g, ''), 10) || 0,
      cost: parseInt(form.cost.replace(/\D/g, ''), 10) || 0,
      note: form.note || null, date: form.date,
    }
    let error
    if (editId) {
      const res = await supabase.from('pl_entries').update(payload).eq('id', editId)
      error = res.error
    } else {
      const res = await supabase.from('pl_entries').insert(payload)
      error = res.error
    }
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success(editId ? 'Đã cập nhật!' : 'Thêm thành công!'); setOpen(false); router.refresh() }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa mục P/L này?')) return
    const supabase = createClient()
    const { error } = await supabase.from('pl_entries').delete().eq('id', id)
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success('Đã xóa!'); router.refresh() }
  }

  const totalRevenue = entries.reduce((s, e) => s + (e.revenue || 0), 0)
  const totalCost = entries.reduce((s, e) => s + (e.cost || 0), 0)
  const netPL = totalRevenue - totalCost

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">P/L Final</CardTitle>
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Thêm</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editId ? 'Cập nhật P/L' : 'Thêm mục P/L'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Danh mục *</Label>
                    <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required placeholder="Ví dụ: Doanh thu dịch vụ" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Doanh thu (VND)</Label>
                      <Input type="number" value={form.revenue} onChange={e => setForm({ ...form, revenue: e.target.value })} placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Chi phí (VND)</Label>
                      <Input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="0" />
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
          )}
        </CardHeader>
        <CardContent>
          {entries.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead className="text-right">Doanh thu</TableHead>
                      <TableHead className="text-right">Chi phí</TableHead>
                      <TableHead className="text-right">Lợi nhuận</TableHead>
                      <TableHead>Ghi chú</TableHead>
                      {isAdmin && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm text-gray-500">{formatDate(e.date)}</TableCell>
                        <TableCell className="font-medium">{e.category}</TableCell>
                        <TableCell className="text-right text-green-600">{formatVND(e.revenue)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatVND(e.cost)}</TableCell>
                        <TableCell className={`text-right font-semibold ${e.revenue - e.cost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatVND(e.revenue - e.cost)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{e.note}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(e)}><Pencil className="h-4 w-4 text-blue-500" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className={`mt-3 pt-3 border-t-2 ${netPL >= 0 ? 'border-green-300' : 'border-red-300'}`}>
                <div className="flex justify-end gap-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Tổng doanh thu</p>
                    <p className="font-bold text-green-600">{formatVND(totalRevenue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Tổng chi phí</p>
                    <p className="font-bold text-red-600">{formatVND(totalCost)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Lợi nhuận ròng</p>
                    <p className={`font-bold text-lg ${netPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatVND(netPL)}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center py-8 text-gray-500">Chưa có mục P/L nào</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
