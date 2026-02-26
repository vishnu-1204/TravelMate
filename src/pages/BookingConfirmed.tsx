import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  MapPin,
  CalendarDays,
  Users,
  CreditCard,
  Download,
  ArrowRight,
  Plane,
  Clock,
  Mail,
  Copy,
  CheckCheck,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';

interface BookingData {
  bookingRef: string;
  packageTitle: string;
  destination: string;
  duration: string;
  travelDate: string;
  travelers: number;
  totalAmount: number;
  email: string;
  travelerName: string;
  roomType: string;
  airline: string;
  departureTime: string;
}

const confettiColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function ConfettiPiece({ index }: { index: number }) {
  const color = confettiColors[index % confettiColors.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 2;
  const duration = 2.5 + Math.random() * 2;
  const size = 6 + Math.random() * 6;
  const rotation = Math.random() * 360;

  return (
    <motion.div
      initial={{ y: -20, opacity: 1, rotate: 0 }}
      animate={{ y: '100vh', opacity: 0, rotate: rotation + 360 }}
      transition={{ duration, delay, ease: 'easeIn' }}
      style={{
        position: 'fixed',
        left: `${left}%`,
        top: -20,
        width: size,
        height: size * 0.6,
        backgroundColor: color,
        borderRadius: 2,
        zIndex: 50,
        pointerEvents: 'none',
      }}
    />
  );
}

export default function BookingConfirmed() {
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const booking: BookingData | null = location.state?.booking ?? null;

  useEffect(() => {
    if (!booking) navigate('/', { replace: true });
  }, [booking, navigate]);

  if (!booking) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(booking.bookingRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (d: string) => {
    const parsed = new Date(d);
    if (!Number.isFinite(parsed.getTime())) return d;
    return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Layout>
      <PageTransition>
        {/* Confetti burst */}
        {Array.from({ length: 40 }).map((_, i) => (
          <ConfettiPiece key={i} index={i} />
        ))}

        <div className="min-h-screen bg-gradient-to-b from-blue-50 via-background to-background py-8 md:py-14">
          <div className="max-w-2xl mx-auto px-4">
            {/* Success hero */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 ring-4 ring-emerald-200/50 mb-5">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Booking Confirmed!
              </h1>
              <p className="text-muted-foreground">
                Your trip is booked. A confirmation has been sent to{' '}
                <span className="font-medium text-foreground">{booking.email}</span>
              </p>
            </motion.div>

            {/* Reference badge */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mx-auto w-fit mb-8"
            >
              <button
                onClick={handleCopy}
                className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
              >
                <span className="text-xs uppercase tracking-wider opacity-80">Reference</span>
                <span className="font-mono text-lg font-bold tracking-wide">
                  {booking.bookingRef}
                </span>
                {copied ? (
                  <CheckCheck className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Copy className="w-4 h-4 opacity-70" />
                )}
              </button>
            </motion.div>

            {/* Booking details card */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="bg-card rounded-2xl shadow-card border border-border overflow-hidden"
            >
              {/* Package header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
                <h2 className="text-xl font-bold">{booking.packageTitle}</h2>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-blue-100 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> {booking.destination}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> {booking.duration}
                  </span>
                </div>
              </div>

              {/* Details grid */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <DetailItem
                  icon={<CalendarDays className="w-5 h-5 text-blue-500" />}
                  label="Travel Date"
                  value={formatDate(booking.travelDate)}
                />
                <DetailItem
                  icon={<Users className="w-5 h-5 text-violet-500" />}
                  label="Travelers"
                  value={`${booking.travelers} ${booking.travelers > 1 ? 'passengers' : 'passenger'}`}
                />
                <DetailItem
                  icon={<Plane className="w-5 h-5 text-emerald-500" />}
                  label="Flight"
                  value={`${booking.airline} · ${booking.departureTime}`}
                />
                <DetailItem
                  icon={<CreditCard className="w-5 h-5 text-amber-500" />}
                  label="Room Type"
                  value={booking.roomType}
                />
                <DetailItem
                  icon={<Users className="w-5 h-5 text-pink-500" />}
                  label="Lead Traveler"
                  value={booking.travelerName}
                />
                <DetailItem
                  icon={<Mail className="w-5 h-5 text-cyan-500" />}
                  label="Contact Email"
                  value={booking.email}
                />
              </div>

              {/* Total */}
              <div className="mx-6 mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-emerald-600 font-semibold">
                    Total Paid
                  </p>
                  <p className="text-2xl font-bold text-emerald-700">
                    ₹{booking.totalAmount.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 text-sm font-medium px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="w-4 h-4" />
                  Payment Successful
                </div>
              </div>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex flex-col sm:flex-row gap-3"
            >
              <Link
                to="/my-bookings"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-md hover:opacity-90 transition"
              >
                View My Bookings
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/packages"
                className="flex-1 inline-flex items-center justify-center gap-2 border border-border bg-card text-foreground px-6 py-3 rounded-xl font-semibold shadow-sm hover:bg-muted transition"
              >
                Explore More Packages
              </Link>
            </motion.div>

            {/* Footer note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-center text-xs text-muted-foreground mt-8"
            >
              Questions? Contact us at{' '}
              <a href="mailto:mail@travelmate.in" className="text-primary hover:underline">
                mail@travelmate.in
              </a>{' '}
              or call{' '}
              <a href="tel:+919342180670" className="text-primary hover:underline">
                +91 9342180670
              </a>
            </motion.p>
          </div>
        </div>
      </PageTransition>
    </Layout>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}
