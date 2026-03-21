"use client";

import clsx from "clsx";
import { InputHTMLAttributes } from "react";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  suffix?: string;
  prefix?: string;
};

export function TextInput({ className, suffix, prefix, ...props }: TextInputProps) {
  return (
    <div className={clsx("field-shell flex items-center rounded-2xl px-4 py-3", className)}>
      {prefix ? <span className="mr-2 text-sm text-[var(--text-soft)]">{prefix}</span> : null}
      <input className="field-input min-w-0 flex-1" {...props} />
      {suffix ? <span className="ml-2 text-sm text-[var(--text-soft)]">{suffix}</span> : null}
    </div>
  );
}
