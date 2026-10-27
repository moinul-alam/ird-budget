import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import {
  getMyOfficeProfile,
  getMinistriesList,
  getDepartments,
  getParentOffices,
  getOfficeTypes,
  getOfficeLevelsForType,
} from '@/lib/actions/office'
import { OfficeInfoClient } from './office-info-client'

export default async function OfficeInfoPage() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const profile = await getMyOfficeProfile()
  if (!profile) redirect('/')

  const [ministries, departments, officeTypes, parentOffices, levels] = await Promise.all([
    getMinistriesList(),
    getDepartments(),
    profile.departmentId ? getOfficeTypes(profile.departmentId) : Promise.resolve([]),
    profile.departmentId ? getParentOffices(profile.departmentId) : Promise.resolve([]),
    profile.officeTypeId ? getOfficeLevelsForType(Number(profile.officeTypeId)) : Promise.resolve([]),
  ])

  return (
    <OfficeInfoClient
      profile={profile}
      ministries={ministries}
      departments={departments}
      initialOfficeTypes={officeTypes}
      initialParentOffices={parentOffices}
      initialLevels={levels}
    />
  )
}
