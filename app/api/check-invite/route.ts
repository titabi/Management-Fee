import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { code } = await request.json()

  // Try to read invite code from Supabase settings table (admin-only read)
  // Fall back to env var if not available
  let validCode = process.env.INVITE_CODE || 'NTP2026'
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'invite_code')
      .maybeSingle()
    if (data?.value) validCode = data.value
  } catch {
    // fallback to env var
  }

  if (code === validCode) {
    return NextResponse.json({ valid: true })
  }
  return NextResponse.json({ valid: false }, { status: 401 })
}
