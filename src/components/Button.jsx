import React from 'react';

const variants = {
  primary: 'bg-clay text-white shadow-press hover:bg-clay-hover',
  secondary: 'border border-line bg-surface text-ink hover:border-clay/40 hover:bg-clay-soft/50',
  ghost: 'text-muted hover:bg-paper hover:text-ink',
  danger: 'border border-danger/30 bg-white text-danger hover:bg-danger/5',
};

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
};

export default function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl font-semibold transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[0.97] active:shadow-none disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
