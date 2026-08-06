import { useState, useEffect, useRef } from 'react';
import { presenceMessages, defaultPresenceMessage } from './presenceMessages';

/**
 * usePresenceAnimator
 * 
 * Takes the conversation type and whether the animation is active.
 * Sequences through the messages at calm intervals (0s, 3s, 7s, etc.).
 * 
 * @param {boolean} isActive - Whether the presence is currently active (i.e. 'thinking')
 * @param {string} type - The conversation type to select messages for
 * @returns {string} The current message to display
 */
export function usePresenceAnimator(isActive, type = 'general') {
  const [messageIndex, setMessageIndex] = useState(0);
  const timerRef = useRef(null);
  
  // Resolve the message list based on type, fallback to general
  const messages = presenceMessages[type] || presenceMessages['general'];

  useEffect(() => {
    if (!isActive) {
      setMessageIndex(0);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Reset index when first activated
    setMessageIndex(0);

    const scheduleNext = (currentIndex) => {
      // Don't advance beyond the last message
      if (currentIndex >= messages.length - 1) return;

      // The intervals: 0s (handled by index 0), 3s, 7s.
      // So wait 3s for the first transition, then 4s for the next.
      const delays = [3000, 4000, 4000, 4000]; // extend safely
      const delay = delays[currentIndex] || 4000;

      timerRef.current = setTimeout(() => {
        setMessageIndex(currentIndex + 1);
        scheduleNext(currentIndex + 1);
      }, delay);
    };

    scheduleNext(0);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, messages.length]);

  return messages[messageIndex] || defaultPresenceMessage;
}
