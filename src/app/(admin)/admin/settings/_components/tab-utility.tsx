'use client'

import { toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Zap, Plus, Edit2, Trash2, Loader2 } from 'lucide-react'
import { UtilityTypeItem, EconomicCodeOption } from '@/lib/actions/admin-settings'
import { UtilityModalState } from '../_types/settings'

/** A shadcn Select cannot hold an empty value, so "unbound" needs a sentinel. */
const UNBOUND_CODE = '__unbound__'

interface TabUtilityProps {
  utilityTypes: UtilityTypeItem[]
  economicCodeOptions: EconomicCodeOption[]
  utilityModal: UtilityModalState
  setUtilityModal: React.Dispatch<React.SetStateAction<UtilityModalState>>
  onSaveUtility: () => Promise<void>
  onDeleteUtility: (id: number) => Promise<void>
  saving: boolean
}

export function TabUtility({
  utilityTypes,
  economicCodeOptions,
  utilityModal,
  setUtilityModal,
  onSaveUtility,
  onDeleteUtility,
  saving,
}: TabUtilityProps) {
  return (
    <>
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              ইউটিলিটির তালিকা
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              অফিসসমূহের বাজেট তৈরির জন্য ইউটিলিটি সেবাসমূহ নির্ধারণ করুন
            </CardDescription>
          </div>
          <Button
            onClick={() => setUtilityModal({ open: true, name: '', economic_code_id: null })}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            নতুন ইউটিলিটি যোগ করুন
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 w-24">ক্রম</th>
                  <th className="px-6 py-4">ইউটিলিটির নাম</th>
                  <th className="px-6 py-4">অর্থনৈতিক কোড</th>
                  <th className="px-6 py-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {utilityTypes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400">
                      কোনো ইউটিলিটি নেই। &quot;নতুন ইউটিলিটি যোগ করুন&quot; বাটনে ক্লিক করে যোগ করুন।
                    </td>
                  </tr>
                ) : (
                  utilityTypes.map((u, idx) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-500">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {u.name}
                      </td>
                      <td className="px-6 py-4">
                        {u.economic_code ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
                            <span className="font-mono">{u.economic_code}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">সংযুক্ত নয়</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUtilityModal({ open: true, id: u.id, name: u.name, economic_code_id: u.economic_code_id })}
                          className="rounded-xl border-slate-200 text-xs font-semibold"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          সম্পাদনা
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteUtility(u.id)}
                          className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          মুছুন
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

      {/* Utility Type Modal */}
      {utilityModal.open && (
        <Dialog open={utilityModal.open} onOpenChange={(open) => !open && setUtilityModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                {utilityModal.id ? 'ইউটিলিটির নাম সম্পাদনা' : 'নতুন ইউটিলিটির নাম যোগ করুন'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">ইউটিলিটির নাম</Label>
                <Input
                  type="text"
                  placeholder="যেমন: ইন্টারনেট বিল, টেলিফোন বিল"
                  value={utilityModal.name}
                  onChange={(e) => setUtilityModal(prev => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl border-slate-200 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">অর্থনৈতিক কোড (বিলটি যে কোডে যাবে)</Label>
                <Select
                  value={utilityModal.economic_code_id === null ? UNBOUND_CODE : String(utilityModal.economic_code_id)}
                  onValueChange={(value) =>
                    setUtilityModal(prev => ({
                      ...prev,
                      economic_code_id: value === UNBOUND_CODE ? null : Number(value),
                    }))
                  }
                >
                  <SelectTrigger className="rounded-xl border-slate-200 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNBOUND_CODE}>সংযুক্ত নয়</SelectItem>
                    {economicCodeOptions.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  ইঞ্জিন ইউটিলিটির নাম মেলায় না — এই কোডটিই বলে বিলটি কোথায় যোগ হবে।
                </p>
              </div>
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setUtilityModal(prev => ({ ...prev, open: false }))} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={onSaveUtility} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
