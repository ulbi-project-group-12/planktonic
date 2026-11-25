import { useEffect, useState } from 'react';

/**
 * Re-renders every `step` ms. Relative labels like "5 минут назад" are computed from this
 * value, so an open page keeps them true instead of freezing the moment of the first render.
 */
export function useNow(step = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, step);
    return () => {
      clearInterval(timer);
    };
  }, [step]);

  return now;
}
