import React from 'react';

const variants = {
  primary: 'bg-accent text-white hover:bg-accent-hover shadow-sm',
  secondary: 'border border-line bg-surface text-ink hover:border-accent/40 hover:bg-accent-soft/40',
  ghost: 'text-muted hover:bg-ink/5 hover:text-ink',
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
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
