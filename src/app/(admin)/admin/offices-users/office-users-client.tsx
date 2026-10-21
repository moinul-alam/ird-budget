'use client'

import { useState } from 'react'
import { OfficeUserItem, updateOfficePassword, createNewOffice } from '@/app/actions/office-users'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Building2, 
  KeyRound, 
  Search, 
  Plus, 
  CheckCircle2, 
  Edit3, 
  Loader2,
  Lock,
  Layers
} from 'lucide-react'

interface OfficeUsersClientProps {
  initialOffices: OfficeUserItem[]
  officeTypes: { id: number; name: string }[]
  parentOffices: { id: number; name: string }[]
}

export function OfficeUsersClient({
  initialOffices,
  officeTypes,
  parentOffices,
}: OfficeUsersClientProps) {
  const [offices, setOffices] = useState<OfficeUserItem[]>(initialOffices)
  const [searchQuery, setSearchQuery] = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Password Modal
  const [selectedOffice, setSelectedOffice] = useState<OfficeUserItem | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)

  // Create Office Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createBudgetId, setCreateBudgetId] = useState('')
  const [createTypeId, setCreateTypeId] = useState('')
  const [createParentId, setCreateParentId] = useState('')
  const [createPassword, setCreatePassword] = useState('budget26')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const filteredOffices = offices.filter(o => 
    o.budgetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.officeType.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenPasswordModal = (office: OfficeUserItem) => {
    setSelectedOffice(office)
    setNewPassword(office.currentPasswordHint)
    setPwdError(null)
  }

  const handleSavePassword = async () => {
    if (!selectedOffice) return
    setSavingPwd(true)
    setPwdError(null)

    const res = await updateOfficePassword(selectedOffice.id, newPassword)
    if (res.error) {
      setPwdError(res.error)
      setSavingPwd(false)
      return
    }

    setOffices(prev => prev.map(o => {
      if (o.id === selectedOffice.id) {
        return {
          ...o,
          currentPasswordHint: newPassword.trim(),
          hasCustomPassword: newPassword.trim() !== 'budget26',
        }
      }
      return o
    }))

    setSavingPwd(false)
    setSelectedOffice(null)
    setSuccessMsg(`"${selectedOffice.name}" অফিসের পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে।`)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const handleCreateOffice = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)

    const formData = new FormData()
    formData.set('name', createName)
    formData.set('budget_id', createBudgetId)
    formData.set('type_id', createTypeId)
    if (createParentId) formData.set('parent_id', createParentId)
    formData.set('password', createPassword || 'budget26')

    const res = await createNewOffice(formData)
    if (res.error) {
      setCreateError(res.error)
      setCreating(false)
      return
    }

    const typeObj = officeTypes.find(t => t.id === parseInt(createTypeId))
    const parentObj = parentOffices.find(p => p.id === parseInt(createParentId))

    setOffices(prev => [
      ...prev,
      {
        id: Date.now(),
        budgetId: createBudgetId,
        name: createName,
        officeType: typeObj?.name || 'Tax Headquarter',
        parentOffice: parentObj?.name || '—',
        hasCustomPassword: createPassword !== 'budget26',
        currentPasswordHint: createPassword || 'budget26',
        created_at: new Date().toISOString(),
      }
    ])

    setCreating(false)
    setShowCreateModal(false)
    setCreateName('')
    setCreateBudgetId('')
    setCreateTypeId('')
    setCreateParentId('')
    setCreatePassword('budget26')
    setSuccessMsg('নতুন অফিস সফলভাবে তৈরি হয়েছে।')
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-sm font-semibold animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">মোট অফিস সংখ্যা</p>
              <h3 className="text-2xl font-extrabold text-slate-800">{offices.length} টি</h3>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ডিফল্ট পাসওয়ার্ড (budget26)</p>
              <h3 className="text-2xl font-extrabold text-slate-800">
                {offices.filter(o => !o.hasCustomPassword).length} টি
              </h3>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">কাস্টম পাসওয়ার্ড যুক্ত</p>
              <h3 className="text-2xl font-extrabold text-slate-800">
                {offices.filter(o => o.hasCustomPassword).length} টি
              </h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800">
              সকল অফিস ইউজার ও পাসওয়ার্ড ব্যবস্থাপনা
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              মাঠপর্যায়ের অফিস আইডি (যেমন: ১০১, ১০২) পর্যবেক্ষণ ও পাসওয়ার্ড রিসেট করুন
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="বাজেট আইডি বা অফিসের নাম..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl border-slate-200 text-sm"
              />
            </div>

            <Button
              onClick={() => {
                setCreateError(null)
                setShowCreateModal(true)
              }}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shrink-0 h-10"
            >
              <Plus className="h-4 w-4" />
              নতুন অফিস যোগ করুন
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">বাজেট আইডি</th>
                  <th className="px-6 py-4">অফিসের নাম</th>
                  <th className="px-6 py-4">গ্রুপ / অফিস ধরন</th>
                  <th className="px-6 py-4">প্যারেন্ট অফিস</th>
                  <th className="px-6 py-4">বর্তমান পাসওয়ার্ড</th>
                  <th className="px-6 py-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOffices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      কোনো অফিস খুঁজে পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  filteredOffices.map((office) => (
                    <tr key={office.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-blue-700">
                        {office.budgetId}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {office.name}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                          <Layers className="h-3 w-3 text-slate-400" />
                          {office.officeType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {office.parentOffice}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        <span className={`px-2 py-1 rounded-md font-semibold ${
                          office.hasCustomPassword 
                            ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {office.currentPasswordHint}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPasswordModal(office)}
                          className="rounded-xl border-slate-200 hover:bg-slate-100 font-semibold text-xs flex items-center gap-1.5 ml-auto"
                        >
                          <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                          পাসওয়ার্ড পরিবর্তন
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Modal */}
      {selectedOffice && (
        <Dialog open={!!selectedOffice} onOpenChange={(open) => !open && setSelectedOffice(null)}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-emerald-600" />
                অফিসের পাসওয়ার্ড পরিবর্তন
              </DialogTitle>
            </DialogHeader>

            {pwdError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {pwdError}
              </div>
            )}

            <div className="space-y-4 py-2">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="text-xs text-slate-400 font-bold uppercase">অফিসের নাম</div>
                <div className="text-sm font-bold text-slate-800">{selectedOffice.name}</div>
                <div className="text-xs text-blue-600 font-mono font-semibold">বাজেট আইডি: {selectedOffice.budgetId}</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="office_pwd_input" className="text-sm font-bold text-slate-700">
                  নতুন পাসওয়ার্ড
                </Label>
                <Input
                  id="office_pwd_input"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="পাসওয়ার্ড লিখুন (ডিফল্ট: budget26)"
                  className="rounded-xl border-slate-200 font-mono"
                />
                <p className="text-xs text-slate-400">
                  অফিসের লগইন করার জন্য এই পাসওয়ার্ডটি ব্যবহৃত হবে। (সাধারণ পাসওয়ার্ড: <span className="font-mono font-semibold">budget26</span>)
                </p>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedOffice(null)}
                disabled={savingPwd}
                className="rounded-xl"
              >
                বাতিল
              </Button>
              <Button
                onClick={handleSavePassword}
                disabled={savingPwd}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white"
              >
                {savingPwd ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    সংরক্ষণ হচ্ছে...
                  </>
                ) : (
                  'পাসওয়ার্ড সংরক্ষণ করুন'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Office Modal */}
      {showCreateModal && (
        <Dialog open={showCreateModal} onOpenChange={(open) => !open && setShowCreateModal(false)}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                নতুন অফিস যোগ করুন
              </DialogTitle>
            </DialogHeader>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateOffice} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="c_name" className="text-sm font-bold text-slate-700">অফিসের নাম <span className="text-rose-500">*</span></Label>
                <Input
                  id="c_name"
                  type="text"
                  required
                  placeholder="যেমন: টেস্ট অফিস"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="c_b_id" className="text-sm font-bold text-slate-700">বাজেট আইডি <span className="text-rose-500">*</span></Label>
                <Input
                  id="c_b_id"
                  type="text"
                  required
                  placeholder="যেমন: 103"
                  value={createBudgetId}
                  onChange={(e) => setCreateBudgetId(e.target.value)}
                  className="rounded-xl border-slate-200 font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="c_type" className="text-sm font-bold text-slate-700">অফিসের ধরন / গ্রুপ <span className="text-rose-500">*</span></Label>
                <Select value={createTypeId} onValueChange={(v) => setCreateTypeId(v || '')}>
                  <SelectTrigger id="c_type" className="w-full rounded-xl">
                    <SelectValue placeholder="ধরন নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {officeTypes.map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="c_parent" className="text-sm font-bold text-slate-700">প্যারেন্ট অফিস (ঐচ্ছিক)</Label>
                <Select value={createParentId} onValueChange={(v) => setCreateParentId(v || '')}>
                  <SelectTrigger id="c_parent" className="w-full rounded-xl">
                    <SelectValue placeholder="প্যারেন্ট অফিস নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {parentOffices.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="c_pwd" className="text-sm font-bold text-slate-700">পাসওয়ার্ড</Label>
                <Input
                  id="c_pwd"
                  type="text"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="budget26"
                  className="rounded-xl border-slate-200 font-mono"
                />
                <p className="text-xs text-slate-400">ডিফল্ট সাধারণ পাসওয়ার্ড: budget26</p>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 flex gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="rounded-xl"
                >
                  বাতিল
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white"
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      সংরক্ষণ হচ্ছে...
                    </>
                  ) : (
                    'অফিস তৈরি করুন'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
