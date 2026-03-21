import { ReactNode } from "react";
import clsx from "clsx";

type FieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

export function Field({ label, hint, children, className }: FieldProps) {
  return (
    <label className={clsx("block", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-[var(--text)]">{label}</span>
        {hint ? <span className="text-xs text-[var(--text-soft)]">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}
