import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, MapPin, Clock, Check, X, Download, ArrowLeft, Plane, Hotel, Utensils, Camera } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import packagesData from '@/data/packages.json';
import { jsPDF } from 'jspdf';
import { motion } from 'framer-motion';

interface PackageItinerary {
  days: { day: number; title: string; activities: string[] }[];
  nights: { night: number; accommodation: string; meals: string }[];
}

interface Package {
  id: string;
  category: string;
  title: string;
  location: string;
  duration: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  description: string;
  highlights: string[];
  included: string[];
  excluded: string[];
  itinerary?: PackageItinerary;
}

const PackageDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const packageData = (packagesData as Package[]).find((pkg) => pkg.id === id);

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
    doc.text(`${packageData.location} | ${packageData.duration}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const descLines = doc.splitTextToSize(packageData.description, pageWidth - 40);
    doc.text(descLines, 20, yPosition);
    yPosition += descLines.length * 6 + 15;

    if (packageData.itinerary?.days) {
      doc.setFontSize(16);
      doc.setTextColor(30, 64, 175);
      doc.text('Day-by-Day Itinerary', 20, yPosition);
      yPosition += 10;

      packageData.itinerary.days.forEach((day) => {
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
          doc.text(`• ${activity}`, 25, yPosition);
          yPosition += 6;
        });
        yPosition += 5;
      });
    }

    if (packageData.itinerary?.nights) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      yPosition += 10;
      doc.setFontSize(16);
      doc.setTextColor(30, 64, 175);
      doc.text('Accommodation Details', 20, yPosition);
      yPosition += 10;

      packageData.itinerary.nights.forEach((night) => {
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
    doc.text(`Price: ₹${packageData.price} per person`, 20, yPosition);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('TravelWise - Your Trusted Travel Partner', pageWidth / 2, 285, { align: 'center' });

    doc.save(`${packageData.title.replace(/\s+/g, '-')}-Itinerary.pdf`);
  };

  return (
    <Layout>
      <PageTransition>
        {/* Hero Image */}
        <div className="relative h-[400px] md:h-[500px]">
          <img
            src={packageData.image}
            alt={packageData.title}
            className="w-full h-full object-cover"
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
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 font-serif">
                {packageData.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-white/90">
                <div className="flex items-center gap-1">
                  <MapPin className="h-5 w-5" />
                  <span>{packageData.location}</span>
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

                {/* Day-by-Day Itinerary */}
                {packageData.itinerary && (
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
                        {packageData.itinerary.days.map((day, index) => {
                          const night = packageData.itinerary?.nights.find(n => n.night === day.day);
                          
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
                                    {index === packageData.itinerary!.days.length - 1 && (
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
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-card rounded-xl p-6 shadow-card sticky top-24">
                  <div className="text-center mb-6">
                    <p className="text-muted-foreground text-sm">Starting from</p>
                    <p className="text-4xl font-bold text-primary">₹{packageData.price}</p>
                    <p className="text-muted-foreground text-sm">per person</p>
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
};

export default PackageDetails;
