import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Profile } from '@/types'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if ((profile as Profile | null)?.role !== 'admin') {
    redirect('/')
  }

  // Fetch current invite code from settings table
  const { data: settingRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'invite_code')
    .maybeSingle()

  const currentInviteCode = settingRow?.value || ''

  return <SettingsClient currentInviteCode={currentInviteCode} />
}
