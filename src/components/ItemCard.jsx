import React from 'react';
import Card from './Card.jsx';
import Icon from './Icon.jsx';
import StatusPill from './StatusPill.jsx';
import { formatDate, titleCase } from '../lib/format.js';
import { photoUrl } from '../lib/api.js';

export default function ItemCard({ item, onClick, footer, className = '' }) {
  const image = photoUrl(item.photo_url);

  return (
    <Card
      as="button"
      type="button"
      onClick={onClick}
      aria-label={`View ${item.title}`}
      className={`group animate-rise overflow-hidden p-0 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-lift ${className}`}
    >
      <div className="flex h-40 items-center justify-center overflow-hidden border-b border-line bg-ink/[0.04]">
        {image
          ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          : <Icon name="tag" className="h-9 w-9 text-ink/20" />}
      </div>
      <div className="space-y-2.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <StatusPill status={item.status} />
          <span className="text-[11px] text-muted">{formatDate(item.created_at)}</span>
        </div>
        <h3 className="line-clamp-1 text-[15px] font-bold tracking-tight text-ink">{item.title}</h3>
        <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-muted">{item.description || 'No description provided.'}</p>
        <div className="flex items-center gap-1.5 pt-1 text-xs text-muted">
          <Icon name="pin" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{item.location || 'Location not listed'}</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-line pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <span>{item.category}</span>
          <span className="inline-flex items-center gap-1 text-accent">
            View <Icon name="arrow" className="h-3.5 w-3.5" />
          </span>
        </div>
        {footer}
      </div>
    </Card>
  );
}
