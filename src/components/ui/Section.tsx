interface Props {
  title: string;
  children: React.ReactNode;
}

export function Section({ title, children }: Props) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
