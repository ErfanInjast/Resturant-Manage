import { create } from 'zustand';

export type ActiveTab = 
  | 'dashboard'
  | 'inventory'
  | 'menu'
  | 'sales'
  | 'analytics'
  | 'settings'
  | 'guide';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastNotification {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ConfirmModalOptions {
  title: string;
  message: string;
  details?: string[];
  badgeText?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface AppStoreState {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  
  // Search & Filter state
  inventorySearchQuery: string;
  setInventorySearchQuery: (query: string) => void;
  
  menuSearchQuery: string;
  setMenuSearchQuery: (query: string) => void;
  
  menuSelectedCategory: string;
  setMenuSelectedCategory: (category: string) => void;

  // Modals state
  isAddIngredientOpen: boolean;
  setIsAddIngredientOpen: (open: boolean) => void;
  
  isAddMenuItemOpen: boolean;
  setIsAddMenuItemOpen: (open: boolean) => void;

  isDailySalesOpen: boolean;
  setIsDailySalesOpen: (open: boolean) => void;

  isWasteModalOpen: boolean;
  setIsWasteModalOpen: (open: boolean) => void;

  editingIngredientId: number | null;
  setEditingIngredientId: (id: number | null) => void;

  editingMenuItemId: number | null;
  setEditingMenuItemId: (id: number | null) => void;

  // Theme state ('light' | 'dark')
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // Mobile drawer state
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;

  // Simple Mode state
  simpleModeUserOverride: boolean | null;
  isSimpleMode: boolean;
  toggleSimpleMode: () => void;
  setIsSimpleMode: (simple: boolean, isUserAction?: boolean) => void;

  // Screen detection state
  isMobileScreen: boolean;
  setIsMobileScreen: (isMobile: boolean) => void;

  // Toast Notification System
  toasts: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, 'id'>) => void;
  removeToast: (id: string) => void;
  notify: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };

  // Confirm Modal System
  confirmModal: (ConfirmModalOptions & { isOpen: boolean }) | null;
  askConfirmation: (options: ConfirmModalOptions) => void;
  closeConfirmation: () => void;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  activeTab: 'dashboard',
  setActiveTab: (activeTab) => set({ activeTab }),

  inventorySearchQuery: '',
  setInventorySearchQuery: (inventorySearchQuery) => set({ inventorySearchQuery }),

  menuSearchQuery: '',
  setMenuSearchQuery: (menuSearchQuery) => set({ menuSearchQuery }),

  menuSelectedCategory: 'همه',
  setMenuSelectedCategory: (menuSelectedCategory) => set({ menuSelectedCategory }),

  isAddIngredientOpen: false,
  setIsAddIngredientOpen: (isAddIngredientOpen) => set({ isAddIngredientOpen }),

  isAddMenuItemOpen: false,
  setIsAddMenuItemOpen: (isAddMenuItemOpen) => set({ isAddMenuItemOpen }),

  isDailySalesOpen: false,
  setIsDailySalesOpen: (isDailySalesOpen) => set({ isDailySalesOpen }),

  isWasteModalOpen: false,
  setIsWasteModalOpen: (isWasteModalOpen) => set({ isWasteModalOpen }),

  editingIngredientId: null,
  setEditingIngredientId: (editingIngredientId) => set({ editingIngredientId }),

  editingMenuItemId: null,
  setEditingMenuItemId: (editingMenuItemId) => set({ editingMenuItemId }),

  theme: (typeof window !== 'undefined' && (localStorage.getItem('deklaneh_theme') as 'light' | 'dark')) || 'light',
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    if (typeof window !== 'undefined') {
      localStorage.setItem('deklaneh_theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    return { theme: nextTheme };
  }),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('deklaneh_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    set({ theme });
  },

  isMobileDrawerOpen: false,
  setIsMobileDrawerOpen: (isMobileDrawerOpen) => set({ isMobileDrawerOpen }),

  simpleModeUserOverride: typeof window !== 'undefined' && localStorage.getItem('deklaneh_simple_mode') !== null
    ? localStorage.getItem('deklaneh_simple_mode') === 'true'
    : null,
  isSimpleMode: typeof window !== 'undefined' && localStorage.getItem('deklaneh_simple_mode') !== null
    ? localStorage.getItem('deklaneh_simple_mode') === 'true'
    : false,
  toggleSimpleMode: () => set((state) => {
    const nextSimple = !state.isSimpleMode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('deklaneh_simple_mode', String(nextSimple));
    }
    return {
      simpleModeUserOverride: nextSimple,
      isSimpleMode: nextSimple,
    };
  }),
  setIsSimpleMode: (isSimpleMode, isUserAction = false) => set((state) => {
    if (isUserAction) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('deklaneh_simple_mode', String(isSimpleMode));
      }
      return {
        simpleModeUserOverride: isSimpleMode,
        isSimpleMode,
      };
    }
    const effectiveSimpleMode = state.simpleModeUserOverride !== null
      ? state.simpleModeUserOverride
      : state.isMobileScreen ? true : isSimpleMode;
    return {
      isSimpleMode: effectiveSimpleMode,
    };
  }),

  isMobileScreen: false,
  setIsMobileScreen: (isMobileScreen) => set((state) => {
    const effectiveSimpleMode = state.simpleModeUserOverride !== null
      ? state.simpleModeUserOverride
      : isMobileScreen;
    return {
      isMobileScreen,
      isSimpleMode: effectiveSimpleMode,
    };
  }),

  // Toast Notification Implementation
  toasts: [],
  addToast: (toast) => {
    set((state) => {
      const existingIndex = state.toasts.findIndex(
        (t) => t.title === toast.title && t.type === toast.type
      );

      let nextToasts: ToastNotification[];
      if (existingIndex >= 0) {
        const newId = Math.random().toString(36).substring(2, 9);
        nextToasts = state.toasts.map((t, idx) =>
          idx === existingIndex ? { ...t, ...toast, id: newId } : t
        );
      } else {
        const id = Math.random().toString(36).substring(2, 9);
        nextToasts = [...state.toasts, { ...toast, id }];
      }

      return {
        toasts: nextToasts.slice(-4),
      };
    });
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  notify: {
    success: (title, message) => get().addToast({ type: 'success', title, message }),
    error: (title, message) => get().addToast({ type: 'error', title, message }),
    warning: (title, message) => get().addToast({ type: 'warning', title, message }),
    info: (title, message) => get().addToast({ type: 'info', title, message }),
  },

  // Confirm Modal Implementation
  confirmModal: null,
  askConfirmation: (options) => {
    set({
      confirmModal: {
        ...options,
        isOpen: true,
      },
    });
  },
  closeConfirmation: () => {
    set({ confirmModal: null });
  },
}));
