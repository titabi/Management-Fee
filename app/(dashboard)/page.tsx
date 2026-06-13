import { createClient } from '@/lib/supabase/server'
import { formatVND } from '@/lib/utils/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import DashboardChart from '@/components/dashboard/DashboardChart'
import { Building2, TrendingUp, TrendingDown, Wallet, ArrowRight, BarChart3, Users, ShieldCheck } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: projects },
    { data: nccItems },
    { data: ntpExpenses },
    { data: customerCosts },
    { data: plSummaries },
  ] = await Promise.all([
    supabase.from('projects').select('*').order('created_at', { ascending: false }),
    supabase.from('ncc_items').select('project_id, received_amount, contract_amount'),
    supabase.from('ntp_expenses').select('project_id, amount, status'),
    supabase.from('customer_costs').select('project_id, amount, status'),
    supabase.from('pl_summary').select('project_id, contract_value, p11_profit, kh_budget'),
  ])

  const totalProjects = projects?.length || 0

  // Revenue
  const totalRevenue = plSummaries?.reduce((s, p) => s + (p.contract_value || 0), 0) || 0
  const totalP11 = plSummaries?.reduce((s, p) => s + (p.p11_profit || 0), 0) || 0

  // NCC control: per project = ncc.contract_amount - Σ(ntp_expenses.amount)
  const totalNccContract = nccItems?.reduce((s, c) => s + (c.contract_amount || 0), 0) || 0
  const totalNtpAll = ntpExpenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0
  const totalControlNcc = totalNccContract - totalNtpAll

  // KH control: per project = kh_budget - Σ(customer_costs.amount)
  const totalKhBudget = plSummaries?.reduce((s, p) => s + (p.kh_budget || 0), 0) || 0
  const totalCustomerCosts = customerCosts?.reduce((s, c) => s + (c.amount || 0), 0) || 0
  const totalControlKH = totalKhBudget - totalCustomerCosts

  // Tổng Manage = KH control + NCC control
  const totalManage = totalControlKH + totalControlNcc

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

  // Per-project chart data
  const chartData = (projects || []).map((project) => {
    const projectNcc = nccItems?.filter((c) => c.project_id === project.id) || []
    const projectExpenses = ntpExpenses?.filter((e) => e.project_id === project.id) || []
    const tienCo = projectNcc.reduce((s, c) => s + (c.received_amount || 0), 0)
    const tienChi = projectExpenses.reduce((s, e) => s + (e.amount || 0), 0)
    return { name: project.code, fullName: project.name, tienCo, tienChi }
  })

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
            <CardTitle className="text-sm font-medium text-gray-600">Tổng doanh thu</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatVND(totalRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">Tổng giá trị HĐ tất cả dự án</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tổng P11 đã ký</CardTitle>
            <BarChart3 className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-indigo-600">{formatVND(totalP11)}</p>
            <p className="text-xs text-gray-500 mt-1">Lợi nhuận P11 tổng hợp</p>
          </CardContent>
        </Card>

        <Card className="border-blue-300 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Tổng tiền phải Manage</CardTitle>
            <ShieldCheck className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-800">{formatVND(totalManage)}</p>
            <p className="text-xs text-blue-500 mt-1">Control KH + Control NCC</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tổng CP Khách Hàng</CardTitle>
            <Users className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{formatVND(totalCustomerCosts)}</p>
            <p className="text-xs text-gray-500 mt-1">{customerCosts?.length || 0} mục chi phí KH</p>
          </CardContent>
        </Card>

        <Card className={totalControlKH >= 0 ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={`text-sm font-medium ${totalControlKH >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Tổng Tiền control KH</CardTitle>
            <ShieldCheck className={`h-5 w-5 ${totalControlKH >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalControlKH >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatVND(totalControlKH)}</p>
            <p className="text-xs text-gray-500 mt-1">KH Budget - Tổng chi phí KH</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tổng CP NCC/NTP</CardTitle>
            <Wallet className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{formatVND(totalNccContract)}</p>
            <p className="text-xs text-gray-500 mt-1">Tổng giá trị HĐ các NCC</p>
          </CardContent>
        </Card>

        <Card className={totalControlNcc >= 0 ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={`text-sm font-medium ${totalControlNcc >= 0 ? 'text-orange-700' : 'text-red-700'}`}>Tổng Tiền control NCC</CardTitle>
            <TrendingDown className={`h-5 w-5 ${totalControlNcc >= 0 ? 'text-orange-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalControlNcc >= 0 ? 'text-orange-700' : 'text-red-700'}`}>{formatVND(totalControlNcc)}</p>
            <p className="text-xs text-gray-500 mt-1">HĐ NCC - Tổng chi NTP</p>
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
                const projectPl = plSummaries?.find(p => p.project_id === project.id)
                const projectNcc = nccItems?.filter((c) => c.project_id === project.id) || []
                const projectExp = ntpExpenses?.filter((e) => e.project_id === project.id) || []
                const projectCosts = customerCosts?.filter((c) => c.project_id === project.id) || []
                const nccTotal = projectNcc.reduce((s, c) => s + (c.contract_amount || 0), 0)
                const ntpTotal = projectExp.reduce((s, e) => s + (e.amount || 0), 0)
                const khTotal = projectCosts.reduce((s, c) => s + (c.amount || 0), 0)
                const controlNcc = nccTotal - ntpTotal
                const controlKH = (projectPl?.kh_budget || 0) - khTotal
                const manage = controlNcc + controlKH

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
                          <p className="text-xs text-gray-500">Tổng Manage</p>
                          <p className={`text-sm font-semibold ${manage >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatVND(manage)}
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
