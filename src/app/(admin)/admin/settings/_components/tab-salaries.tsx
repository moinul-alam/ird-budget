'use client'

import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'
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
import {
  Calendar,
  HeartHandshake,
  Bus,
  GraduationCap,
  Home,
  Smartphone,
  PhoneCall,
  Coffee,
  Sparkles,
  Gift,
  Building,
  Sliders,
  Edit2,
  Plus,
  Loader2,
} from 'lucide-react'
import { SalaryCodeConfig } from '@/app/actions/admin-settings'
import { NumberModalState, GradeModalState } from '../_types/settings'

interface TabSalariesProps {
  salaryConfig: SalaryCodeConfig
  numModal: NumberModalState
  setNumModal: React.Dispatch<React.SetStateAction<NumberModalState>>
  gradeModal: GradeModalState
  setGradeModal: React.Dispatch<React.SetStateAction<GradeModalState>>
  houseRentModal: boolean
  setHouseRentModal: React.Dispatch<React.SetStateAction<boolean>>
  slabs: Array<{ id: string; from_grade: number; to_grade: number; percentage: number }>
  setSlabs: React.Dispatch<React.SetStateAction<Array<{ id: string; from_grade: number; to_grade: number; percentage: number }>>>
  specialBenefitModal: boolean
  setSpecialBenefitModal: React.Dispatch<React.SetStateAction<boolean>>
  specialBenefitSlabs: Array<{ id: string; from_grade: number; to_grade: number; percentage: number }>
  setSpecialBenefitSlabs: React.Dispatch<React.SetStateAction<Array<{ id: string; from_grade: number; to_grade: number; percentage: number }>>>
  mobileModal: boolean
  setMobileModal: React.Dispatch<React.SetStateAction<boolean>>
  mobileSlabs: Array<{ id: string; from_grade: number; to_grade: number; amount: number }>
  setMobileSlabs: React.Dispatch<React.SetStateAction<Array<{ id: string; from_grade: number; to_grade: number; amount: number }>>>
  onSaveNumberField: () => Promise<void>
  onSaveGradeField: () => Promise<void>
  onSaveHouseRentSlabs: () => Promise<void>
  onSaveSpecialBenefitSlabs: () => Promise<void>
  onSaveMobileSlabs: () => Promise<void>
  saving: boolean
}

export function TabSalaries({
  salaryConfig,
  numModal,
  setNumModal,
  gradeModal,
  setGradeModal,
  houseRentModal,
  setHouseRentModal,
  slabs,
  setSlabs,
  specialBenefitModal,
  setSpecialBenefitModal,
  specialBenefitSlabs,
  setSpecialBenefitSlabs,
  mobileModal,
  setMobileModal,
  mobileSlabs,
  setMobileSlabs,
  onSaveNumberField,
  onSaveGradeField,
  onSaveHouseRentSlabs,
  onSaveSpecialBenefitSlabs,
  onSaveMobileSlabs,
  saving,
}: TabSalariesProps) {
  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. বেতন-ভাতা মাস */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="h-1.5 w-full bg-emerald-500" />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-800">বেতন-ভাতা মাস</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">বাজেট গুণক মাস সংখ্যা</CardDescription>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Calendar className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-800 font-mono">
                  {toBanglaNumber(salaryConfig.salary_months)}
                </span>
                <span className="text-xs font-semibold text-slate-400">মাস</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNumModal({
                  open: true,
                  field: 'salary_months',
                  title: 'বেতন-ভাতা মাস সংখ্যা',
                  unit: 'মাস',
                  value: salaryConfig.salary_months,
                })}
                className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5" />
                পরিবর্তন করুন
              </Button>
            </CardContent>
          </Card>

          {/* 2. দায়িত্ব ভাতা */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="h-1.5 w-full bg-blue-500" />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-800">দায়িত্ব ভাতা</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">মাসিক হার</CardDescription>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <HeartHandshake className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-800 font-mono">
                  {toBanglaAmount(salaryConfig.duty_allowance)}
                </span>
                <span className="text-xs font-semibold text-slate-400">টাকা/মাস</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNumModal({
                  open: true,
                  field: 'duty_allowance',
                  title: 'দায়িত্ব ভাতা হার',
                  unit: 'টাকা',
                  value: salaryConfig.duty_allowance,
                })}
                className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5" />
                পরিবর্তন করুন
              </Button>
            </CardContent>
          </Card>

          {/* 3. যাতায়াত ভাতা (Range Grade) */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="h-1.5 w-full bg-indigo-500" />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-800">যাতায়াত ভাতা</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  প্রযোজ্য: গ্রেড {toBanglaNumber(salaryConfig.transport_allowance.from_grade)} হতে {toBanglaNumber(salaryConfig.transport_allowance.to_grade)}
                </CardDescription>
              </div>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Bus className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-800 font-mono">
                  {toBanglaAmount(salaryConfig.transport_allowance.rate)}
                </span>
                <span className="text-xs font-semibold text-slate-400">টাকা/মাস</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGradeModal({
                  open: true,
                  field: 'transport_allowance',
                  title: 'যাতায়াত ভাতা ও প্রযোজ্য গ্রেড',
                  rate: salaryConfig.transport_allowance.rate,
                  fromGrade: salaryConfig.transport_allowance.from_grade,
                  toGrade: salaryConfig.transport_allowance.to_grade,
                })}
                className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5" />
                পরিবর্তন করুন
              </Button>
            </CardContent>
          </Card>

          {/* 4. শিক্ষা ভাতা */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="h-1.5 w-full bg-purple-500" />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-800">শিক্ষা ভাতা</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">সন্তান প্রতি মাসিক হার</CardDescription>
              </div>
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                <GraduationCap className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-800 font-mono">
                  {toBanglaAmount(salaryConfig.education_allowance)}
                </span>
                <span className="text-xs font-semibold text-slate-400">টাকা/মাস</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNumModal({
                  open: true,
                  field: 'education_allowance',
                  title: 'শিক্ষা ভাতা হার',
                  unit: 'টাকা',
                  value: salaryConfig.education_allowance,
                })}
                className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5" />
                পরিবর্তন করুন
              </Button>
            </CardContent>
          </Card>

          {/* 5. বাড়ি ভাড়া ভাতা (Multiple Slabs) */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="h-1.5 w-full bg-teal-500" />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-800">বাড়ি ভাড়া ভাতা</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  {salaryConfig.house_rent_slabs.length} টি স্ল্যাব কনফিগার করা
                </CardDescription>
              </div>
              <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                <Home className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1 mt-1">
                {salaryConfig.house_rent_slabs.map(s => (
                  <div key={s.id} className="flex justify-between text-xs py-0.5 border-b border-slate-100">
                    <span className="text-slate-600">গ্রেড {toBanglaNumber(s.from_grade)} - {toBanglaNumber(s.to_grade)}:</span>
                    <span className="font-bold text-slate-800 font-mono">{toBanglaNumber(s.percentage)}%</span>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSlabs(salaryConfig.house_rent_slabs)
                  setHouseRentModal(true)
                }}
                className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Sliders className="h-3.5 w-3.5" />
                স্ল্যাব সম্পাদনা করুন
              </Button>
            </CardContent>
          </Card>

          {/* 6. চিকিৎসা ভাতা */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="h-1.5 w-full bg-rose-500" />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-800">চিকিৎসা ভাতা</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">কর্মকর্তা/কর্মচারী মাসিক হার</CardDescription>
              </div>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <HeartHandshake className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-800 font-mono">
                  {toBanglaAmount(salaryConfig.medical_allowance)}
                </span>
                <span className="text-xs font-semibold text-slate-400">টাকা/মাস</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNumModal({
                  open: true,
                  field: 'medical_allowance',
                  title: 'চিকিৎসা ভাতা হার',
                  unit: 'টাকা',
                  value: salaryConfig.medical_allowance,
                })}
                className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5" />
                পরিবর্তন করুন
              </Button>
            </CardContent>
          </Card>

          {/* 7. মোবাইল/সেলফোন ভাতা (Slab Wise) */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="h-1.5 w-full bg-amber-500" />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-800">মোবাইল/সেলফোন ভাতা</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  {(salaryConfig.mobile_allowance_slabs || []).length} টি স্ল্যাব কনফিগার করা
                </CardDescription>
              </div>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <Smartphone className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1 mt-1">
                {(salaryConfig.mobile_allowance_slabs || [
                  { id: 'mob-1', from_grade: 1, to_grade: 9, amount: 1500 },
                  { id: 'mob-2', from_grade: 10, to_grade: 20, amount: 1000 },
                ]).map(s => (
                  <div key={s.id} className="flex justify-between text-xs py-0.5 border-b border-slate-100">
                    <span className="text-slate-600">গ্রেড {toBanglaNumber(s.from_grade)} - {toBanglaNumber(s.to_grade)}:</span>
                    <span className="font-bold text-slate-800 font-mono">{toBanglaAmount(s.amount)} টাকা</span>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMobileSlabs(salaryConfig.mobile_allowance_slabs || [
                    { id: 'mob-1', from_grade: 1, to_grade: 9, amount: 1500 },
                    { id: 'mob-2', from_grade: 10, to_grade: 20, amount: 1000 },
                  ])
                  setMobileModal(true)
                }}
                className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Sliders className="h-3.5 w-3.5" />
                স্ল্যাব সম্পাদনা করুন
              </Button>
            </CardContent>
          </Card>

          {/* 8. আবাসিক টেলিফোন নগদায়ন ভাতা */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="h-1.5 w-full bg-cyan-500" />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-800">আবাসিক টেলিফোন নগদায়ন</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  প্রযোজ্য: গ্রেড {toBanglaNumber(salaryConfig.telephone_allowance.from_grade)} হতে {toBanglaNumber(salaryConfig.telephone_allowance.to_grade)}
                </CardDescription>
              </div>
              <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl">
                <PhoneCall className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-800 font-mono">
                  {toBanglaAmount(salaryConfig.telephone_allowance.rate)}
                </span>
                <span className="text-xs font-semibold text-slate-400">টাকা/মাস</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGradeModal({
                  open: true,
                  field: 'telephone_allowance',
                  title: 'আবাসিক টেলিফোন নগদায়ন ভাতা',
                  rate: salaryConfig.telephone_allowance.rate,
                  fromGrade: salaryConfig.telephone_allowance.from_grade,
                  toGrade: salaryConfig.telephone_allowance.to_grade,
                })}
                className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5" />
                পরিবর্তন করুন
              </Button>
            </CardContent>
          </Card>

          {/* 9. টিফিন ভাতা */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="h-1.5 w-full bg-orange-500" />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-800">টিফিন ভাতা</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  প্রযোজ্য: গ্রেড {toBanglaNumber(salaryConfig.tiffin_allowance.from_grade)} হতে {toBanglaNumber(salaryConfig.tiffin_allowance.to_grade)}
                </CardDescription>
              </div>
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                <Coffee className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-800 font-mono">
                  {toBanglaAmount(salaryConfig.tiffin_allowance.rate)}
                </span>
                <span className="text-xs font-semibold text-slate-400">টাকা/মাস</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGradeModal({
                  open: true,
                  field: 'tiffin_allowance',
                  title: 'টিফিন ভাতা ও প্রযোজ্য গ্রেড',
                  rate: salaryConfig.tiffin_allowance.rate,
                  fromGrade: salaryConfig.tiffin_allowance.from_grade,
                  toGrade: salaryConfig.tiffin_allowance.to_grade,
                })}
                className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5" />
                পরিবর্তন করুন
              </Button>
            </CardContent>
          </Card>

          {/* 10. ধোলাই ভাতা */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="h-1.5 w-full bg-sky-500" />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-800">ধোলাই ভাতা</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  প্রযোজ্য: গ্রেড {toBanglaNumber(salaryConfig.wash_allowance.from_grade)} হতে {toBanglaNumber(salaryConfig.wash_allowance.to_grade)}
                </CardDescription>
              </div>
              <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
                <Sparkles className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-800 font-mono">
                  {toBanglaAmount(salaryConfig.wash_allowance.rate)}
                </span>
                <span className="text-xs font-semibold text-slate-400">টাকা/মাস</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGradeModal({
                  open: true,
                  field: 'wash_allowance',
                  title: 'ধোলাই ভাতা ও প্রযোজ্য গ্রেড',
                  rate: salaryConfig.wash_allowance.rate,
                  fromGrade: salaryConfig.wash_allowance.from_grade,
                  toGrade: salaryConfig.wash_allowance.to_grade,
                })}
                className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5" />
                পরিবর্তন করুন
              </Button>
            </CardContent>
          </Card>

          {/* 11. আপ্যায়ন ভাতা */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="h-1.5 w-full bg-lime-500" />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-800">আপ্যায়ন ভাতা</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  প্রযোজ্য: গ্রেড {toBanglaNumber(salaryConfig.entertainment_allowance.from_grade)} হতে {toBanglaNumber(salaryConfig.entertainment_allowance.to_grade)}
                </CardDescription>
              </div>
              <div className="p-2.5 bg-lime-50 text-lime-600 rounded-xl">
                <Coffee className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-800 font-mono">
                  {toBanglaAmount(salaryConfig.entertainment_allowance.rate)}
                </span>
                <span className="text-xs font-semibold text-slate-400">টাকা/মাস</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGradeModal({
                  open: true,
                  field: 'entertainment_allowance',
                  title: 'আপ্যায়ন ভাতা ও প্রযোজ্য গ্রেড',
                  rate: salaryConfig.entertainment_allowance.rate,
                  fromGrade: salaryConfig.entertainment_allowance.from_grade,
                  toGrade: salaryConfig.entertainment_allowance.to_grade,
                })}
                className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5" />
                পরিবর্তন করুন
              </Button>
            </CardContent>
          </Card>

          {/* 12. বিশেষ সুবিধা (Multiple Slabs - Percentage of Basic) */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="h-1.5 w-full bg-violet-500" />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-800">বিশেষ সুবিধা</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  {(salaryConfig.special_benefit_slabs || []).length} টি স্ল্যাব (মূল বেতনের %)
                </CardDescription>
              </div>
              <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl">
                <Gift className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1 mt-1">
                {(salaryConfig.special_benefit_slabs || []).map(s => (
                  <div key={s.id} className="flex justify-between text-xs py-0.5 border-b border-slate-100">
                    <span className="text-slate-600">গ্রেড {toBanglaNumber(s.from_grade)} - {toBanglaNumber(s.to_grade)}:</span>
                    <span className="font-bold text-slate-800 font-mono">{toBanglaNumber(s.percentage)}%</span>
                  </div>
                ))}
                {(!salaryConfig.special_benefit_slabs || salaryConfig.special_benefit_slabs.length === 0) && (
                  <p className="text-xs text-slate-400 py-1">কোনো স্ল্যাব কনফিগার করা নেই</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSpecialBenefitSlabs(salaryConfig.special_benefit_slabs || [])
                  setSpecialBenefitModal(true)
                }}
                className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Sliders className="h-3.5 w-3.5" />
                স্ল্যাব সম্পাদনা করুন
              </Button>
            </CardContent>
          </Card>

          {/* 13. বাংলা নববর্ষ ভাতা (Percentage) */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="h-1.5 w-full bg-red-500" />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-800">বাংলা নববর্ষ ভাতা</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">মূল বেতনের শতকরা হার</CardDescription>
              </div>
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                <Sparkles className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-800 font-mono">
                  {toBanglaNumber(salaryConfig.noboborsho_percent)}%
                </span>
                <span className="text-xs font-semibold text-slate-400">বেসিকের</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNumModal({
                  open: true,
                  field: 'noboborsho_percent',
                  title: 'বাংলা নববর্ষ ভাতা হার (%)',
                  unit: '%',
                  value: salaryConfig.noboborsho_percent,
                })}
                className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5" />
                পরিবর্তন করুন
              </Button>
            </CardContent>
          </Card>

          {/* 14. উৎসব ভাতা (Number of bonuses) */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="h-1.5 w-full bg-emerald-500" />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-800">উৎসব ভাতা</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">বাৎসরিক বোনাস সংখ্যা</CardDescription>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Gift className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-800 font-mono">
                  {toBanglaNumber(salaryConfig.festival_bonus_multiplier)}
                </span>
                <span className="text-xs font-semibold text-slate-400">টি বেসিক</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNumModal({
                  open: true,
                  field: 'festival_bonus_multiplier',
                  title: 'উৎসব বোনাস সংখ্যা',
                  unit: 'টি',
                  value: salaryConfig.festival_bonus_multiplier,
                })}
                className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5" />
                পরিবর্তন করুন
              </Button>
            </CardContent>
          </Card>

          {/* 15. অফিস ভবন ভাড়ার ভ্যাট হার */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="h-1.5 w-full bg-slate-700" />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-800">অফিস ভাড়ার ভ্যাট হার</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">ভাড়া বাবদ ভ্যাটের শতকরা হার</CardDescription>
              </div>
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
                <Building className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-800 font-mono">
                  {toBanglaNumber(salaryConfig.office_rent_vat_percent)}%
                </span>
                <span className="text-xs font-semibold text-slate-400">ভাড়ার ওপর</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNumModal({
                  open: true,
                  field: 'office_rent_vat_percent',
                  title: 'অফিস ভবন ভাড়ার ভ্যাট হার (%)',
                  unit: '%',
                  value: salaryConfig.office_rent_vat_percent,
                })}
                className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5" />
                পরিবর্তন করুন
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Number Value Modal */}
      {numModal.open && (
        <Dialog open={numModal.open} onOpenChange={(open) => !open && setNumModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                {numModal.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <Label className="text-sm font-bold text-slate-700">
                মান লিখুন ({numModal.unit})
              </Label>
              <Input
                type="number"
                value={numModal.value}
                onChange={(e) => setNumModal(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                className="rounded-xl border-slate-200 font-mono text-lg font-bold"
              />
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setNumModal(prev => ({ ...prev, open: false }))} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={onSaveNumberField} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Grade-Range Allowance Modal */}
      {gradeModal.open && (
        <Dialog open={gradeModal.open} onOpenChange={(open) => !open && setGradeModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                {gradeModal.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">ভাতার হার (টাকা/মাস)</Label>
                <Input
                  type="number"
                  value={gradeModal.rate}
                  onChange={(e) => setGradeModal(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                  className="rounded-xl border-slate-200 font-mono text-base font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">প্রযোজ্য গ্রেড পরিসীমা</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">হতে গ্রেড:</span>
                    <Select
                      value={String(gradeModal.fromGrade)}
                      onValueChange={(v) => setGradeModal(prev => ({ ...prev, fromGrade: parseInt(v || '1') }))}
                    >
                      <SelectTrigger className="w-full rounded-xl">
                        <SelectValue placeholder="গ্রেড নির্বাচন করুন">
                          {gradeModal.fromGrade ? `গ্রেড ${toBanglaNumber(gradeModal.fromGrade)}` : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 20 }, (_, i) => i + 1).map(g => (
                          <SelectItem key={g} value={String(g)}>
                            গ্রেড {toBanglaNumber(g)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">পর্যন্ত গ্রেড:</span>
                    <Select
                      value={String(gradeModal.toGrade)}
                      onValueChange={(v) => setGradeModal(prev => ({ ...prev, toGrade: parseInt(v || '20') }))}
                    >
                      <SelectTrigger className="w-full rounded-xl">
                        <SelectValue placeholder="গ্রেড নির্বাচন করুন">
                          {gradeModal.toGrade ? `গ্রেড ${toBanglaNumber(gradeModal.toGrade)}` : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 20 }, (_, i) => i + 1).map(g => (
                          <SelectItem key={g} value={String(g)}>
                            গ্রেড {toBanglaNumber(g)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setGradeModal(prev => ({ ...prev, open: false }))} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={onSaveGradeField} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* House Rent Slabs Modal */}
      {houseRentModal && (
        <Dialog open={houseRentModal} onOpenChange={(open) => !open && setHouseRentModal(false)}>
          <DialogContent className="sm:max-w-xl rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                বাড়ি ভাড়া ভাতা স্ল্যাবসমূহ
              </DialogTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSlabs(prev => [
                  ...prev,
                  { id: `slab-${Date.now()}`, from_grade: 1, to_grade: 20, percentage: 50 }
                ])}
                className="rounded-xl text-xs font-bold border-slate-200"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                স্ল্যাব যোগ করুন
              </Button>
            </DialogHeader>
            <div className="space-y-3 py-3 max-h-[60vh] overflow-y-auto">
              {slabs.map((slab, i) => (
                <div key={slab.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>স্ল্যাব #{toBanglaNumber(i + 1)}</span>
                    <button
                      type="button"
                      onClick={() => setSlabs(prev => prev.filter(s => s.id !== slab.id))}
                      className="text-rose-600 hover:text-rose-800 font-semibold text-xs"
                    >
                      মুছুন
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">হতে গ্রেড</span>
                      <Select
                        value={String(slab.from_grade)}
                        onValueChange={(v) => {
                          const val = parseInt(v || '1')
                          setSlabs(prev => prev.map(s => s.id === slab.id ? { ...s, from_grade: val } : s))
                        }}
                      >
                        <SelectTrigger className="w-full rounded-xl bg-white border-slate-200">
                          <SelectValue>
                            গ্রেড {toBanglaNumber(slab.from_grade)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 20 }, (_, idx) => idx + 1).map(g => (
                            <SelectItem key={g} value={String(g)}>
                              গ্রেড {toBanglaNumber(g)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">পর্যন্ত গ্রেড</span>
                      <Select
                        value={String(slab.to_grade)}
                        onValueChange={(v) => {
                          const val = parseInt(v || '20')
                          setSlabs(prev => prev.map(s => s.id === slab.id ? { ...s, to_grade: val } : s))
                        }}
                      >
                        <SelectTrigger className="w-full rounded-xl bg-white border-slate-200">
                          <SelectValue>
                            গ্রেড {toBanglaNumber(slab.to_grade)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 20 }, (_, idx) => idx + 1).map(g => (
                            <SelectItem key={g} value={String(g)}>
                              গ্রেড {toBanglaNumber(g)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">হার (%)</span>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={slab.percentage}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          setSlabs(prev => prev.map(s => s.id === slab.id ? { ...s, percentage: val } : s))
                        }}
                        className="rounded-xl border-slate-200 bg-white font-mono text-sm font-bold text-emerald-700 h-9"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setHouseRentModal(false)} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={onSaveHouseRentSlabs} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Special Benefit Slabs Modal */}
      {specialBenefitModal && (
        <Dialog open={specialBenefitModal} onOpenChange={(open) => !open && setSpecialBenefitModal(false)}>
          <DialogContent className="sm:max-w-xl rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                বিশেষ সুবিধা স্ল্যাবসমূহ (মূল বেতনের %)
              </DialogTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSpecialBenefitSlabs(prev => [
                  ...prev,
                  { id: `sb-slab-${Date.now()}`, from_grade: 1, to_grade: 20, percentage: 5 }
                ])}
                className="rounded-xl text-xs font-bold border-slate-200"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                স্ল্যাব যোগ করুন
              </Button>
            </DialogHeader>
            <div className="space-y-3 py-3 max-h-[60vh] overflow-y-auto">
              {specialBenefitSlabs.map((slab, i) => (
                <div key={slab.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>স্ল্যাব #{toBanglaNumber(i + 1)}</span>
                    <button
                      type="button"
                      onClick={() => setSpecialBenefitSlabs(prev => prev.filter(s => s.id !== slab.id))}
                      className="text-rose-600 hover:text-rose-800 font-semibold text-xs"
                    >
                      মুছুন
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">হতে গ্রেড</span>
                      <Select
                        value={String(slab.from_grade)}
                        onValueChange={(v) => {
                          const val = parseInt(v || '1')
                          setSpecialBenefitSlabs(prev => prev.map(s => s.id === slab.id ? { ...s, from_grade: val } : s))
                        }}
                      >
                        <SelectTrigger className="w-full rounded-xl bg-white border-slate-200">
                          <SelectValue>
                            গ্রেড {toBanglaNumber(slab.from_grade)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 20 }, (_, idx) => idx + 1).map(g => (
                            <SelectItem key={g} value={String(g)}>
                              গ্রেড {toBanglaNumber(g)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">পর্যন্ত গ্রেড</span>
                      <Select
                        value={String(slab.to_grade)}
                        onValueChange={(v) => {
                          const val = parseInt(v || '20')
                          setSpecialBenefitSlabs(prev => prev.map(s => s.id === slab.id ? { ...s, to_grade: val } : s))
                        }}
                      >
                        <SelectTrigger className="w-full rounded-xl bg-white border-slate-200">
                          <SelectValue>
                            গ্রেড {toBanglaNumber(slab.to_grade)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 20 }, (_, idx) => idx + 1).map(g => (
                            <SelectItem key={g} value={String(g)}>
                              গ্রেড {toBanglaNumber(g)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">হার (% মূলবেতন)</span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="any"
                        value={slab.percentage}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          setSpecialBenefitSlabs(prev => prev.map(s => s.id === slab.id ? { ...s, percentage: val } : s))
                        }}
                        className="rounded-xl border-slate-200 bg-white font-mono text-sm font-bold text-violet-700 h-9"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {specialBenefitSlabs.length === 0 && (
                <div className="text-center py-6 text-sm text-slate-400">
                  কোনো স্ল্যাব নেই। &apos;স্ল্যাব যোগ করুন&apos; বাটনে ক্লিক করে নতুন স্ল্যাব তৈরি করুন।
                </div>
              )}
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setSpecialBenefitModal(false)} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={onSaveSpecialBenefitSlabs} disabled={saving} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Mobile Allowance Slabs Modal */}
      {mobileModal && (
        <Dialog open={mobileModal} onOpenChange={(open) => !open && setMobileModal(false)}>
          <DialogContent className="sm:max-w-xl rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                মোবাইল/সেলফোন ভাতা স্ল্যাবসমূহ
              </DialogTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMobileSlabs(prev => [
                  ...prev,
                  { id: `mob-${Date.now()}`, from_grade: 1, to_grade: 20, amount: 1000 }
                ])}
                className="rounded-xl text-xs font-bold border-slate-200"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                স্ল্যাব যোগ করুন
              </Button>
            </DialogHeader>
            <div className="space-y-3 py-3 max-h-[60vh] overflow-y-auto">
              {mobileSlabs.map((slab, i) => (
                <div key={slab.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>স্ল্যাব #{toBanglaNumber(i + 1)}</span>
                    <button
                      type="button"
                      onClick={() => setMobileSlabs(prev => prev.filter(s => s.id !== slab.id))}
                      className="text-rose-600 hover:text-rose-800 font-semibold text-xs"
                    >
                      মুছুন
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">হতে গ্রেড</span>
                      <Select
                        value={String(slab.from_grade)}
                        onValueChange={(v) => {
                          const val = parseInt(v || '1')
                          setMobileSlabs(prev => prev.map(s => s.id === slab.id ? { ...s, from_grade: val } : s))
                        }}
                      >
                        <SelectTrigger className="w-full rounded-xl bg-white border-slate-200">
                          <SelectValue>
                            গ্রেড {toBanglaNumber(slab.from_grade)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 20 }, (_, idx) => idx + 1).map(g => (
                            <SelectItem key={g} value={String(g)}>
                              গ্রেড {toBanglaNumber(g)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">পর্যন্ত গ্রেড</span>
                      <Select
                        value={String(slab.to_grade)}
                        onValueChange={(v) => {
                          const val = parseInt(v || '20')
                          setMobileSlabs(prev => prev.map(s => s.id === slab.id ? { ...s, to_grade: val } : s))
                        }}
                      >
                        <SelectTrigger className="w-full rounded-xl bg-white border-slate-200">
                          <SelectValue>
                            গ্রেড {toBanglaNumber(slab.to_grade)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 20 }, (_, idx) => idx + 1).map(g => (
                            <SelectItem key={g} value={String(g)}>
                              গ্রেড {toBanglaNumber(g)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">ভাতা (টাকা/মাস)</span>
                      <Input
                        type="number"
                        min={0}
                        value={slab.amount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          setMobileSlabs(prev => prev.map(s => s.id === slab.id ? { ...s, amount: val } : s))
                        }}
                        className="rounded-xl border-slate-200 bg-white font-mono text-sm font-bold text-amber-700 h-9"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setMobileModal(false)} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={onSaveMobileSlabs} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
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
