interface Props {
  label: string;
  children: React.ReactNode;
}

export function Row({ label, children }: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-subtle">{label}</span>
      {children}
    </div>
  );
}
