import type { Transition, Variants } from "framer-motion";

// ── Spring configurations ──────────────────────────────────────────

/** Primary — heavy and slow (container / page level) */
export const liquidSpring: Transition = {
  type: "spring",
  mass: 1.2,
  damping: 30,
  stiffness: 80,
};

/** Children — still heavy but snappier */
export const childSpring: Transition = {
  type: "spring",
  mass: 0.8,
  damping: 30,
  stiffness: 105,
};

/** Exit — deterministic tween (springs have no guaranteed end time) */
export const exitTween: Transition = {
  type: "tween",
  duration: 0.18,
  ease: [0.4, 0, 1, 1],
};

// ── Page-level variant ─────────────────────────────────────────────

export const liquidPageVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: liquidSpring,
  },
};

// ── Stagger entrance animation ────────────────────────────────────

export const liquidStaggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.015,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

export const liquidStaggerChild: Variants = {
  initial: { opacity: 0, y: 8, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: childSpring,
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.99,
    transition: { type: "tween", duration: 0.14, ease: [0.4, 0, 1, 1] },
  },
};

// ── Chromatic shimmer (text) ──────────────────────────────────────

export const chromaticShimmer: Variants = {
  initial: { textShadow: "0 0 0 transparent, 0 0 0 transparent" },
  animate: {
    textShadow: "0 0 0 transparent, 0 0 0 transparent",
    transition: { delay: 0.3, duration: 0.4 },
  },
  exit: {
    textShadow:
      "-0.5px 0 1px rgba(99,102,241,0.3), 0.5px 0 1px rgba(56,189,248,0.3)",
    transition: { duration: 0.15 },
  },
};

// ── Card hover lift config ─────────────────────────────────────────

export const cardHoverLift = {
  whileHover: { y: -4, transition: { duration: 0.2 } },
  whileTap: { scale: 0.98 },
};

// ── Sidebar active pill spring ─────────────────────────────────────

export const sidebarPillSpring: Transition = {
  type: "spring",
  mass: 0.6,
  damping: 28,
  stiffness: 180,
};

// ── Snappy button press spring ────────────────────────────────────

export const buttonPressSpring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 20,
  mass: 0.5,
};

// ── Tab content view transition ───────────────────────────────────

export const viewTransitionVariants: Variants = {
  initial: { opacity: 0, y: 6, scale: 0.995, filter: "blur(2px)" },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 30,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.995,
    filter: "blur(1px)",
    transition: {
      type: "tween",
      duration: 0.15,
      ease: [0.4, 0, 1, 1],
    },
  },
};

// ── Glass card hover with depth increase ──────────────────────────

export const glassCardHover = {
  whileHover: {
    y: -4,
    scale: 1.01,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
  whileTap: {
    scale: 0.97,
    transition: { type: "spring", stiffness: 400, damping: 20 },
  },
};

// ── Smooth entrance with blur dissolve ────────────────────────────

export const blurEntranceVariants: Variants = {
  initial: { opacity: 0, filter: "blur(8px)", scale: 0.96 },
  animate: {
    opacity: 1,
    filter: "blur(0px)",
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 28,
      mass: 0.9,
    },
  },
};
