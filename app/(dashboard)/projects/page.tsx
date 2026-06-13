import { createClient } from '@/lib/supabase/server'
import { formatVND, formatDate } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'
import CreateProjectDialog from '@/components/projects/CreateProjectDialog'
import { Profile } from '@/types'

const statusLabels: Record<string, string> = {
  active: 'Đang hoạt động',
  completed: 'Hoàn thành',
  paused: 'Tạm dừng',
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: profile },
    { data: projects },
    { data: nccItems },
    { data: ntpExpenses },
    { data: customerCosts },
    { data: plSummaries },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('projects').select('*').order('created_at', { ascending: false }),
    supabase.from('ncc_items').select('project_id, contract_amount'),
    supabase.from('ntp_expenses').select('project_id, amount, status'),
    supabase.from('customer_costs').select('project_id, amount, status'),
    supabase.from('pl_summary').select('project_id, kh_budget'),
  ])

  const isAdmin = (profile as Profile | null)?.role === 'admin'

  const projectsWithStats = (projects || []).map((project) => {
    const ncc = nccItems?.filter((c) => c.project_id === project.id) || []
    const expenses = ntpExpenses?.filter((e) => e.project_id === project.id) || []
    const costs = customerCosts?.filter((c) => c.project_id === project.id) || []
    const pl = plSummaries?.find((p) => p.project_id === project.id)

    const nccContract = ncc.reduce((s, c) => s + (c.contract_amount || 0), 0)
    const ntpAll = expenses.reduce((s, e) => s + (e.amount || 0), 0)
    const ntpPlanned = expenses.filter(e => e.status === 'planned').reduce((s, e) => s + (e.amount || 0), 0)
    const ntpCompleted = expenses.filter(e => e.status === 'completed').reduce((s, e) => s + (e.amount || 0), 0)
    const khAll = costs.reduce((s, c) => s + (c.amount || 0), 0)
    const khPlanned = costs.filter(c => c.status === 'planned').reduce((s, c) => s + (c.amount || 0), 0)
    const khCompleted = costs.filter(c => c.status === 'completed').reduce((s, c) => s + (c.amount || 0), 0)
    const khBudget = pl?.kh_budget || 0

    const flexNcc = nccContract - ntpAll
    const flexKH = khBudget - khAll
    const flexProject = flexNcc + flexKH

    const tienChiNcc = ntpAll
    const cpkh = khAll
    const tienPhaiChiKeHoach = khPlanned + ntpPlanned
    const tienDaChi = khCompleted + ntpCompleted

    return { ...project, tienChiNcc, cpkh, flexProject, tienPhaiChiKeHoach, tienDaChi }
  })

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Danh sách Dự án</h1>
          <p className="text-slate-500 text-sm mt-0.5">Quản lý tất cả các dự án</p>
        </div>
        {isAdmin && <CreateProjectDialog />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tất cả dự án ({projectsWithStats.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {projectsWithStats.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã dự án</TableHead>
                    <TableHead>Tên dự án</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead className="text-right">Tiền chi NCC/NTP</TableHead>
                    <TableHead className="text-right">CPKH</TableHead>
                    <TableHead className="text-right">Flex Project</TableHead>
                    <TableHead className="text-right">Phải chi (kế hoạch)</TableHead>
                    <TableHead className="text-right">Đã chi</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectsWithStats.map((project) => (
                    <TableRow key={project.id} className="cursor-pointer hover:bg-slate-50">
                      <TableCell>
                        <Link href={`/projects/${project.id}`} className="block">
                          <span className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-mono text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm">
                            {project.code}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/projects/${project.id}`} className="block font-medium hover:text-blue-600">
                          {project.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-gray-600">{project.client_name}</TableCell>
                      <TableCell className="text-right text-orange-600 font-medium">
                        {formatVND(project.tienChiNcc)}
                      </TableCell>
                      <TableCell className="text-right text-purple-600 font-medium">
                        {formatVND(project.cpkh)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${project.flexProject >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatVND(project.flexProject)}
                      </TableCell>
                      <TableCell className="text-right text-yellow-600 font-medium">
                        {formatVND(project.tienPhaiChiKeHoach)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {formatVND(project.tienDaChi)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            project.status === 'active' ? 'default' :
                            project.status === 'completed' ? 'secondary' : 'outline'
                          }
                          className={
                            project.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''
                          }
                        >
                          {statusLabels[project.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {formatDate(project.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg font-medium mb-2">Chưa có dự án nào</p>
              {isAdmin && <p className="text-sm">Nhấn &quot;Tạo dự án mới&quot; để bắt đầu</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
