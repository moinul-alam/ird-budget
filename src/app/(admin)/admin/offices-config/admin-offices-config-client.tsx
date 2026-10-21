'use client'

import { useState, useTransition } from 'react'
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
import { Badge } from '@/components/ui/badge'
import {
  Landmark,
  Building2,
  Briefcase,
  GitBranch,
  Layers,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
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
  updateOfficeTypeHierarchyOrder,
  removeOfficeTypeHierarchyOrder,
  updateGroupBudgetStatus,
  deleteOfficeType,
  saveOfficeLevel,
  deleteOfficeLevel,
  saveGroupBudgetSetting,
  deleteGroupBudgetSetting,
} from '@/app/actions/admin-offices-config'

// Helper for Bangla Ordinal Level and Colors
export function getLevelOrderBadge(order: number | null | undefined) {
  const o = order || 1
  let label = `${toBanglaNumber(o)}ম স্তর`
  if (o === 1) label = '১ম স্তর'
  else if (o === 2) label = '২য় স্তর'
  else if (o === 3) label = '৩য় স্তর'
  else if (o === 4) label = '৪র্থ স্তর'
  else if (o === 5) label = '৫ম স্তর'
  else label = `${toBanglaNumber(o)}ম স্তর`

  // 5 distinct colors for 5 levels (and fallback)
  switch (o) {
    case 1:
      // Level 1: Indigo / Blue
      return {
        label,
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
      }
    case 2:
      // Level 2: Emerald / Teal
      return {
        label,
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
      }
    case 3:
      // Level 3: Amber / Orange
      return {
        label,
        className: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
      }
    case 4:
      // Level 4: Violet / Purple
      return {
        label,
        className: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
      }
    case 5:
      // Level 5: Rose / Red
      return {
        label,
        className: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
      }
    default:
      // Fallback for levels > 5: Slate
      return {
        label,
        className: 'bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100',
      }
  }
}

interface AdminOfficesConfigClientProps {
  initialMinistries: MinistryItem[]
  initialDepartments: DepartmentItem[]
  initialOfficeTypes: OfficeTypeHierarchyItem[]
  initialOfficeLevels: OfficeLevelItem[]
  initialGroupSettings: GroupBudgetSettingItem[]
}

export function AdminOfficesConfigClient({
  initialMinistries,
  initialDepartments,
  initialOfficeTypes,
  initialOfficeLevels,
  initialGroupSettings,
}: AdminOfficesConfigClientProps) {
  const [activeTab, setActiveTab] = useState<'ministries' | 'departments' | 'office_types' | 'hierarchy' | 'groups'>('ministries')
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
  const [filterDeptForGroups, setFilterDeptForGroups] = useState<string>('all')

  // Modal 1: Ministry
  const [minModal, setMinModal] = useState<{ open: boolean; id?: string; name: string }>({
    open: false,
    name: '',
  })

  // Modal 2: Subordinate Office / Department
  const [depModal, setDepModal] = useState<{ open: boolean; id?: number; name: string; ministry_id: string }>({
    open: false,
    name: '',
    ministry_id: '',
  })

  // Modal 3: Office Type of Subordinate Office
  const [officeTypeModal, setOfficeTypeModal] = useState<{
    open: boolean
    id?: number
    name: string
    department_id: number
  }>({
    open: false,
    name: '',
    department_id: 0,
  })

  // Modal 4: Hierarchy Level / Layer
  const [hierarchyModal, setHierarchyModal] = useState<{
    open: boolean
    id?: string
    office_type_id: number
    level_name: string
    level_order: number
  }>({
    open: false,
    office_type_id: 0,
    level_name: '',
    level_order: 1,
  })

  // Modal 5: Group Budget Setting
  const [groupModal, setGroupModal] = useState<{
    open: boolean
    id?: string
    department_id: number
    office_type_id: number
    office_level_id?: string
    is_group_budget: boolean
  }>({
    open: false,
    department_id: 0,
    office_type_id: 0,
    office_level_id: '',
    is_group_budget: true,
  })

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({
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
      const res = await saveMinistry({ id: minModal.id, name: minModal.name })
      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('মন্ত্রণালয়/বিভাগ সফলভাবে সংরক্ষিত হয়েছে')
        setMinModal({ open: false, name: '' })
        const trimmed = minModal.name.trim()
        if (minModal.id) {
          setMinistries((prev) =>
            prev.map((m) => (m.id === minModal.id ? { ...m, name: trimmed } : m))
          )
        } else {
          setMinistries((prev) => [...prev, { id: `min-${Date.now()}`, name: trimmed }])
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
      })
      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('দপ্তর/সংস্থা সফলভাবে সংরক্ষিত হয়েছে')
        setDepModal({ open: false, name: '', ministry_id: '' })
        const trimmed = depModal.name.trim()
        const selectedMin = ministries.find((m) => m.id === depModal.ministry_id)
        if (depModal.id) {
          setDepartments((prev) =>
            prev.map((d) =>
              d.id === depModal.id
                ? {
                  ...d,
                  name: trimmed,
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
        department_id: groupModal.department_id,
        office_type_id: groupModal.office_type_id,
        office_level_id: groupModal.office_level_id,
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
            // Check if any other settings for this office_type remain
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
    // Relational check: whether subordinate offices exist
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
    // Relational check: whether office types exist under this department
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

  // Departments that have at least one group budget item
  // Combine groupSettings with any officeTypes marked as is_group_budget
  const displayGroupItems: GroupBudgetSettingItem[] = (() => {
    const list: GroupBudgetSettingItem[] = [...groupSettings.filter((g) => g.is_group_budget)]
    // Include office_types that have is_group_budget: true but not yet in groupSettings
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

  const departmentsWithGroupBudget = departments.filter((d) =>
    displayGroupItems.some((g) => g.department_id === d.id)
  )

  const filteredGroupItemsForTab5 = displayGroupItems
    .filter((g) => (filterDeptForGroups === 'all' ? true : String(g.department_id) === filterDeptForGroups))

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

      {/* Tabs - Relational without "ট্যাব" prefix */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto" aria-label="Tabs">
          {/* Tab 1 */}
          <button
            onClick={() => setActiveTab('ministries')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === 'ministries'
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

          {/* Tab 2 */}
          <button
            onClick={() => setActiveTab('departments')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === 'departments'
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

          {/* Tab 3 */}
          <button
            onClick={() => setActiveTab('office_types')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === 'office_types'
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

          {/* Tab 4 */}
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === 'hierarchy'
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

          {/* Tab 5 */}
          <button
            onClick={() => setActiveTab('groups')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === 'groups'
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

      {/* ============================================================ */}
      {/* 1. MINISTRY */}
      {/* ============================================================ */}
      {activeTab === 'ministries' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                মন্ত্রণালয় / বিভাগ তালিকা
              </CardTitle>
            </div>
            <Button
              onClick={() => setMinModal({ open: true, name: '' })}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              নতুন মন্ত্রণালয়/বিভাগ যোগ করুন
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {ministries.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <Landmark className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">
                  কোনো মন্ত্রণালয় বা বিভাগ পাওয়া যায়নি
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  দপ্তর বা সংস্থা নির্ধারণের পূর্বে &quot;নতুন মন্ত্রণালয়/বিভাগ যোগ করুন&quot; বাটনে চাপুন।
                </p>
                <div className="mt-4">
                  <Button
                    size="sm"
                    onClick={() => setMinModal({ open: true, name: '' })}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    নতুন মন্ত্রণালয়/বিভাগ যোগ করুন
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-20">ক্র.নং</th>
                      <th className="py-3 px-4">মন্ত্রণালয় / বিভাগের নাম</th>
                      <th className="py-3 px-4">অধীনস্থ দপ্তর সংখ্যা</th>
                      <th className="py-3 px-4 text-center w-28">একশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ministries.map((m, idx) => {
                      const deptCount = departments.filter((d) => d.ministry_id === m.id).length
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                            {toBanglaNumber(idx + 1)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                            {m.name}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                              {toBanglaNumber(deptCount)} টি দপ্তর
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setMinModal({ open: true, id: m.id, name: m.name })}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                                title="সম্পাদনা"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => confirmDeleteMinistry(m)}
                                className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============================================================ */}
      {/* 2. SUBORDINATE OFFICE / DEPARTMENT */}
      {/* ============================================================ */}
      {activeTab === 'departments' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                দপ্তর / সংস্থার তালিকা
              </CardTitle>
            </div>
            {ministries.length > 0 && (
              <Button
                onClick={() =>
                  setDepModal({
                    open: true,
                    name: '',
                    ministry_id: ministries[0]?.id || '',
                  })
                }
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                নতুন দপ্তর/সংস্থা যোগ করুন
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {ministries.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <Landmark className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">
                  পূর্বে কোনো মন্ত্রণালয়/বিভাগ যুক্ত করা হয়নি
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  দপ্তর বা সংস্থা নির্ধারণ করতে প্রথমে ১ নম্বর ট্যাবে গিয়ে মন্ত্রণালয়/বিভাগ যোগ করুন।
                </p>
                <div className="mt-4">
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('ministries')}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                  >
                    ১. মন্ত্রণালয় / বিভাগে যান
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : departments.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">
                  কোনো দপ্তর বা সংস্থা পাওয়া যায়নি
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  মাঠ পর্যায়ের অফিসের ধরণ কনফিগার করার পূর্বে &quot;নতুন দপ্তর/সংস্থা যোগ করুন&quot; বাটনে চাপুন।
                </p>
                <div className="mt-4">
                  <Button
                    size="sm"
                    onClick={() =>
                      setDepModal({
                        open: true,
                        name: '',
                        ministry_id: ministries[0]?.id || '',
                      })
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    নতুন দপ্তর/সংস্থা যোগ করুন
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-20">ক্র.নং</th>
                      <th className="py-3 px-4">দপ্তর / সংস্থার নাম</th>
                      <th className="py-3 px-4">মূল মন্ত্রণালয় / বিভাগ</th>
                      <th className="py-3 px-4">অফিসের ধরণ সংখ্যা</th>
                      <th className="py-3 px-4 text-center w-28">একশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departments.map((d, idx) => {
                      const typeCount = officeTypes.filter((ot) => ot.department_id === d.id).length
                      return (
                        <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                            {toBanglaNumber(idx + 1)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                            {d.name}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700">
                            {d.ministry_name ? (
                              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-200/60">
                                {d.ministry_name}
                              </span>
                            ) : (
                              <span className="text-slate-400">সাধারণ</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                              {toBanglaNumber(typeCount)} টি ধরণ
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setDepModal({
                                    open: true,
                                    id: d.id,
                                    name: d.name,
                                    ministry_id: d.ministry_id || ministries[0]?.id || '',
                                  })
                                }
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                                title="সম্পাদনা"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => confirmDeleteDepartment(d)}
                                className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============================================================ */}
      {/* 3. OFFICE TYPE OF SUBORDINATE OFFICE (TAB 2'S DATA) */}
      {/* ============================================================ */}
      {activeTab === 'office_types' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                অফিসের ধরণের তালিকা
              </CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {departments.length > 0 && (
                <div className="w-64 sm:w-72">
                  <Select value={filterDeptForTypes} onValueChange={(val) => setFilterDeptForTypes(val || 'all')}>
                    <SelectTrigger className="h-9 w-full rounded-xl border-slate-200 text-xs">
                      <SelectValue placeholder="সব">
                        {filterDeptForTypes === 'all'
                          ? 'সব'
                          : departments.find((d) => String(d.id) === filterDeptForTypes)?.name || 'সব'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl text-xs">
                      <SelectItem value="all">সব</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {departments.length > 0 && (
                <Button
                  onClick={() =>
                    setOfficeTypeModal({
                      open: true,
                      name: '',
                      department_id: departments[0]?.id || 0,
                    })
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  নতুন অফিসের ধরণ যোগ করুন
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {departments.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">
                  পূর্বে কোনো দপ্তর বা সংস্থা যুক্ত করা হয়নি
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  অফিসের ধরণ নির্ধারণ করতে প্রথমে ২ নম্বর ট্যাবে গিয়ে দপ্তর/সংস্থা তৈরি করুন।
                </p>
                <div className="mt-4">
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('departments')}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                  >
                    ২. দপ্তর / সংস্থায় যান
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : filteredOfficeTypesForTab3.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">
                  কোনো অফিসের ধরণ পাওয়া যায়নি
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  নতুন অফিসের ধরণ যোগ করতে &quot;নতুন অফিসের ধরণ যোগ করুন&quot; বাটনে চাপুন।
                </p>
                <div className="mt-4">
                  <Button
                    size="sm"
                    onClick={() =>
                      setOfficeTypeModal({
                        open: true,
                        name: '',
                        department_id: departments[0]?.id || 0,
                      })
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    নতুন অফিসের ধরণ যোগ করুন
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-20">ক্র.নং</th>
                      <th className="py-3 px-4">অফিসের ধরণের নাম</th>
                      <th className="py-3 px-4">দপ্তর / সংস্থা</th>
                      <th className="py-3 px-4 text-center w-28">একশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOfficeTypesForTab3.map((ot, idx) => (
                      <tr key={ot.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                          {toBanglaNumber(idx + 1)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                          {ot.name}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-lg font-bold">
                            {ot.department_name || 'সাধারণ'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setOfficeTypeModal({
                                  open: true,
                                  id: ot.id,
                                  name: ot.name,
                                  department_id: ot.department_id,
                                })
                              }
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                              title="সম্পাদনা"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDeleteOfficeType(ot)}
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============================================================ */}
      {/* 4. HIERARCHY OF TAB 3 */}
      {/* ============================================================ */}
      {activeTab === 'hierarchy' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                মাঠ অফিসের স্তর
              </CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {officeTypesWithHierarchy.length > 0 && (
                <div className="w-64 sm:w-72">
                  <Select value={filterTypeForHierarchy} onValueChange={(val) => setFilterTypeForHierarchy(val || 'all')}>
                    <SelectTrigger className="h-9 w-full rounded-xl border-slate-200 text-xs">
                      <SelectValue placeholder="সব অফিসের ধরণ">
                        {filterTypeForHierarchy === 'all'
                          ? 'সব অফিসের ধরণ'
                          : officeTypesWithHierarchy.find((ot) => String(ot.id) === filterTypeForHierarchy)?.name || 'সব অফিসের ধরণ'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl text-xs">
                      <SelectItem value="all">সব অফিসের ধরণ</SelectItem>
                      {officeTypesWithHierarchy.map((ot) => (
                        <SelectItem key={ot.id} value={String(ot.id)}>
                          {ot.name} {ot.department_name ? `(${ot.department_name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {officeTypes.length > 0 && (
                <Button
                  onClick={() => {
                    const defaultOtId = filterTypeForHierarchy !== 'all'
                      ? parseInt(filterTypeForHierarchy, 10)
                      : (officeTypes[0]?.id || 0)
                    const nextOrder = officeLevels.length > 0
                      ? Math.max(...officeLevels.map((l) => l.level_order)) + 1
                      : 1
                    setHierarchyModal({
                      open: true,
                      id: undefined,
                      office_type_id: defaultOtId,
                      level_name: '',
                      level_order: nextOrder,
                    })
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  নতুন স্তর নির্ধারণ করুন
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {officeTypes.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <GitBranch className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">
                  কোনো অফিসের ধরণ বিদ্যমান নেই
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  স্তর নির্ধারণ করতে প্রথমে ৩ নম্বর ট্যাবে অফিসের ধরণ যুক্ত করুন।
                </p>
                <div className="mt-4">
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('office_types')}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                  >
                    ৩. অফিসের ধরণের ট্যাবে যান
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : filteredOfficeLevelsForTab4.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <GitBranch className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">
                  এখনো কোনো অফিসের স্তর নির্ধারণ করা হয়নি
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  মাঠ অফিসের স্তর নির্ধারণ করতে &quot;নতুন স্তর নির্ধারণ করুন&quot; বাটনে চাপুন।
                </p>
                <div className="mt-4">
                  <Button
                    size="sm"
                    onClick={() => {
                      const defaultOt = officeTypes[0]
                      setHierarchyModal({
                        open: true,
                        id: undefined,
                        office_type_id: defaultOt?.id || 0,
                        level_name: '',
                        level_order: 1,
                      })
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    নতুন স্তর নির্ধারণ করুন
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-28">স্তরের ক্রম</th>
                      <th className="py-3 px-4">স্তরের নাম</th>
                      <th className="py-3 px-4">অফিসের ধরণ</th>
                      <th className="py-3 px-4">দপ্তর / সংস্থা</th>
                      <th className="py-3 px-4 text-center w-36">একশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOfficeLevelsForTab4.map((lvl) => {
                      const badge = getLevelOrderBadge(lvl.level_order)
                      return (
                        <tr key={lvl.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-md font-bold text-xs border transition-colors ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-800 text-sm">
                            {lvl.level_name}
                          </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                          {lvl.office_type_name || '—'}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-lg font-bold">
                            {lvl.department_name || 'সাধারণ'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setHierarchyModal({
                                  open: true,
                                  id: lvl.id,
                                  office_type_id: lvl.office_type_id,
                                  level_name: lvl.level_name,
                                  level_order: lvl.level_order,
                                })
                              }
                              className="rounded-lg text-xs font-semibold h-8 gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
                              title="সম্পাদনা"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              সম্পাদনা
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteOfficeLevel(lvl)}
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                              title="স্তর মুছে ফেলুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============================================================ */}
      {/* 5. MARKING OFFICE TYPE AS GROUP OR NOT */}
      {/* ============================================================ */}
      {activeTab === 'groups' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                গ্রুপ বাজেট নির্ধারণ
              </CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {departmentsWithGroupBudget.length > 0 && (
                <div className="w-64 sm:w-72">
                  <Select value={filterDeptForGroups} onValueChange={(val) => setFilterDeptForGroups(val || 'all')}>
                    <SelectTrigger className="h-9 w-full rounded-xl border-slate-200 text-xs">
                      <SelectValue placeholder="সব">
                        {filterDeptForGroups === 'all'
                          ? 'সব'
                          : departmentsWithGroupBudget.find((d) => String(d.id) === filterDeptForGroups)?.name || 'সব'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl text-xs">
                      <SelectItem value="all">সব</SelectItem>
                      {departmentsWithGroupBudget.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {officeTypes.length > 0 && (
                <Button
                  onClick={() => {
                    const firstDep = departmentsWithGroupBudget[0]?.id || departments[0]?.id || 0
                    const matchingOt = officeTypes.find((ot) => ot.department_id === firstDep) || officeTypes[0]
                    const firstLevel = officeLevels.filter((lvl) => lvl.office_type_id === matchingOt?.id).sort((a, b) => a.level_order - b.level_order)[0]
                    setGroupModal({
                      open: true,
                      department_id: firstDep,
                      office_type_id: matchingOt?.id || 0,
                      office_level_id: firstLevel?.id || '',
                      is_group_budget: true,
                    })
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  নতুন গ্রুপ সেটিং যুক্ত করুন
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {officeTypes.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">
                  কোনো অফিসের ধরণ বিদ্যমান নেই
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  গ্রুপ বাজেট চিহ্নিত করতে প্রথমে ৩ নম্বর ট্যাবে অফিসের ধরণ যুক্ত করুন।
                </p>
                <div className="mt-4">
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('office_types')}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                  >
                    ৩. অফিসের ধরণের ট্যাবে যান
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : filteredGroupItemsForTab5.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">
                  কোনো গ্রুপ সেটিং তৈরি করা হয়নি
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  নতুন গ্রুপ বাজেট অফিস চিহ্নিত করতে &quot;নতুন গ্রুপ সেটিং যুক্ত করুন&quot; বাটনে চাপুন।
                </p>
                <div className="mt-4">
                  <Button
                    size="sm"
                    onClick={() => {
                      const firstDep = departments[0]?.id || 0
                      const matchingOt = officeTypes.find((ot) => ot.department_id === firstDep) || officeTypes[0]
                      const firstLevel = officeLevels.filter((lvl) => lvl.office_type_id === matchingOt?.id).sort((a, b) => a.level_order - b.level_order)[0]
                      setGroupModal({
                        open: true,
                        id: undefined,
                        department_id: firstDep,
                        office_type_id: matchingOt?.id || 0,
                        office_level_id: firstLevel?.id || '',
                        is_group_budget: true,
                      })
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    নতুন গ্রুপ সেটিং যুক্ত করুন
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-20">ক্র. নং.</th>
                      <th className="py-3 px-4">দপ্তর / সংস্থা</th>
                      <th className="py-3 px-4">অফিসের ধরণ</th>
                      <th className="py-3 px-4">অফিসের স্তর</th>
                      <th className="py-3 px-4 text-center">বাজেট মোড</th>
                      <th className="py-3 px-4 text-center w-32">একশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGroupItemsForTab5.map((g, idx) => (
                      <tr key={g.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                          {toBanglaNumber(idx + 1)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">
                          {g.department_name || 'সাধারণ'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                          {g.office_type_name || '—'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 text-sm">
                          {g.office_level_name ? (
                            (() => {
                              const badge = getLevelOrderBadge(g.office_level_order)
                              return (
                                <span className={`px-2.5 py-1 rounded-md font-bold text-xs border ${badge.className}`}>
                                  {g.office_level_name}
                                </span>
                              )
                            })()
                          ) : (
                            <span className="text-slate-400 font-normal">সকল স্তর</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge
                            variant="outline"
                            className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border-purple-300"
                          >
                            গ্রুপ বাজেট
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setGroupModal({
                                  open: true,
                                  id: g.id.startsWith('legacy-') ? undefined : g.id,
                                  department_id: g.department_id,
                                  office_type_id: g.office_type_id,
                                  office_level_id: g.office_level_id || '',
                                  is_group_budget: g.is_group_budget,
                                })
                              }}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                              title="সম্পাদনা"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGroupSetting(g)}
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                              title="অপসারণ করুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: MINISTRY */}
      {/* ============================================================ */}
      <Dialog open={minModal.open} onOpenChange={(open) => !open && setMinModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {minModal.id ? 'মন্ত্রণালয়/বিভাগ সম্পাদনা' : 'নতুন মন্ত্রণালয়/বিভাগ যোগ করুন'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">মন্ত্রণালয় / বিভাগের নাম</Label>
              <Input
                type="text"
                value={minModal.name}
                onChange={(e) => setMinModal((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="যেমন: অর্থ মন্ত্রণালয়, অভ্যন্তরীণ সম্পদ বিভাগ..."
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setMinModal((prev) => ({ ...prev, open: false }))} className="rounded-xl text-xs font-semibold">
              বাতিল
            </Button>
            <Button type="button" onClick={handleSaveMinistry} disabled={isPending} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL 2: SUBORDINATE OFFICE / DEPARTMENT */}
      {/* ============================================================ */}
      <Dialog open={depModal.open} onOpenChange={(open) => !open && setDepModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {depModal.id ? 'দপ্তর/সংস্থা সম্পাদনা' : 'নতুন দপ্তর/সংস্থা যোগ করুন'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">মূল মন্ত্রণালয় / বিভাগ নির্বাচন করুন</Label>
              <Select
                value={depModal.ministry_id}
                onValueChange={(val) => {
                  if (val) setDepModal((prev) => ({ ...prev, ministry_id: val }))
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="মন্ত্রণালয়/বিভাগ নির্বাচন করুন">
                    {ministries.find((m) => m.id === depModal.ministry_id)?.name || 'মন্ত্রণালয়/বিভাগ নির্বাচন করুন'}
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

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">দপ্তর / সংস্থার নাম</Label>
              <Input
                type="text"
                value={depModal.name}
                onChange={(e) => setDepModal((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="যেমন: জাতীয় রাজস্ব বোর্ড, কাস্টম্স বিভাগ..."
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setDepModal((prev) => ({ ...prev, open: false }))} className="rounded-xl text-xs font-semibold">
              বাতিল
            </Button>
            <Button type="button" onClick={handleSaveDepartment} disabled={isPending} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL 3: OFFICE TYPE OF SUBORDINATE OFFICE */}
      {/* ============================================================ */}
      <Dialog open={officeTypeModal.open} onOpenChange={(open) => !open && setOfficeTypeModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {officeTypeModal.id ? 'অফিসের ধরণ সম্পাদনা' : 'নতুন অফিসের ধরণ যোগ করুন'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অধীনস্থ দপ্তর / সংস্থা নির্বাচন করুন</Label>
              <Select
                value={String(officeTypeModal.department_id || '')}
                onValueChange={(val) => {
                  if (val) setOfficeTypeModal((prev) => ({ ...prev, department_id: parseInt(val, 10) }))
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="দপ্তর/সংস্থা নির্বাচন করুন">
                    {departments.find((d) => d.id === officeTypeModal.department_id)?.name || 'দপ্তর/সংস্থা নির্বাচন করুন'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name} {d.ministry_name ? `(${d.ministry_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অফিসের ধরণ (যেমনঃ আয়কর অফিস, কাস্টম্স ও ভ্যাট অফিস)</Label>
              <Input
                type="text"
                value={officeTypeModal.name}
                onChange={(e) => setOfficeTypeModal((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="অফিসের ধরণ লিখুন..."
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOfficeTypeModal((prev) => ({ ...prev, open: false }))} className="rounded-xl text-xs font-semibold">
              বাতিল
            </Button>
            <Button type="button" onClick={handleSaveOfficeTypeOnly} disabled={isPending} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL 4: HIERARCHY LEVEL */}
      {/* ============================================================ */}
      <Dialog open={hierarchyModal.open} onOpenChange={(open) => !open && setHierarchyModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {hierarchyModal.id ? 'মাঠ অফিসের স্তর সম্পাদনা' : 'মাঠ অফিসের স্তর নির্ধারণ'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* ১. অফিসের ধরণ dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অফিসের ধরণ</Label>
              <Select
                value={String(hierarchyModal.office_type_id || '')}
                onValueChange={(val) => {
                  if (val) {
                    const otId = parseInt(val, 10)
                    setHierarchyModal((prev) => ({
                      ...prev,
                      office_type_id: otId,
                    }))
                  }
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="অফিসের ধরণ নির্বাচন করুন">
                    {officeTypes.find((ot) => ot.id === hierarchyModal.office_type_id)?.name || 'অফিসের ধরণ নির্বাচন করুন'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs max-h-60">
                  {officeTypes.map((ot) => (
                    <SelectItem key={ot.id} value={String(ot.id)}>
                      {ot.name} {ot.department_name ? `(${ot.department_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ২. স্তরের নাম (type field) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">স্তরের নাম</Label>
              <Input
                type="text"
                placeholder="যেমন: কর অঞ্চল, কর আপীল অঞ্চল, কর রেঞ্জসমূহ ইত্যাদি"
                value={hierarchyModal.level_name}
                onChange={(e) => setHierarchyModal((prev) => ({ ...prev, level_name: e.target.value }))}
                className="rounded-xl border-slate-200 text-xs"
              />
            </div>

            {/* ৩. স্তরের ক্রম type field, number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">স্তরের ক্রম</Label>
              <Input
                type="number"
                min={1}
                value={hierarchyModal.level_order}
                onChange={(e) => setHierarchyModal((prev) => ({ ...prev, level_order: parseInt(e.target.value, 10) || 1 }))}
                className="rounded-xl border-slate-200 font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setHierarchyModal((prev) => ({ ...prev, open: false }))} className="rounded-xl text-xs font-semibold">
              বাতিল
            </Button>
            <Button type="button" onClick={handleSaveOfficeLevel} disabled={isPending} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL 5: GROUP BUDGET SETTING */}
      {/* ============================================================ */}
      <Dialog open={groupModal.open} onOpenChange={(open) => !open && setGroupModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              গ্রুপ বাজেট নির্ধারণ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* ১. অফিসের ধরণ dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অফিসের ধরণ</Label>
              <Select
                value={String(groupModal.office_type_id || '')}
                onValueChange={(val) => {
                  if (val) {
                    const otId = parseInt(val, 10)
                    const selectedOt = officeTypes.find((ot) => ot.id === otId)
                    const matchingLevels = officeLevels
                      .filter((lvl) => lvl.office_type_id === otId)
                      .sort((a, b) => a.level_order - b.level_order)
                    setGroupModal((prev) => ({
                      ...prev,
                      office_type_id: otId,
                      office_level_id: matchingLevels[0]?.id || '',
                      department_id: selectedOt?.department_id || prev.department_id,
                    }))
                  }
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="অফিসের ধরণ নির্বাচন করুন">
                    {officeTypes.find((ot) => ot.id === groupModal.office_type_id)?.name || 'অফিসের ধরণ নির্বাচন করুন'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs max-h-60">
                  {officeTypes.map((ot) => (
                    <SelectItem key={ot.id} value={String(ot.id)}>
                      {ot.name} {ot.department_name ? `(${ot.department_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ২. অফিসের স্তর dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অফিসের স্তর</Label>
              {(() => {
                // If an office type is selected, show levels for that office type; otherwise show all levels
                const availableLevels = (
                  groupModal.office_type_id
                    ? officeLevels.filter((lvl) => lvl.office_type_id === groupModal.office_type_id)
                    : officeLevels
                ).slice().sort((a, b) => a.level_order - b.level_order)

                const currentLevel = officeLevels.find((lvl) => lvl.id === groupModal.office_level_id)

                return (
                  <Select
                    value={groupModal.office_level_id || ''}
                    onValueChange={(val) => {
                      if (val) {
                        const selectedLevel = officeLevels.find((lvl) => lvl.id === val)
                        setGroupModal((prev) => ({
                          ...prev,
                          office_level_id: val,
                          office_type_id: selectedLevel?.office_type_id || prev.office_type_id,
                          department_id: selectedLevel?.department_id || prev.department_id,
                        }))
                      }
                    }}
                  >
                    <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                      <SelectValue placeholder="অফিসের স্তর নির্বাচন করুন">
                        {currentLevel?.level_name || (availableLevels.length > 0 ? 'অফিসের স্তর নির্বাচন করুন' : 'কোনো স্তর নির্ধারিত নেই')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl text-xs max-h-60">
                      {availableLevels.map((lvl) => (
                        <SelectItem key={lvl.id} value={lvl.id}>
                          {lvl.level_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              })()}
            </div>

            {/* ৩. গ্রুপ বাজেটে অন্তর্ভূক্ত কি না (option) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">গ্রুপ বাজেটে অন্তর্ভূক্ত কি না</Label>
              <Select
                value={groupModal.is_group_budget ? 'yes' : 'no'}
                onValueChange={(val) => setGroupModal((prev) => ({ ...prev, is_group_budget: val === 'yes' }))}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="নির্বাচন করুন">
                    {groupModal.is_group_budget ? 'হ্যাঁ (গ্রুপ বাজেটে অন্তর্ভূক্ত)' : 'না (একক বাজেট)'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="yes">হ্যাঁ (গ্রুপ বাজেটে অন্তর্ভূক্ত)</SelectItem>
                  <SelectItem value="no">না (একক বাজেট)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setGroupModal((prev) => ({ ...prev, open: false }))} className="rounded-xl text-xs font-semibold">
              বাতিল
            </Button>
            <Button type="button" onClick={handleSaveGroupSetting} disabled={isPending} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* CONFIRMATION MODAL */}
      {/* ============================================================ */}
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
