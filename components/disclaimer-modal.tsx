"use client";

import { useEffect, useRef } from "react";

type DisclaimerModalProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onConfirm: () => void;
  open: boolean;
};

export function DisclaimerModal({
  checked,
  onCheckedChange,
  onConfirm,
  open,
}: DisclaimerModalProps) {
  const checkboxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    checkboxRef.current?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="disclaimer-overlay" role="presentation">
      <div
        className="disclaimer-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
        aria-describedby="disclaimer-copy"
      >
        <p className="disclaimer-eyebrow">Safety First</p>
        <h2 id="disclaimer-title" className="disclaimer-title">
          Soapmaking requires careful handling
        </h2>
        <p id="disclaimer-copy" className="disclaimer-copy">
          This calculator is provided for educational and informational purposes only.
          Soap making involves working with sodium hydroxide (lye), which is a caustic
          substance that can cause serious injury if handled improperly. Always verify
          your formulas, follow proper safety procedures, and wear appropriate
          protective equipment. Tallow Be Thy Soap is not responsible for any harm or
          damage resulting from the use of this calculator.
        </p>

        <label className="disclaimer-check">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={checked}
            onChange={(event) => onCheckedChange(event.target.checked)}
          />
          <span>I understand and accept responsibility for safe soapmaking</span>
        </label>

        <button
          type="button"
          onClick={onConfirm}
          disabled={!checked}
          className="disclaimer-confirm"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
