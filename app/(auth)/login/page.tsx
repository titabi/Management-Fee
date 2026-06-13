'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (error) {
      setError('Email hoặc mật khẩu không đúng.')
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <Card className="w-full shadow-2xl border-white/20 bg-white/95 backdrop-blur">
      <CardHeader className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3.5 rounded-2xl shadow-lg shadow-blue-500/30">
            <Wallet className="h-8 w-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">FundFlow</CardTitle>
        <CardDescription>Đăng nhập vào hệ thống quản lý quỹ dự án</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@congty.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
          )}
          <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">
            Đăng ký
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
