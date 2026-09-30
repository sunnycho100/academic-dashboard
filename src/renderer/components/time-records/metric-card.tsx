export interface MetricCardProps {
  label: string
  value: string
}

// A stat in the dialog's summary row: serif number with a small caps label, no box.
export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-serif text-3xl leading-none tabular-nums">{value}</span>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  )
}
