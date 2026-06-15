import { useState, useEffect } from 'react';

export const useFocus = () => {
  const [isFocused, setIsFocused] = useState(true);
  const [blurCount, setBlurCount] = useState(0);

  useEffect(() => {
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => {
      setIsFocused(false);
      setBlurCount((prev) => prev + 1);
      // Trigger a socket event here in a real integration to flag the user!
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return { isFocused, blurCount };
};