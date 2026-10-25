import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';
export type StrategyType = 'baseline' | 'skylink_utility' | 'skylink_rl';

interface UIState {
  theme: ThemeMode;
  activeStrategy: StrategyType;
  selectedPreset: string;
  isTourActive: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  setActiveStrategy: (strategy: StrategyType) => void;
  setSelectedPreset: (preset: string) => void;
  setTourActive: (active: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'dark',
  activeStrategy: 'skylink_utility',
  selectedPreset: 'disaster',
  isTourActive: false,

  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        if (nextTheme === 'light') {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        } else {
          document.documentElement.classList.remove('light');
          document.documentElement.classList.add('dark');
        }
      }
      return { theme: nextTheme };
    }),

  setTheme: (theme) =>
    set(() => {
      if (typeof document !== 'undefined') {
        if (theme === 'light') {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        } else {
          document.documentElement.classList.remove('light');
          document.documentElement.classList.add('dark');
        }
      }
      return { theme };
    }),

  setActiveStrategy: (activeStrategy) => set({ activeStrategy }),
  setSelectedPreset: (selectedPreset) => set({ selectedPreset }),
  setTourActive: (isTourActive) => set({ isTourActive }),
}));
