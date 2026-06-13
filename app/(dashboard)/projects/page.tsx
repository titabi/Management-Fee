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
    { data: ntpContracts },
    { data: ntpExpenses },
    { data: otherCommitments },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('projects').select('*').order('created_at', { ascending: false }),
    supabase.from('ntp_contracts').select('project_id, received_amount'),
    supabase.from('ntp_expenses').select('project_id, planned_amount, actual_amount'),
    supabase.from('other_commitments').select('project_id, amount, paid_amount'),
  ])

  const isAdmin = (profile as Profile | null)?.role === 'admin'

  const projectsWithStats = (projects || []).map((project) => {
    const ntp = ntpContracts?.filter((c) => c.project_id === project.id) || []
    const expenses = ntpExpenses?.filter((e) => e.project_id === project.id) || []
    const commitments = otherCommitments?.filter((c) => c.project_id === project.id) || []

    const totalFromNtp = ntp.reduce((s, c) => s + (c.received_amount || 0), 0)
    const totalPlanned =
      expenses.reduce((s, e) => s + (e.planned_amount || 0), 0) +
      commitments.reduce((s, c) => s + (c.amount || 0), 0)
    const totalSpent =
      expenses.reduce((s, e) => s + (e.actual_amount || 0), 0) +
      commitments.reduce((s, c) => s + (c.paid_amount || 0), 0)

    return { ...project, totalFromNtp, totalPlanned, totalSpent, balance: totalFromNtp - totalSpent }
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Danh sách Dự án</h1>
          <p className="text-gray-500 text-sm">Quản lý tất cả các dự án</p>
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
                    <TableHead className="text-right">Tiền NTP</TableHead>
                    <TableHead className="text-right">Đã chi</TableHead>
                    <TableHead className="text-right">Số dư</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectsWithStats.map((project) => (
                    <TableRow key={project.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell>
                        <Link href={`/projects/${project.id}`} className="block">
                          <span className="bg-blue-100 text-blue-700 font-mono text-xs font-bold px-2 py-1 rounded">
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
