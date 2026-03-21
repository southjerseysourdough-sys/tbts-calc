"use client";

import { SelectHTMLAttributes } from "react";
import clsx from "clsx";

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="field-shell rounded-2xl px-4 py-3">
      <select
        {...props}
        className={clsx("field-input appearance-none bg-transparent pr-6", props.className)}
      />
    </div>
  );
}
