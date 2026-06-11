// Tests for the pure PWA-lite platform classifier (detectPlatform.js).
//
// This is the device-free proof of the install flow: we cannot run an iPhone in
// CI, so the classification logic lives in a pure function that we drive with
// SYNTHETIC navigator objects. The two load-bearing invariants under test:
//   • LBR-A non-regression: a real Android Chrome UA -> platform 'android',
//     isIOS false (so it keeps the native beforeinstallprompt branch and is
//     NEVER stolen by the iOS branch).
//   • iOS cases (iPhone, iPadOS-as-Mac, in-app webviews, standalone) route to
//     the correct flags so the right guidance surface is shown.
//
// Co-located at src/app/components/compatibility/components/ux/ — discovered by
// vitest's include glob 'src/**/*.test.{js,jsx,mjs}'. No React, no DOM: the
// module is pure, so a plain object is enough.

import { describe, it, expect } from 'vitest';
import detectPlatform from './detectPlatform.js';

// Realistic-ish UA strings (trimmed) for each platform under test.
const UA = {
  androidChrome:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  ipadAsMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  desktopMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  iosInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0 (iPhone; iOS 17_4)',
  iphoneBare:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
  desktopChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

describe('detectPlatform — the 8 required classification rows', () => {
  it('Android Chrome -> android, isIOS false, isInAppBrowser false (LBR-A)', () => {
    const r = detectPlatform({
      userAgent: UA.androidChrome,
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
    });
    expect(r.platform).toBe('android');
    expect(r.isIOS).toBe(false);
    expect(r.isInAppBrowser).toBe(false);
  });

  it('iPhone Safari -> ios, isIOS true', () => {
    const r = detectPlatform({
      userAgent: UA.iphoneSafari,
      platform: 'iPhone',
      maxTouchPoints: 5,
    });
    expect(r.platform).toBe('ios');
    expect(r.isIOS).toBe(true);
  });

  it('iPadOS-as-Mac (D2) -> ios, isIOS true', () => {
    const r = detectPlatform({
      userAgent: UA.ipadAsMac,
      platform: 'MacIntel',
      maxTouchPoints: 5,
    });
    expect(r.platform).toBe('ios');
    expect(r.isIOS).toBe(true);
  });

  it('real desktop Mac -> desktop, isIOS false', () => {
    const r = detectPlatform({
      userAgent: UA.desktopMac,
      platform: 'MacIntel',
      maxTouchPoints: 0,
    });
    expect(r.platform).toBe('desktop');
    expect(r.isIOS).toBe(false);
  });

  it('iOS Instagram in-app (D3) -> isIOS true, isInAppBrowser true', () => {
    const r = detectPlatform({
      userAgent: UA.iosInstagram,
      platform: 'iPhone',
      maxTouchPoints: 5,
    });
    expect(r.isIOS).toBe(true);
    expect(r.isInAppBrowser).toBe(true);
  });

  it('iOS standalone (D4) -> isIOS true, isStandalone true', () => {
    const r = detectPlatform({
      userAgent: UA.iphoneBare,
      platform: 'iPhone',
      maxTouchPoints: 5,
      standalone: true,
    });
    expect(r.isIOS).toBe(true);
    expect(r.isStandalone).toBe(true);
  });

  it('desktop Chrome -> desktop, isIOS false', () => {
    const r = detectPlatform({
      userAgent: UA.desktopChrome,
      platform: 'Win32',
      maxTouchPoints: 0,
    });
    expect(r.platform).toBe('desktop');
    expect(r.isIOS).toBe(false);
  });

  it('empty/partial/undefined nav -> desktop, all flags false, no throw', () => {
    for (const nav of [undefined, null, {}, { userAgent: '' }]) {
      const r = detectPlatform(nav);
      expect(r.platform).toBe('desktop');
      expect(r.isIOS).toBe(false);
      expect(r.isStandalone).toBe(false);
      expect(r.isInAppBrowser).toBe(false);
    }
  });
});

describe('detectPlatform — documented precedence edge cases', () => {
  it('Android in-app webview (Instagram on Android) stays android, never iOS (LBR-A)', () => {
    const r = detectPlatform({
      userAgent:
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Instagram 300.0.0.0 Android',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
    });
    expect(r.platform).toBe('android');
    expect(r.isIOS).toBe(false);
    // in-app is only meaningful for the iOS flow; Android keeps native prompt.
    expect(r.isInAppBrowser).toBe(false);
  });

  it('Chrome on iOS (CriOS) classifies as iOS, not desktop', () => {
    const r = detectPlatform({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
    });
    expect(r.platform).toBe('ios');
    expect(r.isIOS).toBe(true);
  });

  it('iOS WhatsApp in-app -> isInAppBrowser true', () => {
    const r = detectPlatform({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 WhatsApp/2.24',
      platform: 'iPhone',
      maxTouchPoints: 5,
    });
    expect(r.isIOS).toBe(true);
    expect(r.isInAppBrowser).toBe(true);
  });

  it('a desktop Mac that reports maxTouchPoints 1 (trackpad) stays desktop', () => {
    const r = detectPlatform({
      userAgent: UA.desktopMac,
      platform: 'MacIntel',
      maxTouchPoints: 1,
    });
    expect(r.platform).toBe('desktop');
    expect(r.isIOS).toBe(false);
  });
});
