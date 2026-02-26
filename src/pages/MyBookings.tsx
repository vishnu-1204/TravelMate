import { type ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Receipt, Loader2, MapPin } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { LOCKED_NOTICE, isLockedBooking, normalizeBookingSnapshot } from '@/lib/bookingSnapshot';
import { getPackageById, getPackages } from '@/lib/packagesApi';

type BookingSnapshot = {
  snapshot: {
    images?: { imageUrl?: string; imageAlt?: string };
    destination?: string;
    cancellationPolicy?: string;
  };
  locked_transport: string | null;
  locked_hotel: string | null;
};

type BookingTerms = {
  airline?: string;
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
};

type BookingRow = {
  id: string;
  booking_reference: string | null;
  package_id: string;
  package_title: string;
  travelers: number;
  total_amount: number;
  payment_status: string;
  payment_verified: boolean;
  is_locked: boolean;
  locked_price_per_person: number | null;
  booking_snapshots: BookingSnapshot[] | null;
  booking_terms: BookingTerms | null;
  created_at: string;
};

const GENERIC_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800';
const TITLE_IMAGE_MATCHERS: Array<{ keywords: string[]; imageUrl: string }> = [
  {
    keywords: ['goa'],
    imageUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1400&q=80',
  },
  {
    keywords: ['new zealand', 'queenstown', 'auckland'],
    imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80',
  },
  {
    keywords: ['paris', 'france'],
    imageUrl: 'https://images.unsplash.com/photo-1431274172761-fca41d930114?auto=format&fit=crop&w=1400&q=80',
  },
  {
    keywords: ['dubai', 'uae'],
    imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=80',
  },
  {
    keywords: ['bali', 'indonesia'],
    imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=80',
  },
  {
    keywords: ['kashmir', 'srinagar'],
    imageUrl: 'https://images.unsplash.com/photo-1595815771614-ade501f4b7d8?auto=format&fit=crop&w=1400&q=80',
  },
  {
    keywords: ['kerala', 'alleppey', 'munnar'],
    imageUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1400&q=80',
  },
  {
    keywords: ['swiss', 'switzerland', 'interlaken'],
    imageUrl: 'https://images.unsplash.com/photo-1521292270410-a8c4d716d518?auto=format&fit=crop&w=1400&q=80',
  },
];

const getSeedFromValue = (value: string) => {
  return Math.abs(
    value.split('').reduce((acc, ch, index) => {
      return acc + ch.charCodeAt(0) * (index + 1);
    }, 0)
  );
};

const buildBookingFallbackImage = (title: string, bookingId: string) => {
  const normalizedTitle = title.toLowerCase();
  const matched = TITLE_IMAGE_MATCHERS.find((entry) =>
    entry.keywords.some((keyword) => normalizedTitle.includes(keyword))
  );
  if (matched) return matched.imageUrl;

  const seed = getSeedFromValue(`${title}-${bookingId}`);
  return `https://picsum.photos/seed/${encodeURIComponent(`booking-${seed}`)}/1200/700`;
};

const MyBookings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [bookingImageById, setBookingImageById] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user?.id) return;

    const loadBookings = async () => {
      setLoading(true);
      setError('');

      try {
        // 1. Fetch from Supabase
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('bookings')
          .select(
            'id, booking_reference, package_id, package_title, travelers, total_amount, payment_status, payment_verified, is_locked, locked_price_per_person, booking_terms, created_at, booking_snapshots(snapshot, locked_transport, locked_hotel)'
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        let supabaseBookings: BookingRow[] = [];
        if (!supabaseError && supabaseData) {
          supabaseBookings = (supabaseData as unknown) as BookingRow[];
        }

        // 2. Fetch from Backend (SQLite)
        const backendBaseUrl =
          import.meta.env.VITE_AUTH_BACKEND_URL ||
          import.meta.env.VITE_BACKEND_URL ||
          'http://localhost:3000';
        
        let localBookings: BookingRow[] = [];
        try {
          const response = await fetch(`${backendBaseUrl}/api/booking/user-bookings?userId=${user.id}`);
          if (response.ok) {
            const result = await response.json();
            localBookings = result.bookings || [];
          }
        } catch (fetchErr) {
          console.warn('Failed to fetch local bookings:', fetchErr);
        }

        // 3. Merge and Sort
        const merged = [...localBookings, ...supabaseBookings].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setBookings(merged);
      } catch (err: any) {
        setError(err.message || 'Failed to load bookings.');
      } finally {
        setLoading(false);
      }
    };

    void loadBookings();
  }, [user?.id]);

  useEffect(() => {
    let active = true;

    const hydratePackageImages = async () => {
      if (!bookings.length) {
        setBookingImageById(new Map());
        return;
      }

      const pairs = await Promise.all(
        bookings.map(async (booking) => {
          const pkg = await getPackageById(booking.package_id);
          if (pkg?.imageUrl || pkg?.image) {
            return [booking.id, pkg?.imageUrl || pkg?.image || ''] as const;
          }

          const byTitle = await getPackages({
            search: booking.package_title,
            limit: 1,
            sortBy: 'trending',
            sortOrder: 'desc',
          });
          return [booking.id, byTitle[0]?.imageUrl || byTitle[0]?.image || ''] as const;
        })
      );

      if (!active) return;
      const map = new Map<string, string>();
      pairs.forEach(([id, url]) => {
        if (url) map.set(id, url);
      });
      setBookingImageById(map);
    };

    void hydratePackageImages();

    return () => {
      active = false;
    };
  }, [bookings]);

  const clearMyBookings = async () => {
    if (!user?.id) return;
    const confirmed = window.confirm('Delete all your bookings? This cannot be undone.');
    if (!confirmed) return;

    setClearing(true);
    const { error: deleteError } = await supabase.from('bookings').delete().eq('user_id', user.id);

    if (deleteError) {
      setError(deleteError.message || 'Failed to clear bookings.');
      setClearing(false);
      return;
    }

    setBookings([]);
    setClearing(false);
    toast.success('All bookings cleared.');
  };

  return (
    <Layout>
      <PageTransition>
        <section className="min-h-screen bg-background py-10">
          <div className="page-container">
            <div className="mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">My Bookings</h1>
                  <p className="text-muted-foreground mt-2">View all your confirmed travel bookings.</p>
                </div>
                <button
                  type="button"
                  onClick={clearMyBookings}
                  disabled={clearing || loading || bookings.length === 0}
                  className="btn-outline disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {clearing ? 'Clearing...' : 'Clear My Bookings'}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="bg-card rounded-xl p-8 shadow-card flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading bookings...
              </div>
            ) : error ? (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive">{error}</div>
            ) : bookings.length === 0 ? (
              <div className="bg-card rounded-xl p-8 shadow-card text-center">
                <p className="text-muted-foreground mb-4">No bookings yet.</p>
                <Link to="/packages/domestic" className="btn-primary">
                  Explore Packages
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const snapshot = booking.booking_snapshots?.[0];
                  const normalized = normalizeBookingSnapshot(snapshot, booking.package_title);
                  const packageImage = bookingImageById.get(booking.id);
                  const generatedFallback = buildBookingFallbackImage(booking.package_title, booking.id);
                  const resolvedImageUrl =
                    normalized.imageUrl.includes('unsplash.com/photo-1488646953014-85cb44e25828')
                      ? packageImage || generatedFallback
                      : normalized.imageUrl;
                  const resolvedDestination =
                    normalized.destination === 'As booked' ? booking.package_title : normalized.destination;

                  return (
                    <div key={booking.id} className="bg-card rounded-xl shadow-card overflow-hidden">
                      <div className="grid grid-cols-1 md:grid-cols-4">
                        <div className="md:col-span-1">
                          <img
                            src={resolvedImageUrl}
                            alt={normalized.imageAlt}
                            onError={(event) => {
                              event.currentTarget.src = packageImage || GENERIC_FALLBACK_IMAGE;
                            }}
                            className="w-full h-44 md:h-full object-cover"
                          />
                        </div>
                        <div className="md:col-span-3 p-5">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                            <h2 className="text-lg font-semibold text-foreground">{booking.package_title}</h2>
                            <span
                              className={`text-xs px-3 py-1 rounded-full w-fit ${
                                booking.payment_verified ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                              }`}
                            >
                              {booking.payment_verified ? 'Confirmed' : booking.payment_status}
                            </span>
                          </div>

                          {isLockedBooking(booking.is_locked) ? (
                            <p className="text-xs rounded-md bg-blue-50 text-blue-700 px-3 py-2 mb-4">
                              {LOCKED_NOTICE}
                            </p>
                          ) : null}

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                            <InfoItem
                              icon={<Receipt className="h-4 w-4" />}
                              label="Reference"
                              value={booking.booking_reference || booking.id.slice(0, 8).toUpperCase()}
                            />
                            <InfoItem icon={<Users className="h-4 w-4" />} label="Travelers" value={`${booking.travelers}`} />
                            <InfoItem
                              icon={<Calendar className="h-4 w-4" />}
                              label="Booked On"
                              value={new Date(booking.created_at).toLocaleDateString()}
                            />
                            <InfoItem
                              icon={<MapPin className="h-4 w-4" />}
                              label="Total"
                              value={`₹${Number(booking.total_amount).toLocaleString('en-IN')}`}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mt-3">
                            <InfoItem icon={<MapPin className="h-4 w-4" />} label="Destination" value={resolvedDestination} />
                            <InfoItem icon={<Users className="h-4 w-4" />} label="Hotel" value={normalized.hotel} />
                            <InfoItem icon={<Receipt className="h-4 w-4" />} label="Transport" value={normalized.transport} />
                          </div>

                          {booking.booking_terms?.airline && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm mt-3 border-t border-border pt-3">
                              <InfoItem 
                                icon={<Receipt className="h-4 w-4" />} 
                                label="Airline" 
                                value={booking.booking_terms.airline} 
                              />
                              <InfoItem 
                                icon={<Calendar className="h-4 w-4" />} 
                                label="Flight Times" 
                                value={`${booking.booking_terms.departureTime} - ${booking.booking_terms.arrivalTime}`} 
                              />
                              <InfoItem 
                                icon={<Calendar className="h-4 w-4" />} 
                                label="Duration" 
                                value={booking.booking_terms.duration || '-'} 
                              />
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            <DownloadButton 
                              bookingReference={booking.booking_reference || booking.id.slice(0, 8).toUpperCase()} 
                              userId={user?.id}
                            />
                          </div>

                          <p className="text-xs text-muted-foreground mt-3">
                            Cancellation policy at booking time: {normalized.cancellationPolicy}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

const InfoItem = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) => (
  <div className="border border-border rounded-lg p-3">
    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">{label}</p>
    <p className="text-foreground font-medium flex items-center gap-2">
      {icon}
      {value}
    </p>
  </div>
);

const DownloadButton = ({ bookingReference, userId }: { bookingReference: string; userId?: string }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const backendBaseUrl =
        import.meta.env.VITE_AUTH_BACKEND_URL ||
        import.meta.env.VITE_BACKEND_URL ||
        'http://localhost:3000';
      const url = `${backendBaseUrl}/api/booking/download-ticket/${bookingReference}${userId ? `?userId=${userId}` : ''}`;
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to download ticket');
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `TravelMate-Ticket-${bookingReference}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }
      toast.success('Ticket downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download ticket. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="btn-outline text-xs px-3 py-1 flex items-center gap-1 mt-3"
    >
      {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Receipt className="h-3 w-3" />}
      {downloading ? 'Downloading...' : 'Download Ticket'}
    </button>
  );
};

export default MyBookings;
