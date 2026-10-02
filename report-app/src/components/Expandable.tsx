import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function Expandable({ header, children, defaultOpen = false }: { header: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`expandable ${open ? 'is-open' : ''}`}>
      <button className="expandable-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {header}
        <ChevronDown size={16} className="expandable-chevron" />
      </button>
      {open && <div className="expandable-body">{children}</div>}
    </div>
  );
}
