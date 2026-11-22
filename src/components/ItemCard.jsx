import React from 'react';
import Card from './Card.jsx';
import Icon from './Icon.jsx';
import StatusPill from './StatusPill.jsx';
import { formatDate } from '../lib/format.js';
import { photoUrl } from '../lib/api.js';

export default function ItemCard({ item, onClick, footer, className = '', style }) {
  const image = photoUrl(item.photo_url);

  return (
    <Card
      as="button"
      type="button"
      onClick={onClick}
      aria-label={`View ${item.title}`}
      style={style}
      className={`group relative mt-2 tape rotate-[var(--tilt,0deg)] animate-rise text-left transition-[transform,box-shadow,border-color] duration-200 ease-out hover:z-10 hover:-translate-y-1 hover:rotate-0 hover:border-clay/30 hover:shadow-lift active:scale-[0.99] ${className}`}
    >
      <div className="flex h-40 items-center justify-center overflow-hidden rounded-t-card border-b border-line bg-[#eceae4]">
        {image
          ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]" />
          : <div className="flex flex-col items-center gap-2 text-ink/25"><Icon name="tag" className="h-8 w-8" /><span className="text-[11px] font-semibold uppercase tracking-widest">Notice</span></div>}
      </div>
      <div className="space-y-2.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <StatusPill status={item.status} />
          <span className="text-[11px] text-muted">{formatDate(item.created_at)}</span>
        </div>
        <h3 className="line-clamp-1 text-[15px] font-bold tracking-tight text-ink">{item.title}</h3>
        <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-muted">{item.description || 'No description provided.'}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Icon name="pin" className="h-3.5 w-3.5 shrink-0 text-clay" />
          <span className="truncate">{item.location || 'Location not listed'}</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-dashed border-line pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <span>{item.category}</span>
          <span className="inline-flex items-center gap-1 text-clay">
            View <Icon name="arrow" className="h-3.5 w-3.5" />
          </span>
        </div>
        {footer}
      </div>
    </Card>
  );
}
