// Interaction adapted from a stacked "digital wallet" component: cards peek out of a holder,
// fan on hover, and one can be pulled to the front. Here the wallet is the API owner's daily
// budget and the cards are the two real lab variants of the Denial-of-Wallet reproduction.
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export type DowNumbers = {
  calls: number; budget: number;
  vulnBilled: number; vulnUsed: number;
  patchBilled: number; patchUsed: number;
};

type Variant = 'vuln' | 'patched';

const STAGE_H = 330;
const WALLET_H = 150;
const WALLET_TOP = STAGE_H - WALLET_H;
const CARD_H = 176;

export function WalletBreach({ dow }: { dow: DowNumbers }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState<Variant | null>(null);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    setTouch(window.matchMedia('(hover: none)').matches);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const fanned = hover || touch;

  // Front card first: index 0 sits lowest, index 1 peeks higher behind it.
  const cards: { id: Variant; billed: number; used: string; note: string; tag: string; file: string }[] = [
    { id: 'patched', billed: dow.patchBilled, used: `${dow.patchUsed} of ${dow.budget}`, note: `Calls 4 to ${dow.calls} rejected with 429`, tag: 'Patched', file: 'dow-mock/patched.mjs' },
    { id: 'vuln', billed: dow.vulnBilled, used: `${dow.vulnUsed}`, note: 'Every attack call reached the paid upstream', tag: 'Vulnerable', file: 'dow-mock/vulnerable.mjs' },
  ];

  const shown = cards.find((c) => c.id === active);
  const billed = shown?.billed ?? null;
  const over = billed != null ? billed - dow.budget : 0;

  const topFor = (i: number, isActive: boolean) => {
    if (isActive) return WALLET_TOP - 118;
    if (fanned) return WALLET_TOP - 62 - i * 70;
    return WALLET_TOP - 46 - i * 40;
  };

  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 260, damping: 21 };

  return (
    <div className="wl">
      <div className="wl-readout" aria-live="polite">
        <div className="wl-cap">{shown ? `${shown.tag} variant: calls billed to the owner` : 'Owner’s daily budget, in paid calls'}</div>
        <motion.div
            key={active ?? 'idle'}
            className={`wl-num${shown ? (over > 0 ? ' bad' : ' good') : ''}`}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {billed ?? dow.budget}
            <small>
              {shown
                ? over > 0 ? `${over} over budget` : 'exactly at budget'
                : 'calls a day'}
            </small>
        </motion.div>
      </div>

      <div
        className="wl-stage"
        style={{ height: STAGE_H }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHover(false); }}
        onClick={() => setActive(null)}
        role="group"
        aria-label="Budget wallet with the two lab variants"
      >
        {cards.map((c, i) => {
          const isActive = active === c.id;
          const dim = active && !isActive;
          return (
            <motion.button
              key={c.id}
              type="button"
              className={`wl-card ${c.id}`}
              style={{ height: CARD_H, zIndex: isActive ? 40 : 10 + (cards.length - i) }}
              initial={false}
              animate={{
                top: topFor(i, isActive),
                scale: isActive ? 1.04 : 1 - i * 0.04,
                filter: `brightness(${dim ? 0.55 : fanned || isActive ? 1 : 0.82})`,
              }}
              transition={spring}
              onClick={(e) => { e.stopPropagation(); setActive(isActive ? null : c.id); }}
              aria-pressed={isActive}
              aria-label={`${c.tag} variant, ${c.billed} calls billed`}
            >
              <span className="wl-grain" aria-hidden />
              <span className="wl-row">
                <span className="wl-tag">{c.tag}</span>
                <span className="wl-big">{c.billed}<i> billed</i></span>
              </span>
              <span className="wl-mid">
                <span>Attacker quota used <b>{c.used}</b></span>
                <span>{c.note}</span>
              </span>
              <span className="wl-foot">
                <span>GHSA-hcq5-jm84-2395</span>
                <span>{c.file}</span>
              </span>
            </motion.button>
          );
        })}

        <motion.div
          className="wl-front"
          style={{ height: WALLET_H, zIndex: 30 }}
          initial={false}
          animate={{ y: fanned && !reduce ? 5 : 0 }}
          transition={spring}
          aria-hidden
        >
          <span className="wl-stitch" />
          <span className="wl-slot" />
          <span className="wl-label">Daily budget</span>
          <span className="wl-budget">{dow.budget} calls</span>
        </motion.div>
      </div>

      <p className="wl-hint">
        {active ? 'Press Esc or click the background to close.' : 'Hover the wallet, then pick a variant.'}
      </p>
    </div>
  );
}
