import { store } from './store'
import type { VpsData } from './types'

export interface GithubConfig {
  username: string
  repo: string
  branch: string
  filePath: string
  token: string
  enabled: boolean
}

export async function getGithubConfig(): Promise<GithubConfig> {
  const raw = await store.getGithubConfig()
  if (raw) {
    return {
      username: raw.username || '',
      repo: raw.repo || '',
      branch: raw.branch || 'main',
      filePath: raw.filePath || '',
      token: raw.token || '',
      enabled: raw.enabled || false,
    }
  }
  return { username: '', repo: '', branch: 'main', filePath: '', token: '', enabled: false }
}

export async function saveGithubConfig(config: GithubConfig): Promise<void> {
  await store.saveGithubConfig(config)
}

export async function generateVpsListContent(): Promise<string> {
  const all = await store.getAll()
  let content = ''
  for (const item of all) {
    if (item.username && item.ipVps) {
      const ip = item.ipVps.startsWith("'") ? item.ipVps.substring(1) : item.ipVps
      const expiry = item.masaAktif || 'lifetime'
      content += `### ${item.username} ${expiry} ${ip}\n`
    }
  }
  return content
}

export async function importFromGithub(): Promise<{ success: boolean; message: string; imported?: number }> {
  const config = await getGithubConfig()
  if (!config.username || !config.repo || !config.filePath) {
    return { success: false, message: 'GitHub belum dikonfigurasi. Buka Pengaturan > GitHub untuk setup.' }
  }

  try {
    const url = `https://raw.githubusercontent.com/${config.username}/${config.repo}/refs/heads/${config.branch}/${config.filePath}`
    const res = await fetch(url)

    if (!res.ok) {
      if (res.status === 404) {
        return { success: false, message: 'File tidak ditemukan di GitHub. Sync data dulu dari dashboard.' }
      }
      return { success: false, message: `Gagal mengambil data: ${res.statusText}` }
    }

    const raw = await res.text()
    const lines = raw.split('\n').filter(line => line.trim().startsWith('### '))

    const imported: VpsData[] = []
    for (const line of lines) {
      const parts = line.replace('### ', '').trim().split(/\s+/)
      if (parts.length >= 3) {
        const username = parts[0]
        const expiry = parts[1]
        const ip = parts.slice(2).join(' ')

        imported.push({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          username,
          tipeAkun: expiry === 'lifetime' ? 'unli' : 'limit',
          masaAktif: expiry,
          ipVps: `'${ip}`,
          emailMember: '',
          ram: '',
          pesan: '',
        })
      }
    }

    if (imported.length === 0) {
      return { success: false, message: 'Tidak ada data valid di file GitHub. Import dibatalkan agar data lokal tidak terhapus.' }
    }

    await store.replaceAll(imported)

    return { success: true, message: `Berhasil import ${imported.length} data dari GitHub!`, imported: imported.length }
  } catch (err) {
    return { success: false, message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }
}

export async function syncToGithub(): Promise<{ success: boolean; message: string }> {
  const config = await getGithubConfig()
  if (!config.enabled || !config.token || !config.username || !config.repo || !config.filePath) {
    return { success: false, message: 'GitHub belum dikonfigurasi. Buka Pengaturan > GitHub untuk setup.' }
  }

  try {
    const content = await generateVpsListContent()
    const url = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${config.filePath}`

    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${config.token}`,
        'User-Agent': 'VPS-Manager-App',
      },
    })

    let sha: string | null = null
    if (getRes.ok) {
      const getData = await getRes.json()
      sha = getData.sha
    } else if (getRes.status !== 404) {
      const errData = await getRes.json().catch(() => ({}))
      return { success: false, message: `Gagal cek file GitHub: ${errData.message || getRes.statusText}` }
    }

    const base64Content = Buffer.from(content, 'utf-8').toString('base64')
    const payload: Record<string, unknown> = {
      message: 'Update VPS list from VPS Manager',
      content: base64Content,
    }
    if (sha) payload.sha = sha

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${config.token}`,
        'User-Agent': 'VPS-Manager-App',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!putRes.ok && putRes.status !== 201) {
      const errData = await putRes.json().catch(() => ({}))
      return { success: false, message: `Gagal sync ke GitHub: ${errData.message || putRes.statusText}` }
    }

    return { success: true, message: 'Berhasil sync data ke GitHub!' }
  } catch (err) {
    return { success: false, message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }
}
