import React from 'react';

const styles = {
  lost: 'border-[#e7cdc0] bg-clay-soft text-clay',
  found: 'border-[#cddbd2] bg-[#eef3ef] text-success',
  claimed: 'border-line bg-paper text-ink',
  returned: 'border-line bg-ink/5 text-muted',
};

const labels = {
  lost: 'Lost',
  found: 'Found',
  claimed: 'Claimed',
  returned: 'Returned',
};

export default function StatusPill({ status }) {
  const style = styles[status] || styles.returned;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {labels[status] || status}
    </span>
  );
}
