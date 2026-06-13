import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatVND } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Profile } from '@/types'
import TongQuan from '@/components/project-detail/TongQuan'
import ChiPhiKhachHang from '@/components/project-detail/ChiPhiKhachHang'
import HopDongNTP from '@/components/project-detail/HopDongNTP'
import ChiTieuNTP from '@/components/project-detail/ChiTieuNTP'
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
    { data: ntpContracts },
    { data: ntpExpenses },
    { data: otherCommitments },
    { data: plEntries },
    { data: customerCosts },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('ntp_contracts').select('*').eq('project_id', id).order('date', { ascending: false }),
    supabase.from('ntp_expenses').select('*').eq('project_id', id).order('date', { ascending: false }),
    supabase.from('other_commitments').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('pl_entries').select('*').eq('project_id', id).order('date', { ascending: false }),
    supabase.from('customer_costs').select('*').eq('project_id', id).order('date', { ascending: false }),
  ])

  if (!project) notFound()

  const isAdmin = (profile as Profile | null)?.role === 'admin'

  const totalFromNtp = ntpContracts?.reduce((s, c) => s + (c.received_amount || 0), 0) || 0
  const totalPlanned =
    (ntpExpenses?.reduce((s, e) => s + (e.planned_amount || 0), 0) || 0) +
    (otherCommitments?.reduce((s, c) => s + (c.amount || 0), 0) || 0)
  const totalSpent =
    (ntpExpenses?.reduce((s, e) => s + (e.actual_amount || 0), 0) || 0) +
    (otherCommitments?.reduce((s, c) => s + (c.paid_amount || 0), 0) || 0)
  const balance = totalFromNtp - totalSpent

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
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-green-700 font-medium">Tiền NTP</p>
            <p className="text-lg font-bold text-green-700">{formatVND(totalFromNtp)}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-orange-700 font-medium">Chi kế hoạch</p>
            <p className="text-lg font-bold text-orange-700">{formatVND(totalPlanned)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-red-700 font-medium">Đã chi</p>
            <p className="text-lg font-bold text-red-700">{formatVND(totalSpent)}</p>
          </CardContent>
        </Card>
        <Card className={balance >= 0 ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="pt-4 pb-3">
            <p className={`text-xs font-medium ${balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Số dư</p>
            <p className={`text-lg font-bold ${balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatVND(balance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tong-quan">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
          <TabsTrigger value="tong-quan" className="text-xs">Tổng quan</TabsTrigger>
          <TabsTrigger value="khach-hang" className="text-xs">Chi phí KH</TabsTrigger>
          <TabsTrigger value="hop-dong-ntp" className="text-xs">HĐ NTP</TabsTrigger>
          <TabsTrigger value="chi-tieu-ntp" className="text-xs">Chi tiêu NTP</TabsTrigger>
          <TabsTrigger value="pl-final" className="text-xs">P/L Final</TabsTrigger>
          <TabsTrigger value="cam-ket" className="text-xs">Cam kết khác</TabsTrigger>
        </TabsList>

        <TabsContent value="tong-quan">
          <TongQuan
            project={project}
            ntpContracts={ntpContracts || []}
            ntpExpenses={ntpExpenses || []}
            otherCommitments={otherCommitments || []}
            plEntries={plEntries || []}
            isAdmin={isAdmin}
            customerCosts={customerCosts || []}
          />
        </TabsContent>

        <TabsContent value="khach-hang">
          <ChiPhiKhachHang
            projectId={id}
            customerCosts={customerCosts || []}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="hop-dong-ntp">
          <HopDongNTP
            projectId={id}
            contracts={ntpContracts || []}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="chi-tieu-ntp">
          <ChiTieuNTP
            projectId={id}
            expenses={ntpExpenses || []}
            contracts={ntpContracts || []}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="pl-final">
          <PLFinal
            projectId={id}
            entries={plEntries || []}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="cam-ket">
          <CamKetKhac
            projectId={id}
            commitments={otherCommitments || []}
            isAdmin={isAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
