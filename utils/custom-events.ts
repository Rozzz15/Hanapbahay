/**
 * Cross-platform Custom Event utility
 * Provides CustomEvent polyfill for React Native environments
 */

// Polyfill for CustomEvent in React Native
if (typeof window !== 'undefined' && !window.CustomEvent) {
  // @ts-ignore
  window.CustomEvent = function CustomEvent(event: string, params?: any) {
    const evt = new Event(event, params);
    // @ts-ignore
    evt.detail = params?.detail;
    return evt;
  };
}

/**
 * Safely dispatch a custom event with cross-platform support
 * @param eventName Name of the event
 * @param detail Optional event detail/payload
 */
export function dispatchCustomEvent(eventName: string, detail?: any): void {
  if (typeof window === 'undefined') {
    console.log(`📢 Event "${eventName}" dispatched (server-side, no listeners)`);
    return;
  }

  try {
    if (window.dispatchEvent) {
      // Try to use CustomEvent if available
      if (typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
      } else {
        // Fallback: Use regular Event and attach detail manually
        const event = new Event(eventName);
        // @ts-ignore
        event.detail = detail;
        window.dispatchEvent(event);
      }
      console.log(`✅ Event "${eventName}" dispatched successfully`, detail ? `with detail: ${JSON.stringify(detail)}` : '');
    } else {
      console.log(`⚠️ window.dispatchEvent not available for "${eventName}"`);
    }
  } catch (error) {
    console.error(`❌ Error dispatching "${eventName}" event:`, error);
  }
}

/**
 * Add event listener with cross-platform support
 * @param eventName Name of the event
 * @param handler Event handler function
 * @returns Cleanup function to remove the listener
 */
export function addCustomEventListener(
  eventName: string,
  handler: (event: Event) => void
): () => void {
  if (typeof window === 'undefined') {
    console.log(`👂 Listener for "${eventName}" skipped (server-side)`);
    return () => {};
  }

  try {
    if (window.addEventListener) {
      window.addEventListener(eventName, handler);
      console.log(`👂 Listener added for "${eventName}"`);
      
      // Return cleanup function
      return () => {
        if (window.removeEventListener) {
          window.removeEventListener(eventName, handler);
          console.log(`🔇 Listener removed for "${eventName}"`);
        }
      };
    } else {
      console.log(`⚠️ window.addEventListener not available for "${eventName}"`);
      return () => {};
    }
  } catch (error) {
    console.error(`❌ Error adding listener for "${eventName}":`, error);
    return () => {};
  }
}

