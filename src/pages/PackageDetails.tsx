import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, MapPin, Clock, Check, X, Download, ArrowLeft, Plane, Hotel, Utensils, Camera } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import {
  getPackageById,
  getPackageHistory,
  overridePackageCategories,
  overridePackageImage,
  type PackageVersionHistory,
  type TravelPackage,
} from '@/lib/packagesApi';
import { jsPDF } from 'jspdf';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import PackageImage from '@/components/common/PackageImage';

export default function PackageDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [packageData, setPackageData] = useState<TravelPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminCategoriesInput, setAdminCategoriesInput] = useState('');
  const [adminImageUrl, setAdminImageUrl] = useState('');
  const [adminImageAlt, setAdminImageAlt] = useState('');
  const [versionHistory, setVersionHistory] = useState<PackageVersionHistory[]>([]);
  const [adminSaving, setAdminSaving] = useState(false);
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
        setAdminCategoriesInput(pkg?.categories?.join(', ') || '');
        setAdminImageUrl(pkg?.imageUrl || '');
        setAdminImageAlt(pkg?.imageAlt || '');
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
  }, [id]);

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
    const categories = adminCategoriesInput
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    if (!categories.length) return;

    setAdminSaving(true);
    try {
      const updated = await overridePackageCategories(packageData.id, categories, adminToken);
      if (updated) {
        setPackageData(updated);
        setAdminCategoriesInput(updated.categories.join(', '));
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
                <span className="font-medium">{packageData.rating}</span>
                <span className="text-white/80">({packageData.reviews} reviews)</span>
              </div>
              {packageData.specialTags.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  {packageData.specialTags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-xs bg-emerald-500/90 text-white px-3 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
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

                <div className="bg-card rounded-xl p-6 shadow-card">
                  <h2 className="text-xl font-bold text-foreground mb-4">Available Dates</h2>
                  <div className="flex flex-wrap gap-2">
                    {packageData.availableDates.map((date) => (
                      <span key={date} className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary">
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

                {/* Day-by-Day Itinerary */}
                {itineraryDays.length > 0 && (
                  <div className="bg-card rounded-xl p-6 shadow-card">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Camera className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-foreground">Day-by-Day Itinerary</h2>
                        <p className="text-sm text-muted-foreground">Your complete travel journey</p>
                      </div>
                    </div>

                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-primary/20 hidden md:block" />

                      <div className="space-y-6">
                        {itineraryDays.map((day, index) => {
                          const night = itineraryNights.find((n) => n.night === day.day);

                          return (
                            <motion.div
                              key={day.day}
                              initial={{ opacity: 0, x: -20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: index * 0.1 }}
                              className="relative"
                            >
                              {/* Day marker */}
                              <div className="flex items-start gap-4">
                                <div className="relative z-10 flex-shrink-0">
                                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                                    <span className="text-primary-foreground font-bold text-lg">{day.day}</span>
                                  </div>
                                </div>

                                <div className="flex-1 bg-secondary/30 rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-colors">
                                  {/* Day header */}
                                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                                    <div>
                                      <span className="text-xs font-medium text-primary uppercase tracking-wider">Day {day.day}</span>
                                      <h3 className="text-lg font-semibold text-foreground">{day.title}</h3>
                                    </div>
                                    {index === 0 && (
                                      <span className="inline-flex items-center gap-1 text-xs bg-green-500/10 text-green-600 px-3 py-1 rounded-full w-fit">
                                        <Plane className="h-3 w-3" />
                                        Arrival Day
                                      </span>
                                    )}
                                    {index === itineraryDays.length - 1 && (
                                      <span className="inline-flex items-center gap-1 text-xs bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full w-fit">
                                        <Plane className="h-3 w-3" />
                                        Departure Day
                                      </span>
                                    )}
                                  </div>

                                  {/* Activities */}
                                  <div className="space-y-2 mb-4">
                                    {day.activities.map((activity, actIndex) => (
                                      <div key={actIndex} className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                        <span className="text-sm text-muted-foreground">{activity}</span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Accommodation info */}
                                  {night && (
                                    <div className="flex flex-wrap gap-4 pt-4 border-t border-border/50">
                                      <div className="flex items-center gap-2 text-sm">
                                        <Hotel className="h-4 w-4 text-primary" />
                                        <span className="text-foreground font-medium">{night.accommodation}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm">
                                        <Utensils className="h-4 w-4 text-primary" />
                                        <span className="text-muted-foreground">{night.meals}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
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
                          placeholder="domestic, honeymoon"
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
                      +91 93245 79945
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

