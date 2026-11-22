import React from 'react';

export default function Logo({ compact = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 36 36" className="h-9 w-9 shrink-0" aria-hidden="true">
        <rect width="36" height="36" rx="11" fill="#1d1d1b" />
        <path d="M10 10h16v15a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V10Z" fill="#fffdf9" />
        <path d="M14 10V7.5h8V10" fill="none" stroke="#fffdf9" strokeWidth="2" strokeLinecap="round" />
        <path d="M14 15h8M14 19h5" fill="none" stroke="#1d1d1b" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="24" cy="23" r="3.2" fill="#a8461f" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="text-[16px] font-extrabold tracking-[-0.035em] text-ink">Findora</span>
        {!compact && <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">campus noticeboard</span>}
      </span>
    </span>
  );
}
