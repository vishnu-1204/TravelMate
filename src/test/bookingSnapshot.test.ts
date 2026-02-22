import { describe, expect, it } from 'vitest';
import { LOCKED_NOTICE, isLockedBooking, normalizeBookingSnapshot } from '@/lib/bookingSnapshot';

describe('booking snapshot helpers', () => {
  it('normalizes snapshot values with fallback', () => {
    const normalized = normalizeBookingSnapshot(undefined, 'My Package');
    expect(normalized.imageAlt).toBe('My Package');
    expect(normalized.destination).toBe('As booked');
    expect(normalized.hotel).toBe('As booked');
    expect(normalized.transport).toBe('As booked');
  });

  it('uses snapshot-provided values when present', () => {
    const normalized = normalizeBookingSnapshot(
      {
        snapshot: {
          images: { imageUrl: 'https://img.test/p.jpg', imageAlt: 'Paris view' },
          destination: 'Paris, France',
          cancellationPolicy: 'Non-refundable',
        },
        locked_hotel: 'comfort',
        locked_transport: 'flight',
      },
      'Package'
    );

    expect(normalized.imageUrl).toContain('https://img.test/p.jpg');
    expect(normalized.imageAlt).toBe('Paris view');
    expect(normalized.destination).toBe('Paris, France');
    expect(normalized.cancellationPolicy).toBe('Non-refundable');
    expect(normalized.hotel).toBe('comfort');
    expect(normalized.transport).toBe('flight');
  });

  it('recognizes locked booking state', () => {
    expect(isLockedBooking(true)).toBe(true);
    expect(isLockedBooking(false)).toBe(false);
    expect(LOCKED_NOTICE).toContain('locked');
  });
});
