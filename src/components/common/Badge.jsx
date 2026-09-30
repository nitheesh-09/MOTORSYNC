import React from 'react';

export const Badge = ({ status = 'HEALTHY', label, size = 'md', className = '' }) => {
  const norm = (label || status || '').toUpperCase();

  let variant = 'healthy';
  if (['FAULT', 'CRITICAL', 'HIGH', 'DEGRADED'].includes(norm)) {
    variant = 'fault';
  } else if (['WARNING', 'MEDIUM', 'ELEVATED'].includes(norm)) {
    variant = 'warning';
  } else if (['SYNTHETIC', 'SIMULATED', 'SYNTHETIC DATA'].includes(norm)) {
    variant = 'synthetic';
  } else if (['INFO', 'ACQUIRING', 'PROCESSING', 'ANALYZING'].includes(norm)) {
    variant = 'info';
  } else if (['OFFLINE', 'STANDBY', 'NOT CONNECTED', '—'].includes(norm)) {
    variant = 'muted';
  }

  return (
    <span className={`badge badge-${variant} ${size === 'sm' ? 'badge-sm' : ''} ${className}`}>
      <span className="badge-dot" />
      <span>{label || status}</span>
    </span>
  );
};
