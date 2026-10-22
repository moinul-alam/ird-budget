'use client'

import { useState, useTransition } from 'react'
import { toBanglaNumber } from '@/lib/bangla'
import {
  Landmark,
  Building2,
  Briefcase,
  GitBranch,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import {
  MinistryItem,
  DepartmentItem,
  OfficeTypeHierarchyItem,
  OfficeLevelItem,
  GroupBudgetSettingItem,
  saveMinistry,
  deleteMinistry,
  saveDepartment,
  deleteDepartment,
  saveOfficeTypeOnly,
  saveOfficeLevel,
  deleteOfficeLevel,
  saveGroupBudgetSetting,
  deleteGroupBudgetSetting,
  deleteOfficeType,
} from '@/app/actions/admin-offices-config'
import {
  AdminOfficesConfigClientProps,
  ConfigTabType,
  MinistryModalState,
  DepartmentModalState,
  OfficeTypeModalState,
  HierarchyModalState,
  GroupModalState,
  ConfirmModalState,
} from './_types/offices-config'
import { getLevelOrderBadge } from './_lib/helpers'
import { ConfirmDeleteDialog } from './_components/confirm-delete-dialog'
import { TabMinistries } from './_components/tab-ministries'
import { TabDepartments } from './_components/tab-departments'
import { TabOfficeTypes } from './_components/tab-office-types'
import { TabOfficeLevels } from './_components/tab-office-levels'
import { TabGroupBudget } from './_components/tab-group-budget'

// Re-export getLevelOrderBadge in case external consumers import it from here
export { getLevelOrderBadge }

export function AdminOfficesConfigClient({
  initialMinistries,
  initialDepartments,
  initialOfficeTypes,
  initialOfficeLevels,
  initialGroupSettings,
}: AdminOfficesConfigClientProps) {
  const [activeTab, setActiveTab] = useState<ConfigTabType>('ministries')
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [ministries, setMinistries] = useState<MinistryItem[]>(initialMinistries)
  const [departments, setDepartments] = useState<DepartmentItem[]>(initialDepartments)
  const [officeTypes, setOfficeTypes] = useState<OfficeTypeHierarchyItem[]>(initialOfficeTypes)
  const [officeLevels, setOfficeLevels] = useState<OfficeLevelItem[]>(initialOfficeLevels)
  const [groupSettings, setGroupSettings] = useState<GroupBudgetSettingItem[]>(initialGroupSettings)

  // Filtering dropdowns for relational views
  const [filterDeptForTypes, setFilterDeptForTypes] = useState<string>('all')
  const [filterTypeForHierarchy, setFilterTypeForHierarchy] = useState<string>('all')
  const [filterTypeForGroups, setFilterTypeForGroups] = useState<string>('all')

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
    department_id: 0,
  })

  const [hierarchyModal, setHierarchyModal] = useState<HierarchyModalState>({
    open: false,
    office_type_id: 0,
    level_name: '',
    level_order: 1,
  })

  const [groupModal, setGroupModal] = useState<GroupModalState>({
    open: false,
    department_id: 0,
    office_type_id: 0,
    office_level_id: '',
    is_group_budget: true,
  })

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
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
              id: Date.now(),
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
      const res = await saveOfficeTypeOnly({
        id: officeTypeModal.id,
        name: officeTypeModal.name,
        department_id: officeTypeModal.department_id,
      })

      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('অফিসের ধরণ সফলভাবে সংরক্ষিত হয়েছে')
        setOfficeTypeModal({
          open: false,
          name: '',
          department_id: departments[0]?.id || 0,
        })

        const dep = departments.find((d) => d.id === officeTypeModal.department_id)
        if (officeTypeModal.id) {
          setOfficeTypes((prev) =>
            prev.map((ot) =>
              ot.id === officeTypeModal.id
                ? {
                    ...ot,
                    name: officeTypeModal.name.trim(),
                    department_id: officeTypeModal.department_id,
                    department_name: dep?.name || '',
                  }
                : ot
            )
          )
        } else {
          setOfficeTypes((prev) => [
            ...prev,
            {
              id: Date.now(),
              name: officeTypeModal.name.trim(),
              department_id: officeTypeModal.department_id,
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
        office_type_id: hierarchyModal.office_type_id,
        level_name: hierarchyModal.level_name,
        level_order: hierarchyModal.level_order,
      })
      if (res.error) {
        showStatus(res.error, 'error')
      } else if (res.level) {
        showStatus('মাঠ অফিসের স্তর সফলভাবে সংরক্ষিত হয়েছে')
        const savedItem = res.level
        setOfficeLevels((prev) => {
          const exists = prev.some((l) => l.id === savedItem.id)
          let updated: OfficeLevelItem[]
          if (exists) {
            updated = prev.map((l) => (l.id === savedItem.id ? savedItem : l))
          } else {
            updated = [...prev, savedItem]
          }
          return updated.sort((a, b) => a.level_order - b.level_order)
        })
        setHierarchyModal({
          open: false,
          id: undefined,
          office_type_id: 0,
          level_name: '',
          level_order: 1,
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

  // Handle Tab 5 Save (Group setting)
  const handleSaveGroupSetting = () => {
    if (!groupModal.office_type_id) {
      showStatus('অফিসের ধরণ নির্বাচন আবশ্যক', 'error')
      return
    }

    startTransition(async () => {
      const res = await saveGroupBudgetSetting({
        id: groupModal.id,
        office_type_id: groupModal.office_type_id,
        office_level_id: groupModal.office_level_id,
        department_id: groupModal.department_id,
        is_group_budget: groupModal.is_group_budget,
      })
      if (res.error) {
        showStatus(res.error, 'error')
      } else if (res.setting) {
        showStatus('গ্রুপ বাজেট সেটিংস সফলভাবে আপডেট হয়েছে')
        const savedSetting = res.setting
        setGroupSettings((prev) => {
          const exists = prev.some((g) => g.id === savedSetting.id)
          if (exists) {
            return prev.map((g) => (g.id === savedSetting.id ? savedSetting : g))
          }
          return [...prev, savedSetting]
        })
        setOfficeTypes((prev) =>
          prev.map((ot) =>
            ot.id === groupModal.office_type_id
              ? { ...ot, is_group_budget: groupModal.is_group_budget }
              : ot
          )
        )
        setGroupModal((prev) => ({ ...prev, open: false }))
      }
    })
  }

  // Handle Tab 5 Delete (Group setting)
  const handleDeleteGroupSetting = (gs: GroupBudgetSettingItem) => {
    setConfirmModal({
      open: true,
      title: 'গ্রুপ বাজেট থেকে অপসারণ',
      description: `আপনি কি "${gs.office_type_name}${gs.office_level_name ? ` - ${gs.office_level_name}` : ''}" কে গ্রুপ বাজেট কনফিগারেশন থেকে অপসারণ করতে চান?`,
      onConfirm: () => {
        startTransition(async () => {
          const res = await deleteGroupBudgetSetting(gs.id)
          setConfirmModal((prev) => ({ ...prev, open: false }))
          if (res.error) {
            showStatus(res.error, 'error')
          } else {
            showStatus('গ্রুপ বাজেট সেটিং সফলভাবে মুছে ফেলা হয়েছে')
            setGroupSettings((prev) => prev.filter((item) => item.id !== gs.id))
            const othersRemain = groupSettings.some(
              (g) => g.id !== gs.id && g.office_type_id === gs.office_type_id && g.is_group_budget
            )
            if (!othersRemain) {
              setOfficeTypes((prev) =>
                prev.map((item) =>
                  item.id === gs.office_type_id ? { ...item, is_group_budget: false } : item
                )
              )
            }
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
          setConfirmModal((prev) => ({ ...prev, open: false }))
          if (res.error) showStatus(res.error, 'error')
          else {
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
          setConfirmModal((prev) => ({ ...prev, open: false }))
          if (res.error) showStatus(res.error, 'error')
          else {
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

  // Tab 4: filtered office levels by office_type_id
  const filteredOfficeLevelsForTab4 = officeLevels
    .filter((lvl) => (filterTypeForHierarchy === 'all' ? true : String(lvl.office_type_id) === filterTypeForHierarchy))
    .sort((a, b) => a.level_order - b.level_order)

  // Office types that have at least one office level configured
  const officeTypesWithHierarchy = officeTypes.filter((ot) =>
    officeLevels.some((lvl) => lvl.office_type_id === ot.id)
  )

  // Display group items calculation
  const displayGroupItems: GroupBudgetSettingItem[] = (() => {
    const list: GroupBudgetSettingItem[] = [...groupSettings.filter((g) => g.is_group_budget)]
    for (const ot of officeTypes) {
      if (ot.is_group_budget && !list.some((g) => g.office_type_id === ot.id)) {
        const matchingLevels = officeLevels.filter((lvl) => lvl.office_type_id === ot.id).sort((a, b) => a.level_order - b.level_order)
        list.push({
          id: `legacy-${ot.id}`,
          department_id: ot.department_id,
          department_name: ot.department_name,
          office_type_id: ot.id,
          office_type_name: ot.name,
          office_level_id: matchingLevels[0]?.id || '',
          office_level_name: matchingLevels[0]?.level_name || '',
          office_level_order: matchingLevels[0]?.level_order,
          is_group_budget: true,
        })
      }
    }
    return list
  })()

  const officeTypesWithGroupBudget = officeTypes.filter((ot) =>
    displayGroupItems.some((g) => g.office_type_id === ot.id)
  )

  const filteredGroupItemsForTab5 = displayGroupItems
    .filter((g) => (filterTypeForGroups === 'all' ? true : String(g.office_type_id) === filterTypeForGroups))

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-title">
            অফিস কনফিগারেশন
          </h1>
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

      {/* Tabs navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('ministries')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'ministries'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Landmark className="h-4 w-4" />
            <span>১. মন্ত্রণালয় / বিভাগ</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
              {toBanglaNumber(ministries.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('departments')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'departments'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>২. দপ্তর / সংস্থা</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
              {toBanglaNumber(departments.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('office_types')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'office_types'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>৩. অফিসের ধরণ</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
              {toBanglaNumber(officeTypes.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'hierarchy'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <GitBranch className="h-4 w-4" />
            <span>৪. মাঠ অফিসের স্তর</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
              {toBanglaNumber(officeLevels.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'groups'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>৫. গ্রুপ বাজেট নির্ধারণ</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
              {toBanglaNumber(displayGroupItems.length)}
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
          officeLevels={officeLevels}
          filteredOfficeLevels={filteredOfficeLevelsForTab4}
          officeTypes={officeTypes}
          officeTypesWithHierarchy={officeTypesWithHierarchy}
          filterTypeForHierarchy={filterTypeForHierarchy}
          setFilterTypeForHierarchy={setFilterTypeForHierarchy}
          hierarchyModal={hierarchyModal}
          setHierarchyModal={setHierarchyModal}
          onSaveOfficeLevel={handleSaveOfficeLevel}
          onDeleteOfficeLevel={handleDeleteOfficeLevel}
          setActiveTab={setActiveTab}
          isPending={isPending}
        />
      )}

      {/* Tab 5: Group Budget */}
      {activeTab === 'groups' && (
        <TabGroupBudget
          displayGroupItems={displayGroupItems}
          filteredGroupItems={filteredGroupItemsForTab5}
          departments={departments}
          officeTypes={officeTypes}
          officeTypesWithGroupBudget={officeTypesWithGroupBudget}
          officeLevels={officeLevels}
          filterTypeForGroups={filterTypeForGroups}
          setFilterTypeForGroups={setFilterTypeForGroups}
          groupModal={groupModal}
          setGroupModal={setGroupModal}
          onSaveGroupSetting={handleSaveGroupSetting}
          onDeleteGroupSetting={handleDeleteGroupSetting}
          setActiveTab={setActiveTab}
          isPending={isPending}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDeleteDialog
        confirmModal={confirmModal}
        setConfirmModal={setConfirmModal}
        isPending={isPending}
      />
    </div>
  )
}
