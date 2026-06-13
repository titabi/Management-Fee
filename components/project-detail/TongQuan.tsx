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

export default function TongQuan({ nccItems, ntpExpenses, otherCommitments, plSummary, isAdmin, customerCosts }: Props) {
  const totalNccContract = nccItems.reduce((s, c) => s + (c.contract_amount || 0), 0)
  const totalNccReceived = nccItems.reduce((s, c) => s + (c.received_amount || 0), 0)
  // Use amount field for ntp_expenses (redesign)
  const totalNtpAll = ntpExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const totalNtpPlanned = ntpExpenses.filter(e => e.status === 'planned').reduce((s, e) => s + (e.amount || 0), 0)
  const totalNtpCompleted = ntpExpenses.filter(e => e.status === 'completed').reduce((s, e) => s + (e.amount || 0), 0)
  const totalCommitmentsAmount = otherCommitments.reduce((s, c) => s + (c.amount || 0), 0)
  const totalCommitmentsPaid = otherCommitments.reduce((s, c) => s + (c.paid_amount || 0), 0)

  // Chi phí KH
  const totalCustomerCosts = customerCosts.reduce((s, c) => s + (c.amount || 0), 0)

  // New formulas
  const controlNcc = totalNccContract - totalNtpAll
  const controlKH = (plSummary?.kh_budget || 0) - totalCustomerCosts
  const totalManage = controlNcc + controlKH

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
              <span className="font-medium text-yellow-600">{formatVND(totalNtpPlanned)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Chi tiêu thực tế</span>
              <span className="font-medium text-red-600">{formatVND(totalNtpCompleted)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tổng cộng</span>
              <span className="font-medium text-orange-600">{formatVND(totalNtpAll)}</span>
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
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">KH Budget</span>
              <span className="font-medium text-purple-600">{formatVND(plSummary?.kh_budget || 0)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-gray-700 font-semibold">Trạng thái</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${plSummary ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {plSummary ? 'Đã cập nhật' : 'Chưa có dữ liệu'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card className="border-blue-300 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-blue-700">Tổng tiền cần Manage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-purple-700 uppercase">Chi phí KH</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">KH Budget</span>
                  <span className="font-medium text-purple-700">{formatVND(plSummary?.kh_budget || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tổng chi phí</span>
                  <span className="font-medium text-red-600">{formatVND(totalCustomerCosts)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-1">
                  <span className="font-semibold">Tiền control KH</span>
                  <span className={`font-bold ${controlKH >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatVND(controlKH)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-orange-700 uppercase">NCC / NTP</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tổng HĐ NCC</span>
                  <span className="font-medium text-orange-700">{formatVND(totalNccContract)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tổng chi NTP</span>
                  <span className="font-medium text-red-600">{formatVND(totalNtpAll)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-1">
                  <span className="font-semibold">Tiền control NCC</span>
                  <span className={`font-bold ${controlNcc >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatVND(controlNcc)}</span>
                </div>
              </div>
              <div className="bg-blue-100 rounded-lg p-3 flex flex-col justify-center items-center text-center">
                <p className="text-xs text-blue-600 mb-1">Tổng cần Manage</p>
                <p className="text-2xl font-bold text-blue-800">{formatVND(totalManage)}</p>
                <p className="text-xs text-blue-500 mt-1">Control KH + Control NCC</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
