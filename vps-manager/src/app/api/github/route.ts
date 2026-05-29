import { NextRequest, NextResponse } from 'next/server'
import { getGithubConfig, saveGithubConfig, syncToGithub } from '@/lib/github'

export async function GET() {
  const config = await getGithubConfig()
  // Never expose token to client
  const safe = { ...config, token: '' }
  return NextResponse.json({ config: safe, hasToken: !!config.token })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  if (action === 'save') {
    const { username, repo, filePath, token, enabled } = body
    const current = await getGithubConfig()
    await saveGithubConfig({
      username: username || current.username,
      repo: repo || current.repo,
      filePath: filePath || current.filePath,
      token: token || current.token,
      enabled: enabled ?? current.enabled,
    })
    return NextResponse.json({ success: true, message: 'Konfigurasi GitHub berhasil disimpan!' })
  }

  if (action === 'sync') {
    const result = await syncToGithub()
    return NextResponse.json(result)
  }

  return NextResponse.json({ success: false, message: 'Aksi tidak dikenal.' }, { status: 400 })
}
