import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function useScreenSize() {
  const { setIsMobileScreen, setIsSimpleMode } = useAppStore();
  const [isMobileScreen, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const checkScreen = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsMobileScreen(mobile);
      setIsSimpleMode(mobile, false);
    };

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkScreen, 150);
    };

    // Initial check on mount
    checkScreen();

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [setIsMobileScreen, setIsSimpleMode]);

  return { isMobileScreen };
}
