import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Star, MapPin, Clock, Check, X, Download, ArrowLeft, Hotel, Utensils, ChevronDown, ChevronUp, Loader2, User, Phone } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import {
  deletePackage,
  getPackageById,
  getPackageHistory,
  overridePackageCategories,
  overridePackageImage,
  type PackageVersionHistory,
  type TravelPackage,
} from '@/lib/packagesApi';
import { jsPDF } from 'jspdf';
import { useEffect, useState } from 'react';
import PackageImage from '@/components/common/PackageImage';
import { useAuth } from '@/hooks/useAuth';

const getFallbackDepartures = (packageId: string) => {
  const seed = (packageId || 'default').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const now = new Date();
  
  return Array.from({ length: 3 }, (_, i) => {
    // Start from next month, space them out
    const date = new Date(now.getFullYear(), now.getMonth() + 1 + i, 5 + (seed % 15));
    return {
      date: date.toISOString().split('T')[0],
      maxCapacity: 15 + (seed % 15),
      currentBookings: (seed * (i + 1)) % 12,
    };
  });
};

export default function PackageDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [packageData, setPackageData] = useState<TravelPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminCategoriesInput, setAdminCategoriesInput] = useState('');
  const [adminImageUrl, setAdminImageUrl] = useState('');
  const [adminImageAlt, setAdminImageAlt] = useState('');
  const [versionHistory, setVersionHistory] = useState<PackageVersionHistory[]>([]);
  const [adminSaving, setAdminSaving] = useState(false);
  const [openItineraryDay, setOpenItineraryDay] = useState<number>(1);
  const [itineraryView, setItineraryView] = useState<'story' | 'bullet'>('story');
  const [selectedDepartureDate, setSelectedDepartureDate] = useState<string>('');
  const { user } = useAuth();


  const backendUrl =
    import.meta.env.VITE_AUTH_BACKEND_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    'http://localhost:3000';
  const adminToken = import.meta.env.VITE_PACKAGE_ADMIN_TOKEN as string | undefined;

  useEffect(() => {
    let active = true;

    const loadPackage = async () => {
      if (!id) {
        setPackageData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const pkg = await getPackageById(id);
        if (!active) return;
        setPackageData(pkg || null);
        setAdminCategoriesInput(pkg?.category || '');
        setAdminImageUrl(pkg?.imageUrl || '');
        setAdminImageAlt(pkg?.imageAlt || '');
        if (pkg?.isGroupTour || pkg?.category === 'group') {
          if (pkg.groupDepartures?.length) {
            setSelectedDepartureDate(pkg.groupDepartures[0].date);
          } else {
            const fallbacks = getFallbackDepartures(id || 'default');
            setSelectedDepartureDate(fallbacks[0].date);
          }
        }
      } catch (err) {
        if (!active) return;
        setPackageData(null);
        setError(err instanceof Error ? err.message : 'Failed to load package details');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPackage();

    return () => {
      active = false;
    };
  }, [id, backendUrl]);

  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      if (!packageData?.id || !adminToken) return;
      try {
        const history = await getPackageHistory(packageData.id, adminToken);
        if (!active) return;
        setVersionHistory(history);
      } catch {
        if (!active) return;
        setVersionHistory([]);
      }
    };
    void loadHistory();
    return () => {
      active = false;
    };
  }, [packageData?.id, adminToken]);

  if (loading) {
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
              {error ? <p className="text-destructive mb-4">{error}</p> : null}
              <Link to="/packages" className="btn-primary">
                View All Packages
              </Link>
            </div>
          </div>
        </PageTransition>
      </Layout>
    );
  }

  const discountedPrice = packageData.dynamicPricing.finalPricePerPerson;
  const basePrice = packageData.dynamicPricing.basePricePerPerson;
  const savingsPerPerson = packageData.dynamicPricing.savingsPerPerson;
  const groupFlowRequested = new URLSearchParams(location.search).get('group') === '1';
  const isGroupTour = packageData.category === 'group' || groupFlowRequested;

  const itineraryDays =
    packageData.itinerary?.days && packageData.itinerary.days.length > 0
      ? packageData.itinerary.days
      : Array.from({ length: Math.max(2, packageData.durationDays || 3) }, (_, index) => ({
          day: index + 1,
          title:
            index === 0
              ? `Arrival in ${packageData.destination}`
              : index === Math.max(2, packageData.durationDays || 3) - 1
              ? 'Departure'
              : `Explore ${packageData.destination}`,
          activities:
            index === 0
              ? ['Arrival and hotel check-in', 'Local orientation walk']
              : index === Math.max(2, packageData.durationDays || 3) - 1
              ? ['Breakfast at hotel', 'Checkout and return transfer']
              : packageData.highlights.slice(0, 3),
        }));

  const itineraryNights =
    packageData.itinerary?.nights && packageData.itinerary.nights.length > 0
      ? packageData.itinerary.nights
      : Array.from(
          { length: Math.max(1, (packageData.durationDays || itineraryDays.length) - 1) },
          (_, index) => ({
            night: index + 1,
            accommodation: 'Comfort hotel stay',
            meals: 'Breakfast',
          })
        );


  const buildFallbackNarrative = (day: { day: number; title: string; activities: string[] }, index: number) => {
    const night = itineraryNights.find((item) => item.night === day.day);
    const morning = day.activities[0] || `Explore ${packageData.destination}`;
    const afternoon = day.activities[1] || 'Enjoy local experiences and sightseeing';
    const evening = day.activities[2] || 'Relax and absorb the destination vibe';
    const stay = night?.accommodation || 'comfort hotel stay';
    const meals = night?.meals || 'breakfast';
    const isDeparture = index === itineraryDays.length - 1;

    if (index === 0) {
      return `Upon arrival, you will be welcomed and transferred for hotel check-in and rest. In the morning/early day, begin with ${morning.toLowerCase()}. In the afternoon, continue with ${afternoon.toLowerCase()} and connect with local culture. In the evening, enjoy ${evening.toLowerCase()} before an overnight stay at ${stay} with ${meals} included.`;
    }
    if (isDeparture) {
      return `In the morning, enjoy a relaxed start and complete checkout from ${stay}. In the afternoon, cover your final experiences including ${morning.toLowerCase()} and ${afternoon.toLowerCase()}. In the evening, depart with memorable experiences and conclude your journey comfortably.`;
    }
    return `In the morning, continue your journey with ${morning.toLowerCase()}. In the afternoon, explore more through ${afternoon.toLowerCase()}. In the evening, unwind with ${evening.toLowerCase()} before returning to ${stay} for an overnight rest with ${meals} included.`;
  };

  const downloadItinerary = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    doc.setFontSize(24);
    doc.setTextColor(30, 64, 175);
    doc.text(packageData.title, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`${packageData.destination} | ${packageData.duration}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const descLines = doc.splitTextToSize(packageData.description, pageWidth - 40);
    doc.text(descLines, 20, yPosition);
    yPosition += descLines.length * 6 + 15;

    if (itineraryDays.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(30, 64, 175);
      doc.text('Day-by-Day Itinerary', 20, yPosition);
      yPosition += 10;

      itineraryDays.forEach((day) => {
        if (yPosition > 260) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(30, 64, 175);
        doc.text(`Day ${day.day}: ${day.title}`, 20, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        day.activities.forEach((activity) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(`- ${activity}`, 25, yPosition);
          yPosition += 6;
        });
        yPosition += 5;
      });
    }

    if (itineraryNights.length > 0) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      yPosition += 10;
      doc.setFontSize(16);
      doc.setTextColor(30, 64, 175);
      doc.text('Accommodation Details', 20, yPosition);
      yPosition += 10;

      itineraryNights.forEach((night) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`Night ${night.night}: ${night.accommodation} - ${night.meals}`, 25, yPosition);
        yPosition += 6;
      });
    }

    yPosition += 15;
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.text(`Price: Rs ${discountedPrice.toLocaleString('en-IN')} per person`, 20, yPosition);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('TravelWise - Your Trusted Travel Partner', pageWidth / 2, 285, { align: 'center' });

    doc.save(`${packageData.title.replace(/\s+/g, '-')}-Itinerary.pdf`);
  };

  const handleAdminCategorySave = async () => {
    if (!packageData || !adminToken) return;
    const raw = adminCategoriesInput.trim().toLowerCase();
    const allowed = ['south-india', 'north-india', 'solo', 'honeymoon', 'educational', 'domestic', 'nearby', 'international', 'budget', 'group'];
    if (!raw || !allowed.includes(raw)) {
      setError('Enter a valid category: south-india, north-india, solo, honeymoon, educational');
      return;
    }

    setAdminSaving(true);
    try {
      const updated = await overridePackageCategories(packageData.id, [raw], adminToken);
      if (updated) {
        setPackageData(updated);
        setAdminCategoriesInput(updated.category);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update categories');
    } finally {
      setAdminSaving(false);
    }
  };

  const handleAdminImageSave = async () => {
    if (!packageData || !adminToken || !adminImageUrl.trim()) return;
    setAdminSaving(true);
    try {
      const updated = await overridePackageImage(packageData.id, adminImageUrl.trim(), adminImageAlt.trim(), adminToken);
      if (updated) {
        setPackageData(updated);
        setAdminImageUrl(updated.imageUrl);
        setAdminImageAlt(updated.imageAlt || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update image');
    } finally {
      setAdminSaving(false);
    }
  };

  const handleAdminDelete = async () => {
    if (!packageData || !adminToken) return;
    const confirmed = window.confirm('Delete this package? This cannot be undone.');
    if (!confirmed) return;
    setAdminSaving(true);
    try {
      const deleted = await deletePackage(packageData.id, adminToken);
      if (deleted) {
        navigate('/packages');
      } else {
        setError('Package not found or already removed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete package');
    } finally {
      setAdminSaving(false);
    }
  };

  return (
    <Layout>
      <PageTransition>
        {/* Hero Image */}
        <div className="relative h-[400px] md:h-[500px]">
          <PackageImage
            src={packageData.image}
            alt={packageData.imageAlt || `${packageData.title} in ${packageData.destination}`}
            category={packageData.category}
            imageQuery={`${packageData.title} ${packageData.destination}`}
            packageId={packageData.id}
            className="w-full h-full object-cover"
            loading="eager"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
            <div className="page-container">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Packages
              </button>
              <div className="flex items-center gap-1 text-amber-400 mb-3">
                <Star className="h-5 w-5 fill-current" />
                <span className="font-medium">{Number(packageData.rating).toFixed(1)}</span>
                <span className="text-white/80">({packageData.reviews} reviews)</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 font-serif">
                {packageData.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-white/90">
                <div className="flex items-center gap-1">
                  <MapPin className="h-5 w-5" />
                  <span>{packageData.destination}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-5 w-5" />
                  <span>{packageData.duration}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <section className="py-12 bg-background">
          <div className="page-container">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Description */}
                <div className="bg-card rounded-xl p-6 shadow-card">
                  <h2 className="text-xl font-bold text-foreground mb-4">Overview</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {packageData.description}
                  </p>
                </div>

                {/* Highlights */}
                <div className="bg-card rounded-xl p-6 shadow-card">
                  <h2 className="text-xl font-bold text-foreground mb-4">Highlights</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {packageData.highlights.map((highlight, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-lg"
                      >
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm text-foreground">{highlight}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Departures */}
                <div className="bg-card rounded-xl p-6 shadow-card">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <h2 className="text-xl font-bold text-foreground">
                      Available Dates
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {packageData.availableDates.map((date) => (
                      <span key={date} className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {new Date(date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Included/Excluded */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-card rounded-xl p-6 shadow-card">
                    <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500" />
                      What's Included
                    </h3>
                    <ul className="space-y-2">
                      {packageData.included.map((item, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-green-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-card rounded-xl p-6 shadow-card">
                    <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                      <X className="h-5 w-5 text-red-500" />
                      What's Excluded
                    </h3>
                    <ul className="space-y-2">
                      {packageData.excluded.map((item, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <X className="h-4 w-4 text-red-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Itinerary */}
                {itineraryDays.length > 0 && (
                  <div className="bg-card rounded-xl p-6 shadow-card">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-foreground mb-3">Itinerary</h2>
                      <p className="text-muted-foreground leading-relaxed">
                        If this journey is on your bucket list, explore our{' '}
                        <span className="font-semibold text-foreground">{packageData.title}</span> package.
                        We can customise this itinerary to match your expectations.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => setItineraryView('story')}
                        className={`px-3 py-1.5 rounded-md text-sm border ${
                          itineraryView === 'story'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-border'
                        }`}
                      >
                        Story View
                      </button>
                      <button
                        type="button"
                        onClick={() => setItineraryView('bullet')}
                        className={`px-3 py-1.5 rounded-md text-sm border ${
                          itineraryView === 'bullet'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-border'
                        }`}
                      >
                        Bullet View
                      </button>
                    </div>

                    <div className="space-y-3">
                      {itineraryDays.map((day: any, index: number) => {
                        const night = itineraryNights.find((n) => n.night === day.day);
                        const isOpen = openItineraryDay === day.day;
                        const narrativeText = day.narrative || buildFallbackNarrative(day, index);

                        return (
                          <div key={day.day} className="rounded-md border border-border overflow-hidden bg-card">
                            <button
                              type="button"
                              onClick={() => setOpenItineraryDay(isOpen ? -1 : day.day)}
                              className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-secondary/20 transition-colors"
                            >
                              <h3 className="text-lg font-semibold text-foreground">Day {day.day}: {day.title}</h3>
                              {isOpen ? (
                                <ChevronUp className="h-5 w-5 text-primary" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-primary" />
                              )}
                            </button>

                            {isOpen ? (
                              <div className="px-4 pb-5 pt-2 border-t border-border/70">
                                {itineraryView === 'story' ? (
                                  <p className="text-muted-foreground leading-8">
                                    {narrativeText}
                                  </p>
                                ) : (
                                  <div className="space-y-3">
                                    {day.activities.map((activity: string, actIndex: number) => (
                                      <p key={actIndex} className="text-muted-foreground leading-relaxed">
                                        {activity}
                                      </p>
                                    ))}
                                  </div>
                                )}

                                {night ? (
                                  <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-border/60">
                                    <div className="flex items-center gap-2 text-sm">
                                      <Hotel className="h-4 w-4 text-primary" />
                                      <span className="text-foreground">{night.accommodation}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <Utensils className="h-4 w-4 text-primary" />
                                      <span className="text-muted-foreground">{night.meals}</span>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-card rounded-xl p-6 shadow-card sticky top-24">
                  <div className="text-center mb-6">
                    <p className="text-muted-foreground text-sm">Starting from</p>
                    {basePrice > discountedPrice ? (
                      <p className="text-sm text-muted-foreground line-through">
                        ₹{basePrice.toLocaleString('en-IN')}
                      </p>
                    ) : null}
                    <p className="text-4xl font-bold text-primary">₹{discountedPrice.toLocaleString('en-IN')}</p>
                    {savingsPerPerson > 0 ? (
                      <p className="text-xs text-emerald-600 font-medium mt-1">
                        Save ₹{savingsPerPerson.toLocaleString('en-IN')} per traveler
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground mt-1">
                      Typical market range: {packageData.priceRange} | Tier: {packageData.pricingTier}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Affordability score: {packageData.affordabilityScore}/100
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Popularity score: {packageData.popularityScore}
                    </p>
                    <p className="text-muted-foreground text-sm">per person</p>
                  </div>

                  <div className="rounded-lg border border-border p-3 mb-4 text-sm">
                    <p className="font-semibold text-foreground mb-2">Price Breakdown</p>
                    <p className="text-muted-foreground flex justify-between"><span>Hotel</span><span>₹{packageData.dynamicPricing.breakdown.hotel.toLocaleString('en-IN')}</span></p>
                    <p className="text-muted-foreground flex justify-between"><span>Transport</span><span>₹{packageData.dynamicPricing.breakdown.transport.toLocaleString('en-IN')}</span></p>
                    <p className="text-muted-foreground flex justify-between"><span>Food</span><span>₹{packageData.dynamicPricing.breakdown.food.toLocaleString('en-IN')}</span></p>
                    <p className="text-muted-foreground flex justify-between"><span>Activities</span><span>₹{packageData.dynamicPricing.breakdown.activities.toLocaleString('en-IN')}</span></p>
                    <p className="text-muted-foreground flex justify-between"><span>Taxes</span><span>₹{packageData.dynamicPricing.breakdown.taxes.toLocaleString('en-IN')}</span></p>
                  </div>

                  {packageData.dynamicPricing.discounts.length > 0 ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 mb-4 text-sm">
                      <p className="font-semibold text-emerald-900 mb-2">Applied Offers</p>
                      {packageData.dynamicPricing.discounts.map((item) => (
                        <p key={item.type} className="text-emerald-800 flex justify-between">
                          <span>{item.label}</span>
                          <span>-{item.percent}%</span>
                        </p>
                      ))}
                    </div>
                  ) : null}

                  <div className="rounded-lg border border-border p-3 mb-4 text-sm">
                    <p className="font-semibold text-foreground mb-2">Payment Options</p>
                    {packageData.dynamicPricing.paymentPlans.map((plan) => (
                      <p key={plan.label} className="text-muted-foreground">
                        {plan.months ? `${plan.label}: ₹${(plan.monthlyAmount || 0).toLocaleString('en-IN')}/month` : plan.label}
                      </p>
                    ))}
                  </div>

                  {packageData.dynamicPricing.upgradeOptions.length > 0 ? (
                    <div className="rounded-lg border border-border p-3 mb-4 text-sm">
                      <p className="font-semibold text-foreground mb-2">Optional Upgrades</p>
                      {packageData.dynamicPricing.upgradeOptions.map((item) => (
                        <p key={item.id} className="text-muted-foreground flex justify-between">
                          <span>{item.label}</span>
                          <span>+₹{item.pricePerPerson.toLocaleString('en-IN')}</span>
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {/* Guide Information */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-6">
                    <p className="font-bold text-foreground mb-3 flex items-center gap-2">
                       <User className="h-4 w-4 text-primary" />
                       Your Tour Guide
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        {packageData.guideName}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        {packageData.guidePhone}
                      </p>
                    </div>
                  </div>
                  

                  <Link
                    to={`/package/${packageData.id}/payment`}
                    className="btn-primary w-full mb-4 flex items-center justify-center"
                  >
                    Book Now
                  </Link>

                  <button
                    onClick={downloadItinerary}
                    className="btn-outline w-full flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Itinerary
                  </button>

                  <div className="mt-6 pt-6 border-t border-border">
                    {adminToken ? (
                      <div className="mb-4 text-left">
                        <p className="text-xs uppercase text-muted-foreground mb-2">Admin Category Override</p>
                        <input
                          type="text"
                          value={adminCategoriesInput}
                          onChange={(event) => setAdminCategoriesInput(event.target.value)}
                          placeholder="south-india | north-india | solo | honeymoon | educational"
                          className="w-full text-sm px-3 py-2 rounded-md border border-border bg-background"
                        />
                        <button
                          type="button"
                          onClick={handleAdminCategorySave}
                          disabled={adminSaving}
                          className="btn-outline mt-2 w-full disabled:opacity-60"
                        >
                          {adminSaving ? 'Saving...' : 'Save Categories'}
                        </button>
                        <p className="text-xs uppercase text-muted-foreground mt-4 mb-2">Admin Image Override</p>
                        <input
                          type="url"
                          value={adminImageUrl}
                          onChange={(event) => setAdminImageUrl(event.target.value)}
                          placeholder="https://cdn.example.com/paris.jpg"
                          className="w-full text-sm px-3 py-2 rounded-md border border-border bg-background"
                        />
                        <input
                          type="text"
                          value={adminImageAlt}
                          onChange={(event) => setAdminImageAlt(event.target.value)}
                          placeholder="Paris Eiffel Tower city view"
                          className="w-full text-sm px-3 py-2 rounded-md border border-border bg-background mt-2"
                        />
                        <button
                          type="button"
                          onClick={handleAdminImageSave}
                          disabled={adminSaving || !adminImageUrl.trim()}
                          className="btn-outline mt-2 w-full disabled:opacity-60"
                        >
                          {adminSaving ? 'Saving...' : 'Save Image'}
                        </button>
                        <button
                          type="button"
                          onClick={handleAdminDelete}
                          disabled={adminSaving}
                          className="btn-outline mt-2 w-full text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-60"
                        >
                          {adminSaving ? 'Please wait...' : 'Delete Package'}
                        </button>
                        {versionHistory.length > 0 ? (
                          <div className="mt-4 rounded-md border border-border p-2">
                             <p className="text-xs uppercase text-muted-foreground mb-2">Package History</p>
                             {versionHistory.slice(0, 5).map((item) => (
                               <p key={item.id} className="text-xs text-muted-foreground">
                                 v{item.version_number} • {item.is_active ? 'Active' : 'Archived'} • {new Date(item.created_at).toLocaleDateString()}
                               </p>
                             ))}
                           </div>
                         ) : null}
                      </div>
                    ) : null}
                    <p className="text-sm text-muted-foreground text-center">
                      Need help? Contact our travel experts
                    </p>
                    <p className="text-primary font-medium text-center mt-1">
                      +91 9342180670
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
}
