import { store } from './store'

export interface GithubConfig {
  username: string
  repo: string
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
      filePath: raw.filePath || '',
      token: raw.token || '',
      enabled: raw.enabled || false,
    }
  }
  return { username: '', repo: '', filePath: '', token: '', enabled: false }
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
