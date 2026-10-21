'use client'

import { useState } from 'react'
import { toBanglaNumber } from '@/lib/bangla'
import { AdminUserItem, updateAdminUserRole, createAdminUser } from '@/app/actions/admin-users'
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
  ShieldCheck,
  Shield,
  CheckCircle2,
  XCircle,
  Edit3,
  Loader2,
  KeyRound,
  UserCheck,
  UserPlus
} from 'lucide-react'

interface UsersClientProps {
  initialUsers: AdminUserItem[]
  officeTypes: { id: number; name: string }[]
  currentUserId: number
}

export function UsersClient({ initialUsers, officeTypes, currentUserId }: UsersClientProps) {
  const [users, setUsers] = useState<AdminUserItem[]>(initialUsers)

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null)
  const [role, setRole] = useState<'admin' | 'superadmin'>('admin')
  const [active, setActive] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createUsername, setCreateUsername] = useState('')
  const [createRole, setCreateRole] = useState<'admin' | 'superadmin'>('admin')
  const [createPassword, setCreatePassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const handleOpenEdit = (user: AdminUserItem) => {
    setEditingUser(user)
    setRole(user.role)
    setActive(user.active)
    setNewPassword('')
    setErrorMsg(null)
  }

  const handleSave = async () => {
    if (!editingUser) return
    setSaving(true)
    setErrorMsg(null)

    const res = await updateAdminUserRole(
      editingUser.id,
      role,
      active,
      newPassword.trim() || undefined
    )

    if (res.error) {
      setErrorMsg(res.error)
      setSaving(false)
      return
    }

    setUsers(prev => prev.map(u => {
      if (u.id === editingUser.id) {
        return {
          ...u,
          role,
          active,
        }
      }
      return u
    }))

    setSaving(false)
    setEditingUser(null)
    setSuccessMsg('ইউজার তথ্য সফলভাবে আপডেট করা হয়েছে।')
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const handleCreate = async () => {
    if (!createUsername.trim()) {
      setCreateError('অনুগ্রহ করে ইউজারনেম লিখুন')
      return
    }

    setCreating(true)
    setCreateError(null)

    const res = await createAdminUser(
      createUsername.trim(),
      createRole,
      createPassword.trim() || '123456'
    )

    if (res.error) {
      setCreateError(res.error)
      setCreating(false)
      return
    }

    // Append to local list
    setUsers(prev => [
      ...prev,
      {
        id: Date.now(),
        username: createUsername.trim(),
        role: createRole,
        active: true,
        created_at: new Date().toISOString(),
        assignedOfficeTypeIds: [],
      }
    ])

    setCreating(false)
    setShowCreateModal(false)
    setCreateUsername('')
    setCreatePassword('')
    setSuccessMsg('নতুন অ্যাডমিন অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।')
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

      {/* Access Level Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <CardTitle className="text-base font-bold">সুপার অ্যাডমিন</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5">
            <p>✓ সকল অফিসের বাজেট দেখা ও সংশোধন</p>
            <p>✓ সকল সেটিংস ও কনফিগারেশন পরিবর্তন</p>
            <p>✓ নতুন অ্যাডমিন / সুপারঅ্যাডমিন ইউজার তৈরি</p>
            <p>✓ সকল ইউজারের পাসওয়ার্ড রিসেট</p>
            <p>✓ বাজেট চক্র ওপেন/ক্লোজ</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <Shield className="h-5 w-5" />
              </span>
              <CardTitle className="text-base font-bold">অ্যাডমিন</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5">
            <p>✓ সকল অফিসের বাজেট রিপোর্ট পর্যবেক্ষণ</p>
            <p>✓ দাখিলকৃত বাজেট সংশোধন/পরিবর্তন</p>
            <p>✓ বাজেট কনফিগারেশন পরিবর্তন</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <UserCheck className="h-5 w-5" />
              </span>
              <CardTitle className="text-base font-bold">সাধারণ ইউজার</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5">
            <p>✓ বাজেট ফরম পূরণ ও সংরক্ষণ</p>
            <p>✓ নিজ অফিসের বাজেট প্রস্তুতকরণ</p>
          </CardContent>
        </Card>
      </div>

      {/* Users List Table */}
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800">অ্যাডমিন ইউজার তালিকা ({toBanglaNumber(users.length)})</CardTitle>
          </div>
          <Button
            onClick={() => {
              setCreateError(null)
              setShowCreateModal(true)
            }}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            নতুন অ্যাডমিন তৈরি করুন
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">ইউজারনেম</th>
                  <th className="px-6 py-4">বর্তমান রোল</th>
                  <th className="px-6 py-4">স্ট্যাটাস</th>
                  <th className="px-6 py-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                      {u.username}
                      {u.id === currentUserId && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          আপনি
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.role === 'superadmin' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                          <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                          সুপার অ্যাডমিন
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                          <Shield className="h-3.5 w-3.5 text-blue-600" />
                          অ্যাডমিন
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          সক্রিয়
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                          <XCircle className="h-4 w-4 text-rose-500" />
                          নিষ্ক্রিয়
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(u)}
                        className="rounded-xl border-slate-200 hover:bg-slate-100 font-semibold text-xs flex items-center gap-1.5 ml-auto"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        সম্পাদনা
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      {showCreateModal && (
        <Dialog open={showCreateModal} onOpenChange={(open) => !open && setShowCreateModal(false)}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-600" />
                নতুন অ্যাডমিন অ্যাকাউন্ট তৈরি
              </DialogTitle>
            </DialogHeader>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {createError}
              </div>
            )}

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="create-username" className="text-sm font-bold text-slate-700">ইউজারনেম <span className="text-rose-500">*</span></Label>
                <Input
                  id="create-username"
                  type="text"
                  placeholder="যেমন: admin_dhaka বা vat_admin"
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-role" className="text-sm font-bold text-slate-700">ইউজার টাইপ / রোল</Label>
                <Select value={createRole} onValueChange={(v) => setCreateRole(v as 'admin' | 'superadmin')}>
                  <SelectTrigger id="create-role" className="w-full rounded-xl">
                    <SelectValue placeholder="রোল নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">অ্যাডমিন (Admin - বিভাগীয় অ্যাক্সেস)</SelectItem>
                    <SelectItem value="superadmin">সুপার অ্যাডমিন (SuperAdmin - সর্বময় অ্যাক্সেস)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-pwd" className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                  পাসওয়ার্ড
                </Label>
                <Input
                  id="create-pwd"
                  type="text"
                  placeholder="পাসওয়ার্ড লিখুন (খালি রাখলে ডিফল্ট: 123456)"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="rounded-xl border-slate-200"
                />
                <p className="text-xs text-slate-400">ডিফল্ট পাসওয়ার্ড: <span className="font-mono font-semibold">123456</span></p>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="rounded-xl"
              >
                বাতিল
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    তৈরি হচ্ছে...
                  </>
                ) : (
                  'অ্যাকাউন্ট তৈরি করুন'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-emerald-600" />
                ইউজার তথ্য ও রোল পরিবর্তন
              </DialogTitle>
            </DialogHeader>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ইউজারনেম</Label>
                <div className="font-bold text-base text-slate-800 mt-1">{editingUser.username}</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-select" className="text-sm font-bold text-slate-700">ইউজার টাইপ / রোল</Label>
                <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'superadmin')}>
                  <SelectTrigger id="role-select" className="w-full rounded-xl">
                    <SelectValue placeholder="রোল নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="superadmin">সুপার অ্যাডমিন (SuperAdmin - সর্বময় অ্যাক্সেস)</SelectItem>
                    <SelectItem value="admin">অ্যাডমিন (Admin - বিভাগীয় অ্যাক্সেস)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="active-select" className="text-sm font-bold text-slate-700">অ্যাকাউন্ট স্ট্যাটাস</Label>
                <Select value={active ? 'true' : 'false'} onValueChange={(v) => setActive(v === 'true')}>
                  <SelectTrigger id="active-select" className="w-full rounded-xl">
                    <SelectValue placeholder="স্ট্যাটাস নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">সক্রিয় (Active)</SelectItem>
                    <SelectItem value="false">নিষ্ক্রিয় (Inactive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Label htmlFor="pwd" className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                  নতুন পাসওয়ার্ড (ঐচ্ছিক)
                </Label>
                <Input
                  id="pwd"
                  type="text"
                  placeholder="পরিবর্তন না করতে চাইলে খালি রাখুন"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rounded-xl border-slate-200"
                />
                <p className="text-xs text-slate-400">যেকোনো সংখ্যার পাসওয়ার্ড দিতে পারেন (ডিফল্ট: 123456)</p>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setEditingUser(null)}
                disabled={saving}
                className="rounded-xl"
              >
                বাতিল
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    সংরক্ষণ হচ্ছে...
                  </>
                ) : (
                  'পরিবর্তন সংরক্ষণ করুন'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
