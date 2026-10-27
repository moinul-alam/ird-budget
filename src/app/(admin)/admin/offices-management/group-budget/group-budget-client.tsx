'use client'

import { useState, useTransition, useMemo } from 'react'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import {
  OfficeTypeHierarchyItem,
  OfficeLevelItem,
  GroupBudgetSettingItem,
  saveGroupBudgetSetting,
  deleteGroupBudgetSetting,
  getGroupBudgetSettings,
} from '@/lib/actions/admin-offices-config'
import {
  GroupModalState,
  ConfirmModalState,
} from '../../offices-config/_types/offices-config'
import { ConfirmDeleteDialog } from '../../offices-config/_components/confirm-delete-dialog'
import { GroupBudgetTable } from './_components/group-budget-table'

interface GroupBudgetClientProps {
  initialGroupSettings: GroupBudgetSettingItem[]
  officeTypes: OfficeTypeHierarchyItem[]
  officeLevels: OfficeLevelItem[]
}

export function GroupBudgetClient({
  initialGroupSettings,
  officeTypes,
  officeLevels,
}: GroupBudgetClientProps) {
  const [groupSettings, setGroupSettings] = useState<GroupBudgetSettingItem[]>(initialGroupSettings)
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [filterTypeForGroups, setFilterTypeForGroups] = useState<string>('all')

  const [groupModal, setGroupModal] = useState<GroupModalState>({
    open: false,
    office_type_id: '',
    office_level_id: '',
    is_group_budget: true,
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

  // Only group-budget office types are listed here
  const groupItems = useMemo(
    () => groupSettings.filter((g) => g.is_group_budget),
    [groupSettings]
  )

  const officeTypesWithGroupBudget = useMemo(
    () => officeTypes.filter((ot) => groupItems.some((g) => g.office_type_id === ot.id)),
    [officeTypes, groupItems]
  )

  const filteredGroupItems = useMemo(
    () =>
      groupItems.filter((g) =>
        filterTypeForGroups === 'all' ? true : String(g.office_type_id) === filterTypeForGroups
      ),
    [groupItems, filterTypeForGroups]
  )

  // Save group budget setting
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
        is_group_budget: groupModal.is_group_budget,
      })
      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('গ্রুপ বাজেট সেটিংস সফলভাবে আপডেট হয়েছে')
        const refreshed = await getGroupBudgetSettings()
        setGroupSettings(refreshed)
        setGroupModal((prev) => ({ ...prev, open: false }))
      }
    })
  }

  // Delete group budget setting
  const handleDeleteGroupSetting = (gs: GroupBudgetSettingItem) => {
    setConfirmModal({
      open: true,
      title: 'গ্রুপ বাজেট থেকে অপসারণ',
      description: `আপনি কি "${gs.office_type_name}${gs.office_level_name ? ` - ${gs.office_level_name}` : ''}" কে গ্রুপ বাজেট উন্মুক্তকরণ থেকে অপসারণ করতে চান?`,
      onConfirm: () => {
        startTransition(async () => {
          const res = await deleteGroupBudgetSetting(gs.id)
          setConfirmModal((prev) => ({ ...prev, open: false }))
          if (res.error) {
            showStatus(res.error, 'error')
          } else {
            showStatus('গ্রুপ বাজেট সেটিং সফলভাবে মুছে ফেলা হয়েছে')
            setGroupSettings((prev) => prev.filter((item) => item.id !== gs.id))
          }
        })
      },
    })
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-title">
            গ্রুপ বাজেট নির্ধারণ (Group Budget)
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

      <GroupBudgetTable
        filteredGroupItems={filteredGroupItems}
        officeTypes={officeTypes}
        officeTypesWithGroupBudget={officeTypesWithGroupBudget}
        officeLevels={officeLevels}
        filterTypeForGroups={filterTypeForGroups}
        setFilterTypeForGroups={setFilterTypeForGroups}
        groupModal={groupModal}
        setGroupModal={setGroupModal}
        onSaveGroupSetting={handleSaveGroupSetting}
        onDeleteGroupSetting={handleDeleteGroupSetting}
        isPending={isPending}
      />

      <ConfirmDeleteDialog
        confirmModal={confirmModal}
        setConfirmModal={setConfirmModal}
        isPending={isPending}
      />
    </div>
  )
}
