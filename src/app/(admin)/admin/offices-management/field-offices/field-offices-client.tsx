'use client'

import { useState, useTransition, useMemo } from 'react'
import { toEnglishNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import {
  FieldOfficeItem,
  HeadOfficeItem,
  saveFieldOffice,
  deleteFieldOffice,
} from '@/app/actions/admin-offices-management'
import { MinistryItem, DepartmentItem, OfficeTypeHierarchyItem, OfficeLevelItem } from '@/app/actions/admin-offices-config'
import { FieldOfficeModalState, ConfirmModalState } from './_types/field-offices'
import { FieldOfficesTable } from './_components/field-offices-table'
import { FieldOfficeModal } from './_components/field-office-modal'

interface FieldOfficesClientProps {
  initialFieldOffices: FieldOfficeItem[]
  headOffices: HeadOfficeItem[]
  ministries: MinistryItem[]
  departments: DepartmentItem[]
  officeTypes: OfficeTypeHierarchyItem[]
  officeLevels: OfficeLevelItem[]
}

export function FieldOfficesClient({
  initialFieldOffices,
  headOffices,
  ministries,
  departments,
  officeTypes,
  officeLevels,
}: FieldOfficesClientProps) {
  const [fieldOffices, setFieldOffices] = useState<FieldOfficeItem[]>(initialFieldOffices)
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Field Office Modal state
  const [modal, setModal] = useState<FieldOfficeModalState>({
    open: false,
    name: '',
    budget_id: '',
    ministry_id: '',
    department_id: '',
    head_office_id: '',
    office_type_id: '',
    office_level_id: '',
  })

  // Delete confirmation modal state
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  })

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 3500)
  }

  // Filtered departments for selected ministry
  const modalDepartments = useMemo(() => {
    if (!modal.ministry_id) return departments
    return departments.filter((d) => d.ministry_id === modal.ministry_id)
  }, [departments, modal.ministry_id])

  // Filtered head offices for selected department
  const modalHeadOffices = useMemo(() => {
    if (!modal.department_id) return headOffices
    return headOffices.filter((h) => h.department_id === modal.department_id)
  }, [headOffices, modal.department_id])

  // Filtered office types for selected department
  const modalOfficeTypes = useMemo(() => {
    if (!modal.department_id) return officeTypes
    return officeTypes.filter((ot) => ot.department_id === modal.department_id)
  }, [officeTypes, modal.department_id])

  // Selected office type
  const selectedTypeObj = useMemo(() => {
    return officeTypes.find((ot) => ot.id === modal.office_type_id)
  }, [officeTypes, modal.office_type_id])

  // Computed level
  const computedOfficeLevel = useMemo(() => {
    if (selectedTypeObj) return selectedTypeObj.hierarchy_order || 1
    if (modalOfficeTypes.length > 0) return modalOfficeTypes[0].hierarchy_order || 1
    return 1
  }, [selectedTypeObj, modalOfficeTypes])

  // Open Add modal
  const handleOpenAdd = () => {
    const defaultMin = ministries[0]?.id || ''
    const defaultDepts = defaultMin ? departments.filter((d) => d.ministry_id === defaultMin) : departments
    const defaultDeptId = defaultDepts[0]?.id?.toString() || departments[0]?.id?.toString() || ''
    const defaultHeads = defaultDeptId ? headOffices.filter((h) => h.department_id === defaultDeptId) : headOffices
    const defaultHeadId = defaultHeads[0]?.id?.toString() || headOffices[0]?.id?.toString() || ''
    const defaultTypes = defaultDeptId ? officeTypes.filter((ot) => ot.department_id === defaultDeptId) : officeTypes
    const defaultTypeId = defaultTypes[0]?.id?.toString() || officeTypes[0]?.id?.toString() || ''

    setModal({
      open: true,
      name: '',
      budget_id: '',
      ministry_id: defaultMin,
      department_id: defaultDeptId,
      head_office_id: defaultHeadId,
      office_type_id: defaultTypeId,
      office_level_id: '',
    })
  }

  // Open Edit modal
  const handleOpenEdit = (item: FieldOfficeItem) => {
    setModal({
      open: true,
      id: item.id,
      name: item.name,
      budget_id: item.budget_id,
      ministry_id: item.ministry_id || ministries[0]?.id || '',
      department_id: item.department_id,
      head_office_id: item.head_office_id,
      office_type_id: item.office_type_id,
      office_level_id: item.office_level_id || '',
    })
  }

  // Open Duplicate modal: keeps ministry, department, head office, type, level, clears name and budget_id
  const handleOpenDuplicate = (item: FieldOfficeItem) => {
    setModal({
      open: true,
      id: undefined,
      name: '', // Empty: admin has to type
      budget_id: '', // Empty: admin has to type
      ministry_id: item.ministry_id || ministries[0]?.id || '',
      department_id: item.department_id,
      head_office_id: item.head_office_id,
      office_type_id: item.office_type_id,
      office_level_id: item.office_level_id || '',
    })
    showStatus(`"${item.name}" থেকে অনুলিপি করা হচ্ছে। নতুন অফিসের নাম ও বাজেট আইডি লিখুন।`, 'success')
  }

  // Handle Save
  const handleSave = () => {
    if (!modal.name.trim()) {
      showStatus('মাঠ পর্যায়ের অফিসের নাম আবশ্যক', 'error')
      return
    }
    if (!modal.budget_id.trim()) {
      showStatus('বাজেট আইডি আবশ্যক', 'error')
      return
    }
    if (!modal.head_office_id) {
      showStatus('হেড অফিস নির্বাচন আবশ্যক', 'error')
      return
    }
    if (!modal.office_type_id) {
      showStatus('অফিসের ধরণ নির্বাচন আবশ্যক', 'error')
      return
    }

    const englishBudgetId = toEnglishNumber(modal.budget_id.trim())

    startTransition(async () => {
      const res = await saveFieldOffice({
        id: modal.id,
        name: modal.name,
        budget_id: englishBudgetId,
        head_office_id: modal.head_office_id,
        office_type_id: modal.office_type_id,
        password: '12345', // Default 12345 for login
      })

      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        const msg = modal.id
          ? 'মাঠ পর্যায়ের অফিস সফলভাবে আপডেট হয়েছে'
          : `নতুন অফিস তৈরি হয়েছে! ইউজার আইডি: ${englishBudgetId}, পাসওয়ার্ড: 12345`
        showStatus(msg)
        setModal((prev) => ({ ...prev, open: false }))

        const dept = departments.find((d) => d.id === modal.department_id)
        const typeObj = officeTypes.find((ot) => ot.id === modal.office_type_id)
        const headObj = headOffices.find((h) => h.id === modal.head_office_id)
        const minObj = ministries.find((m) => m.id === modal.ministry_id)

        if (modal.id) {
          setFieldOffices((prev) =>
            prev.map((f) =>
              f.id === modal.id
                ? {
                    ...f,
                    name: modal.name.trim(),
                    budget_id: englishBudgetId,
                    department_id: modal.department_id,
                    department_name: dept?.name || '',
                    ministry_id: modal.ministry_id,
                    ministry_name: minObj?.name || '',
                    head_office_id: modal.head_office_id,
                    head_office_name: headObj?.name || '',
                    office_type_id: modal.office_type_id,
                    office_type_name: typeObj?.name || '',
                  }
                : f
            )
          )
        } else {
          setFieldOffices((prev) => [
            {
              id: String(Date.now()),
              name: modal.name.trim(),
              budget_id: englishBudgetId,
              department_id: modal.department_id,
              department_name: dept?.name || '',
              ministry_id: modal.ministry_id,
              ministry_name: minObj?.name || '',
              head_office_id: modal.head_office_id,
              head_office_name: headObj?.name || '',
              office_type_id: modal.office_type_id,
              office_type_name: typeObj?.name || '',
              password_hint: '12345',
              created_at: new Date().toISOString(),
            },
            ...prev,
          ])
        }
      }
    })
  }

  // Handle Delete
  const confirmDelete = (item: FieldOfficeItem) => {
    setConfirmModal({
      open: true,
      title: 'মাঠ পর্যায়ের অফিস মুছে ফেলা',
      description: `আপনি কি নিশ্চিতভাবে "${item.name}" (বাজেট আইডি: ${item.budget_id}) অফিসটি মুছে ফেলতে চান? সংশ্লিষ্ট অফিস ইউজারও অপসারিত হবে।`,
      onConfirm: () => {
        startTransition(async () => {
          const res = await deleteFieldOffice(item.id)
          setConfirmModal((prev) => ({ ...prev, open: false }))
          if (res.error) {
            showStatus(res.error, 'error')
          } else {
            showStatus('অফিস এবং ইউজার সফলভাবে মুছে ফেলা হয়েছে')
            setFieldOffices((prev) => prev.filter((f) => f.id !== item.id))
          }
        })
      },
    })
  }

  const filteredOffices = fieldOffices.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.budget_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.head_office_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.office_type_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-title">
            মাঠ পর্যায়ের সকল অফিস (Field Offices)
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            হেড অফিসের অধীনে সার্কেল ও মাঠ পর্যায়ের অফিসসমূহ পরিচালনা ও স্বয়ংক্রিয় ইউজার আইডি তৈরি
          </p>
        </div>

        {statusMessage && (
          <div
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Table Component */}
      <FieldOfficesTable
        fieldOffices={fieldOffices}
        filteredOffices={filteredOffices}
        headOffices={headOffices}
        officeTypes={officeTypes}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAdd={handleOpenAdd}
        onOpenEdit={handleOpenEdit}
        onOpenDuplicate={handleOpenDuplicate}
        onConfirmDelete={confirmDelete}
      />

      {/* Field Office Modal */}
      <FieldOfficeModal
        modal={modal}
        setModal={setModal}
        ministries={ministries}
        departments={departments}
        modalDepartments={modalDepartments}
        headOffices={headOffices}
        modalHeadOffices={modalHeadOffices}
        officeTypes={officeTypes}
        modalOfficeTypes={modalOfficeTypes}
        officeLevels={officeLevels}
        onSave={handleSave}
        isPending={isPending}
      />

      {/* Delete Confirmation Modal */}
      <Dialog
        open={confirmModal.open}
        onOpenChange={(open) => !open && setConfirmModal((prev) => ({ ...prev, open: false }))}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <span>{confirmModal.title}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmModal.description}
            </p>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
              className="rounded-xl text-xs font-semibold"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={confirmModal.onConfirm}
              disabled={isPending}
              className="rounded-xl text-white font-bold text-xs bg-rose-600 hover:bg-rose-700"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              মুছে ফেলা নিশ্চিত করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
