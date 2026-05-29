import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'

export async function GET() {
  const pin = await store.getPin()
  return NextResponse.json({ pin })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, pin } = body

  if (action === 'verify') {
    const isValid = await store.verifyPin(pin)
    return NextResponse.json({ success: isValid, message: isValid ? 'PIN benar' : 'PIN salah' })
  }

  if (action === 'setup') {
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ success: false, message: 'PIN harus terdiri dari 6 digit angka!' })
    }
    await store.setPin(pin)
    return NextResponse.json({ success: true, message: 'PIN berhasil diubah menjadi: ' + pin })
  }

  return NextResponse.json({ success: false, message: 'Aksi tidak dikenal.' }, { status: 400 })
}
