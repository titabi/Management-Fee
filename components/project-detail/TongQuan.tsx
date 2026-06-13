import { formatVND } from '@/lib/utils/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NCCItem, NtpExpense, OtherCommitment, PLSummary, CustomerCost } from '@/types'

interface Props {
  project: {
    id: string
    name: string
    code: string
    client_name: string
    status: string
  }
  nccItems: NCCItem[]
  ntpExpenses: NtpExpense[]
  otherCommitments: OtherCommitment[]
  plSummary: PLSummary | null
  isAdmin: boolean
  customerCosts: CustomerCost[]
}

export default function TongQuan({ project, nccItems, ntpExpenses, otherCommitments, plSummary, isAdmin, customerCosts }: Props) {
  const totalNccReceived = nccItems.reduce((s, c) => s + (c.received_amount || 0), 0)
  const totalNccContract = nccItems.reduce((s, c) => s + (c.contract_amount || 0), 0)
  const totalExpensesPlanned = ntpExpenses.reduce((s, e) => s + (e.planned_amount || 0), 0)
  const totalExpensesActual = ntpExpenses.reduce((s, e) => s + (e.actual_amount || 0), 0)
  const totalCommitmentsAmount = otherCommitments.reduce((s, c) => s + (c.amount || 0), 0)
  const totalCommitmentsPaid = otherCommitments.reduce((s, c) => s + (c.paid_amount || 0), 0)
  const totalPlanned = totalExpensesPlanned + totalCommitmentsAmount
  const totalSpent = totalExpensesActual + totalCommitmentsPaid
  const balance = totalNccReceived - totalSpent
  const totalCustomerCosts = customerCosts.reduce((s, c) => s + (c.amount || 0), 0)

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* NCC Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">NCC / Nhà Thầu Phụ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tổng giá trị HĐ NCC</span>
              <span className="font-medium">{formatVND(totalNccContract)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tổng đã nhận từ NCC</span>
              <span className="font-semibold text-green-600">{formatVND(totalNccReceived)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Số NCC</span>
              <span className="font-medium">{nccItems.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Expense Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Chi tiêu NTP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Chi tiêu kế hoạch</span>
              <span className="font-medium text-orange-600">{formatVND(totalExpensesPlanned)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Chi tiêu thực tế</span>
              <span className="font-medium text-red-600">{formatVND(totalExpensesActual)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Số mục chi tiêu</span>
              <span className="font-medium">{ntpExpenses.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Other Commitments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Cam kết khác</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tổng cam kết</span>
              <span className="font-medium text-orange-600">{formatVND(totalCommitmentsAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Đã thanh toán</span>
              <span className="font-medium text-red-600">{formatVND(totalCommitmentsPaid)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Chưa thanh toán</span>
              <span className="font-medium text-yellow-600">{formatVND(totalCommitmentsAmount - totalCommitmentsPaid)}</span>
            </div>
          </CardContent>
        </Card>

        {/* P/L Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">P/L Final</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Giá trị HĐ trước VAT</span>
              <span className="font-medium text-blue-600">{formatVND(plSummary?.contract_value || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Lợi nhuận P11</span>
              <span className={`font-medium ${(plSummary?.p11_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatVND(plSummary?.p11_profit || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-gray-700 font-semibold">Trạng thái dữ liệu</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${plSummary ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {plSummary ? 'Đã cập nhật' : 'Chưa có dữ liệu'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom line */}
      <Card className={`border-2 ${balance >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-600 mb-1">Tổng tiền nhận từ NCC</p>
              <p className="text-xl font-bold text-green-600">{formatVND(totalNccReceived)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Tổng đã chi</p>
              <p className="text-xl font-bold text-red-600">{formatVND(totalSpent)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Số dư</p>
              <p className={`text-xl font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatVND(balance)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isAdmin && customerCosts.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-purple-700">Chi phí khách hàng (Admin)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm">
              <span className="text-purple-700">Tổng chi phí khách hàng</span>
              <span className="font-bold text-purple-700">{formatVND(totalCustomerCosts)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
