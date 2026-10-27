'use server'

import { errorMessage } from '@/lib/errors'

import { prisma } from '@/lib/db/client'
import { guardDraftWrite } from './guard'
import { formBasicSchema } from '@/lib/schemas/forms'

export async function saveFormBasic(submissionId: number, formData: FormData) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  const parsed = formBasicSchema.safeParse({
    head_of_office: formData.get('head_of_office'),
    designation: formData.get('designation'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    address: formData.get('address'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const payload = {
    headOfOffice: parsed.data.head_of_office,
    designation: parsed.data.designation,
    phone: parsed.data.phone,
    email: parsed.data.email,
    address: parsed.data.address,
  }

  try {
    await prisma.officeFormBasic.upsert({
      where: { submissionId: BigInt(submissionId) },
      update: payload,
      create: {
        submissionId: BigInt(submissionId),
        ...payload,
      },
    })

    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}
