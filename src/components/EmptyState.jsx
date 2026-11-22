import React from 'react';
import Icon from './Icon.jsx';

export default function EmptyState({ icon = 'search', title, description, action }) {
  return (
    <div className="surface flex flex-col items-center px-6 py-16 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
