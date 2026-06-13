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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-orange-700 font-medium">Tổng HĐ NCC/NTP</p>
            <p className="text-lg font-bold text-orange-700">{formatVND(totalNccContract)}</p>
          </CardContent>
        </Card>
        <Card className={controlNcc >= 0 ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="pt-4 pb-3">
            <p className={`text-xs font-medium ${controlNcc >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Flex NCC/NTP</p>
            <p className={`text-lg font-bold ${controlNcc >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatVND(controlNcc)}</p>
          </CardContent>
        </Card>
        <Card className={controlKH >= 0 ? 'border-purple-200 bg-purple-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="pt-4 pb-3">
            <p className={`text-xs font-medium ${controlKH >= 0 ? 'text-purple-700' : 'text-red-700'}`}>Flex CPKH</p>
            <p className={`text-lg font-bold ${controlKH >= 0 ? 'text-purple-700' : 'text-red-700'}`}>{formatVND(controlKH)}</p>
          </CardContent>
        </Card>
        <Card className={totalManage >= 0 ? 'border-blue-300 bg-blue-100' : 'border-red-200 bg-red-50'}>
          <CardContent className="pt-4 pb-3">
            <p className={`text-xs font-medium ${totalManage >= 0 ? 'text-blue-800' : 'text-red-700'}`}>Flex Project</p>
            <p className={`text-lg font-bold ${totalManage >= 0 ? 'text-blue-800' : 'text-red-700'}`}>{formatVND(totalManage)}</p>
          </CardContent>
        </Card>
      </div>

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
          />
        </TabsContent>

        <TabsContent value="ncc-ntp">
          <HopDongNTP
            projectId={id}
            nccItems={nccItems || []}
            ntpExpenses={ntpExpenses || []}
            isAdmin={isAdmin}
            contractValue={plSummary?.contract_value || 0}
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
