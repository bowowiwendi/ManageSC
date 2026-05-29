import type { VpsData } from './types'

export type { VpsData }

export interface PaginationResult {
  data: VpsData[]
  pagination: { currentPage: number; limit: number; totalItems: number; totalPages: number }
}

// KV keys
const KV_KEY_VPS = 'vps_data'
const KV_KEY_PIN = 'pin'
const KV_KEY_GITHUB = 'github_config'

async function getKv(): Promise<any | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const ctx = await getCloudflareContext()
    return (ctx.env as any)?.VPS_KV || null
  } catch {
    return null
  }
}

// --- File system helpers (dev fallback) ---
async function readFsData(): Promise<VpsData[]> {
  try {
    const fs = await import('fs')
    const path = await import('path')
    const file = path.join(process.cwd(), 'data', 'vps.json')
    const raw = await fs.promises.readFile(file, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeFsData(data: VpsData[]) {
  const fs = await import('fs')
  const path = await import('path')
  const dir = path.join(process.cwd(), 'data')
  await fs.promises.mkdir(dir, { recursive: true })
  await fs.promises.writeFile(path.join(dir, 'vps.json'), JSON.stringify(data, null, 2), 'utf-8')
}

async function readFsPin(): Promise<string> {
  try {
    const fs = await import('fs')
    const path = await import('path')
    const raw = await fs.promises.readFile(path.join(process.cwd(), 'data', 'pin.json'), 'utf-8')
    return JSON.parse(raw).pin || '123456'
  } catch {
    return '123456'
  }
}

async function writeFsPin(pin: string) {
  const fs = await import('fs')
  const path = await import('path')
  const dir = path.join(process.cwd(), 'data')
  await fs.promises.mkdir(dir, { recursive: true })
  await fs.promises.writeFile(path.join(dir, 'pin.json'), JSON.stringify({ pin }), 'utf-8')
}

async function readFsGithub() {
  try {
    const fs = await import('fs')
    const path = await import('path')
    const raw = await fs.promises.readFile(path.join(process.cwd(), 'data', 'github.json'), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// --- Core store functions ---

async function getAllData(): Promise<VpsData[]> {
  const kv = await getKv()
  if (kv) {
    const raw = await kv.get(KV_KEY_VPS)
    return raw ? JSON.parse(raw) : []
  }
  return readFsData()
}

async function writeAllData(data: VpsData[]) {
  const kv = await getKv()
  if (kv) {
    await kv.put(KV_KEY_VPS, JSON.stringify(data))
    return
  }
  await writeFsData(data)
}

async function getPin(): Promise<string> {
  const kv = await getKv()
  if (kv) {
    const raw = await kv.get(KV_KEY_PIN)
    if (raw) return JSON.parse(raw).pin || '123456'
    return '123456'
  }
  return readFsPin()
}

async function setPin(pin: string) {
  const kv = await getKv()
  if (kv) {
    await kv.put(KV_KEY_PIN, JSON.stringify({ pin }))
    return
  }
  await writeFsPin(pin)
}

async function getGithubRaw(): Promise<any> {
  const kv = await getKv()
  if (kv) {
    const raw = await kv.get(KV_KEY_GITHUB)
    return raw ? JSON.parse(raw) : null
  }
  return readFsGithub()
}

async function setGithubRaw(data: any) {
  const kv = await getKv()
  if (kv) {
    await kv.put(KV_KEY_GITHUB, JSON.stringify(data))
    return
  }
  const fs = await import('fs')
  const path = await import('path')
  const dir = path.join(process.cwd(), 'data')
  await fs.promises.mkdir(dir, { recursive: true })
  await fs.promises.writeFile(path.join(dir, 'github.json'), JSON.stringify(data, null, 2), 'utf-8')
}

export const store = {
  async getAll(): Promise<VpsData[]> {
    return getAllData()
  },

  async getImproved(page = 1, limit = 10, startDate?: string | null, endDate?: string | null, search?: string | null): Promise<PaginationResult> {
    let data = await getAllData()

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate + 'T00:00:00') : null
      const end = endDate ? new Date(endDate + 'T23:59:59') : null
      data = data.filter(item => {
        if (!item.masaAktif || item.masaAktif === 'lifetime') return false
        const d = new Date(item.masaAktif)
        if (isNaN(d.getTime())) return false
        if (start && d < start) return false
        if (end && d > end) return false
        return true
      })
    }

    if (search) {
      const q = search.toLowerCase()
      data = data.filter(item =>
        item.username.toLowerCase().includes(q) ||
        item.ipVps.toLowerCase().includes(q)
      )
    }

    const totalItems = data.length
    const totalPages = Math.ceil(totalItems / limit)
    const startIndex = (page - 1) * limit
    const paginatedData = data.slice(startIndex, startIndex + limit)

    return {
      data: paginatedData,
      pagination: { currentPage: page, limit, totalItems, totalPages }
    }
  },

  async add(data: Omit<VpsData, 'id'>): Promise<VpsData> {
    const all = await getAllData()
    const newItem: VpsData = {
      ...data,
      id: Date.now().toString(),
    }
    if (data.tipeAkun === 'limit') {
      const hari = parseInt(data.masaAktif, 10)
      if (!isNaN(hari)) {
        const tgl = new Date()
        tgl.setDate(tgl.getDate() + hari)
        newItem.masaAktif = tgl.toISOString().split('T')[0]
      }
    } else {
      newItem.masaAktif = 'lifetime'
    }
    all.push(newItem)
    await writeAllData(all)
    return newItem
  },

  async update(data: VpsData): Promise<VpsData | null> {
    const all = await getAllData()
    const idx = all.findIndex(item => item.id === data.id)
    if (idx === -1) return null
    const ipToSave = data.ipVps.startsWith("'") ? data.ipVps : "'" + data.ipVps
    all[idx] = { ...all[idx], ...data, ipVps: ipToSave }
    await writeAllData(all)
    return all[idx]
  },

  async remove(id: string): Promise<boolean> {
    const all = await getAllData()
    const idx = all.findIndex(item => item.id === id)
    if (idx === -1) return false
    all.splice(idx, 1)
    await writeAllData(all)
    return true
  },

  async renew(id: string, jumlahHari: number): Promise<VpsData | null> {
    const all = await getAllData()
    const idx = all.findIndex(item => item.id === id)
    if (idx === -1) return null
    const tgl = new Date()
    tgl.setDate(tgl.getDate() + jumlahHari)
    all[idx].masaAktif = tgl.toISOString().split('T')[0]
    await writeAllData(all)
    return all[idx]
  },

  // PIN
  async getPin(): Promise<string> {
    return getPin()
  },
  async setPin(pin: string) {
    await setPin(pin)
  },
  async verifyPin(enteredPin: string): Promise<boolean> {
    const stored = await getPin()
    return enteredPin === stored
  },

  // GitHub config
  async getGithubConfig(): Promise<any> {
    return getGithubRaw()
  },
  async saveGithubConfig(data: any) {
    await setGithubRaw(data)
  },
}
