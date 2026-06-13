import { createClient } from '@/lib/supabase/server'
import { formatVND } from '@/lib/utils/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import DashboardChart from '@/components/dashboard/DashboardChart'
import { Building2, TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: projects },
    { data: nccItems },
    { data: ntpExpenses },
    { data: otherCommitments },
  ] = await Promise.all([
    supabase.from('projects').select('*').order('created_at', { ascending: false }),
    supabase.from('ncc_items').select('project_id, received_amount'),
    supabase.from('ntp_expenses').select('project_id, planned_amount, actual_amount'),
    supabase.from('other_commitments').select('project_id, amount, paid_amount'),
  ])

  const totalProjects = projects?.length || 0
  const totalFromNtp = nccItems?.reduce((s, c) => s + (c.received_amount || 0), 0) || 0
  const totalPlanned =
    (ntpExpenses?.reduce((s, e) => s + (e.planned_amount || 0), 0) || 0) +
    (otherCommitments?.reduce((s, c) => s + (c.amount || 0), 0) || 0)
  const totalSpent =
    (ntpExpenses?.reduce((s, e) => s + (e.actual_amount || 0), 0) || 0) +
    (otherCommitments?.reduce((s, c) => s + (c.paid_amount || 0), 0) || 0)

  // Per-project chart data
  const chartData = (projects || []).map((project) => {
    const projectNcc = nccItems?.filter((c) => c.project_id === project.id) || []
    const projectExpenses = ntpExpenses?.filter((e) => e.project_id === project.id) || []
    const projectCommitments = otherCommitments?.filter((c) => c.project_id === project.id) || []

    const tienCo = projectNcc.reduce((s, c) => s + (c.received_amount || 0), 0)
    const tienChi =
      projectExpenses.reduce((s, e) => s + (e.actual_amount || 0), 0) +
      projectCommitments.reduce((s, c) => s + (c.paid_amount || 0), 0)

    return {
      name: project.code,
      fullName: project.name,
      tienCo,
      tienChi,
    }
  })

  const statusLabels: Record<string, string> = {
    active: 'Đang hoạt động',
    completed: 'Hoàn thành',
    paused: 'Tạm dừng',
  }
  const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    completed: 'secondary',
    paused: 'outline',
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
        <p className="text-gray-500 text-sm">Theo dõi tài chính tất cả dự án</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tổng dự án</CardTitle>
            <Building2 className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalProjects}</p>
            <p className="text-xs text-gray-500 mt-1">dự án đang quản lý</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tổng tiền nhận từ NCC</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatVND(totalFromNtp)}</p>
            <p className="text-xs text-gray-500 mt-1">tiền nhận từ NCC / Nhà Thầu Phụ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tổng chi kế hoạch</CardTitle>
            <Wallet className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{formatVND(totalPlanned)}</p>
            <p className="text-xs text-gray-500 mt-1">chi tiêu kế hoạch</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tổng đã chi</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatVND(totalSpent)}</p>
            <p className="text-xs text-gray-500 mt-1">chi tiêu thực tế</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Biểu đồ tài chính theo dự án</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardChart data={chartData} />
          </CardContent>
        </Card>
      )}

      {/* Recent Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Dự án gần đây</CardTitle>
          <Link href="/projects" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            Xem tất cả <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {projects && projects.length > 0 ? (
            <div className="space-y-3">
              {projects.slice(0, 5).map((project) => {
                const projectNcc = nccItems?.filter((c) => c.project_id === project.id) || []
                const projectExpenses = ntpExpenses?.filter((e) => e.project_id === project.id) || []
                const projectCommitments = otherCommitments?.filter((c) => c.project_id === project.id) || []
                const tienCo = projectNcc.reduce((s, c) => s + (c.received_amount || 0), 0)
                const tienChi =
                  projectExpenses.reduce((s, e) => s + (e.actual_amount || 0), 0) +
                  projectCommitments.reduce((s, c) => s + (c.paid_amount || 0), 0)
                const soDu = tienCo - tienChi

                return (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 text-blue-700 font-mono text-xs font-bold px-2 py-1 rounded">
                          {project.code}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{project.name}</p>
                          <p className="text-xs text-gray-500">{project.client_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-500">Số dư</p>
                          <p className={`text-sm font-semibold ${soDu >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatVND(soDu)}
                          </p>
                        </div>
                        <Badge variant={statusColors[project.status]}>
                          {statusLabels[project.status]}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Chưa có dự án nào</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
