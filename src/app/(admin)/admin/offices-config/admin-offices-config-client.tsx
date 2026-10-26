'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toBanglaNumber } from '@/lib/bangla'
import {
  Landmark,
  Building2,
  Briefcase,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import {
  MinistryItem,
  DepartmentItem,
  OfficeTypeHierarchyItem,
  OfficeLevelItem,
  saveMinistry,
  deleteMinistry,
  saveDepartment,
  deleteDepartment,
  saveOfficeType,
  saveOfficeLevel,
  deleteOfficeLevel,
  deleteOfficeType,
  getOfficeLevels,
} from '@/app/actions/admin-offices-config'
import {
  AdminOfficesConfigClientProps,
  ConfigTabType,
  MinistryModalState,
  DepartmentModalState,
  OfficeTypeModalState,
  HierarchyModalState,
  ConfirmModalState,
} from './_types/offices-config'
import { getLevelOrderBadge } from './_lib/helpers'
import { ConfirmDeleteDialog } from './_components/confirm-delete-dialog'
import { TabMinistries } from './_components/tab-ministries'
import { TabDepartments } from './_components/tab-departments'
import { TabOfficeTypes } from './_components/tab-office-types'
import { TabOfficeLevels } from './_components/tab-office-levels'

// Re-export getLevelOrderBadge in case external consumers import it from here
export { getLevelOrderBadge }

const CONFIG_TABS: ConfigTabType[] = ['ministries', 'departments', 'office_types', 'hierarchy']

const isConfigTab = (value: string | null): value is ConfigTabType =>
  value !== null && (CONFIG_TABS as string[]).includes(value)

export function AdminOfficesConfigClient({
  initialMinistries,
  initialDepartments,
  initialOfficeTypes,
  initialOfficeLevels,
}: AdminOfficesConfigClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // The active tab lives in the URL (?tab=office_types) rather than in component
  // state. Saving calls a server action that revalidates this path and re-renders
  // the segment, which drops local state and would otherwise bounce the user back
  // to the first tab on every save.
  const tabParam = searchParams.get('tab')
  const activeTab: ConfigTabType = isConfigTab(tabParam) ? tabParam : 'ministries'
  const setActiveTab = (tab: ConfigTabType) => {
    if (tab === activeTab) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [ministries, setMinistries] = useState<MinistryItem[]>(initialMinistries)
  const [departments, setDepartments] = useState<DepartmentItem[]>(initialDepartments)
  const [officeTypes, setOfficeTypes] = useState<OfficeTypeHierarchyItem[]>(initialOfficeTypes)
  const [officeLevels, setOfficeLevels] = useState<OfficeLevelItem[]>(initialOfficeLevels)

  // Filtering dropdowns for relational views
  const [filterDeptForTypes, setFilterDeptForTypes] = useState<string>('all')

  // Modals state
  const [minModal, setMinModal] = useState<MinistryModalState>({
    open: false,
    name: '',
  })

  const [depModal, setDepModal] = useState<DepartmentModalState>({
    open: false,
    name: '',
    ministry_id: '',
  })

  const [officeTypeModal, setOfficeTypeModal] = useState<OfficeTypeModalState>({
    open: false,
    name: '',
    department_id: '',
  })

  const [hierarchyModal, setHierarchyModal] = useState<HierarchyModalState>({
    open: false,
    ministry_id: '',
    department_id: '',
    office_type_id: '',
    level_name: '',
    level_order: 3,
  })

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => { },
  })

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 3000)
  }

  // Handle Tab 1 Save (Ministry)
  const handleSaveMinistry = () => {
    if (!minModal.name.trim()) {
      showStatus('মন্ত্রণালয়/বিভাগের নাম আবশ্যক', 'error')
      return
    }

    startTransition(async () => {
      const res = await saveMinistry({
        id: minModal.id,
        name: minModal.name,
        budget_id: minModal.budget_id?.trim() || undefined,
      })
      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('মন্ত্রণালয়/বিভাগ সফলভাবে সংরক্ষিত হয়েছে')
        const trimmed = minModal.name.trim()
        const trimmedBudget = minModal.budget_id?.trim() || undefined
        setMinModal({ open: false, name: '', budget_id: '' })
        if (minModal.id) {
          setMinistries((prev) =>
            prev.map((m) =>
              m.id === minModal.id ? { ...m, name: trimmed, budget_id: trimmedBudget } : m
            )
          )
        } else {
          setMinistries((prev) => [
            ...prev,
            { id: `min-${Date.now()}`, name: trimmed, budget_id: trimmedBudget },
          ])
        }
      }
    })
  }

  // Handle Tab 2 Save (Subordinate Office / Department)
  const handleSaveDepartment = () => {
    if (!depModal.name.trim()) {
      showStatus('দপ্তর/সংস্থার নাম আবশ্যক', 'error')
      return
    }
    if (!depModal.ministry_id) {
      showStatus('মন্ত্রণালয়/বিভাগ নির্বাচন আবশ্যক', 'error')
      return
    }

    startTransition(async () => {
      const res = await saveDepartment({
        id: depModal.id,
        name: depModal.name,
        ministry_id: depModal.ministry_id,
        budget_id: depModal.budget_id?.trim() || undefined,
      })
      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('দপ্তর/সংস্থা সফলভাবে সংরক্ষিত হয়েছে')
        const trimmed = depModal.name.trim()
        const trimmedBudget = depModal.budget_id?.trim() || undefined
        const selectedMin = ministries.find((m) => m.id === depModal.ministry_id)
        setDepModal({ open: false, name: '', ministry_id: '', budget_id: '' })
        if (depModal.id) {
          setDepartments((prev) =>
            prev.map((d) =>
              d.id === depModal.id
                ? {
                  ...d,
                  name: trimmed,
                  budget_id: trimmedBudget,
                  ministry_id: depModal.ministry_id,
                  ministry_name: selectedMin?.name || '',
                }
                : d
            )
          )
        } else {
          setDepartments((prev) => [
            ...prev,
            {
              id: String(Date.now()),
              name: trimmed,
              budget_id: trimmedBudget,
              ministry_id: depModal.ministry_id,
              ministry_name: selectedMin?.name || '',
            },
          ])
        }
      }
    })
  }

  // Handle Tab 3 Save (Office Type of Subordinate Office)
  const handleSaveOfficeTypeOnly = () => {
    if (!officeTypeModal.name.trim()) {
      showStatus('অফিসের ধরণ আবশ্যক', 'error')
      return
    }
    if (!officeTypeModal.department_id) {
      showStatus('অধীনস্থ দপ্তর/সংস্থা নির্বাচন আবশ্যক', 'error')
      return
    }

    startTransition(async () => {
      const res = await saveOfficeType({
        id: officeTypeModal.id,
        name: officeTypeModal.name,
        department_id: officeTypeModal.department_id?.toString(),
      })

      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('অফিসের ধরণ সফলভাবে সংরক্ষিত হয়েছে')
        setOfficeTypeModal({
          open: false,
          name: '',
          department_id: departments[0]?.id?.toString() || '',
        })

        const dep = departments.find((d) => d.id === officeTypeModal.department_id)
        if (officeTypeModal.id) {
          setOfficeTypes((prev) =>
            prev.map((ot) =>
              ot.id === officeTypeModal.id
                ? {
                  ...ot,
                  name: officeTypeModal.name.trim(),
                  department_id: officeTypeModal.department_id?.toString(),
                  department_name: dep?.name || '',
                }
                : ot
            )
          )
        } else {
          setOfficeTypes((prev) => [
            ...prev,
            {
              id: String(Date.now()),
              name: officeTypeModal.name.trim(),
              department_id: officeTypeModal.department_id?.toString(),
              department_name: dep?.name || '',
              hierarchy_order: null,
              is_group_budget: false,
            },
          ])
        }
      }
    })
  }

  // Handle Tab 4 Save (Office Level)
  const handleSaveOfficeLevel = () => {
    if (!hierarchyModal.office_type_id) {
      showStatus('অফিসের ধরণ নির্বাচন আবশ্যক', 'error')
      return
    }
    if (!hierarchyModal.level_name.trim()) {
      showStatus('স্তরের নাম আবশ্যক', 'error')
      return
    }
    if (!hierarchyModal.level_order || hierarchyModal.level_order < 1) {
      showStatus('সঠিক স্তরের ক্রম আবশ্যক', 'error')
      return
    }

    startTransition(async () => {
      const res = await saveOfficeLevel({
        id: hierarchyModal.id,
        owner_type: 'office_type',
        owner_id: hierarchyModal.office_type_id,
        level_name: hierarchyModal.level_name,
        level_order: hierarchyModal.level_order,
      })
      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('মাঠ অফিসের স্তর সফলভাবে সংরক্ষিত হয়েছে')
        // Re-fetch office levels to get updated data
        startTransition(async () => {
          const refreshed = await getOfficeLevels()
          setOfficeLevels(refreshed)
        })
        setHierarchyModal({
          open: false,
          ministry_id: '',
          department_id: '',
          office_type_id: '',
          level_name: '',
          level_order: 3,
        })
      }
    })
  }

  // Handle Tab 4 Delete Level
  const handleDeleteOfficeLevel = (lvl: OfficeLevelItem) => {
    setConfirmModal({
      open: true,
      title: 'মাঠ অফিসের স্তর মুছুন',
      description: `আপনি কি নিশ্চিতভাবে "${lvl.level_name}" (লেভেল ${toBanglaNumber(lvl.level_order)}) স্তরটি মুছে ফেলতে চান?`,
      onConfirm: () => {
        startTransition(async () => {
          const res = await deleteOfficeLevel(lvl.id)
          setConfirmModal((prev) => ({ ...prev, open: false }))
          if (res.error) {
            showStatus(res.error, 'error')
          } else {
            showStatus('স্তর সফলভাবে মুছে ফেলা হয়েছে')
            setOfficeLevels((prev) => prev.filter((item) => item.id !== lvl.id))
          }
        })
      },
    })
  }

  // Confirmation helpers
  const confirmDeleteMinistry = (m: MinistryItem) => {
    const linkedDepts = departments.filter((d) => d.ministry_id === m.id)
    if (linkedDepts.length > 0) {
      setConfirmModal({
        open: true,
        title: 'মন্ত্রণালয়/বিভাগ মোছা সম্ভব নয়',
        description: `"${m.name}" এর অধীনে ${toBanglaNumber(linkedDepts.length)}টি দপ্তর/সংস্থা বিদ্যমান রয়েছে। প্রথমে সংশ্লিষ্ট দপ্তরসমূহ অপসারণ করুন।`,
        onConfirm: () => setConfirmModal((prev) => ({ ...prev, open: false })),
        blocked: true,
      })
      return
    }

    setConfirmModal({
      open: true,
      title: 'মন্ত্রণালয়/বিভাগ মুছুন',
      description: `আপনি কি নিশ্চিতভাবে "${m.name}" মন্ত্রণালয়/বিভাগটি মুছে ফেলতে চান?`,
      onConfirm: () => {
        startTransition(async () => {
          const res = await deleteMinistry(m.id)
          if (res.error) {
            // Budget data (draft or submitted) is attached to this ministry, so it cannot be
            // removed — keep the reason in front of the admin rather than a fleeting banner.
            setConfirmModal({
              open: true,
              title: 'মন্ত্রণালয়/বিভাগ মোছা সম্ভব নয়',
              description: res.error,
              onConfirm: () => setConfirmModal((prev) => ({ ...prev, open: false })),
              blocked: true,
            })
          } else {
            setConfirmModal((prev) => ({ ...prev, open: false }))
            showStatus('মন্ত্রণালয়/বিভাগ সফলভাবে মুছে ফেলা হয়েছে')
            setMinistries((prev) => prev.filter((item) => item.id !== m.id))
          }
        })
      },
    })
  }

  const confirmDeleteDepartment = (d: DepartmentItem) => {
    const linkedTypes = officeTypes.filter((ot) => ot.department_id === d.id)
    if (linkedTypes.length > 0) {
      setConfirmModal({
        open: true,
        title: 'দপ্তর/সংস্থা মোছা সম্ভব নয়',
        description: `"${d.name}" এর অধীনে ${toBanglaNumber(linkedTypes.length)}টি অফিসের ধরণ বিদ্যমান রয়েছে। প্রথমে সম্পর্কিত অফিসের ধরণসমূহ অপসারণ করুন।`,
        onConfirm: () => setConfirmModal((prev) => ({ ...prev, open: false })),
        blocked: true,
      })
      return
    }

    setConfirmModal({
      open: true,
      title: 'দপ্তর/সংস্থা মুছুন',
      description: `আপনি কি নিশ্চিতভাবে "${d.name}" দপ্তর/সংস্থাটি মুছে ফেলতে চান?`,
      onConfirm: () => {
        startTransition(async () => {
          const res = await deleteDepartment(d.id)
          if (res.error) {
            // Budget data (draft or submitted) is attached to this department, so it cannot be
            // removed — keep the reason in front of the admin rather than a fleeting banner.
            setConfirmModal({
              open: true,
              title: 'দপ্তর/সংস্থা মোছা সম্ভব নয়',
              description: res.error,
              onConfirm: () => setConfirmModal((prev) => ({ ...prev, open: false })),
              blocked: true,
            })
          } else {
            setConfirmModal((prev) => ({ ...prev, open: false }))
            showStatus('দপ্তর/সংস্থা সফলভাবে মুছে ফেলা হয়েছে')
            setDepartments((prev) => prev.filter((item) => item.id !== d.id))
          }
        })
      },
    })
  }

  const confirmDeleteOfficeType = (ot: OfficeTypeHierarchyItem) => {
    setConfirmModal({
      open: true,
      title: 'অফিসের ধরণ মুছুন',
      description: `আপনি কি নিশ্চিতভাবে "${ot.name}" অফিসের ধরণটি মুছে ফেলতে চান? হায়ারার্কি ও গ্রুপ সেটিংস থেকেও এটি অপসারিত হবে।`,
      onConfirm: () => {
        startTransition(async () => {
          const res = await deleteOfficeType(ot.id)
          setConfirmModal((prev) => ({ ...prev, open: false }))
          if (res.error) showStatus(res.error, 'error')
          else {
            showStatus('অফিসের ধরণ সফলভাবে মুছে ফেলা হয়েছে')
            setOfficeTypes((prev) => prev.filter((item) => item.id !== ot.id))
          }
        })
      },
    })
  }

  // Filtered lists for Tab 3, 4, 5
  const filteredOfficeTypesForTab3 =
    filterDeptForTypes === 'all'
      ? officeTypes
      : officeTypes.filter((ot) => String(ot.department_id) === filterDeptForTypes)

  // Tab 4 lists only office-type (field-office) levels. Ministry and department levels are
  // auto-provisioned by their own tabs, so they are not shown or editable here.
  const officeTypeLevelsForTab4 = officeLevels
    .filter((lvl) => lvl.office_type_id)
    .sort((a, b) => a.level_order - b.level_order)

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-title">
            অরগানোগ্রামঃ   প্রাতিষ্ঠানিক হায়ারার্কি সেটাপ
          </h1>
        </div>

        {statusMessage && (
          <div
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 ${statusMessage.type === 'success'
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

      {/* Tabs navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('ministries')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === 'ministries'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
          >
            <Landmark className="h-4 w-4" />
            <span>মন্ত্রণালয় / বিভাগ</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
              {toBanglaNumber(ministries.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('departments')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === 'departments'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
          >
            <Building2 className="h-4 w-4" />
            <span>দপ্তর / সংস্থা</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
              {toBanglaNumber(departments.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('office_types')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === 'office_types'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>অফিসের ধরণ</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
              {toBanglaNumber(officeTypes.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === 'hierarchy'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
          >
            <GitBranch className="h-4 w-4" />
            <span>মাঠ অফিসের স্তর</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
              {toBanglaNumber(officeLevels.length)}
            </span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Ministries */}
      {activeTab === 'ministries' && (
        <TabMinistries
          ministries={ministries}
          departments={departments}
          minModal={minModal}
          setMinModal={setMinModal}
          onSaveMinistry={handleSaveMinistry}
          onConfirmDeleteMinistry={confirmDeleteMinistry}
          isPending={isPending}
        />
      )}

      {/* Tab 2: Departments */}
      {activeTab === 'departments' && (
        <TabDepartments
          departments={departments}
          ministries={ministries}
          officeTypes={officeTypes}
          depModal={depModal}
          setDepModal={setDepModal}
          onSaveDepartment={handleSaveDepartment}
          onConfirmDeleteDepartment={confirmDeleteDepartment}
          setActiveTab={setActiveTab}
          isPending={isPending}
        />
      )}

      {/* Tab 3: Office Types */}
      {activeTab === 'office_types' && (
        <TabOfficeTypes
          officeTypes={officeTypes}
          filteredOfficeTypes={filteredOfficeTypesForTab3}
          departments={departments}
          filterDeptForTypes={filterDeptForTypes}
          setFilterDeptForTypes={setFilterDeptForTypes}
          officeTypeModal={officeTypeModal}
          setOfficeTypeModal={setOfficeTypeModal}
          onSaveOfficeType={handleSaveOfficeTypeOnly}
          onConfirmDeleteOfficeType={confirmDeleteOfficeType}
          setActiveTab={setActiveTab}
          isPending={isPending}
        />
      )}

      {/* Tab 4: Hierarchy */}
      {activeTab === 'hierarchy' && (
        <TabOfficeLevels
          officeTypeLevels={officeTypeLevelsForTab4}
          officeLevels={officeLevels}
          ministries={ministries}
          departments={departments}
          officeTypes={officeTypes}
          hierarchyModal={hierarchyModal}
          setHierarchyModal={setHierarchyModal}
          onSaveOfficeLevel={handleSaveOfficeLevel}
          onDeleteOfficeLevel={handleDeleteOfficeLevel}
          setActiveTab={setActiveTab}
          isPending={isPending}
        />
      )}

      {/* Tab 5: Group Budget has moved to /admin/offices-management/group-budget */}

      {/* Confirmation Dialog */}
      <ConfirmDeleteDialog
        confirmModal={confirmModal}
        setConfirmModal={setConfirmModal}
        isPending={isPending}
      />
    </div>
  )
}
