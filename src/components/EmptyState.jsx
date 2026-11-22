import React from 'react';
import Icon from './Icon.jsx';

export default function EmptyState({ icon = 'search', title, description, action }) {
  return (
    <div className="surface relative mx-auto max-w-xl px-6 py-16 text-center">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-clay/20 bg-clay-soft text-clay">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
      {description && <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
