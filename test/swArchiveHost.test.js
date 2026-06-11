// Locks in the archive/mirror host classifier used by swRegister.registerOnce()
// to decide whether to SKIP service-worker registration (and tear down any
// pre-existing SW). The site must render cleanly inside the Wayback Machine
// and other mirrors, where registering '/sw.js' against the archive origin
// throws and a returning visitor's live SW can serve a stale shell over the
// snapshot. The production domain and dev hosts must NOT be treated as mirrors.

import { describe, it, expect } from 'vitest';
import { isArchiveHostname } from '../src/app/components/compatibility/components/ux/swRegister.js';

describe('isArchiveHostname', () => {
  it('treats Wayback Machine hosts as archives', () => {
    expect(isArchiveHostname('web.archive.org')).toBe(true);
    expect(isArchiveHostname('archive.org')).toBe(true);
  });

  it('treats archive.today and its mirrors as archives', () => {
    for (const h of ['archive.today', 'archive.ph', 'archive.is', 'archive.li', 'archive.md', 'archive.vn', 'archive.fo']) {
      expect(isArchiveHostname(h)).toBe(true);
    }
  });

  it('treats google cache + memento gateway as archives', () => {
    expect(isArchiveHostname('webcache.googleusercontent.com')).toBe(true);
    expect(isArchiveHostname('timetravel.mementoweb.org')).toBe(true);
  });

  it('does NOT treat the production domain as an archive', () => {
    expect(isArchiveHostname('mapafome.com.br')).toBe(false);
    expect(isArchiveHostname('www.mapafome.com.br')).toBe(false);
  });

  it('does NOT treat local/dev hosts as archives', () => {
    expect(isArchiveHostname('localhost')).toBe(false);
    expect(isArchiveHostname('127.0.0.1')).toBe(false);
    expect(isArchiveHostname('dashing-swift-precious.ngrok-free.app')).toBe(false);
  });

  it('does NOT match a look-alike that merely contains the substring', () => {
    // suffix-anchored: a domain that only *ends with a different label* must not match
    expect(isArchiveHostname('notarchive.org.evil.com')).toBe(false);
    expect(isArchiveHostname('web.archive.org.evil.com')).toBe(false);
    expect(isArchiveHostname('myarchive.org')).toBe(false);
  });

  it('handles empty / falsy host', () => {
    expect(isArchiveHostname('')).toBe(false);
    expect(isArchiveHostname(undefined)).toBe(false);
    expect(isArchiveHostname(null)).toBe(false);
  });
});
