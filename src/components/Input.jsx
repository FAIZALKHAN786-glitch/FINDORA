import React, { useId } from 'react';

export default function Input({ label, hint, error, className = '', id, ...props }) {
  const generated = useId();
  const inputId = id || generated;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={inputId} className="block text-sm font-semibold text-ink">{label}</label>}
      <input
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-muted/70 transition-[border-color,box-shadow] duration-150 ease-out hover:border-ink/25 focus:border-clay focus:ring-2 focus:ring-clay/10 ${className}`}
        {...props}
      />
      {hint && !error && <p id={`${inputId}-hint`} className="text-xs text-muted">{hint}</p>}
      {error && <p id={`${inputId}-error`} role="alert" className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
