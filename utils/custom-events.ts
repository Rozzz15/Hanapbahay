/**
 * Cross-platform Custom Event utility
 * Provides CustomEvent polyfill for React Native environments
 * Uses a simple EventEmitter for React Native, falls back to window events for web
 */

// Simple EventEmitter for React Native
class SimpleEventEmitter {
  private listeners: Map<string, Set<(event: any) => void>> = new Map();

  on(eventName: string, handler: (event: any) => void): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(handler);
  }

  off(eventName: string, handler: (event: any) => void): void {
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  emit(eventName: string, detail?: any): void {
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      // Create a mock event object similar to DOM events
      const event = {
        type: eventName,
        detail,
        target: null,
        currentTarget: null,
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`❌ Error in event handler for "${eventName}":`, error);
        }
      });
    }
  }
}

// Create a singleton EventEmitter instance for React Native
const eventEmitter = new SimpleEventEmitter();

// Check if we're in a web environment with full DOM support
const isWebWithDOM = typeof window !== 'undefined' && 
                     typeof window.dispatchEvent === 'function' && 
                     typeof window.addEventListener === 'function';

// Polyfill for CustomEvent in React Native (for web compatibility)
if (typeof window !== 'undefined' && !window.CustomEvent) {
  try {
    // @ts-ignore
    window.CustomEvent = function CustomEvent(event: string, params?: any) {
      const evt = new Event(event, params);
      // @ts-ignore
      evt.detail = params?.detail;
      return evt;
    };
  } catch (e) {
    // Event constructor might not be available in React Native
  }
}

/**
 * Safely dispatch a custom event with cross-platform support
 * @param eventName Name of the event
 * @param detail Optional event detail/payload
 */
export function dispatchCustomEvent(eventName: string, detail?: any): void {
  if (typeof window === 'undefined') {
    // Server-side rendering - events are not applicable
    return;
  }

  // Try web DOM events first
  if (isWebWithDOM) {
    try {
      // Try to use CustomEvent if available
      if (typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
        return;
      } else {
        // Fallback: Use regular Event and attach detail manually
        const event = new Event(eventName);
        // @ts-ignore
        event.detail = detail;
        window.dispatchEvent(event);
        return;
      }
    } catch (error) {
      console.error(`❌ Error dispatching "${eventName}" event via DOM:`, error);
      // Fall through to EventEmitter fallback
    }
  }

  // Fallback to EventEmitter for React Native or when DOM events fail
  eventEmitter.emit(eventName, detail);
}

/**
 * Add event listener with cross-platform support
 * @param eventName Name of the event
 * @param handler Event handler function
 * @returns Cleanup function to remove the listener
 */
export function addCustomEventListener(
  eventName: string,
  handler: (event: Event | any) => void
): () => void {
  if (typeof window === 'undefined') {
    // Server-side rendering - listeners are not applicable
    return () => {};
  }

  // Try web DOM events first
  if (isWebWithDOM) {
    try {
      window.addEventListener(eventName, handler as EventListener);
      // Return cleanup function
      return () => {
        if (window.removeEventListener) {
          window.removeEventListener(eventName, handler as EventListener);
        }
      };
    } catch (error) {
      console.error(`❌ Error adding DOM listener for "${eventName}":`, error);
      // Fall through to EventEmitter fallback
    }
  }

  // Fallback to EventEmitter for React Native or when DOM events fail
  eventEmitter.on(eventName, handler);
  return () => {
    eventEmitter.off(eventName, handler);
  };
}

