export type BookingSnapshotLike = {
  snapshot?: {
    images?: { imageUrl?: string; imageAlt?: string };
    destination?: string;
    cancellationPolicy?: string;
  };
  locked_hotel?: string | null;
  locked_transport?: string | null;
};

export const LOCKED_NOTICE = 'This package is locked after booking.';

export const normalizeBookingSnapshot = (
  item: BookingSnapshotLike | undefined,
  fallbackTitle: string
) => {
  const imageUrl =
    item?.snapshot?.images?.imageUrl ||
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800';
  const imageAlt = item?.snapshot?.images?.imageAlt || fallbackTitle;
  const destination = item?.snapshot?.destination || 'As booked';
  const cancellationPolicy = item?.snapshot?.cancellationPolicy || 'As per booking terms';
  const hotel = item?.locked_hotel || 'As booked';
  const transport = item?.locked_transport || 'As booked';

  return {
    imageUrl,
    imageAlt,
    destination,
    cancellationPolicy,
    hotel,
    transport,
  };
};

export const isLockedBooking = (isLocked: boolean | null | undefined) => Boolean(isLocked);
