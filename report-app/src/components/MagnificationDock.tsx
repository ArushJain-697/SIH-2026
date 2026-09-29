// Adapted from the MagnificationDock component (framer-motion). Ported off Tailwind onto
// this project's CSS tokens, with keyboard support, clientX-based hit math, an active
// state, and reduced-motion handling added.
import { useRef, useState, type ReactNode } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
  type SpringOptions,
} from 'motion/react';

export type DockItemData = {
  id: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  primary?: boolean;
};

type DockProps = {
  items: DockItemData[];
  visible?: boolean;
  distance?: number;
  baseItemSize?: number;
  magnification?: number;
  spring?: SpringOptions;
};

function DockItem({
  item, mouseX, spring, distance, baseItemSize, magnification,
}: {
  item: DockItemData;
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  baseItemSize: number;
  magnification: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [showLabel, setShowLabel] = useState(false);

  const offset = useTransform(mouseX, (x) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return Infinity;
    return x - rect.left - rect.width / 2;
  });
  const target = useTransform(offset, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(target, spring);

  return (
    <motion.button
      ref={ref}
      type="button"
      className={`dock-item${item.active ? ' active' : ''}${item.primary ? ' primary' : ''}`}
      style={{ width: size, height: size }}
      onClick={item.onClick}
      onHoverStart={() => setShowLabel(true)}
      onHoverEnd={() => setShowLabel(false)}
      onFocus={() => setShowLabel(true)}
      onBlur={() => setShowLabel(false)}
      aria-label={item.label}
      aria-current={item.active ? 'true' : undefined}
    >
      <span className="dock-icon" aria-hidden>{item.icon}</span>
      <AnimatePresence>
        {showLabel && (
          <motion.span
            className="dock-label"
            role="tooltip"
            initial={{ opacity: 0, y: 4, x: '-50%' }}
            animate={{ opacity: 1, y: -6, x: '-50%' }}
            exit={{ opacity: 0, y: 4, x: '-50%' }}
            transition={{ duration: 0.16 }}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function MagnificationDock({
  items,
  visible = true,
  distance = 140,
  baseItemSize = 44,
  magnification = 64,
  spring = { mass: 0.1, stiffness: 160, damping: 13 },
}: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const reduce = useReducedMotion();
  const peak = reduce ? baseItemSize : magnification;

  return (
    <motion.nav
      className="dock-wrap"
      aria-label="Page sections"
      initial={false}
      animate={
        visible
          ? { y: 0, opacity: 1, visibility: 'visible' }
          : { y: 110, opacity: 0, transitionEnd: { visibility: 'hidden' } }
      }
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 28 }}
    >
      <div
        className="dock-panel"
        style={{ height: baseItemSize + 16 }}
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
      >
        {items.map((item) => (
          <DockItem
            key={item.id}
            item={item}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            baseItemSize={baseItemSize}
            magnification={peak}
          />
        ))}
      </div>
    </motion.nav>
  );
}
