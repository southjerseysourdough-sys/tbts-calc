type StatProps = {
  label: string;
  value: string;
  hint?: string;
};

export function Stat({ label, value, hint }: StatProps) {
  return (
    <div className="metric-panel rounded-2xl p-4">
      <p className="metric-panel__label text-xs uppercase tracking-[0.18em]">{label}</p>
      <p className="metric-panel__value mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="metric-panel__hint mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}
