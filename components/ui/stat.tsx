type StatProps = {
  label: string;
  value: string;
  hint?: string;
};

export function Stat({ label, value, hint }: StatProps) {
  return (
    <div className="metric-panel rounded-2xl p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--text-soft)]">{hint}</p> : null}
    </div>
  );
}
