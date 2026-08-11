import { Variants } from 'motion/react';

/**
 * Standard Animation Design System for Food Costing App
 * Unified, minimal, performant motion tokens and variants.
 */

export const EASINGS = {
  // Modern cubic-bezier curve for swift, natural motion
  smooth: [0.16, 1, 0.3, 1] as const,
  // Snappy spring for popups and dialogs
  snappySpring: { type: 'spring', stiffness: 380, damping: 28 } as const,
  // Gentle spring for micro-interactions
  gentleSpring: { type: 'spring', stiffness: 280, damping: 22 } as const,
};

// 1. Page & Tab Transitions
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: EASINGS.smooth },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.12, ease: EASINGS.smooth },
  },
};

// 2. Container & Staggered Children
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const fadeInUpItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: EASINGS.smooth },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.15, ease: EASINGS.smooth },
  },
};

// 3. Modal & Overlay Motion
export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: EASINGS.snappySpring,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.15, ease: EASINGS.smooth },
  },
};

// 4. Dropdown & Popover Motion
export const popoverVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: -4 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.16, ease: EASINGS.smooth },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -4,
    transition: { duration: 0.12, ease: EASINGS.smooth },
  },
};

// 5. Expandable / Collapsible Accordion Motion
export const expandVariants: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.24, ease: EASINGS.smooth },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.18, ease: EASINGS.smooth },
  },
};

// 6. Toast Notification Motion
export const toastVariants: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: EASINGS.snappySpring,
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.96,
    transition: { duration: 0.15, ease: EASINGS.smooth },
  },
};

// 7. Micro-interactions
export const buttonPress = {
  whileTap: { scale: 0.97 },
  whileHover: { scale: 1.01 },
  transition: { duration: 0.1 },
};

export const cardHover = {
  whileHover: { y: -2 },
  transition: { duration: 0.18, ease: EASINGS.smooth },
};

// 8. Table & List Page Transition Motion
export const tablePageVariants: Variants = {
  initial: (direction: number = 1) => ({
    opacity: 0,
    x: direction > 0 ? 16 : -16,
  }),
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.22,
      ease: EASINGS.smooth,
      staggerChildren: 0.03,
    },
  },
  exit: (direction: number = 1) => ({
    opacity: 0,
    x: direction > 0 ? -16 : 16,
    transition: {
      duration: 0.15,
      ease: EASINGS.smooth,
    },
  }),
};

export const tableRowVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: EASINGS.smooth },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.12 },
  },
};

