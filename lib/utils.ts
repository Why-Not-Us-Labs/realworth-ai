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
  // Check for Capacitor JS bridge (works when loading local content)
  if ((window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) {
    return true;
  }
  // Check for native Google Sign-In bridge injected by GoogleSignInViewController
  if ((window as { nativeGoogleSignIn?: boolean }).nativeGoogleSignIn) {
    return true;
  }
  // When loading remote URL in Capacitor WebView, detect via user agent
  // iOS WKWebView in a native app doesn't include "Safari" in the UA
  const ua = navigator.userAgent;
  const isIosWebView = /iPhone|iPad|iPod/.test(ua) && /AppleWebKit/.test(ua) && !/Safari/.test(ua);
  return isIosWebView;
}
