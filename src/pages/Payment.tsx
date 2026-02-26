import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { User, Calendar, Lock, ArrowLeft, Check, Loader2, Plus, Trash2, CreditCard, UserRound } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { getPackageById, type TravelPackage } from '@/lib/packagesApi';
import { computeDynamicPricing } from '@/lib/packagePricing';
import { buildGroupTourFormUrl, hasGroupTourFormUrl, saveGroupTourFormUrl, trackGroupTourBookingEvent } from '@/lib/groupTourBooking';

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

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  aadhaar_hash: string | null;
  aadhaar_last4: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  alternate_email: string | null;
  occupation: string | null;
  bio: string | null;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
};

type BookingDraft = {
  travelers: Traveler[];
  travelDate: string;
  roomType: RoomType;
  extras: ExtraServices;
};

interface BookingTerms {
  cancellationPolicy: string;
  termsVersion: string;
  lockedNotice: string;
  acceptedAt: string;
  destination: string;
  travelDate: string;
  travelCategory: string;
  duration: string;
  airline: string;
  departureTime: string;
  arrivalTime: string;
  itinerary: {
    days: unknown[];
    nights: unknown[];
    activities: string[];
    included: string[];
    excluded: string[];
  };
  included: string[];
  excluded: string[];
  travelDetails: {
    transportDetails: string;
    checkIn: string;
    checkOut: string;
  };
  emergencyContact: string;
  travelGuidelines: string[];
  documentsToCarry: string[];
  importantNotes: string[];
  flightDataSource: 'amadeus' | 'fallback';
  email: {
    sent: boolean;
    status: 'pending' | 'sending' | 'sent' | 'queued' | 'failed';
    sentAt: string | null;
  };
  manualFollowUpRequired: boolean;
  manualFollowUpReason: string | null;
  manualFollowUpLoggedAt: string | null;
}

interface BookingInsertPayload {
  user_id: string;
  package_id: string;
  package_title: string;
  travelers: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  total_amount: number;
  payment_status: 'paid';
  payment_verified: boolean;
  payment_id: string;
  booking_reference: string;
  email_sent: boolean;
  booking_status: 'confirmed';
  ticket_pdf_url: null;
  locked_price_per_person: number;
  locked_total_amount: number;
  booking_terms: BookingTerms;
  is_locked: boolean;
}

interface ConfirmationEmailPayload {
  email: string;
  fullName: string;
  phone: string;
  bookingReference: string;
  bookingId: string;
  paymentId: string;
  packageTitle: string;
  destination: string;
  travelDate: string;
  passengers: number;
  totalAmount: number;
  travelCategory: string;
  itineraryDays: unknown[];
  itineraryNights: unknown[];
  transportDetails: string;
  activities: string[];
  checkIn: string;
  checkOut: string;
  emergencyContact: string;
  travelGuidelines: string[];
  documentsToCarry: string[];
  importantNotes: string[];
  duration: string;
  airline: string;
  departureTime: string;
  arrivalTime: string;
  included: string[];
  excluded: string[];
}

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
    <span className="text-foreground">₹{value.toLocaleString('en-IN')}</span>
  </div>
);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
};

const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMessage = 'Operation timed out'): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms))
  ]);
};

const Payment = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [packageData, setPackageData] = useState<TravelPackage | null>(null);
  const [packageLoading, setPackageLoading] = useState(true);
  const [packageError, setPackageError] = useState('');
  const backendBaseUrl =
    import.meta.env.VITE_AUTH_BACKEND_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    'http://localhost:3000';
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
  const [bookingRef, setBookingRef] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [emailNotice, setEmailNotice] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('Processing...');
  const [groupFormOpened, setGroupFormOpened] = useState(false);
  const [groupFormUrlInput, setGroupFormUrlInput] = useState('');
  const [groupFormReady, setGroupFormReady] = useState(hasGroupTourFormUrl());
  const [groupRedirectNote, setGroupRedirectNote] = useState('');
  const [flightData, setFlightData] = useState<{ airline: string; departureTime: string; arrivalTime: string } | null>(null);
  const [flightSearching, setFlightSearching] = useState(false);
  const [flightApiFailed, setFlightApiFailed] = useState(false);
  const [autoSaveProfile, setAutoSaveProfile] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPackage = async () => {
      if (!id) {
        setPackageData(null);
        setPackageLoading(false);
        return;
      }

      setPackageLoading(true);
      setPackageError('');
      try {
        const pkg = await getPackageById(id);
        if (!active) return;
        setPackageData(pkg || null);
      } catch (err) {
        if (!active) return;
        setPackageData(null);
        setPackageError(err instanceof Error ? err.message : 'Failed to load package');
      } finally {
        if (active) setPackageLoading(false);
      }
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

  useEffect(() => {
    if (!travelDate || !packageData) return;

    const fetchFlight = async () => {
      setFlightSearching(true);
      setFlightData(null);
      setFlightApiFailed(false);
      try {
        let destCode = packageData.destination;
        if (packageData.id.startsWith('amadeus-')) {
          const parts = packageData.id.split('-');
          if (parts.length >= 3) destCode = parts[2];
        }

        const url = `${backendBaseUrl}/api/booking/flight-search?destination=${destCode}&departureDate=${travelDate}`;
        const response = await fetchWithTimeout(url, {}, 8000);
        if (response.ok) {
          const data = await response.json();
          setFlightData(data);
        } else {
          setFlightApiFailed(true);
        }
      } catch (err) {
        setFlightApiFailed(true);
        console.error('Failed to fetch flight:', err);
      } finally {
        setFlightSearching(false);
      }
    };

    void fetchFlight();
  }, [travelDate, packageData, backendBaseUrl]);

  const loadFromProfile = async () => {
    if (!user?.id) {
      toast.error('Please login to load profile details.');
      return;
    }

    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('No saved profile found. Please update your profile first.');
        return;
      }

      const profileData = data as unknown as ProfileRow;

      const calculateAge = (dob: string | null) => {
        if (!dob) return '';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age.toString();
      };

      setTravelers((prev) => {
        const updated = [...prev];
        updated[0] = {
          ...updated[0],
          fullName: profileData.full_name || updated[0].fullName,
          mobile: profileData.phone || updated[0].mobile,
          email: user.email || profileData.alternate_email || updated[0].email,
          gender: (profileData.gender ? profileData.gender.charAt(0).toUpperCase() + profileData.gender.slice(1).toLowerCase() : 'Male') as Gender,
          age: calculateAge(profileData.date_of_birth) || updated[0].age,
          aadhaar: profileData.aadhaar_last4 ? `XXXX-XXXX-${profileData.aadhaar_last4}` : updated[0].aadhaar,
        };
        return updated;
      });

      toast.success('Details loaded from your profile.');
    } catch (err) {
      console.error('Error loading profile:', err);
      toast.error('Failed to load profile details.');
    } finally {
      setProfileLoading(false);
    }
  };

  const updateUserProfile = async () => {
    if (!user?.id || !autoSaveProfile) return;

    const primary = travelers[0];
    const normalizedAadhaar = primary.aadhaar.replace(/\D/g, '');
    
    // Create payload with available fields
    const payload: Record<string, string | null> = {
      id: user.id,
      full_name: primary.fullName || null,
      phone: primary.mobile || null,
      gender: primary.gender.toLowerCase() || null,
      updated_at: new Date().toISOString(),
    };

    // If a full Aadhaar was entered, update the hash and last 4
    if (normalizedAadhaar.length === 12) {
      const sha256 = async (str: string) => {
        const data = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      };
      payload.aadhaar_hash = await sha256(normalizedAadhaar);
      payload.aadhaar_last4 = normalizedAadhaar.slice(-4);
    }

    try {
      await (supabase.from('profiles').upsert(payload as any, { onConflict: 'id' }) as any);
      // Also update auth metadata for faster access
      await supabase.auth.updateUser({
        data: { full_name: payload.full_name }
      });
    } catch (err) {
      console.error('Failed to auto-save profile:', err);
    }
  };

  useEffect(() => {
    if (!packageData) return;
    setGroupFormReady(Boolean(packageData.groupFormLink) || hasGroupTourFormUrl());
  }, [packageData]);

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
              {packageError ? <p className="text-destructive mb-4">{packageError}</p> : null}
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
  const groupFlowRequested = new URLSearchParams(location.search).get('group') === '1';
  const isGroupTour = packageData.category === 'group' || groupFlowRequested;
  const dynamicPricing = computeDynamicPricing(packageData, {
    travelers: totalPassengers,
    selectedDate: travelDate || undefined,
  });
  const pricePerPerson = dynamicPricing.finalPricePerPerson;
  const basePrice = dynamicPricing.basePricePerPerson * totalPassengers;
  const roomSurcharge = ROOM_SURCHARGE_PER_PERSON[roomType] * totalPassengers;
  const mealCost = extras.meals ? EXTRA_PRICING.mealsPerPerson * totalPassengers : 0;
  const insuranceCost = extras.travelInsurance ? EXTRA_PRICING.insurancePerPerson * totalPassengers : 0;
  const pickupCost = extras.airportPickup ? EXTRA_PRICING.airportPickupFlat : 0;
  const subtotal = pricePerPerson * totalPassengers + roomSurcharge + mealCost + insuranceCost + pickupCost;
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
    doc.text(`Amount Paid: ₹${grandTotal.toLocaleString('en-IN')}`, 16, y);
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

  const validateBooking = (): string | null => {
    if (!travelDate) {
      return 'Please select a travel date.';
    }

    const [year, month, day] = travelDate.split('-').map(Number);
    const selectedDate = new Date(year, (month || 1) - 1, day || 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return 'Travel date cannot be in the past.';
    }

    for (let i = 0; i < travelers.length; i += 1) {
      const traveler = travelers[i];
      const index = i + 1;
      const fullName = traveler.fullName.trim();
      const age = Number(traveler.age.trim());
      const mobileDigits = traveler.mobile.replace(/\D/g, '');
      const aadhaarDigits = traveler.aadhaar.replace(/\D/g, '');

      if (!fullName) return `Traveler ${index}: full name is required.`;
      if (!traveler.age.trim() || Number(traveler.age) < 1 || Number(traveler.age) > 120) {
        return `Traveler ${index}: enter a valid age (1-120).`;
      }
      if (!Number.isFinite(age) || age < 1 || age > 120) {
        return `Traveler ${index}: enter a valid age (1-120).`;
      }
      if (!traveler.gender) return `Traveler ${index}: gender is required.`;
      if (!/^[6-9]\d{9}$/.test(mobileDigits.slice(-10))) {
        return `Traveler ${index}: enter a valid mobile number.`;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(traveler.email.trim())) {
        return `Traveler ${index}: enter a valid email address.`;
      }
      if (!/^\d{12}$/.test(aadhaarDigits)) {
        return `Traveler ${index}: Aadhaar must be 12 digits.`;
      }
    }

    return null;
  };

  const formatTravelDate = (value: string) => {
    if (!value) return 'Flexible Date';
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleGroupFormSave = () => {
    const ok = saveGroupTourFormUrl(groupFormUrlInput);
    if (!ok) {
      toast.error('Please enter a valid Google Form URL.');
      return;
    }
    setGroupFormReady(true);
    setGroupFormUrlInput('');
    toast.success('Google Form URL saved.');
  };

  const openGroupTourForm = async () => {
    const selectedDate = travelDate || packageData.availableDates[0] || new Date().toISOString().slice(0, 10);
    const formUrl = buildGroupTourFormUrl({
      tourName: packageData.title,
      destination: packageData.destination,
      travelDate: formatTravelDate(selectedDate),
      price: grandTotal,
    }, {
      packageId: packageData.id,
      packageTitle: packageData.title,
      explicitFormUrl: packageData.groupFormLink,
    });

    if (!formUrl) {
      toast.error('Google Form URL missing. Add it below or set VITE_GROUP_TOUR_FORM_URL.');
      return;
    }

    setLoading(true);
    setGroupRedirectNote('You will be redirected to secure registration form.');
    await delay(550);

    trackGroupTourBookingEvent('group_tour_form_opened_payment_page', {
      packageId: packageData.id,
      tourName: packageData.title,
      destination: packageData.destination,
      travelDate: selectedDate,
      price: grandTotal,
    });
    window.open(formUrl, '_blank', 'noopener,noreferrer');
    setLoading(false);
    setGroupFormOpened(true);
  };

  const handleCardPayment = async () => {
    if (isGroupTour) {
      await openGroupTourForm();
      return;
    }
    const validationError = validateBooking();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError('');
    setLoading(true);
    setProcessingMessage('Processing...');

    try {
      await delay(600);
      if (!user?.id) {
        toast.error('Please login again to complete booking.');
        return;
      }

      const ref = `TM-${Date.now().toString().slice(-8)}`;
      const paymentId = `sim_${Date.now()}`;
      const primaryTraveler = travelers[0];
      const normalizedPrimaryMobile = primaryTraveler.mobile.replace(/\D/g, '').slice(-10);
      const registeredEmail = user.email?.trim().toLowerCase() || primaryTraveler.email.trim().toLowerCase();
      const [firstName, ...lastNameParts] = primaryTraveler.fullName.trim().split(/\s+/);
      const lastName = lastNameParts.join(' ') || '-';
      const bookingTerms: BookingTerms = {
        cancellationPolicy:
          (packageData as unknown as { cancellationPolicy?: string }).cancellationPolicy ||
          'Cancellation charges may apply based on departure date.',
        termsVersion: 'v1',
        lockedNotice: 'This package is locked after booking.',
        acceptedAt: new Date().toISOString(),
        destination: packageData.location,
        travelDate,
        travelCategory: packageData.category,
        duration: packageData.duration,
        airline: flightData?.airline || (packageData.transportMode === 'flight' ? 'Indigo / Air India' : 'Luxury Coach'),
        departureTime: flightData?.departureTime || '06:30 AM',
        arrivalTime: flightData?.arrivalTime || '09:45 AM',
        itinerary: {
          days: packageData.itinerary?.days || [],
          nights: packageData.itinerary?.nights || [],
          activities: packageData.highlights || [],
          included: Array.isArray(packageData.included) ? packageData.included : [],
          excluded: Array.isArray(packageData.excluded) ? packageData.excluded : [],
        },
        included: Array.isArray(packageData.included) ? packageData.included : [],
        excluded: Array.isArray(packageData.excluded) ? packageData.excluded : [],
        travelDetails: {
          transportDetails: packageData.transportMode || '-',
          checkIn: travelDate || '-',
          checkOut: '-',
        },
        emergencyContact: '+91 9342180670',
        travelGuidelines: [
          'Arrive at the pickup point at least 45 minutes before departure.',
          'Keep emergency contacts active during your trip.',
          'Follow local regulations and guide instructions at all times.',
        ],
        documentsToCarry: ['Government ID proof', 'Booking confirmation email', 'Any required permits/visa documents'],
        importantNotes: [
          'Hotel check-in/check-out times depend on property policy.',
          'Itinerary timings can shift due to weather or operational needs.',
        ],
        flightDataSource: flightData && !flightApiFailed ? 'amadeus' : 'fallback',
        email: {
          sent: false,
          status: 'pending',
          sentAt: null,
        },
        manualFollowUpRequired: false,
        manualFollowUpReason: null,
        manualFollowUpLoggedAt: null,
      };

      const bookingInsertPayload: BookingInsertPayload = {
        user_id: user.id,
        package_id: packageData.id,
        package_title: packageData.title,
        travelers: totalPassengers,
        first_name: firstName || 'Guest',
        last_name: lastName,
        email: registeredEmail,
        phone: normalizedPrimaryMobile,
        total_amount: grandTotal,
        payment_status: 'paid',
        payment_verified: true,
        payment_id: paymentId,
        booking_reference: ref,
        email_sent: false,
        booking_status: 'confirmed',
        ticket_pdf_url: null,
        locked_price_per_person: pricePerPerson,
        locked_total_amount: grandTotal,
        booking_terms: bookingTerms,
        is_locked: true,
      };

      setProcessingMessage('Confirming your booking...');

      // Save booking to backend SQLite + trigger confirmation email
      try {
        await fetch(`${backendBaseUrl}/api/booking/book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingReference: ref,
            packageTitle: packageData.title,
            destination: packageData.location,
            duration: packageData.duration,
            travelDate,
            travelers: totalPassengers,
            travelerName: primaryTraveler.fullName,
            roomType,
            email: registeredEmail,
            phone: primaryTraveler.mobile,
            totalAmount: grandTotal,
            airline: flightData?.airline || (packageData.transportMode === 'flight' ? 'Indigo / Air India' : 'Luxury Coach'),
            departureTime: flightData?.departureTime || '06:30 AM',
            userId: user?.id || 'guest',
          }),
        });
      } catch (saveErr) {
        console.warn('Booking save/email request failed, proceeding anyway:', saveErr);
      }

      // Set booking reference
      setBookingRef(ref);
      setBookingEmail(registeredEmail);

      if (autoSaveProfile) {
        void updateUserProfile();
      }

      toast.success('Successfully Booked!');
      localStorage.removeItem(storageKey);

      try {
        downloadBookingItinerary(ref);
      } catch (e) {
        console.error('PDF auto-download skipped');
      }

      // Navigate to the Booking Confirmed page
      navigate('/booking-confirmed', {
        state: {
          booking: {
            bookingRef: ref,
            packageTitle: packageData.title,
            destination: packageData.location,
            duration: packageData.duration,
            travelDate,
            travelers: totalPassengers,
            totalAmount: grandTotal,
            email: registeredEmail,
            travelerName: primaryTraveler.fullName,
            roomType,
            airline: flightData?.airline || (packageData.transportMode === 'flight' ? 'Indigo / Air India' : 'Luxury Coach'),
            departureTime: flightData?.departureTime || '06:30 AM',
          },
        },
      });

    } catch (globalError: any) {
      console.error('Global handleCardPayment error:', globalError);
      toast.error(globalError.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
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
                    <DetailRow label="Categories" value={packageData.categories.join(', ')} />
                    <DetailRow label="Destination" value={packageData.location} />
                    <DetailRow label="Duration" value={packageData.duration} />
                    <DetailRow label="Rating" value={`${packageData.rating}/5`} />
                    <DetailRow label="Reviews" value={`${packageData.reviews}`} />
                    <DetailRow label="Highlights" value={`${packageData.highlights.length}`} />
                    <DetailRow label="Included Items" value={`${packageData.included.length}`} />
                    <DetailRow label="Excluded Items" value={`${packageData.excluded.length}`} />
                    <DetailRow label="Price per person" value={`₹${pricePerPerson.toLocaleString('en-IN')}`} />
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
                  {!isGroupTour ? (
                    <>
                      <div className="flex flex-col gap-3 pb-4 mb-4 border-b border-border/60">
                        <div className="flex items-center gap-2">
                          <User className="h-5 w-5 text-primary" />
                          <h2 className="text-lg font-bold text-foreground">Traveler Details</h2>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={addTraveler}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:opacity-90 transition"
                          >
                            <Plus className="h-4 w-4" />
                            Add Traveler
                          </button>
                          <button
                            type="button"
                            onClick={loadFromProfile}
                            disabled={profileLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-100 text-sky-700 border border-sky-200 text-sm font-medium shadow-sm hover:bg-sky-200 transition disabled:opacity-50"
                          >
                            {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
                            Use My Profile
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

                      <div className="mt-6 pt-6 border-t border-border">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <div className="flex items-center h-5">
                            <input
                              type="checkbox"
                              checked={autoSaveProfile}
                              onChange={(e) => setAutoSaveProfile(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                              Update my permanent profile with these details
                            </span>
                            <p className="text-muted-foreground text-xs mt-0.5">
                              This will keep your traveler information up to date for future bookings.
                            </p>
                          </div>
                        </label>
                      </div>
                    </>
                  ) : (
                    <div className="mt-6 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                      Group tour bookings are handled via Google Form.
                    </div>
                  )}
                </div>

                {!isGroupTour ? (
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
                      subtitle={`+₹${EXTRA_PRICING.mealsPerPerson.toLocaleString('en-IN')} / person`}
                      checked={extras.meals}
                      onChange={(checked) => setExtras((prev) => ({ ...prev, meals: checked }))}
                    />
                    <CheckboxCard
                      title="Airport Pickup"
                      subtitle={`+₹${EXTRA_PRICING.airportPickupFlat.toLocaleString('en-IN')} flat`}
                      checked={extras.airportPickup}
                      onChange={(checked) =>
                        setExtras((prev) => ({ ...prev, airportPickup: checked }))
                      }
                    />
                    <CheckboxCard
                      title="Travel Insurance"
                      subtitle={`+₹${EXTRA_PRICING.insurancePerPerson.toLocaleString('en-IN')} / person`}
                      checked={extras.travelInsurance}
                      onChange={(checked) =>
                        setExtras((prev) => ({ ...prev, travelInsurance: checked }))
                      }
                    />
                  </div>
                </div>
                ) : null}

                <div className="bg-card rounded-xl p-6 shadow-card" id="payment-section">
                  <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    {isGroupTour ? 'Group Tour Booking Form' : 'Card Payment'}
                  </h2>
                  {isGroupTour ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Group Tours use Google Form booking only in this payment section. No online payment is required now.
                      </p>
                      {!groupFormReady ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-semibold text-amber-900 mb-2">Add Google Form URL (one-time setup)</p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="url"
                              value={groupFormUrlInput}
                              onChange={(event) => setGroupFormUrlInput(event.target.value)}
                              placeholder="https://docs.google.com/forms/d/e/.../viewform"
                              className="flex-1 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm"
                            />
                            <button type="button" onClick={handleGroupFormSave} className="btn-outline whitespace-nowrap">
                              Save Link
                            </button>
                          </div>
                        </div>
                      ) : null}
                      <button type="button" onClick={openGroupTourForm} disabled={loading} className="btn-primary w-full">
                        {loading ? 'Redirecting...' : 'Open Group Tour Form'}
                      </button>
                      {groupRedirectNote ? <p className="text-xs text-muted-foreground">{groupRedirectNote}</p> : null}
                      {groupFormOpened ? (
                        <Link to="/group-tour/thank-you" className="btn-outline w-full text-center block">
                          Continue
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground mb-4">
                        Click Book Now to pay by debit/credit card and generate your ticket.
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        <span>Secure payment flow. Final amount: ₹{grandTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  )}
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
                    
                    <div className="pt-2 border-t border-border mt-2">
                       <p className="text-xs uppercase font-bold text-primary mb-1">Flight Information</p>
                       {flightSearching ? (
                         <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                           <Loader2 className="h-3 w-3 animate-spin" />
                           <span>Finding best flights...</span>
                         </div>
                       ) : flightData ? (
                         <div className="space-y-1">
                           <p className="text-foreground font-medium">{flightData.airline}</p>
                           <p className="text-xs text-muted-foreground">
                             {flightData.departureTime} → {flightData.arrivalTime}
                           </p>
                         </div>
                       ) : (
                         <p className="text-xs text-muted-foreground italic">
                           {travelDate ? 'Updating flight schedules...' : 'Select date to see flights'}
                         </p>
                       )}
                     </div>
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
                      <span className="text-primary">₹{grandTotal.toLocaleString('en-IN')}</span>
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
                    {isGroupTour
                      ? 'Open Group Tour Form'
                      : loading
                        ? processingMessage
                        : `Book Now - Pay ₹${grandTotal.toLocaleString('en-IN')}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="max-w-xl border-slate-700/70 bg-slate-950 text-slate-100">
            <DialogHeader className="space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-400/40">
                <Check className="h-7 w-7 text-emerald-300" />
              </div>
              <DialogTitle className="text-center text-2xl font-semibold text-white">Booking Confirmed</DialogTitle>
              <DialogDescription className="text-center text-slate-300">
                Check your email ({bookingEmail}) for your ticket.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Reference ID</p>
              <p className="mt-1 font-mono text-lg text-cyan-300">{bookingRef}</p>
              {emailNotice ? <p className="mt-3 text-sm text-slate-300">{emailNotice}</p> : null}
            </div>
            <DialogFooter className="gap-3 sm:justify-center">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/my-bookings');
                }}
              >
                View My Bookings
              </button>
              <button type="button" className="btn-outline" onClick={() => setShowSuccessModal(false)}>
                Continue Browsing
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageTransition>
    </Layout>
  );
};


export default Payment;

