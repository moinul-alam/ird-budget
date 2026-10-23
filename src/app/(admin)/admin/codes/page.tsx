import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { getOfficeTypes, getDepartments, getOfficeLevels } from '@/app/actions/admin-offices-config'
import { getBudgetCategories, getExpenseCodesWithCategoryAndMapping } from '@/app/actions/admin-codes'
import { AdminCodesClient } from './admin-codes-client'

export const metadata = {
  title: 'কোড কনফিগারেশন | আইআরডি বাজেট ব্যবস্থাপনা',
  description: 'বাজেট কোড তৈরি, ক্যাটাগরি এবং অফিসের ধরণ অনুযায়ী প্রদর্শন নির্ধারণ',
}

export default async function AdminCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ office_type_id?: string }>
}) {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  const officeTypes = await getOfficeTypes()
  const params = await searchParams
  const defaultTypeId = officeTypes[0]?.id || '1'
  const selectedTypeId = params.office_type_id || defaultTypeId

  const [categories, { codes }, departments, officeLevels] = await Promise.all([
    getBudgetCategories(),
    getExpenseCodesWithCategoryAndMapping(String(selectedTypeId)),
    getDepartments(),
    getOfficeLevels(),
  ])

  return (
    <div className="space-y-6">
      <AdminCodesClient
        officeTypes={officeTypes.map((ot) => ({
          id: String(ot.id),
          name: ot.name,
          department_name: ot.department_name || '',
          department_id: ot.department_id?.toString() || '',
        }))}
        departments={departments}
        officeLevels={officeLevels}
        initialCodes={codes}
        initialCategories={categories}
        initialOfficeTypeId={String(selectedTypeId)}
      />
    </div>
  )
}
