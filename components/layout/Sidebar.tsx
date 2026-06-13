'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Wallet, LayoutDashboard, FolderOpen, LogOut, Settings, Sparkles } from 'lucide-react'
import { Profile } from '@/types'

interface SidebarProps {
  profile: Profile | null
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = profile?.role === 'admin'

  const navItems = [
    { href: '/', label: 'Tổng quan', icon: LayoutDashboard },
    { href: '/projects', label: 'Dự án', icon: FolderOpen },
    ...(isAdmin ? [{ href: '/settings', label: 'Cài đặt', icon: Settings }] : []),
  ]

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white flex flex-col min-h-screen border-r border-white/5">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/30">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <p className="font-bold text-base leading-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">FundFlow</p>
            <p className="text-[11px] text-slate-400 leading-tight">Quản lý quỹ dự án</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Menu</p>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}>
                <Icon className={cn('h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110', isActive && 'drop-shadow')} />
                {item.label}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Upgrade banner */}
      <div className="px-4 pb-4">
        <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-white/10 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <p className="text-xs font-semibold text-white">FundFlow Pro</p>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">Theo dõi tài chính dự án realtime, chính xác từng đồng.</p>
        </div>
      </div>

      {/* User info */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9 ring-2 ring-white/10">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-semibold">
              {profile?.full_name?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name || 'Người dùng'}</p>
            <p className="text-xs text-slate-400 truncate flex items-center gap-1">
              {profile?.role === 'admin' && <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />}
              {profile?.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-red-500/10 hover:text-red-300"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Đăng xuất
        </Button>
      </div>
    </aside>
  )
}
