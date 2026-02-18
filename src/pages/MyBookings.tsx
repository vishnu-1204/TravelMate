import { type ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Receipt, Loader2, MapPin } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getPackages } from '@/lib/packagesApi';

type BookingRow = {
  id: string;
  booking_reference: string | null;
  package_id: string;
  package_title: string;
  travelers: number;
  total_amount: number;
  payment_status: string;
  payment_verified: boolean;
  created_at: string;
};

const MyBookings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [packageImageById, setPackageImageById] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user?.id) return;

    const loadBookings = async () => {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(
          'id, booking_reference, package_id, package_title, travelers, total_amount, payment_status, payment_verified, created_at'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message || 'Failed to load bookings.');
        setLoading(false);
        return;
      }

      setBookings((data || []) as BookingRow[]);
      setLoading(false);
    };

    void loadBookings();
  }, [user?.id]);

  useEffect(() => {
    let active = true;

    const loadPackages = async () => {
      const packages = await getPackages();
      if (!active) return;

      const map = new Map<string, string>();
      packages.forEach((pkg) => map.set(pkg.id, pkg.image));
      setPackageImageById(map);
    };

    void loadPackages();

    return () => {
      active = false;
    };
  }, []);

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
                  <p className="text-muted-foreground mt-2">
                    View all your confirmed travel bookings.
                  </p>
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
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive">
                {error}
              </div>
            ) : bookings.length === 0 ? (
              <div className="bg-card rounded-xl p-8 shadow-card text-center">
                <p className="text-muted-foreground mb-4">No bookings yet.</p>
                <Link to="/packages/indian" className="btn-primary">
                  Explore Packages
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="bg-card rounded-xl shadow-card overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-4">
                      <div className="md:col-span-1">
                        <img
                          src={
                            packageImageById.get(booking.package_id) ||
                            'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800'
                          }
                          alt={booking.package_title}
                          className="w-full h-44 md:h-full object-cover"
                        />
                      </div>
                      <div className="md:col-span-3 p-5">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                          <h2 className="text-lg font-semibold text-foreground">{booking.package_title}</h2>
                          <span
                            className={`text-xs px-3 py-1 rounded-full w-fit ${
                              booking.payment_verified
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-amber-500/10 text-amber-600'
                            }`}
                          >
                            {booking.payment_verified ? 'Confirmed' : booking.payment_status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                          <InfoItem
                            icon={<Receipt className="h-4 w-4" />}
                            label="Reference"
                            value={booking.booking_reference || booking.id.slice(0, 8).toUpperCase()}
                          />
                          <InfoItem
                            icon={<Users className="h-4 w-4" />}
                            label="Travelers"
                            value={`${booking.travelers}`}
                          />
                          <InfoItem
                            icon={<Calendar className="h-4 w-4" />}
                            label="Booked On"
                            value={new Date(booking.created_at).toLocaleDateString()}
                          />
                          <InfoItem
                            icon={<MapPin className="h-4 w-4" />}
                            label="Total"
                            value={`₹${Number(booking.total_amount).toLocaleString()}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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

export default MyBookings;
