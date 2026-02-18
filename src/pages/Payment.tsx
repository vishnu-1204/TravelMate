import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { User, Calendar, Lock, ArrowLeft, Check, Loader2, Plus, Trash2, CreditCard } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { getPackageById, type TravelPackage } from '@/lib/packagesApi';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (response: Record<string, unknown>) => void) => void;
    };
  }
}

type Gender = 'Male' | 'Female' | 'Other';
type RoomType = 'Single' | 'Double' | 'Family';

type Traveler = {
  id: string;
  fullName: string;
  age: string;
  gender: Gender;
  mobile: string;
  email: string;
  aadhaar: string;
  passport: string;
};

type ExtraServices = {
  meals: boolean;
  airportPickup: boolean;
  travelInsurance: boolean;
};

type BookingDraft = {
  travelers: Traveler[];
  travelDate: string;
  roomType: RoomType;
  extras: ExtraServices;
};

const ROOM_SURCHARGE_PER_PERSON: Record<RoomType, number> = {
  Single: 1200,
  Double: 600,
  Family: 300,
};

const EXTRA_PRICING = {
  mealsPerPerson: 400,
  insurancePerPerson: 350,
  airportPickupFlat: 1200,
};
const isTestingMode = import.meta.env.DEV;

const createTraveler = (index: number, defaultEmail = ''): Traveler => ({
  id: `${Date.now()}-${index}`,
  fullName: '',
  age: '',
  gender: 'Male',
  mobile: '',
  email: defaultEmail,
  aadhaar: '',
  passport: '',
});

const Payment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [packageData, setPackageData] = useState<TravelPackage | null>(null);
  const [packageLoading, setPackageLoading] = useState(true);
  const backendBaseUrl = import.meta.env.VITE_AUTH_BACKEND_URL || 'http://localhost:3000';
  const storageKey = useMemo(() => `travelmate-booking-draft-${id || 'unknown'}`, [id]);

  const [travelers, setTravelers] = useState<Traveler[]>([createTraveler(1, user?.email || '')]);
  const [travelDate, setTravelDate] = useState('');
  const [roomType, setRoomType] = useState<RoomType>('Double');
  const [extras, setExtras] = useState<ExtraServices>({
    meals: false,
    airportPickup: false,
    travelInsurance: false,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;

    const loadPackage = async () => {
      if (!id) {
        setPackageData(null);
        setPackageLoading(false);
        return;
      }

      setPackageLoading(true);
      const pkg = await getPackageById(id);
      if (!active) return;

      setPackageData(pkg || null);
      setPackageLoading(false);
    };

    void loadPackage();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Partial<BookingDraft>;
      if (parsed.travelers?.length) {
        setTravelers(parsed.travelers);
      }
      if (parsed.travelDate) {
        setTravelDate(parsed.travelDate);
      }
      if (parsed.roomType) {
        setRoomType(parsed.roomType);
      }
      if (parsed.extras) {
        setExtras(parsed.extras);
      }
    } catch {
      // Ignore corrupted local drafts
    }
  }, [storageKey]);

  useEffect(() => {
    const draft: BookingDraft = { travelers, travelDate, roomType, extras };
    localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [extras, roomType, storageKey, travelDate, travelers]);

  if (packageLoading) {
    return (
      <Layout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center">
            <p className="text-muted-foreground">Loading package details...</p>
          </div>
        </PageTransition>
      </Layout>
    );
  }

  if (!packageData) {
    return (
      <Layout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-4">Package Not Found</h1>
              <Link to="/packages" className="btn-primary">
                View All Packages
              </Link>
            </div>
          </div>
        </PageTransition>
      </Layout>
    );
  }

  const totalPassengers = travelers.length;
  const basePrice = packageData.price * totalPassengers;
  const roomSurcharge = ROOM_SURCHARGE_PER_PERSON[roomType] * totalPassengers;
  const mealCost = extras.meals ? EXTRA_PRICING.mealsPerPerson * totalPassengers : 0;
  const insuranceCost = extras.travelInsurance ? EXTRA_PRICING.insurancePerPerson * totalPassengers : 0;
  const pickupCost = extras.airportPickup ? EXTRA_PRICING.airportPickupFlat : 0;
  const subtotal = basePrice + roomSurcharge + mealCost + insuranceCost + pickupCost;
  const taxes = Math.round(subtotal * 0.1);
  const grandTotal = subtotal + taxes;

  const downloadBookingItinerary = (bookingReference: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 18;

    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175);
    doc.text('TravelMate Booking Itinerary', pageWidth / 2, y, { align: 'center' });
    y += 12;

    doc.setFontSize(15);
    doc.text(packageData.title, pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(11);
    doc.setTextColor(70, 70, 70);
    doc.text(`${packageData.location} | ${packageData.duration}`, pageWidth / 2, y, {
      align: 'center',
    });
    y += 12;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Booking Ref: ${bookingReference}`, 16, y);
    y += 6;
    doc.text(`Travel Date: ${travelDate || '-'}`, 16, y);
    y += 6;
    doc.text(`Passengers: ${totalPassengers}`, 16, y);
    y += 6;
    doc.text(`Amount Paid: Rs ${grandTotal.toLocaleString()}`, 16, y);
    y += 10;

    if (packageData.itinerary?.days?.length) {
      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text('Day-by-Day Plan', 16, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      packageData.itinerary.days.forEach((day) => {
        if (y > 270) {
          doc.addPage();
          y = 18;
        }

        doc.setTextColor(30, 64, 175);
        doc.text(`Day ${day.day}: ${day.title}`, 16, y);
        y += 6;

        doc.setTextColor(60, 60, 60);
        day.activities.forEach((activity) => {
          if (y > 275) {
            doc.addPage();
            y = 18;
          }
          doc.text(`- ${activity}`, 20, y);
          y += 5;
        });
        y += 3;
      });
    }

    if (packageData.itinerary?.nights?.length) {
      if (y > 245) {
        doc.addPage();
        y = 18;
      }

      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text('Accommodation', 16, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      packageData.itinerary.nights.forEach((night) => {
        if (y > 275) {
          doc.addPage();
          y = 18;
        }
        doc.text(
          `Night ${night.night}: ${night.accommodation} | Meals: ${night.meals}`,
          20,
          y
        );
        y += 5;
      });
    }

    const safeTitle = packageData.title.replace(/\s+/g, '-');
    doc.save(`${safeTitle}-${bookingReference}-Itinerary.pdf`);
  };

  const addTraveler = () => {
    setFormError('');
    setTravelers((prev) => [...prev, createTraveler(prev.length + 1, user?.email || '')]);
  };

  const removeTraveler = (travelerId: string) => {
    setFormError('');
    setTravelers((prev) => (prev.length > 1 ? prev.filter((t) => t.id !== travelerId) : prev));
  };

  const updateTraveler = (travelerId: string, field: keyof Traveler, value: string) => {
    setFormError('');
    setTravelers((prev) =>
      prev.map((traveler) =>
        traveler.id === travelerId ? { ...traveler, [field]: value } : traveler
      )
    );
  };

  const autoFillAllFields = () => {
    if (!isTestingMode) return;
    setFormError('');
    const date = new Date();
    date.setDate(date.getDate() + 14);
    const autoDate = date.toISOString().split('T')[0];

    setTravelDate(autoDate);
    setRoomType('Double');

    setTravelers((prev) =>
      prev.map((traveler, index) => ({
        ...traveler,
        fullName: `Traveler ${index + 1}`,
        age: String(25 + index),
        gender: index % 2 === 0 ? 'Male' : 'Female',
        mobile: `9${String(100000000 + index).slice(-9)}`,
        email: index === 0 && user?.email ? user.email : `traveler${index + 1}@mail.com`,
        aadhaar: `${111122223333 + index}`,
        passport: `P${1234567 + index}`,
      }))
    );
  };

  const validateBooking = (): boolean => {
    if (!travelDate) {
      return false;
    }

    const selectedDate = new Date(travelDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return false;
    }

    for (let i = 0; i < travelers.length; i += 1) {
      const traveler = travelers[i];
      if (!traveler.fullName.trim()) return false;
      if (!traveler.age.trim() || Number(traveler.age) < 1 || Number(traveler.age) > 120) {
        return false;
      }
      if (!traveler.gender) return false;
      if (!/^[6-9]\d{9}$/.test(traveler.mobile.trim())) {
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(traveler.email.trim())) {
        return false;
      }
      if (!/^\d{12}$/.test(traveler.aadhaar.trim())) {
        return false;
      }
    }

    return true;
  };

  const handleCardPayment = async () => {
    const isValid = validateBooking();
    if (!isValid) {
      setFormError('Please fill all required fields.');
      return;
    }

    setFormError('');
    setLoading(true);
    await delay(600);
    if (!user?.id) {
      toast.error('Please login again to complete booking.');
      setLoading(false);
      return;
    }

    const ref = `TM-${Date.now().toString().slice(-8)}`;
    const primaryTraveler = travelers[0];
    const [firstName, ...lastNameParts] = primaryTraveler.fullName.trim().split(/\s+/);
    const lastName = lastNameParts.join(' ') || '-';

    const { error: bookingError } = await supabase.from('bookings').insert({
      user_id: user.id,
      package_id: packageData.id,
      package_title: packageData.title,
      travelers: totalPassengers,
      first_name: firstName || 'Guest',
      last_name: lastName,
      email: primaryTraveler.email.trim(),
      phone: primaryTraveler.mobile.trim(),
      total_amount: grandTotal,
      payment_status: 'paid',
      payment_verified: true,
      payment_id: `sim_${Date.now()}`,
      booking_reference: ref,
    });

    if (bookingError) {
      toast.error(bookingError.message || 'Payment succeeded but booking save failed.');
      setLoading(false);
      return;
    }

    try {
      await fetch(`${backendBaseUrl}/api/booking/confirmation-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: primaryTraveler.email.trim(),
          fullName: primaryTraveler.fullName.trim(),
          bookingReference: ref,
          packageTitle: packageData.title,
          destination: packageData.location,
          travelDate,
          passengers: totalPassengers,
          totalAmount: grandTotal,
        }),
      });
    } catch {
      toast.info('Booking confirmed. Email could not be sent right now.');
    }

    setBookingRef(ref);
    setSuccess(true);
    setLoading(false);
    localStorage.removeItem(storageKey);
    try {
      downloadBookingItinerary(ref);
      toast.success('Payment successful. Itinerary PDF downloaded.');
    } catch {
      toast.success('Payment successful. Booking confirmed.');
      toast.info('Could not auto-download itinerary PDF. Please try again from package details.');
    }
  };

  if (success) {
    return (
      <Layout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center py-12">
            <div className="bg-card rounded-2xl shadow-card p-8 max-w-xl w-full">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2 text-center">Booking Confirmed!</h1>
              <p className="text-muted-foreground mb-6 text-center">
                Thank you for booking {packageData.title}. Your booking for {totalPassengers}{' '}
                {totalPassengers === 1 ? 'traveler' : 'travelers'} is confirmed.
              </p>

              <div className="border-2 border-dashed border-primary/40 rounded-xl p-5 mb-6 bg-primary/5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Travel Ticket</p>
                <p className="text-lg font-bold text-foreground mt-1">{packageData.title}</p>
                <p className="text-sm text-muted-foreground">{packageData.location}</p>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Reference</p>
                    <p className="font-semibold text-primary">{bookingRef}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Travel Date</p>
                    <p className="font-semibold text-foreground">{travelDate}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Passengers</p>
                    <p className="font-semibold text-foreground">{totalPassengers}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount Paid</p>
                    <p className="font-semibold text-foreground">₹{grandTotal.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link to="/my-bookings" className="btn-primary w-full text-center">
                  View My Bookings
                </Link>
                <Link to="/" className="btn-outline w-full text-center">
                  Return to Home
                </Link>
              </div>
            </div>
          </div>
        </PageTransition>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageTransition>
        <div className="py-8 bg-background min-h-screen">
          <div className="page-container">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Package
            </button>

            <h1 className="text-3xl font-bold text-foreground mb-8">Travel Package Booking</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-card rounded-xl p-6 shadow-card">
                  <h2 className="text-lg font-bold text-foreground mb-4">Package Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <DetailRow label="Package ID" value={packageData.id} />
                    <DetailRow label="Package Name" value={packageData.title} />
                    <DetailRow label="Category" value={packageData.category} />
                    <DetailRow label="Destination" value={packageData.location} />
                    <DetailRow label="Duration" value={packageData.duration} />
                    <DetailRow label="Rating" value={`${packageData.rating}/5`} />
                    <DetailRow label="Reviews" value={`${packageData.reviews}`} />
                    <DetailRow label="Highlights" value={`${packageData.highlights.length}`} />
                    <DetailRow label="Included Items" value={`${packageData.included.length}`} />
                    <DetailRow label="Excluded Items" value={`${packageData.excluded.length}`} />
                    <DetailRow label="Price per person" value={`₹${packageData.price.toLocaleString()}`} />
                  </div>
                </div>

                <div className="bg-card rounded-xl p-6 shadow-card">
                  <div className="mt-4 text-sm text-muted-foreground">
                    <p className="text-xs uppercase tracking-wide mb-1">Description</p>
                    <p>{packageData.description}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Highlights</p>
                      <ul className="space-y-1 text-foreground">
                        {packageData.highlights.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Included</p>
                      <ul className="space-y-1 text-foreground">
                        {packageData.included.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Excluded</p>
                      <ul className="space-y-1 text-foreground">
                        {packageData.excluded.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 pb-4 mb-4 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-bold text-foreground">Traveler Details</h2>
                    </div>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={addTraveler}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:opacity-90 transition"
                      >
                        <Plus className="h-4 w-4" />
                        Add Traveler
                      </button>
                    </div>
                  </div>

                  {formError ? (
                    <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                      {formError}
                    </div>
                  ) : null}

                  <AnimatePresence initial={false}>
                    <div className="space-y-4">
                      {travelers.map((traveler, index) => (
                        <motion.div
                          key={traveler.id}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          className="border border-border/70 rounded-xl p-5 bg-muted/20 shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-foreground">Traveler {index + 1}</h3>
                            {travelers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTraveler(traveler.id)}
                                className="text-red-500 hover:text-red-600 inline-flex items-center gap-1 text-sm"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <FormInput
                              label="Full Name"
                              value={traveler.fullName}
                              onChange={(v) => updateTraveler(traveler.id, 'fullName', v)}
                              required
                            />
                            <FormInput
                              label="Age"
                              type="number"
                              value={traveler.age}
                              onChange={(v) => updateTraveler(traveler.id, 'age', v)}
                              required
                            />
                            <FormSelect
                              label="Gender"
                              value={traveler.gender}
                              onChange={(v) => updateTraveler(traveler.id, 'gender', v as Gender)}
                              options={['Male', 'Female', 'Other']}
                            />
                            <FormInput
                              label="Mobile Number"
                              value={traveler.mobile}
                              onChange={(v) => updateTraveler(traveler.id, 'mobile', v)}
                              required
                            />
                            <FormInput
                              label="Email"
                              type="email"
                              value={traveler.email}
                              onChange={(v) => updateTraveler(traveler.id, 'email', v)}
                              required
                            />
                            <FormInput
                              label="Aadhaar Number"
                              value={traveler.aadhaar}
                              onChange={(v) => updateTraveler(traveler.id, 'aadhaar', v)}
                              required
                            />
                            <FormInput
                              label="Passport Number (Optional)"
                              value={traveler.passport}
                              onChange={(v) => updateTraveler(traveler.id, 'passport', v)}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </AnimatePresence>
                </div>

                <div className="bg-card rounded-xl p-6 shadow-card">
                  <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Additional Options
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormInput
                      label="Travel Date"
                      type="date"
                      value={travelDate}
                      onChange={(value) => {
                        setFormError('');
                        setTravelDate(value);
                      }}
                      required
                    />
                    <FormSelect
                      label="Room Type"
                      value={roomType}
                      onChange={(value) => {
                        setFormError('');
                        setRoomType(value as RoomType);
                      }}
                      options={['Single', 'Double', 'Family']}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <CheckboxCard
                      title="Meals"
                      subtitle={`+₹${EXTRA_PRICING.mealsPerPerson} / person`}
                      checked={extras.meals}
                      onChange={(checked) => setExtras((prev) => ({ ...prev, meals: checked }))}
                    />
                    <CheckboxCard
                      title="Airport Pickup"
                      subtitle={`+₹${EXTRA_PRICING.airportPickupFlat} flat`}
                      checked={extras.airportPickup}
                      onChange={(checked) =>
                        setExtras((prev) => ({ ...prev, airportPickup: checked }))
                      }
                    />
                    <CheckboxCard
                      title="Travel Insurance"
                      subtitle={`+₹${EXTRA_PRICING.insurancePerPerson} / person`}
                      checked={extras.travelInsurance}
                      onChange={(checked) =>
                        setExtras((prev) => ({ ...prev, travelInsurance: checked }))
                      }
                    />
                  </div>
                </div>

                <div className="bg-card rounded-xl p-6 shadow-card" id="payment-section">
                  <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Card Payment
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click Book Now to pay by debit/credit card and generate your ticket.
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span>Secure payment flow. Final amount: ₹{grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-card rounded-xl p-6 shadow-card sticky top-24">
                  <h2 className="text-lg font-bold text-foreground mb-4">Booking Summary</h2>

                  <div className="space-y-2 text-sm mb-4">
                    <p className="font-medium text-foreground">{packageData.title}</p>
                    <p className="text-muted-foreground">{packageData.location}</p>
                    <p className="text-muted-foreground">{packageData.duration}</p>
                    <p className="text-muted-foreground">
                      Travel Date: {travelDate || 'Not selected'}
                    </p>
                    <p className="text-muted-foreground">Room: {roomType}</p>
                  </div>

                  <div className="border-t border-border pt-4 space-y-2 mb-4">
                    {travelers.map((traveler, index) => (
                      <div key={traveler.id} className="text-sm text-muted-foreground">
                        {index + 1}. {traveler.fullName || 'Unnamed traveler'}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 border-t border-border pt-4">
                    <PriceRow label={`Base price × ${totalPassengers}`} value={basePrice} />
                    <PriceRow label={`Room (${roomType})`} value={roomSurcharge} />
                    <PriceRow label="Meals" value={mealCost} />
                    <PriceRow label="Airport Pickup" value={pickupCost} />
                    <PriceRow label="Travel Insurance" value={insuranceCost} />
                    <PriceRow label="Taxes & Fees" value={taxes} />
                    <div className="flex justify-between font-bold text-lg pt-3 border-t border-border">
                      <span className="text-foreground">Total</span>
                      <span className="text-primary">₹{grandTotal.toLocaleString()}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Passengers: <span className="font-medium text-foreground">{totalPassengers}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCardPayment}
                    disabled={loading}
                    className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Book Now - Pay ₹{grandTotal.toLocaleString()}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    </Layout>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-foreground font-medium">{value}</p>
  </div>
);

const FormInput = ({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) => (
  <div>
    <label className="form-label">
      {label}
      {required ? ' *' : ''}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input-field"
      required={required}
    />
  </div>
);

const FormSelect = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) => (
  <div>
    <label className="form-label">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field">
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

const CheckboxCard = ({
  title,
  subtitle,
  checked,
  onChange,
}: {
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <label className="border border-border rounded-lg p-3 flex items-start gap-3 cursor-pointer hover:border-primary/40 transition-colors">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 h-4 w-4"
    />
    <div>
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  </label>
);

const PriceRow = ({ label, value }: { label: string; value: number }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-foreground">₹{value.toLocaleString()}</span>
  </div>
);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default Payment;
