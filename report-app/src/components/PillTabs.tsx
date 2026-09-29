// Adapted from the PillNav component's rising-dome hover: a circle rises to fill the pill
// and the label rolls up while a dark copy rolls in. Rebuilt in CSS (no GSAP, no router)
// for this project's hash routing, and fired on keyboard focus as well as hover.

export type PillTab = { path: string; label: string };

export function PillTabs({ tabs, isActive, onSelect }: {
  tabs: PillTab[];
  isActive: (path: string) => boolean;
  onSelect: (path: string) => void;
}) {
  return (
    <div className="pill-tabs">
      {tabs.map((t) => {
        const active = isActive(t.path);
        return (
          <button
            key={t.path}
            type="button"
            className={`pill-tab${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelect(t.path)}
          >
            <span className="pill-dome" aria-hidden />
            <span className="pill-stack">
              <span className="pill-a">{t.label}</span>
              <span className="pill-b" aria-hidden>{t.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
