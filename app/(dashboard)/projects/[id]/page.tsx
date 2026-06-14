import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatVND } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Profile } from '@/types'
import ChiPhiKhachHang from '@/components/project-detail/ChiPhiKhachHang'
import HopDongNTP from '@/components/project-detail/HopDongNTP'
import PLFinal from '@/components/project-detail/PLFinal'
import CamKetKhac from '@/components/project-detail/CamKetKhac'

const statusLabels: Record<string, string> = {
  active: 'Đang hoạt động',
  completed: 'Hoàn thành',
  paused: 'Tạm dừng',
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: project },
    { data: profile },
    { data: nccItems },
    { data: ntpExpenses },
    { data: otherCommitments },
    { data: plSummary },
    { data: customerCosts },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('ncc_items').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('ntp_expenses').select('*').eq('project_id', id).order('date', { ascending: false }),
    supabase.from('other_commitments').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('pl_summary').select('*').eq('project_id', id).maybeSingle(),
    supabase.from('customer_costs').select('*').eq('project_id', id).order('date', { ascending: false }),
  ])

  if (!project) notFound()

  const isAdmin = (profile as Profile | null)?.role === 'admin'

  // Calculate quick stats using new formulas
  const totalNccContract = nccItems?.reduce((s, c) => s + (c.contract_amount || 0), 0) || 0
  const totalNtpAll = ntpExpenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0
  const totalCustomerCosts = customerCosts?.reduce((s, c) => s + (c.amount || 0), 0) || 0
  const controlNcc = totalNccContract - totalNtpAll
  const controlKH = (plSummary?.kh_budget || 0) - totalCustomerCosts
  const totalManage = controlNcc + controlKH

  // Quỹ dự án (3 con số vàng)
  const veQuyNcc = nccItems?.reduce((s, c) => s + (c.ve_quy || 0), 0) || 0
  const veQuyKh = customerCosts?.reduce((s, c) => s + (c.ve_quy || 0), 0) || 0
  const daChiQuy = otherCommitments?.reduce((s, c) => s + (c.paid_amount || 0), 0) || 0
  const camKetQuy = otherCommitments?.reduce((s, c) => s + (c.amount || 0), 0) || 0
  const dangGiu = (veQuyNcc + veQuyKh) - daChiQuy
  const nccPhaiThu = totalNccContract - veQuyNcc
  const khPhaiThu = controlKH - veQuyKh
  const phaiThu = nccPhaiThu + khPhaiThu
  const phaiChi = camKetQuy - daChiQuy
  const flexRong = (phaiThu + dangGiu) - phaiChi

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="bg-blue-100 text-blue-700 font-mono text-sm font-bold px-3 py-1.5 rounded self-start">
          {project.code}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-500 text-sm">Khách hàng: {project.client_name}</p>
        </div>
        <Badge
          variant={project.status === 'active' ? 'default' : project.status === 'completed' ? 'secondary' : 'outline'}
          className={project.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
        >
          {statusLabels[project.status]}
        </Badge>
      </div>

      {/* Tổng quan dự án (gộp 1 khối) */}
      <Card className="border-slate-200 overflow-hidden">
        {/* Hàng đầu: Flex Project (sổ quản lý hợp đồng) */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-blue-200 font-medium">Flex Project</p>
            <p className="text-2xl font-bold text-white tracking-tight">{formatVND(totalManage)}</p>
          </div>
          <div className="flex gap-5 text-right">
            <div>
              <p className="text-[11px] text-blue-300">Flex NCC</p>
              <p className="text-sm font-semibold text-white">{formatVND(controlNcc)}</p>
            </div>
            <div>
              <p className="text-[11px] text-blue-300">Flex CPKH</p>
              <p className="text-sm font-semibold text-white">{formatVND(controlKH)}</p>
            </div>
            <div>
              <p className="text-[11px] text-blue-300">Tổng HĐ NCC</p>
              <p className="text-sm font-semibold text-white">{formatVND(totalNccContract)}</p>
            </div>
          </div>
        </div>
        {/* Hàng dưới: Quỹ cá nhân (4 con số vàng) */}
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-slate-400 mb-2.5">💰 Quỹ dự án — dòng tiền cá nhân của bạn</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-xs text-emerald-600 font-medium">Đang giữ</p>
              <p className={`text-lg font-bold ${dangGiu >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatVND(dangGiu)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Đã về Quỹ − Đã chi</p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-600 font-medium">Phải thu</p>
              <p className={`text-lg font-bold ${phaiThu >= 0 ? 'text-amber-700' : 'text-red-600'}`}>{formatVND(phaiThu)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Dự kiến về − Đã về Quỹ</p>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-xs text-red-600 font-medium">Phải chi</p>
              <p className={`text-lg font-bold ${phaiChi <= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatVND(phaiChi)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Cam kết chi − Đã chi</p>
            </div>
            <div className="rounded-lg bg-blue-50 border-2 border-blue-300 p-3">
              <p className="text-xs text-blue-600 font-medium">Flex ròng</p>
              <p className={`text-lg font-bold ${flexRong >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatVND(flexRong)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">(Phải thu + Đang giữ) − Phải chi</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="khach-hang">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full">
          <TabsTrigger value="khach-hang" className="text-xs">Chi phí KH</TabsTrigger>
          <TabsTrigger value="ncc-ntp" className="text-xs">NCC / NTP</TabsTrigger>
          <TabsTrigger value="pl-final" className="text-xs">P/L Final</TabsTrigger>
          <TabsTrigger value="cam-ket" className="text-xs">Cam kết khác</TabsTrigger>
        </TabsList>

        <TabsContent value="khach-hang">
          <ChiPhiKhachHang
            projectId={id}
            customerCosts={customerCosts || []}
            isAdmin={isAdmin}
            contractValue={plSummary?.contract_value || 0}
            khBudget={plSummary?.kh_budget || 0}
            khVeQuy={plSummary?.kh_ve_quy || 0}
          />
        </TabsContent>

        <TabsContent value="ncc-ntp">
          <HopDongNTP
            projectId={id}
            nccItems={nccItems || []}
            ntpExpenses={ntpExpenses || []}
            isAdmin={isAdmin}
            contractValue={plSummary?.contract_value || 0}
            nccVeQuy={plSummary?.ncc_ve_quy || 0}
          />
        </TabsContent>

        <TabsContent value="pl-final">
          <PLFinal
            projectId={id}
            plSummary={plSummary || null}
            nccItems={nccItems || []}
            customerCosts={customerCosts || []}
            ntpExpenses={ntpExpenses || []}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="cam-ket">
          <CamKetKhac
            projectId={id}
            commitments={otherCommitments || []}
            isAdmin={isAdmin}
            contractValue={plSummary?.contract_value || 0}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
