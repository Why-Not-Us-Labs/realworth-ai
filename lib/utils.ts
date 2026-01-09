import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Detect if running inside a Capacitor native app
 * Returns true when the app is wrapped in iOS/Android shell
 */
export function isCapacitorApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
}
