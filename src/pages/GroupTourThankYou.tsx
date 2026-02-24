import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import { useAuth } from '@/hooks/useAuth';

const WHATSAPP_NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined)?.trim() || '919342180670';
const GROUP_TOUR_EMAIL_SENT_CACHE_KEY = 'travelmate_group_tour_email_sent_v1';

const GroupTourThankYou = () => {
  const { user } = useAuth();
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'failed' | 'missing_user'>('idle');
  const backendBaseUrl =
    import.meta.env.VITE_AUTH_BACKEND_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    'http://localhost:3000';
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    'Hi, I submitted my group tour booking request. Please help me with the next steps.'
  )}`;
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const bookingReference = query.get('ref') || `GT-${Date.now().toString().slice(-8)}`;
  const tourName = query.get('tour') || 'Group Tour Package';
  const destination = query.get('destination') || '-';
  const travelDate = query.get('travelDate') || new Date().toISOString().slice(0, 10);
  const price = Number(query.get('price') || 0);

  useEffect(() => {
    const sendEmail = async () => {
      if (!user?.email) {
        setEmailStatus('missing_user');
        return;
      }

      const dedupeKey = `${GROUP_TOUR_EMAIL_SENT_CACHE_KEY}:${user.email}:${bookingReference}:${travelDate}`;
      if (sessionStorage.getItem(dedupeKey) === '1') {
        setEmailStatus('sent');
        return;
      }

      setEmailStatus('sending');
      try {
        const response = await fetch(`${backendBaseUrl}/api/booking/confirmation-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            fullName:
              String((user.user_metadata as Record<string, unknown> | undefined)?.full_name || '').trim() || 'Traveler',
            bookingReference,
            packageTitle: `${tourName} (Group Tour Request)`,
            destination,
            travelDate,
            passengers: 1,
            totalAmount: Number.isFinite(price) && price > 0 ? price : 1,
          }),
        });

        if (!response.ok) throw new Error('Email API failed');
        sessionStorage.setItem(dedupeKey, '1');
        setEmailStatus('sent');
      } catch {
        setEmailStatus('failed');
      }
    };

    void sendEmail();
  }, [backendBaseUrl, bookingReference, destination, price, tourName, travelDate, user]);

  return (
    <Layout>
      <PageTransition>
        <section className="py-20 bg-background">
          <div className="page-container max-w-2xl">
            <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 shadow-card text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">Booking Request</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Thank You</h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                Your request is received. Our team will contact you within 24 hours.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {emailStatus === 'sending' ? 'Sending booking confirmation to your login email...' : null}
                {emailStatus === 'sent' && user?.email ? `Booking confirmation sent to ${user.email}.` : null}
                {emailStatus === 'missing_user'
                  ? 'Log in to receive booking confirmation on your email automatically.'
                  : null}
                {emailStatus === 'failed'
                  ? 'We could not send email now. Your request is still saved, and our team will contact you.'
                  : null}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary inline-flex items-center justify-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Contact on WhatsApp
                </a>
                <Link to="/packages/group" className="btn-outline inline-flex items-center justify-center">
                  Back to Group Tours
                </Link>
              </div>
            </div>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default GroupTourThankYou;
