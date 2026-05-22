import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, MailCheck, MailX, Receipt } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';

import { BACKEND_URL } from '@/lib/apiConfig';

type AdminBooking = {
  booking_reference: string | null;
  email: string;
  total_amount: number;
  email_sent: boolean | null;
  created_at: string;
};

const AdminBookingMonitor = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<AdminBooking[]>([]);

  const backendBaseUrl = BACKEND_URL;
  const adminToken = import.meta.env.VITE_PACKAGE_ADMIN_TOKEN as string | undefined;
  const canAccess = useMemo(() => Boolean(adminToken), [adminToken]);

  useEffect(() => {
    if (!canAccess || !adminToken) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${backendBaseUrl}/api/booking/admin/recent-bookings?limit=100`, {
          headers: {
            'x-admin-token': adminToken,
          },
        });
        const result = (await response.json().catch(() => null)) as
          | { bookings?: AdminBooking[]; message?: string }
          | null;
        if (!response.ok) {
          throw new Error(result?.message || 'Failed to load recent bookings.');
        }
        setBookings(result?.bookings || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recent bookings.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [adminToken, backendBaseUrl, canAccess]);

  return (
    <Layout>
      <PageTransition>
        <section className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black py-10">
          <div className="page-container">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-white">Admin Booking Monitor</h1>
              <p className="mt-2 text-slate-300">Recent bookings with transactional email delivery status.</p>
            </div>

            {!canAccess ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
                Admin token missing. Set `VITE_PACKAGE_ADMIN_TOKEN` to access this page.
              </div>
            ) : loading ? (
              <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-8 text-slate-100 flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading recent bookings...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            ) : bookings.length === 0 ? (
              <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-8 text-slate-300">No recent bookings found.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-700/70 bg-slate-900/70 shadow-2xl shadow-black/30">
                <table className="min-w-full text-sm text-slate-200">
                  <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-300">
                    <tr>
                      <th className="px-4 py-3 text-left">Reference ID</th>
                      <th className="px-4 py-3 text-left">User Email</th>
                      <th className="px-4 py-3 text-left">Total Price</th>
                      <th className="px-4 py-3 text-left">Email Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking, index) => (
                      <tr
                        key={`${booking.booking_reference || booking.email}-${index}`}
                        className="border-t border-slate-800/80 hover:bg-slate-800/60 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-cyan-300">
                          {booking.booking_reference || `REF-${index + 1}`}
                        </td>
                        <td className="px-4 py-3">{booking.email}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-300">
                          ₹{Number(booking.total_amount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          {booking.email_sent ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-emerald-300">
                              <MailCheck className="h-3.5 w-3.5" />
                              Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-amber-200">
                              <MailX className="h-3.5 w-3.5" />
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-slate-700/70 bg-slate-900/50 p-3 text-xs text-slate-400 flex items-center gap-2">
              <Receipt className="h-3.5 w-3.5" />
              Data source: `GET /api/booking/admin/recent-bookings`
            </div>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default AdminBookingMonitor;
