import React from 'react';

export default function Card({ as: Component = 'div', className = '', ...props }) {
  return <Component className={`surface ${className}`} {...props} />;
}
