export const COLOR_HEX = {
  brandPrimary: '#5E6AD2',
  brandPrimaryHover: '#4C58C2',
  statusSuccess: '#10B981',
  statusError: '#EF4444',
  statusWarning: '#F59E0B',
  statusInfo: '#3B82F6',
  statusPurple: '#8B5CF6',
} as const;

export const DESIGN_TOKENS = {
  brand: {
    primary: 'var(--brand-primary)',
    primaryHover: 'var(--brand-primary-hover)',
    primarySubtle: 'var(--brand-primary-subtle)',
  },
  neutrals: {
    textPrimary: 'var(--text-primary)',
    textSecondary: 'var(--text-secondary)',
    bgBase: 'var(--bg-base)',
    bgCard: 'var(--bg-card)',
    borderSubtle: 'var(--border-subtle)',
    borderFunctional: 'var(--border-functional)',
  },
  status: {
    successText: 'var(--status-success-text)',
    successBg: 'var(--status-success-bg)',
    errorText: 'var(--status-error-text)',
    errorBg: 'var(--status-error-bg)',
    warningText: 'var(--status-warning-text)',
    warningBg: 'var(--status-warning-bg)',
    infoText: 'var(--status-info-text)',
    infoBg: 'var(--status-info-bg)',
    purpleText: 'var(--status-purple-text)',
    purpleBg: 'var(--status-purple-bg)',
  },
} as const;
