const fs = require('fs')
const path = require('path')

const strings = {
  5: 'Vehicles & Fuel',
  6: 'Vehicle Rent',
  7: 'IT Equipment',
  8: 'Utilities',
  9: 'House Rent',
  10: 'Return Info',
}

for (let i = 5; i <= 10; i++) {
  const dir = path.join(__dirname, `src/app/(office)/office/form-${i}`)
  fs.mkdirSync(dir, { recursive: true })

  const pageContent = `import { createClient } from '@/lib/supabase/server'
import { Form${i}Client } from './form-${i}-client'

export default async function Form${i}Page() {
  const supabase = await createClient()
  const submissionId = null

  return <Form${i}Client submissionId={submissionId} />
}
`

  const clientContent = `'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'

export function Form${i}Client({ submissionId }: { submissionId: number | null }) {
  return (
    <FormShell
      title={strings.forms.form${i}.title}
      formNumber={${i}}
      prevHref="/office/form-${i - 1}"
      nextHref="${i === 10 ? '/office/budget-sheet' : `/office/form-${i + 1}`}"
    >
      <div className="p-8 text-center text-slate-500">
        [Form ${i}: ${strings[i]} implementation will go here]
      </div>
    </FormShell>
  )
}
`

  fs.writeFileSync(path.join(dir, 'page.tsx'), pageContent)
  fs.writeFileSync(path.join(dir, `form-${i}-client.tsx`), clientContent)
}

console.log('Forms generated successfully')
