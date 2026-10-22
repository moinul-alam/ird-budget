'use client'

import { toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Loader2 } from 'lucide-react'
import { HeadOfficeItem } from '@/app/actions/admin-offices-management'
import { MinistryItem, DepartmentItem, OfficeTypeHierarchyItem, OfficeLevelItem } from '@/app/actions/admin-offices-config'
import { FieldOfficeModalState } from '../_types/field-offices'

interface FieldOfficeModalProps {
  modal: FieldOfficeModalState
  setModal: React.Dispatch<React.SetStateAction<FieldOfficeModalState>>
  ministries: MinistryItem[]
  departments: DepartmentItem[]
  modalDepartments: DepartmentItem[]
  headOffices: HeadOfficeItem[]
  modalHeadOffices: HeadOfficeItem[]
  officeTypes: OfficeTypeHierarchyItem[]
  modalOfficeTypes: OfficeTypeHierarchyItem[]
  officeLevels: OfficeLevelItem[]
  onSave: () => void
  isPending: boolean
}

export function FieldOfficeModal({
  modal,
  setModal,
  ministries,
  departments,
  modalDepartments,
  headOffices,
  modalHeadOffices,
  officeTypes,
  modalOfficeTypes,
  officeLevels,
  onSave,
  isPending,
}: FieldOfficeModalProps) {
  return (
    <Dialog open={modal.open} onOpenChange={(open) => !open && setModal((prev) => ({ ...prev, open: false }))}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            {modal.id ? 'মাঠ পর্যায়ের অফিস সম্পাদনা' : 'নতুন মাঠ পর্যায়ের অফিস যোগ করুন'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* ১. মন্ত্রণালয়/বিভাগ */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">মন্ত্রণালয় / বিভাগ</Label>
            <Select
              value={modal.ministry_id}
              onValueChange={(val) => {
                if (val) {
                  const depts = departments.filter((d) => d.ministry_id === val)
                  const newDeptId = depts[0]?.id || 0
                  const heads = headOffices.filter((h) => h.department_id === newDeptId)
                  const types = officeTypes.filter((ot) => ot.department_id === newDeptId)
                  setModal((prev) => ({
                    ...prev,
                    ministry_id: val,
                    department_id: newDeptId,
                    head_office_id: heads[0]?.id || 0,
                    office_type_id: types[0]?.id || 0,
                  }))
                }
              }}
            >
              <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                <SelectValue placeholder="মন্ত্রণালয়/বিভাগ নির্বাচন করুন">
                  {ministries.find((m) => m.id === modal.ministry_id)?.name || 'মন্ত্রণালয়/বিভাগ নির্বাচন করুন'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                {ministries.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ২. দপ্তর / সংস্থা */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">দপ্তর / সংস্থা</Label>
            <Select
              value={String(modal.department_id || '')}
              onValueChange={(val) => {
                if (val) {
                  const deptId = parseInt(val, 10)
                  const heads = headOffices.filter((h) => h.department_id === deptId)
                  const types = officeTypes.filter((ot) => ot.department_id === deptId)
                  setModal((prev) => ({
                    ...prev,
                    department_id: deptId,
                    head_office_id: heads[0]?.id || 0,
                    office_type_id: types[0]?.id || 0,
                  }))
                }
              }}
            >
              <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                <SelectValue placeholder="দপ্তর/সংস্থা নির্বাচন করুন">
                  {departments.find((d) => d.id === modal.department_id)?.name || 'দপ্তর/সংস্থা নির্বাচন করুন'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                {modalDepartments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ৩. হেড অফিস */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">হেড অফিসের নাম</Label>
            <Select
              value={String(modal.head_office_id || '')}
              onValueChange={(val) => {
                if (val) setModal((prev) => ({ ...prev, head_office_id: parseInt(val, 10) }))
              }}
            >
              <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                <SelectValue placeholder="হেড অফিস নির্বাচন করুন">
                  {headOffices.find((h) => h.id === modal.head_office_id)?.name || 'হেড অফিস নির্বাচন করুন'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                {modalHeadOffices.map((h) => (
                  <SelectItem key={h.id} value={String(h.id)}>
                    {h.name} ({h.department_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ৪. অফিসের ধরণ */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">অফিসের ধরণ</Label>
            <Select
              value={String(modal.office_type_id || '')}
              onValueChange={(val) => {
                if (val) setModal((prev) => ({ ...prev, office_type_id: parseInt(val, 10) }))
              }}
            >
              <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                <SelectValue placeholder="অফিসের ধরণ নির্বাচন করুন">
                  {officeTypes.find((ot) => ot.id === modal.office_type_id)?.name || 'অফিসের ধরণ নির্বাচন করুন'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                {modalOfficeTypes.map((ot) => (
                  <SelectItem key={ot.id} value={String(ot.id)}>
                    {ot.name} (লেভেল {toBanglaNumber(ot.hierarchy_order)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ৪.৫ মাঠ পর্যায়ের অফিসের স্তর */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">মাঠ পর্যায়ের অফিসের স্তর</Label>
            <Select
              value={String(modal.office_level_id || '')}
              onValueChange={(val) => {
                if (val) setModal((prev) => ({ ...prev, office_level_id: parseInt(val, 10) }))
              }}
            >
              <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                <SelectValue placeholder="স্তর নির্বাচন করুন">
                  {officeLevels.find((ol) => String(ol.id) === String(modal.office_level_id))?.level_name || 'স্তর নির্বাচন করুন'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                {officeLevels
                  .filter((ol) => ol.office_type_id === modal.office_type_id)
                  .map((ol) => (
                    <SelectItem key={ol.id} value={String(ol.id)}>
                      {ol.level_name} (স্তর {toBanglaNumber(ol.level_order)})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* ৫. মাঠ পর্যায়ের অফিসের নাম */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">মাঠ পর্যায়ের অফিসের নাম</Label>
            <Input
              type="text"
              value={modal.name}
              onChange={(e) => setModal((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="যেমন: সার্কেল-১ (কোতোয়ালী), সার্কেল-২ (মতিঝিল)..."
              className="rounded-xl border-slate-200 text-xs h-10"
            />
          </div>

          {/* ৬. অফিসের বাজেট আইডি */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">অফিসের বাজেট আইডি (ইউজার লগইন আইডি)</Label>
            <Input
              type="text"
              value={modal.budget_id}
              onChange={(e) => setModal((prev) => ({ ...prev, budget_id: e.target.value }))}
              placeholder="যেমন: ১০১, ১০২, ১০৩০১..."
              className="rounded-xl border-slate-200 text-xs h-10 font-mono"
            />
            <p className="text-[11px] text-slate-500">
              এই আইডিটি সংশ্লিষ্ট মাঠ পর্যায়ের অফিসের লগইন আইডি হিসেবে কাজ করবে এবং প্রাথমিক পাসওয়ার্ড হবে <span className="font-bold text-slate-800">12345</span>
            </p>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setModal((prev) => ({ ...prev, open: false }))}
            className="rounded-xl text-xs font-semibold"
          >
            বাতিল
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            সংরক্ষণ করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
