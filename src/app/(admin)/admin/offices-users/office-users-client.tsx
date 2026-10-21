'use client'

import { useState } from 'react'
import { toBanglaNumber } from '@/lib/bangla'
import { OfficeUserItem, updateOfficePassword } from '@/app/actions/office-users'
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
  Users,
  KeyRound,
  Search,
  CheckCircle2,
  Loader2,
  Lock,
  Layers,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

interface OfficeUsersClientProps {
  initialOffices: OfficeUserItem[]
  defaultPassword?: string
  officeTypes?: { id: number; name: string }[]
  parentOffices?: { id: number; name: string }[]
}

export function OfficeUsersClient({
  initialOffices,
  defaultPassword = '—',
}: OfficeUsersClientProps) {
  const [offices, setOffices] = useState<OfficeUserItem[]>(initialOffices)
  const [searchQuery, setSearchQuery] = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Password Modal
  const [selectedOffice, setSelectedOffice] = useState<OfficeUserItem | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)

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
          hasCustomPassword: newPassword.trim() !== defaultPassword,
        }
      }
      return o
    }))

    setSavingPwd(false)
    setSelectedOffice(null)
    setSuccessMsg(`"${selectedOffice.name}" অফিসের পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে।`)
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

      {/* Summary Cards: Only Total Number of Users and Default Password */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="rounded-2xl border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">মোট ইউজার সংখ্যা</p>
              <h3 className="text-2xl font-extrabold text-slate-800">{toBanglaNumber(offices.length)} জন</h3>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                ডিফল্ট পাসওয়ার্ড ({defaultPassword})
              </p>
              <h3 className="text-2xl font-extrabold text-slate-800 font-mono">
                {defaultPassword}
              </h3>
            </div>
          </div>
        </Card>
      </div>

      {/* When empty meaning no user, hide সকল অফিস ইউজার ও পাসওয়ার্ড ব্যবস্থাপনা */}
      {offices.length === 0 ? (
        <Card className="rounded-2xl border-slate-200/80 bg-white p-12 text-center shadow-sm">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">কোনো অফিস ইউজার নেই</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            মাঠ পর্যায়ের অফিস তৈরি হলে স্বয়ংক্রিয়ভাবে সংশ্লিষ্ট বাজেট আইডির বিপরীতে অফিস ইউজার তৈরি হবে।
          </p>
          <div className="mt-4">
            <Link href="/admin/offices-management/field-offices">
              <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-sm">
                মাঠ পর্যায়ের সকল অফিসে যান
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        /* Main Table Card */
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">
                সকল অফিস ইউজার ও পাসওয়ার্ড ব্যবস্থাপনা
              </CardTitle>
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

              <Link href="/admin/offices-management/field-offices">
                <Button
                  variant="outline"
                  className="rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-xs shrink-0 h-10"
                >
                  মাঠ পর্যায়ের সকল অফিস
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 w-16">ক্র. নং</th>
                    <th className="px-6 py-4">অফিসের নাম</th>
                    <th className="px-6 py-4">বাজেট আইডি (লগিন আইডি)</th>
                    <th className="px-6 py-4">বর্তমান পাসওয়ার্ড</th>
                    <th className="px-6 py-4 text-right">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOffices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">
                        অনুসন্ধানে কোনো অফিস ইউজার পাওয়া যায়নি
                      </td>
                    </tr>
                  ) : (
                    filteredOffices.map((office, idx) => (
                      <tr key={office.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-mono font-semibold text-slate-600">
                          {toBanglaNumber(idx + 1)}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {office.name}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-blue-700">
                          {office.budgetId}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold ${office.hasCustomPassword
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                            <KeyRound className="h-3 w-3 text-emerald-600" />
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
      )}

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
                <div className="text-xs text-blue-600 font-mono font-semibold">লগইন আইডি: {selectedOffice.budgetId}</div>
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
                  placeholder="নতুন পাসওয়ার্ড লিখুন"
                  className="rounded-xl border-slate-200 font-mono"
                />
                <p className="text-xs text-slate-400">
                  অফিসের লগইন করার জন্য এই পাসওয়ার্ডটি ব্যবহৃত হবে।
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
    </div>
  )
}
