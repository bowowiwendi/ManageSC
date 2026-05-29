import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { syncToGithub } from '@/lib/github'

async function tryGithubSync() {
  try {
    const result = await syncToGithub()
    if (!result.success) {
      console.log('GitHub sync skipped:', result.message)
    }
    return result
  } catch {
    return { success: false, message: 'GitHub sync gagal' }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const search = searchParams.get('search')

  const result = await store.getImproved(page, limit, startDate, endDate, search)
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, ...data } = body

  if (action === 'renew') {
    const item = await store.renew(data.id, parseInt(data.jumlahHari))
    if (!item) return NextResponse.json({ success: false, message: 'Data tidak ditemukan.' }, { status: 404 })
    const github = await tryGithubSync()
    return NextResponse.json({ success: true, message: `Masa aktif berhasil diperpanjang ${data.jumlahHari} hari!`, github })
  }

  const newItem = await store.add(data)
  const github = await tryGithubSync()
  return NextResponse.json({ success: true, message: 'Data penyewaan berhasil ditambahkan!', data: newItem, github })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const item = await store.update(body)
  if (!item) return NextResponse.json({ success: false, message: 'Data tidak ditemukan.' }, { status: 404 })
  const github = await tryGithubSync()
  return NextResponse.json({ success: true, message: 'Data penyewaan berhasil diperbarui!', github })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, message: 'ID diperlukan.' }, { status: 400 })
  const ok = await store.remove(id)
  if (!ok) return NextResponse.json({ success: false, message: 'Data tidak ditemukan.' }, { status: 404 })
  const github = await tryGithubSync()
  return NextResponse.json({ success: true, message: 'Data penyewaan berhasil dihapus!', github })
}
