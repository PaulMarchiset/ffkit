import { cn } from "@/lib/cn";

interface Props {
  value: React.ReactNode;
  label: string;
  valueClassName?: string;
}

/** One labeled stat (big mono value + small uppercase caption), centered in its
 *  column. Shared by the encoding meter and the result card. */
export function JobStat({ value, label, valueClassName }: Props) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <span className={cn("font-mono text-xl text-fg tabular-nums", valueClassName)}>
        {value}
      </span>
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}
