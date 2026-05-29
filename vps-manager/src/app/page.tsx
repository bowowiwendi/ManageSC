'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HomeIcon, PlusIcon, SearchIcon, SettingsIcon, LockIcon, MonitorIcon,
  EditIcon, TrashIcon, RefreshIcon, SaveIcon, CheckIcon, XIcon,
  AlertIcon, ChevronLeftIcon, ChevronRightIcon, SpinnerIcon,
} from '@/components/icons'

type VpsItem = {
  id: string
  username: string
  tipeAkun: string
  masaAktif: string
  ipVps: string
  emailMember: string
  ram: string
  pesan: string
}

type Pagination = {
  currentPage: number
  limit: number
  totalItems: number
  totalPages: number
}

type ModalType = 'add' | 'edit' | 'delete' | 'renew' | 'github' | null

type GithubConfig = {
  username: string
  repo: string
  branch: string
  filePath: string
  enabled: boolean
}

const PAGE_LIMIT = 10

export default function Home() {
  // State
  const [data, setData] = useState<VpsItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({ currentPage: 1, limit: PAGE_LIMIT, totalItems: 0, totalPages: 0 })
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // PIN
  const [pinVerified, setPinVerified] = useState(false)
  const [showPinModal, setShowPinModal] = useState(true)
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', ''])
  const [pinError, setPinError] = useState(false)
  const pinRefs = useRef<(HTMLInputElement | null)[]>([])

  // Modals
  const [modal, setModal] = useState<ModalType>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [renewId, setRenewId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ username: '', tipeAkun: '', masaAktifHari: '', ipVps: '', emailMember: '', ram: '', pesan: '' })
  const [renewDays, setRenewDays] = useState('')

  // GitHub
  const [githubConfig, setGithubConfig] = useState<GithubConfig>({ username: '', repo: '', branch: 'main', filePath: '', enabled: false })
  const [githubHasToken, setGithubHasToken] = useState(false)
  const [githubToken, setGithubToken] = useState('')
  const [githubStatus, setGithubStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Snackbar auto-hide
  useEffect(() => {
    if (snackbar) {
      const t = setTimeout(() => setSnackbar(null), 3500)
      return () => clearTimeout(t)
    }
  }, [snackbar])

  const showSnackbar = (message: string, type: 'success' | 'error' = 'success') => setSnackbar({ message, type })

  // Fetch data
  const fetchData = useCallback(async (p?: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(p ?? page))
      params.set('limit', String(PAGE_LIMIT))
      if (searchQuery) params.set('search', searchQuery)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const res = await fetch(`/api/vps?${params}`)
      const json = await res.json()
      setData(json.data)
      setPagination(json.pagination)
    } catch {
      showSnackbar('Gagal mengambil data', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, searchQuery, startDate, endDate])

  useEffect(() => {
    if (pinVerified) {
      fetchData()
      loadGithubConfig()
    }
  }, [pinVerified, fetchData])

  const loadGithubConfig = async () => {
    try {
      const res = await fetch('/api/github')
      const json = await res.json()
      setGithubConfig(json.config)
      setGithubHasToken(json.hasToken)
    } catch {}
  }

  const saveGithubConfig = async () => {
    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          ...githubConfig,
          token: githubToken,
        }),
      })
      const json = await res.json()
      showSnackbar(json.message)
      setModal(null)
      setGithubStatus(null)
      loadGithubConfig()
    } catch {
      showSnackbar('Gagal menyimpan konfigurasi GitHub', 'error')
    }
  }

  const triggerGithubSync = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      })
      const json = await res.json()
      setGithubStatus({ message: json.message, type: json.success ? 'success' : 'error' })
      setTimeout(() => setGithubStatus(null), 4000)
    } catch {
      setGithubStatus({ message: 'Gagal sync', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const triggerGithubImport = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import' }),
      })
      const json = await res.json()
      setGithubStatus({ message: json.message, type: json.success ? 'success' : 'error' })
      setTimeout(() => setGithubStatus(null), 4000)
      if (json.success) fetchData()
    } catch {
      setGithubStatus({ message: 'Gagal import data', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const goToPage = (p: number) => {
    if (p < 1 || p > pagination.totalPages) return
    setPage(p)
  }

  const handleSearch = () => {
    setPage(1)
    setSearchQuery(searchInput)
  }

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
    setPage(1)
  }

  const applyFilter = () => {
    setPage(1)
    fetchData(1)
  }

  const resetFilter = () => {
    setStartDate('')
    setEndDate('')
    setPage(1)
    setSearchQuery('')
    setSearchInput('')
  }

  // PIN
  const handlePinDigit = (idx: number, value: string) => {
    if (!/^\d$/.test(value) && value !== '') return
    const newDigits = [...pinDigits]
    newDigits[idx] = value
    setPinDigits(newDigits)
    setPinError(false)

    if (value && idx < 5) {
      pinRefs.current[idx + 1]?.focus()
    }

    if (value && idx === 5) {
      verifyPin([...newDigits.slice(0, 5), value].join(''))
    }
  }

  const handlePinKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pinDigits[idx] && idx > 0) {
      const newDigits = [...pinDigits]
      newDigits[idx - 1] = ''
      setPinDigits(newDigits)
      pinRefs.current[idx - 1]?.focus()
    }
  }

  const verifyPin = async (pin: string) => {
    if (pin.length !== 6) return
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', pin }),
      })
      const json = await res.json()
      if (json.success) {
        setPinVerified(true)
        setShowPinModal(false)
        showSnackbar('✅ PIN benar! Selamat datang.')
      } else {
        setPinError(true)
        setPinDigits(['', '', '', '', '', ''])
        setTimeout(() => { setPinError(false); pinRefs.current[0]?.focus() }, 400)
        showSnackbar('❌ PIN salah!', 'error')
      }
    } catch {
      showSnackbar('Gagal verifikasi PIN', 'error')
    }
  }

  // CRUD
  const openAddModal = () => {
    setEditId(null)
    setFormData({ username: '', tipeAkun: '', masaAktifHari: '', ipVps: '', emailMember: '', ram: '', pesan: '' })
    setModal('add')
  }

  const openEditModal = (item: VpsItem) => {
    setEditId(item.id)
    setFormData({
      username: item.username,
      tipeAkun: item.tipeAkun,
      masaAktifHari: '',
      ipVps: item.ipVps.replace(/^'/, ''),
      emailMember: item.emailMember,
      ram: item.ram,
      pesan: item.pesan,
    })
    setModal('edit')
  }

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      let json: any
      if (editId) {
        const res = await fetch('/api/vps', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, id: editId }),
        })
        json = await res.json()
      } else {
        const res = await fetch('/api/vps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        json = await res.json()
      }
      const msg = json.github?.success
        ? json.message + ' (GitHub: ✅)'
        : json.github && !json.github.success
        ? json.message + ' (GitHub: ⏭️)'
        : json.message
      showSnackbar(msg)
      setModal(null)
      fetchData()
    } catch {
      showSnackbar('Gagal menyimpan data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const openDeleteModal = (id: string) => {
    setDeleteId(id)
    setModal('delete')
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/vps?id=${deleteId}`, { method: 'DELETE' })
      const json = await res.json()
      const msg = json.github?.success
        ? json.message + ' (GitHub: ✅)'
        : json.github && !json.github.success
        ? json.message + ' (GitHub: ⏭️)'
        : json.message
      showSnackbar(msg)
      setModal(null)
      setDeleteId(null)
      fetchData()
    } catch {
      showSnackbar('Gagal menghapus data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const openRenewModal = (id: string) => {
    setRenewId(id)
    setRenewDays('')
    setModal('renew')
  }

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renewId || !renewDays) return
    setLoading(true)
    try {
      const res = await fetch('/api/vps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renew', id: renewId, jumlahHari: renewDays }),
      })
      const json = await res.json()
      const msg = json.github?.success
        ? json.message + ' (GitHub: ✅)'
        : json.github && !json.github.success
        ? json.message + ' (GitHub: ⏭️)'
        : json.message
      showSnackbar(msg)
      setModal(null)
      setRenewId(null)
      fetchData()
    } catch {
      showSnackbar('Gagal memperpanjang', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Navigation actions
  const navAction = (action: string) => {
    switch (action) {
      case 'add': openAddModal(); break
      case 'search': document.getElementById('search-input')?.focus(); break
    }
  }

  const { currentPage, totalPages, totalItems } = pagination
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_LIMIT + 1
  const endItem = Math.min(currentPage * PAGE_LIMIT, totalItems)

  return (
    <>
      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(102,126,234,0.95)] p-4 animate-fade-in" style={{ backdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center animate-slide-up">
            <div className="mx-auto mb-4 w-14 h-14 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600"><LockIcon size={32} /></div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Keamanan</h2>
            <p className="text-slate-500 text-sm mb-6">Masukkan PIN 6 digit untuk melanjutkan</p>
            <div className="flex justify-center gap-2 mb-6">
              {pinDigits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { pinRefs.current[i] = el }}
                  type="tel"
                  maxLength={1}
                  inputMode="numeric"
                  value={d}
                  onChange={e => handlePinDigit(i, e.target.value)}
                  onKeyDown={e => handlePinKeyDown(i, e)}
                  autoFocus={i === 0}
                  autoComplete="one-time-code"
                  className={`w-12 h-14 border-2 rounded-lg text-center text-xl font-bold text-slate-800 outline-none transition-all duration-200 bg-white
                    ${pinError ? 'border-red-500 animate-[shake_0.4s_ease]' : d ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-400">PIN default: 123456</p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-5xl mx-auto p-3 md:p-6">
        <div className="bg-white/98 md:bg-white rounded-2xl shadow-lg md:p-6 p-4 md:my-8">
          {/* Header */}
          <div className="text-center border-b border-slate-200 pb-4 mb-4">
            <h1 className="text-xl md:text-2xl font-bold text-indigo-600 flex items-center justify-center gap-2"><MonitorIcon size={28} /> VPS Manager</h1>
            <p className="text-slate-500 text-sm mt-1">Manajemen Penyewaan VPS Limit & Unlimited</p>
          </div>

          {/* Desktop Top Nav */}
          <div className="hidden md:flex justify-center gap-3 mb-4 flex-wrap">
            {[
              { icon: 'home', label: 'Home', action: 'home' },
              { icon: 'add', label: 'Tambah', action: 'add' },
              { icon: 'search', label: 'Cari', action: 'search' },
              { icon: 'github', label: 'GitHub', action: 'github' },
            ].map(nav => {
              const IconMap: Record<string, React.ReactNode> = {
                home: <HomeIcon size={22} />,
                add: <PlusIcon size={22} />,
                search: <SearchIcon size={22} />,
                github: <SettingsIcon size={22} />,
              }
              return (
                <button key={nav.label}
                  onClick={() => {
                    if (nav.action === 'add') openAddModal()
                    else if (nav.action === 'search') document.getElementById('search-input')?.focus()
                    else if (nav.action === 'github') { loadGithubConfig(); setModal('github') }
                    else window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="flex flex-col items-center gap-1 px-5 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-500 font-semibold text-sm transition-all hover:border-indigo-500 hover:text-indigo-600 hover:-translate-y-0.5 hover:shadow active:scale-[0.98]"
                >
                  <span className="text-slate-500">{IconMap[nav.icon]}</span>
                  <span>{nav.label}</span>
                </button>
              )
            })}
          </div>

          {/* Action Buttons (Desktop) */}
          <div className="hidden md:flex gap-3 mb-4">
            <button onClick={openAddModal} className="btn btn-primary flex-1"><PlusIcon size={18} /> Tambah Penyewaan Baru</button>
            <button onClick={() => { loadGithubConfig(); setModal('github') }} className="btn btn-secondary flex-none"><SettingsIcon size={18} /> GitHub</button>
          </div>

          {/* GitHub Quick Sync Status */}
          {githubStatus && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold text-white ${githubStatus.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'} animate-slide-up`}>
              {githubStatus.message}
            </div>
          )}
          {githubConfig.enabled && githubHasToken && !githubStatus && (
            <div className="mb-4 px-4 py-2 rounded-xl text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-2">
              <CheckIcon size={14} className="text-emerald-500" /> GitHub sync aktif — data otomatis sync ke <strong>{githubConfig.username}/{githubConfig.repo}</strong>
              <button onClick={triggerGithubSync} disabled={loading} className="ml-auto btn !py-1.5 !px-3 !text-xs btn-sky">
                {loading ? '...' : 'Sync Now'}
              </button>
            </div>
          )}

          {/* Search */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><SearchIcon size={16} /> Cari Data</h3>
            <div className="flex gap-2">
              <input id="search-input" type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={handleSearchKey}
                placeholder="Cari username atau IP VPS..." className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all bg-white" />
              <button onClick={handleSearch} className="btn btn-primary px-5"><SearchIcon size={16} /> Cari</button>
              {searchQuery && <button onClick={clearSearch} className="btn btn-secondary px-3"><XIcon size={14} /></button>}
            </div>
          </div>

          {/* Filter */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><SearchIcon size={16} /> Filter Data</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Dari Tanggal</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Sampai Tanggal</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 bg-white" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={applyFilter} className="btn btn-secondary flex-1">Terapkan Filter</button>
              <button onClick={resetFilter} className="btn btn-secondary flex-1">Reset</button>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
            {/* Mobile Card View */}
            <div className="block md:hidden">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              ) : data.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  {searchQuery ? `Tidak ditemukan data untuk "${searchQuery}".` : 'Tidak ada data penyewaan.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.map(item => (
                    <div key={item.id} className="p-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{item.username}</span>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full text-white ${item.tipeAkun === 'unli' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                          #{item.tipeAkun}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-600 text-xs">
                        <div><span className="text-slate-400">Masa Aktif:</span> {item.masaAktif}</div>
                        <div><span className="text-slate-400">IP VPS:</span> {item.ipVps}</div>
                        {item.emailMember && <div><span className="text-slate-400">Email:</span> {item.emailMember}</div>}
                        {item.ram && <div><span className="text-slate-400">RAM:</span> {item.ram}</div>}
                        {item.pesan && <div className="col-span-2"><span className="text-slate-400">Pesan:</span> {item.pesan.substring(0, 50)}{item.pesan.length > 50 ? '...' : ''}</div>}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => openEditModal(item)} className="btn !p-2 !min-w-[36px] !h-9 !text-xs bg-amber-500 text-white rounded-lg shadow"><EditIcon size={16} /></button>
                        {item.tipeAkun === 'limit' && (
                          <button onClick={() => openRenewModal(item.id)} className="btn !p-2 !min-w-[36px] !h-9 !text-xs btn-sky"><RefreshIcon size={16} /></button>
                        )}
                        <button onClick={() => openDeleteModal(item.id)} className="btn !p-2 !min-w-[36px] !h-9 !text-xs btn-danger"><TrashIcon size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs uppercase tracking-wider">
                    <th className="p-3 text-left font-semibold">Username</th>
                    <th className="p-3 text-left font-semibold">Tipe</th>
                    <th className="p-3 text-left font-semibold">Masa Aktif</th>
                    <th className="p-3 text-left font-semibold">IP VPS</th>
                    <th className="p-3 text-left font-semibold">Email</th>
                    <th className="p-3 text-left font-semibold">RAM</th>
                    <th className="p-3 text-left font-semibold">Pesan</th>
                    <th className="p-3 text-left font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-12"><div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto" /></td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-slate-500">{searchQuery ? `Tidak ditemukan data untuk "${searchQuery}".` : 'Tidak ada data penyewaan.'}</td></tr>
                  ) : data.map(item => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-sm">
                      <td className="p-3 font-medium">{item.username}</td>
                      <td className="p-3">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full text-white ${item.tipeAkun === 'unli' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                          #{item.tipeAkun}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{item.masaAktif}</td>
                      <td className="p-3 text-slate-600">{item.ipVps}</td>
                      <td className="p-3 text-slate-600">{item.emailMember || '-'}</td>
                      <td className="p-3 text-slate-600">{item.ram || '-'}</td>
                      <td className="p-3 text-slate-600 max-w-[120px] truncate">{item.pesan ? (item.pesan.substring(0, 20) + (item.pesan.length > 20 ? '...' : '')) : '-'}</td>
                      <td className="p-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => openEditModal(item)} className="btn !p-1.5 !min-w-[32px] !h-8 !text-xs bg-amber-500 text-white rounded-lg shadow"><EditIcon size={14} /></button>
                          {item.tipeAkun === 'limit' && (
                            <button onClick={() => openRenewModal(item.id)} className="btn !p-1.5 !min-w-[32px] !h-8 !text-xs btn-sky"><RefreshIcon size={14} /></button>
                          )}
                          <button onClick={() => openDeleteModal(item.id)} className="btn !p-1.5 !min-w-[32px] !h-8 !text-xs btn-danger"><TrashIcon size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalItems > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 border-t border-slate-200 text-sm">
                <span className="text-slate-500 font-medium">Menampilkan {startItem}-{endItem} dari {totalItems} data</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
                    className="btn !py-2 !px-4 !text-xs btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeftIcon size={14} /> Sebelumnya</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => goToPage(p)}
                      className={`!py-2 !px-3 !text-xs rounded-lg font-semibold transition-all border ${p === currentPage ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
                    className="btn !py-2 !px-4 !text-xs btn-secondary disabled:opacity-40 disabled:cursor-not-allowed">Selanjutnya <ChevronRightIcon size={14} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 pb-safe">
        <div className="flex justify-around items-center max-w-lg mx-auto py-2">
          {[
            { icon: 'home', label: 'Home', action: 'home' },
            { icon: 'add', label: 'Tambah', action: 'add' },
            { icon: 'search', label: 'Cari', action: 'search' },
            { icon: 'github', label: 'GitHub', action: 'github' },
          ].map(nav => {
            const IconMap: Record<string, React.ReactNode> = {
              home: <HomeIcon size={22} />,
              add: <PlusIcon size={22} />,
              search: <SearchIcon size={22} />,
              github: <SettingsIcon size={22} />,
            }
            return (
              <button key={nav.label}
                onClick={() => {
                  if (nav.action === 'home') window.scrollTo({ top: 0, behavior: 'smooth' })
                  else if (nav.action === 'github') { loadGithubConfig(); setModal('github') }
                  else navAction(nav.action)
                }}
                className="flex flex-col items-center gap-0.5 px-4 py-1 text-slate-400 text-xs font-medium transition-colors active:text-indigo-600"
              >
                <span className="text-slate-400">{IconMap[nav.icon]}</span>
                <span>{nav.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Add/Edit Modal */}
      {modal === 'add' || modal === 'edit' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(102,126,234,0.9)] p-4 animate-fade-in" style={{ backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">{editId ? 'Edit Data Penyewaan' : 'Tambah Penyewaan Baru'}</h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Username</label>
                <input required value={formData.username} onChange={e => handleFormChange('username', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 bg-white" placeholder="Masukkan username" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tipe Akun</label>
                <select value={formData.tipeAkun} onChange={e => handleFormChange('tipeAkun', e.target.value)} required disabled={!!editId}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed">
                  <option value="">-- Pilih Tipe --</option>
                  <option value="limit">#limit</option>
                  <option value="unli">#unli (lifetime)</option>
                </select>
              </div>
              {formData.tipeAkun === 'limit' && !editId && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Jumlah Hari</label>
                  <input type="number" value={formData.masaAktifHari} onChange={e => handleFormChange('masaAktifHari', e.target.value)} min={1}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 bg-white" placeholder="Contoh: 30" />
                  <small className="text-slate-400 text-xs mt-1 block">Masa aktif dihitung dari hari ini.</small>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">IP VPS</label>
                <input required value={formData.ipVps} onChange={e => handleFormChange('ipVps', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 bg-white" placeholder="Contoh: 192.168.1.1" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Member</label>
                <input type="email" value={formData.emailMember} onChange={e => handleFormChange('emailMember', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 bg-white" placeholder="member@example.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">RAM</label>
                <input value={formData.ram} onChange={e => handleFormChange('ram', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 bg-white" placeholder="Contoh: 2GB" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Pesan</label>
                <textarea rows={3} value={formData.pesan} onChange={e => handleFormChange('pesan', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 bg-white resize-y min-h-[80px]" placeholder="Pesan khusus (jika ada)" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn btn-success flex-1" disabled={loading}>
                  {loading ? <SpinnerIcon size={16} /> : <><SaveIcon size={16} /> Simpan</>}
                </button>
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary flex-1">Batal</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Delete Modal */}
      {modal === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(102,126,234,0.9)] p-4 animate-fade-in" style={{ backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-slide-up text-center">
            <div className="mx-auto mb-4 w-12 h-12 flex items-center justify-center rounded-full bg-red-100 text-red-500"><AlertIcon size={28} /></div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Konfirmasi Hapus</h2>
            <p className="text-slate-500 text-sm mb-6">Apakah Anda yakin ingin menghapus data ini?</p>
            <div className="flex gap-3">
              <button onClick={confirmDelete} className="btn btn-danger flex-1" disabled={loading}>
                {loading ? <SpinnerIcon size={16} /> : <><TrashIcon size={16} /> Hapus</>}
              </button>
              <button onClick={() => setModal(null)} className="btn btn-secondary flex-1">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {modal === 'renew' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(102,126,234,0.9)] p-4 animate-fade-in" style={{ backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-slide-up">
            <h2 className="text-lg font-bold text-slate-800 mb-2"><RefreshIcon size={20} className="inline mr-1" /> Perpanjang Masa Aktif</h2>
            <p className="text-slate-500 text-sm mb-4">Masukkan jumlah hari yang ingin ditambahkan.</p>
            <form onSubmit={handleRenew} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Jumlah Hari</label>
                <input type="number" value={renewDays} onChange={e => setRenewDays(e.target.value)} required min={1}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 bg-white" placeholder="Contoh: 30" />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn btn-success flex-1" disabled={loading}>
                  {loading ? <SpinnerIcon size={16} /> : <><RefreshIcon size={16} /> Perpanjang</>}
                </button>
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary flex-1">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GitHub Settings Modal */}
      {modal === 'github' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(102,126,234,0.9)] p-4 animate-fade-in" style={{ backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800"><SettingsIcon size={20} className="inline mr-1" /> Pengaturan GitHub</h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">GitHub Username</label>
                <input value={githubConfig.username} onChange={e => setGithubConfig(p => ({ ...p, username: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 bg-white" placeholder="Contoh: bowowiwendi" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Repository</label>
                <input value={githubConfig.repo} onChange={e => setGithubConfig(p => ({ ...p, repo: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 bg-white" placeholder="Contoh: ipvps" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">File Path</label>
                <input value={githubConfig.filePath} onChange={e => setGithubConfig(p => ({ ...p, filePath: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 bg-white" placeholder="Contoh: main/ip" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Branch</label>
                <input value={githubConfig.branch} onChange={e => setGithubConfig(p => ({ ...p, branch: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 bg-white" placeholder="Contoh: main" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Personal Access Token {githubHasToken && <span className="text-emerald-500 text-xs font-normal">(tersimpan)</span>}</label>
                <input type="password" value={githubToken} onChange={e => setGithubToken(e.target.value)} placeholder={githubHasToken ? 'Kosongkan jika tidak ingin mengubah' : 'Masukkan token...'}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 bg-white" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-700">Aktifkan Auto Sync</label>
                <button onClick={() => setGithubConfig(p => ({ ...p, enabled: !p.enabled }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${githubConfig.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${githubConfig.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
              <p className="text-xs text-slate-400">Jika aktif, setiap perubahan data akan otomatis sync ke GitHub.</p>
              <div className="flex gap-3 pt-2">
                <button onClick={saveGithubConfig} className="btn btn-success flex-1"><SaveIcon size={16} /> Simpan</button>
                <button onClick={triggerGithubImport} className="btn btn-success flex-1" disabled={loading}>
                  {loading ? <SpinnerIcon size={16} /> : <><RefreshIcon size={16} /> Sync dari GitHub</>}
                </button>
                <button onClick={triggerGithubSync} className="btn btn-sky flex-1" disabled={loading}>
                  {loading ? <SpinnerIcon size={16} /> : <><RefreshIcon size={16} /> Sync ke GitHub</>}
                </button>
              </div>
              <button onClick={() => setModal(null)} className="btn btn-secondary w-full">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar */}
      {snackbar && (
        <div className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-sm font-semibold text-white animate-slide-up max-w-[90vw] whitespace-nowrap
          ${snackbar.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'}`}>
          {snackbar.message}
        </div>
      )}
    </>
  )
}
