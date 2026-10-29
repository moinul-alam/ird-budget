import { toBanglaHazar, toBanglaHazarWords } from '@/lib/bangla'
import { strings } from '@/lib/strings'
import { cn } from '@/lib/utils'

/**
 * A হাজার-scale figure, written the way whoever drafts the budget reads it: the number
 * leads in হাজার (১০০), while the spoken form (১ লক্ষ) is kept as a hover gloss. Nothing
 * is lost — the word is just a glance away — but no one has to convert ১ লক্ষ back into
 * a figure to check it. An empty amount shows the dash every other blank cell uses.
 */
export function HazarAmount({
  taka,
  className,
  unitClassName,
}: {
  taka: number
  className?: string
  unitClassName?: string
}) {
  if (!taka) return <span className="text-slate-300">—</span>

  return (
    <span
      className={cn('cursor-help', className)}
      title={`${toBanglaHazarWords(taka)} ${strings.taka}`}
    >
      {toBanglaHazar(taka)}
      <span className={cn('ml-1 text-[11px] font-medium text-slate-400', unitClassName)}>
        {strings.hazar.badge}
      </span>
    </span>
  )
}
