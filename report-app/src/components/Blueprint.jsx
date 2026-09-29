import React from 'react';

export function Stamp({ status, label }) {
  const cls = status === 'REPRODUCED-KNOWN' || status === 'CONFIRMED-NOVEL'
    ? 'flagged'
    : status === 'CANDIDATE-UNCONFIRMED'
      ? 'pending'
      : 'approved';
  const text = label || (cls === 'flagged' ? 'FINDING' : cls === 'pending' ? 'CANDIDATE' : 'SECURE');
  return <span className={`stamp ${cls}`}>{text}</span>;
}

export function StreamDot({ status }) {
  const cls = status === 'REPRODUCED-KNOWN' || status === 'CONFIRMED-NOVEL'
    ? 'flagged'
    : status === 'CANDIDATE-UNCONFIRMED'
      ? 'pending'
      : 'approved';
  return <span className={`stream-dot ${cls}`} />;
}

export function SectionTitle({ children, count }) {
  return (
    <div className="section-title">
      <span className="dot" />
      {children}
      {count != null && <span className="count">· {count}</span>}
    </div>
  );
}
