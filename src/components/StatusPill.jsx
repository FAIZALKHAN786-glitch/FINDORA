import React from 'react';

const styles = {
  lost: 'border-danger/20 bg-danger/5 text-danger',
  found: 'border-success/20 bg-success/5 text-success',
  claimed: 'border-accent/20 bg-accent-soft text-accent',
  returned: 'border-line bg-ink/5 text-muted',
};

const labels = {
  lost: 'Lost',
  found: 'Found',
  claimed: 'Claimed',
  returned: 'Returned',
};

export default function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${styles[status] || styles.returned}`}>
      {labels[status] || status}
    </span>
  );
}
