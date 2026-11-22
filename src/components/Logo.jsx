import React from 'react';

export default function Logo({ compact = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 36 36" className="h-9 w-9" aria-hidden="true">
        <rect width="36" height="36" rx="10" fill="#4f46e5" />
        <path d="M10 13h16v13H10z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
        <path d="M14 13V9h8v4" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx="18" cy="19" r="3" fill="white" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-bold tracking-tight text-ink">Lost &amp; Found</span>
        {!compact && <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Campus board</span>}
      </span>
    </span>
  );
}
