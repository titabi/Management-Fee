'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Save, Key } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  currentInviteCode: string
}

export default function SettingsClient({ currentInviteCode }: Props) {
  const [showCode, setShowCode] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!newCode.trim()) {
      toast.error('Vui lòng nhập mã mời mới')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'invite_code', value: newCode.trim(), updated_at: new Date().toISOString() })
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success('Đã cập nhật mã mời!'); setNewCode('') }
    setLoading(false)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt</h1>
        <p className="text-gray-500 text-sm">Quản lý cấu hình hệ thống</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-base">Mã mời (Invite Code)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mã hiện tại</Label>
            <div className="flex gap-2 items-center">
              <div className="flex-1 px-3 py-2 bg-gray-100 rounded-md text-sm font-mono">
                {showCode ? currentInviteCode || '(Chưa đặt)' : '•'.repeat(Math.max(currentInviteCode.length, 8))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCode(!showCode)}
              >
                {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showCode ? 'Ẩn' : 'Xem'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Đặt mã mới</Label>
            <Input
              value={newCode}
              onChange={e => setNewCode(e.target.value)}
              placeholder="Nhập mã mời mới..."
              className="font-mono"
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-700">
              Chia sẻ mã này cho thành viên mới để đăng ký tài khoản. Chỉ quản trị viên mới có thể xem và thay đổi mã mời.
            </p>
          </div>

          <Button onClick={handleSave} disabled={loading || !newCode.trim()} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Đang lưu...' : 'Lưu mã mới'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
