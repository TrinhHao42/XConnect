import { create } from 'zustand';

type Language = 'en' | 'vi';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  initialize: () => void;
}

const getInitialLanguage = (): Language => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('language');
    if (saved === 'en' || saved === 'vi') return saved;
  }
  return 'en';
};

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'en', // Always default to 'en' for SSR consistency
  setLanguage: (language) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', language);
    }
    set({ language });
  },
  initialize: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language');
      if (saved === 'en' || saved === 'vi') {
        set({ language: saved });
      }
    }
  }
}));
