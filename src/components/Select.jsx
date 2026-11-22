import React, { useId } from 'react';

export default function Select({ label, children, className = '', id, ...props }) {
  const generated = useId();
  const selectId = id || generated;

  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={selectId} className="block text-sm font-semibold text-ink">{label}</label>}
      <select
        id={selectId}
        className={`h-12 w-full appearance-none rounded-xl border border-line bg-surface bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%20fill%3D%22none%22%20stroke%3D%22%2366665f%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_0.9rem_center] bg-no-repeat px-3.5 pr-10 text-sm text-ink transition-[border-color,box-shadow] duration-150 ease-out hover:border-ink/25 focus:border-clay focus:ring-2 focus:ring-clay/10 ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
