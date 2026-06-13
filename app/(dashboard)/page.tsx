import { createClient } from '@/lib/supabase/server'
import { formatVND } from '@/lib/utils/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import DashboardChart from '@/components/dashboard/DashboardChart'
import { Building2, TrendingUp, Wallet, ArrowRight, BarChart3, Users, ShieldCheck, FolderOpen } from 'lucide-react'

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
    supabase.from('pl_summary').select('project_id, contract_value, p11_profit, kh_budget, ncc_ve_quy, kh_ve_quy'),
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

  // Tổng Manage = KH control + NCC control (= Flex Project)
  const totalManage = totalControlKH + totalControlNcc

  // "Về Quỹ" aggregates
  const totalNccVeQuy = plSummaries?.reduce((s, p) => s + (p.ncc_ve_quy || 0), 0) || 0
  const totalKhVeQuy = plSummaries?.reduce((s, p) => s + (p.kh_ve_quy || 0), 0) || 0
  const totalNtpCompleted = ntpExpenses?.filter(e => e.status === 'completed').reduce((s, e) => s + (e.amount || 0), 0) || 0
  const totalKhCompleted = customerCosts?.filter(c => c.status === 'completed').reduce((s, c) => s + (c.amount || 0), 0) || 0
  // Money in Quỹ = Σ(NCC in Quỹ) + Σ(CPKH in Quỹ)
  const moneyInQuy = (totalNccVeQuy - totalNtpCompleted) + (totalKhVeQuy - totalKhCompleted)
  // Money phải thu = Σ(NCC phải thu) + Σ(CPKH phải thu)
  const moneyPhaiThu = (totalNccContract - totalNccVeQuy) + (totalControlKH - totalKhVeQuy)

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

  const statCards: {
    title: string
    icon: typeof Building2
    gradient: string
    rows: { label?: string; value: string; accent: string }[]
  }[] = [
    { title: 'Doanh Thu', icon: TrendingUp, gradient: 'from-emerald-500 to-green-500', rows: [
      { value: formatVND(totalRevenue), accent: 'text-emerald-600' },
    ] },
    { title: 'P11 Kí hợp đồng', icon: BarChart3, gradient: 'from-indigo-500 to-violet-500', rows: [
      { value: formatVND(totalP11), accent: 'text-indigo-600' },
    ] },
    { title: 'Flex CPKH / CPKH', icon: Users, gradient: 'from-purple-500 to-fuchsia-500', rows: [
      { label: 'Flex CPKH', value: formatVND(totalControlKH), accent: totalControlKH >= 0 ? 'text-sky-600' : 'text-red-600' },
      { label: 'CPKH', value: formatVND(totalCustomerCosts), accent: 'text-purple-600' },
    ] },
    { title: 'Flex NCC / CP NCC', icon: Wallet, gradient: 'from-orange-500 to-amber-500', rows: [
      { label: 'Flex NCC', value: formatVND(totalControlNcc), accent: totalControlNcc >= 0 ? 'text-orange-600' : 'text-red-600' },
      { label: 'CP NCC', value: formatVND(totalNccContract), accent: 'text-amber-700' },
    ] },
  ]

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tổng quan</h1>
          <p className="text-slate-500 text-sm mt-0.5">Theo dõi tài chính tất cả dự án theo thời gian thực</p>
        </div>
        <Link href="/projects" className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow">
          <FolderOpen className="h-4 w-4" /> Xem dự án
        </Link>
      </div>

      {/* Hero: Tổng tiền phải Manage */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-indigo-500/20 blur-2xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-200 text-sm font-medium mb-2">
              <ShieldCheck className="h-4 w-4" /> Flex Project
            </div>
            <p className="text-4xl font-bold text-white tracking-tight">{formatVND(totalManage)}</p>
            <p className="text-blue-300/80 text-sm mt-1">Flex CPKH + Flex NCC · trên {totalProjects} dự án</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="rounded-xl bg-white/10 backdrop-blur px-4 py-3 border border-white/10">
              <p className="text-xs text-blue-200">Flex CPKH</p>
              <p className="text-lg font-semibold text-white">{formatVND(totalControlKH)}</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur px-4 py-3 border border-white/10">
              <p className="text-xs text-blue-200">Flex NCC</p>
              <p className="text-lg font-semibold text-white">{formatVND(totalControlNcc)}</p>
            </div>
            <div className="rounded-xl bg-emerald-400/15 backdrop-blur px-4 py-3 border border-emerald-300/20">
              <p className="text-xs text-emerald-200">Money in Quỹ</p>
              <p className="text-lg font-semibold text-white">{formatVND(moneyInQuy)}</p>
            </div>
            <div className="rounded-xl bg-amber-400/15 backdrop-blur px-4 py-3 border border-amber-300/20">
              <p className="text-xs text-amber-200">Money phải thu</p>
              <p className="text-lg font-semibold text-white">{formatVND(moneyPhaiThu)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.title} className="group border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">{c.title}</CardTitle>
                <div className={`bg-gradient-to-br ${c.gradient} p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                {c.rows.length === 1 ? (
                  <p className={`text-2xl font-bold ${c.rows[0].accent}`}>{c.rows[0].value}</p>
                ) : (
                  <div className="space-y-1.5">
                    {c.rows.map((r) => (
                      <div key={r.label} className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-400">{r.label}</span>
                        <span className={`text-lg font-bold ${r.accent}`}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
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
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-200/80 hover:border-blue-200 hover:shadow-sm transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-mono text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm group-hover:scale-105 transition-transform">
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
