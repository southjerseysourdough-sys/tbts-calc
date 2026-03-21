import { ReactNode } from "react";
import clsx from "clsx";

type CardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function Card({ title, subtitle, children, className }: CardProps) {
  return (
    <section className={clsx("paper-card p-5 md:p-6", className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[var(--text-soft)]">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
