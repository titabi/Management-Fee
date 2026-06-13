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
    { data: otherCommitments },
    { data: customerCosts },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('projects').select('*').order('created_at', { ascending: false }),
    supabase.from('ncc_items').select('project_id, received_amount, contract_amount'),
    supabase.from('ntp_expenses').select('project_id, planned_amount, actual_amount'),
    supabase.from('other_commitments').select('project_id, amount, paid_amount'),
    supabase.from('customer_costs').select('project_id, amount, status'),
  ])

  const isAdmin = (profile as Profile | null)?.role === 'admin'

  const projectsWithStats = (projects || []).map((project) => {
    const ncc = nccItems?.filter((c) => c.project_id === project.id) || []
    const expenses = ntpExpenses?.filter((e) => e.project_id === project.id) || []
    const commitments = otherCommitments?.filter((c) => c.project_id === project.id) || []
    const costs = customerCosts?.filter((c) => c.project_id === project.id) || []

    const totalFromNtp = ncc.reduce((s, c) => s + (c.received_amount || 0), 0)
    const totalNccContract = ncc.reduce((s, c) => s + (c.contract_amount || 0), 0)
    const totalCosts = costs.reduce((s, c) => s + (c.amount || 0), 0)
    const totalCanManage = totalCosts + totalNccContract
    const totalPlanned =
      expenses.reduce((s, e) => s + (e.planned_amount || 0), 0) +
      commitments.reduce((s, c) => s + (c.amount || 0), 0) +
      totalCosts
    const totalSpent =
      expenses.reduce((s, e) => s + (e.actual_amount || 0), 0) +
      commitments.reduce((s, c) => s + (c.paid_amount || 0), 0) +
      costs.filter(c => c.status === 'completed').reduce((s, c) => s + (c.amount || 0), 0)

    return { ...project, totalFromNtp, totalPlanned, totalSpent, balance: totalFromNtp - totalSpent, totalCanManage }
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
                    <TableHead className="text-right">Tiền nhận NCC</TableHead>
                    <TableHead className="text-right">Tổng cần Manage</TableHead>
                    <TableHead className="text-right">Đã chi</TableHead>
                    <TableHead className="text-right">Số dư</TableHead>
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
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatVND(project.totalFromNtp)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600 font-medium">
                        {formatVND(project.totalCanManage)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {formatVND(project.totalSpent)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${project.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatVND(project.balance)}
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
