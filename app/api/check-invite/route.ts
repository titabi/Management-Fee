import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { code } = await request.json()
  const validCode = process.env.INVITE_CODE || 'NTP2026'

  if (code === validCode) {
    return NextResponse.json({ valid: true })
  }
  return NextResponse.json({ valid: false }, { status: 401 })
}
