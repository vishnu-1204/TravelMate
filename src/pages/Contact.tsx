import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  CheckCircle2, 
  MessageSquare, 
  Instagram, 
  Facebook, 
  Linkedin, 
  Clock,
  Loader2,
  AlertCircle,
  Sparkles,
  Youtube,
  Twitter,
  Globe,
  Plane,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import { toast } from '@/components/ui/use-toast';
import { BACKEND_URL } from '@/lib/apiConfig';

// =========================================================================
// --- CONTACT VALIDATION SCHEMA ---
// =========================================================================

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  phone: z.string().trim().min(1, 'Phone number is required').max(20),
  subject: z.string().trim().min(1, 'Subject selection is required').max(200),
  message: z.string().trim().min(5, 'Message must be at least 5 characters').max(2000),
});

type ContactFormData = z.infer<typeof contactSchema>;

// =========================================================================
// --- PREMIUM SUB-COMPONENTS (NATIVE PERFORMANCE WIDGETS) ---
// =========================================================================

/**
 * High-performance scroll reveal component utilizing native IntersectionObserver
 */
const ScrollReveal = ({ 
  children, 
  className = "", 
  delay = 0,
  direction = "up"
}: { 
  children: React.ReactNode; 
  className?: string; 
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "fade"
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -50px 0px' }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  const getDirectionClass = () => {
    switch (direction) {
      case "up": return isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-12 scale-[0.98]";
      case "down": return isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-12 scale-[0.98]";
      case "left": return isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12";
      case "right": return isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12";
      case "fade": return isVisible ? "opacity-100" : "opacity-0";
      default: return isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12";
    }
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) ${getDirectionClass()} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

/**
 * Cross-device high-fidelity scroll parallax background
 */
const ParallaxBackground = ({ imageUrl, className = "", speed = 0.12 }: { imageUrl: string; className?: string; speed?: number }) => {
  const [offset, setOffset] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const scrolled = window.scrollY;
      const elementTop = rect.top + scrolled;
      const viewportHeight = window.innerHeight;
      
      const relativePosition = (scrolled + viewportHeight / 2) - (elementTop + rect.height / 2);
      setOffset(relativePosition * speed);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none">
      <div 
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat ${className}`}
        style={{ 
          backgroundImage: `url(${imageUrl})`,
          transform: `translateY(${offset}px) scale(1.18)`,
          transition: 'transform 0.15s cubic-bezier(0.1, 0.8, 0.2, 1)'
        }}
      />
    </div>
  );
};

/**
 * Premium 3D Tilt Card with dynamic, cursor-tracking radial spotlight glow
 */
const TiltCard = ({ children, className = "", glowColor = "rgba(255, 122, 0, 0.12)" }: { children: React.ReactNode; className?: string; glowColor?: string }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -6; 
    const rotateY = ((x - centerX) / centerX) * 6;
    
    card.style.setProperty('--rx', `${rotateX}deg`);
    card.style.setProperty('--ry', `${rotateY}deg`);
    
    const pctX = (x / rect.width) * 100;
    const pctY = (y / rect.height) * 100;
    card.style.setProperty('--mx', `${pctX}%`);
    card.style.setProperty('--my', `${pctY}%`);
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
    card.style.setProperty('--mx', '50%');
    card.style.setProperty('--my', '50%');
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-all duration-500 ease-out [transform-style:preserve-3d] ${className}`}
      style={{
        transform: 'perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))',
      } as React.CSSProperties}
    >
      <div 
        className="absolute inset-0 rounded-[23px] pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
        style={{
          background: `radial-gradient(circle at var(--mx, 50%) var(--my, 50%), ${glowColor} 0%, transparent 60%)`
        }}
      />
      {children}
    </div>
  );
};

/**
 * Custom smooth FAQ accordion widget
 */
const FAQItem = ({ question, answer, isOpen, onClick }: { question: string; answer: string; isOpen: boolean; onClick: () => void }) => {
  return (
    <div className="border-b border-white/5 py-4">
      <button
        onClick={onClick}
        type="button"
        className="w-full flex items-center justify-between text-left py-4 text-white hover:text-[#FF7A00] transition-colors focus:outline-none group"
      >
        <span className="font-bold text-base md:text-lg transition-colors duration-300">{question}</span>
        <span className={`text-[#FF7A00] font-light transform transition-transform duration-300 text-3xl leading-none ${isOpen ? 'rotate-45' : 'rotate-0'}`}>
          +
        </span>
      </button>
      <div 
        className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[300px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
      >
        <p className="text-sm md:text-base text-gray-400 leading-relaxed font-medium pb-5 pl-1">
          {answer}
        </p>
      </div>
    </div>
  );
};

// =========================================================================
// --- CONTACT PAGE COMPONENT ---
// =========================================================================

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  
  // Accordion active index
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Newsletter states
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Something went wrong');
      }

      setIsSuccess(true);
      toast({
        title: "Message Sent",
        description: "Thank you for contacting us. We'll be in touch soon!",
      });
      reset();
    } catch (error: any) {
      setServerError(error.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubscribed(true);
    setNewsletterEmail('');
    setTimeout(() => setSubscribed(false), 4000);
  };

  const contactCards = [
    {
      icon: Mail,
      title: 'Email Address',
      subtitle: 'Write to our architects',
      value: 'travemate713@gmail.com',
      action: 'mailto:travemate713@gmail.com'
    },
    {
      icon: Phone,
      title: 'Phone Number',
      subtitle: 'Call our traveler desk',
      value: '+91 93421 80670',
      action: 'tel:+919342180670'
    },
    {
      icon: MapPin,
      title: 'Office Location',
      subtitle: 'Visit our Marina hub',
      value: 'Marina Beach Rd, Chennai',
      action: '#interactive-map'
    },
    {
      icon: Clock,
      title: 'Support Hours',
      subtitle: 'Empathetic guidance',
      value: 'Mon - Sat: 9am - 8pm',
      action: '#'
    }
  ];

  const faqItems = [
    {
      question: 'How can I plan a trip using TravelMate?',
      answer: 'Simply head over to our "Packages" page to explore our hand-crafted, offbeat itineraries. Once you choose a destination, you can customize your dates, select optional add-ons, and secure your booking in minutes. Our platform handles all guide assignments and route planning behind the scenes.'
    },
    {
      question: 'Does TravelMate offer personalized recommendations?',
      answer: 'Yes, absolutely! We believe every traveler has a unique vibe. By selecting your interests on our platform or reaching out directly to our expedition architects, we can custom-build an itinerary that matches your pace, budget, and sense of adventure.'
    },
    {
      question: 'Can I save my favorite destinations?',
      answer: 'Definitely. Once you create a free TravelMate account, you can bookmark any package or destination by clicking the heart icon. Saved trips will appear in your private profile dashboard for easy planning later.'
    },
    {
      question: 'How quickly does support respond?',
      answer: 'Our dedicated traveler support desk operates 24/7. For general inquiries through our contact form, we guarantee a personalized response within 12 to 24 hours. For active bookings on the road, our live emergency desk responds instantly.'
    }
  ];

  const socialLinks = [
    { icon: Instagram, href: "https://instagram.com/travelmate", label: "Instagram", color: "hover:bg-gradient-to-tr hover:from-yellow-500 hover:via-pink-500 hover:to-purple-600 hover:text-white" },
    { icon: Twitter, href: "https://twitter.com/travelmate", label: "Twitter", color: "hover:bg-black hover:text-white" },
    { icon: Facebook, href: "https://facebook.com/travelmate", label: "Facebook", color: "hover:bg-blue-600 hover:text-white" },
    { icon: Youtube, href: "https://youtube.com/travelmate", label: "YouTube", color: "hover:bg-red-600 hover:text-white" },
    { icon: Linkedin, href: "https://linkedin.com/company/travelmate", label: "LinkedIn", color: "hover:bg-blue-700 hover:text-white" }
  ];

  return (
    <Layout hideFooter>
      <PageTransition>
        <div className="bg-[#111111] text-white min-h-screen font-sans selection:bg-[#FF7A00] selection:text-white overflow-hidden relative">
          
          {/* Custom Cinematic Styles Injection */}
          <style>{`
            @keyframes softPulseGlow {
              0%, 100% { opacity: 0.15; filter: blur(140px); }
              50% { opacity: 0.25; filter: blur(160px); }
            }
            .animate-pulse-glow {
              animation: softPulseGlow 8s ease-in-out infinite;
            }
          `}</style>

          {/* =========================================================================
              SECTION 1: CINEMATIC HERO SECTION
              ========================================================================= */}
          <section className="relative min-h-[55vh] flex items-center justify-center py-20 px-4 overflow-hidden border-b border-white/5">
            {/* Cinematic Travel Background Image */}
            <ParallaxBackground 
              imageUrl="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1920&q=80" 
              className="opacity-60 scale-105"
              speed={0.06}
            />
            
            {/* Immersive Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/80 to-black/35 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF7A00]/10 via-transparent to-orange-500/10 pointer-events-none" />

            {/* Glowing Sunset Ambient Backdrop */}
            <div className="absolute w-[500px] h-[500px] bg-orange-600/15 rounded-full top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse-glow" />

            <div className="relative page-container text-center max-w-4xl z-10 space-y-5">
              {/* Glow Badge */}
              <ScrollReveal delay={100} direction="fade">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-[#FF7A00] hover:border-[#FF7A00]/40 transition-all duration-300">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" /> 24/7 Compassionate Support
                </div>
              </ScrollReveal>

              {/* Bold Cinematic Heading */}
              <ScrollReveal delay={250} direction="up">
                <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight md:leading-none">
                  Let’s Plan Your <br />
                  <span className="bg-gradient-to-r from-[#FF7A00] via-[#FFA000] to-orange-400 bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(255,122,0,0.3)]">
                    Next Adventure
                  </span>
                </h1>
              </ScrollReveal>

              {/* Short Emotional Subtitle */}
              <ScrollReveal delay={400} direction="up">
                <p className="text-base md:text-lg text-gray-300 font-medium max-w-2xl mx-auto leading-relaxed">
                  Have a question about a route, need customized trip design, or simply want to share a campfire story? Our expedition architects are waiting to connect with you.
                </p>
              </ScrollReveal>
            </div>
          </section>

          {/* =========================================================================
              SECTION 2: CONTACT INFORMATION SECTION
              ========================================================================= */}
          <section className="py-16 bg-[#111111] relative border-b border-white/5">
            <div className="page-container">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {contactCards.map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <ScrollReveal key={idx} delay={idx * 100} direction="up">
                      <TiltCard 
                        className="relative p-[1px] rounded-3xl bg-gradient-to-br from-orange-500/10 via-white/5 to-[#FF7A00]/15 hover:from-orange-500/35 transition-all duration-500 group shadow-md"
                      >
                        <a 
                          href={card.action} 
                          className="block bg-[#161616] p-6 rounded-[23px] h-full relative overflow-hidden group-hover:bg-[#1a1a1a] transition-all duration-300"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                          
                          <div className="w-12 h-12 rounded-xl bg-orange-600/10 border border-orange-600/10 group-hover:border-orange-500/35 flex items-center justify-center mb-4 transition-colors">
                            <Icon className="h-5 w-5 text-[#FF7A00] group-hover:scale-110 transition-transform duration-300" />
                          </div>

                          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{card.subtitle}</p>
                          <h4 className="text-lg font-black text-white mb-2 group-hover:text-[#FF7A00] transition-colors">{card.title}</h4>
                          <p className="text-sm text-gray-300 font-semibold leading-relaxed break-words">{card.value}</p>
                        </a>
                      </TiltCard>
                    </ScrollReveal>
                  );
                })}
              </div>
            </div>
          </section>

          {/* =========================================================================
              SECTION 3: CONTACT FORM SECTION
              ========================================================================= */}
          <section className="py-24 bg-[#141414] relative border-b border-white/5">
            <div className="absolute w-[400px] h-[400px] bg-orange-600/5 blur-[120px] rounded-full top-1/2 left-10 pointer-events-none" />

            <div className="page-container max-w-4xl mx-auto">
              <ScrollReveal delay={100} direction="up" className="text-center mb-12 space-y-4">
                <span className="text-sm font-bold uppercase tracking-wider text-[#FF7A00] block">Send Us A Message</span>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white inline-block relative pb-4">
                  Tell Us About Your Journey
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-[3px] bg-gradient-to-r from-[#FF7A00] to-orange-500 rounded-full" />
                </h2>
                <p className="text-gray-400 font-medium max-w-lg mx-auto pt-2">
                  Complete the form below and an expedition logisticians will personally reach back to you within 12 to 24 hours.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={250} direction="up">
                <div className="relative p-[1px] rounded-3xl bg-gradient-to-br from-orange-500/10 via-white/5 to-[#FF7A00]/15 hover:from-orange-500/35 transition-all duration-700 shadow-2xl">
                  <div className="bg-[#181818] rounded-[23px] p-8 md:p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
                    
                    {isSuccess ? (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-4">Message Sent Successfully!</h3>
                        <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto font-medium">
                          Thank you for connecting with TravelMate. We've routed your inquiry to our expedition leads, and we will get back to you shortly.
                        </p>
                        <button 
                          onClick={() => { setIsSuccess(false); setServerError(null); }} 
                          className="px-8 py-4 bg-gradient-to-r from-[#FF7A00] to-orange-600 hover:brightness-110 hover:shadow-[0_0_25px_rgba(255,122,0,0.3)] active:scale-95 text-white font-bold rounded-2xl transition-all duration-300 cursor-pointer"
                        >
                          Send Another Message
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        
                        {serverError && (
                          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm font-semibold">
                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                            <p>{serverError}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Full Name */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider ml-1">Full Name</label>
                            <input 
                              {...register('name')}
                              type="text" 
                              className={`w-full px-5 py-4 rounded-2xl bg-[#111111]/70 border ${errors.name ? 'border-red-500' : 'border-white/5'} focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00] outline-none text-white transition-all duration-300 font-semibold placeholder:text-gray-600`}
                              placeholder="e.g. Aarav Sharma" 
                            />
                            {errors.name && <p className="text-xs text-red-400 font-bold ml-1">{errors.name.message}</p>}
                          </div>
                          
                          {/* Email Address */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider ml-1">Email Address</label>
                            <input 
                              {...register('email')}
                              type="email" 
                              className={`w-full px-5 py-4 rounded-2xl bg-[#111111]/70 border ${errors.email ? 'border-red-500' : 'border-white/5'} focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00] outline-none text-white transition-all duration-300 font-semibold placeholder:text-gray-600`}
                              placeholder="e.g. aarav@gmail.com" 
                            />
                            {errors.email && <p className="text-xs text-red-400 font-bold ml-1">{errors.email.message}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Phone Number */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider ml-1">Phone Number</label>
                            <input 
                              {...register('phone')}
                              type="tel" 
                              className={`w-full px-5 py-4 rounded-2xl bg-[#111111]/70 border ${errors.phone ? 'border-red-500' : 'border-white/5'} focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00] outline-none text-white transition-all duration-300 font-semibold placeholder:text-gray-600`}
                              placeholder="e.g. +91 93421 80670" 
                            />
                            {errors.phone && <p className="text-xs text-red-400 font-bold ml-1">{errors.phone.message}</p>}
                          </div>
                          
                          {/* Subject Dropdown */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider ml-1">Subject of Inquiry</label>
                            <select 
                              {...register('subject')}
                              className={`w-full px-5 py-4 rounded-2xl bg-[#111111] border ${errors.subject ? 'border-red-500' : 'border-white/5'} focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00] outline-none text-white transition-all duration-300 font-semibold cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FF7A00%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22/%3E%3C/svg%3E')] bg-[length:12px_12px] bg-[right_1.5rem_center] bg-no-repeat`}
                            >
                              <option value="" className="bg-[#181818] text-gray-400">Select Subject</option>
                              <option value="General Inquiry" className="bg-[#181818]">General Inquiry</option>
                              <option value="Booking & Custom Packages" className="bg-[#181818]">Booking & Custom Packages</option>
                              <option value="Cancellation & Refunds" className="bg-[#181818]">Cancellation & Refunds</option>
                              <option value="Tour Guide Partnerships" className="bg-[#181818]">Tour Guide Partnerships</option>
                              <option value="Other Inquiries" className="bg-[#181818]">Other Inquiries</option>
                            </select>
                            {errors.subject && <p className="text-xs text-red-400 font-bold ml-1">{errors.subject.message}</p>}
                          </div>
                        </div>

                        {/* Message Box */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-300 uppercase tracking-wider ml-1">Message Details</label>
                          <textarea 
                            {...register('message')}
                            rows={5} 
                            className={`w-full px-5 py-4 rounded-2xl bg-[#111111]/70 border ${errors.message ? 'border-red-500' : 'border-white/5'} focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00] outline-none text-white transition-all duration-300 font-semibold placeholder:text-gray-600 resize-none`}
                            placeholder="Tell us everything about your dream destination, dates, and travelers..." 
                          />
                          {errors.message && <p className="text-xs text-red-400 font-bold ml-1">{errors.message.message}</p>}
                        </div>

                        {/* Submit Button */}
                        <button 
                          type="submit" 
                          disabled={isSubmitting}
                          className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-orange-600 hover:brightness-110 hover:shadow-[0_0_35px_rgba(255,122,0,0.35)] active:scale-95 text-white font-bold rounded-2xl flex items-center justify-center gap-3 group transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            <>
                              Send Message
                              <Send className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* =========================================================================
              SECTION 4: INTERACTIVE MAP SECTION
              ========================================================================= */}
          <section id="interactive-map" className="py-24 bg-[#111111] relative border-b border-white/5">
            <div className="page-container">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center max-w-6xl mx-auto">
                
                {/* Text Description */}
                <div className="lg:col-span-5 space-y-6">
                  <ScrollReveal delay={100} direction="left" className="space-y-4">
                    <span className="text-sm font-bold uppercase tracking-wider text-[#FF7A00] block">Global Connectivity</span>
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white inline-block relative pb-4">
                      Our Travel Hub
                      <span className="absolute bottom-0 left-0 w-20 h-[3px] bg-gradient-to-r from-[#FF7A00] to-orange-500 rounded-full" />
                    </h2>
                  </ScrollReveal>
                  <ScrollReveal delay={200} direction="up" className="space-y-4 text-gray-300 font-medium leading-relaxed">
                    <p>
                      Located along the pristine coastline of Chennai, our travel hub serves as the operations control center for thousands of journeys planned across India.
                    </p>
                    <p>
                      Whether coordinating mountain permits in Ladakh or securing houseboats in the backwaters of Alleppey, our central logisticians synchronize guides and schedules here in real time. We are a bridge that connects passionate minds to raw, local, and authentic guiding networks globally.
                    </p>
                  </ScrollReveal>
                </div>

                {/* Styled Dark Mode Map Frame Container */}
                <div className="lg:col-span-7">
                  <ScrollReveal delay={200} direction="right">
                    <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl h-[400px]">
                      <iframe
                        title="TravelMate Marina Beach Hub Location"
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.918519495146!2d80.25266947514937!3d13.047190187213444!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a52662c12401f11%3A0xed0176d6556e4c27!2sMarina%20Beach!5e0!3m2!1sen!2sin!4v1709400000000!5m2!1sen!2sin"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="w-full h-full border-0 filter invert-[90%] hue-rotate-[180deg] brightness-[88%] contrast-[95%] opacity-85 hover:opacity-100 transition-opacity duration-500"
                      />
                    </div>
                  </ScrollReveal>
                </div>

              </div>
            </div>
          </section>

          {/* =========================================================================
              SECTION 5: FAQ SECTION (Expandable Accordion)
              ========================================================================= */}
          <section className="py-24 bg-[#141414] relative border-b border-white/5">
            <div className="page-container max-w-4xl mx-auto">
              
              <div className="text-center mb-16 space-y-4">
                <ScrollReveal delay={100} direction="up" className="space-y-4">
                  <span className="text-sm font-bold uppercase tracking-wider text-[#FF7A00] block">Got Questions?</span>
                  <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white inline-block relative pb-4">
                    Frequently Asked Questions
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-[3px] bg-gradient-to-r from-[#FF7A00] to-orange-500 rounded-full" />
                  </h2>
                </ScrollReveal>
              </div>

              <ScrollReveal delay={200} direction="up">
                <div className="bg-[#181818] p-6 md:p-8 rounded-3xl border border-white/5 shadow-xl">
                  {faqItems.map((item, index) => (
                    <FAQItem 
                      key={index}
                      question={item.question}
                      answer={item.answer}
                      isOpen={openFaqIndex === index}
                      onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                    />
                  ))}
                </div>
              </ScrollReveal>

            </div>
          </section>

          {/* =========================================================================
              SECTION 6: SOCIAL MEDIA SECTION (Circular Icons & Hover Glows)
              ========================================================================= */}
          <section className="py-24 bg-[#111111] relative border-b border-white/5 text-center">
            {/* Glowing Backdrop */}
            <div className="absolute w-[350px] h-[350px] bg-orange-600/5 blur-[120px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

            <div className="page-container max-w-3xl mx-auto relative z-10 space-y-8">
              <ScrollReveal delay={100} direction="up" className="space-y-4">
                <span className="text-sm font-bold uppercase tracking-wider text-[#FF7A00] block">Join the Clan</span>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
                  Follow Our Journey
                </h2>
                <p className="text-gray-400 font-medium max-w-lg mx-auto">
                  We are a living community of backpackers. Follow our stories and visual expedition logs across social networks!
                </p>
              </ScrollReveal>

              <ScrollReveal delay={250} direction="up">
                <div className="flex items-center justify-center gap-5 flex-wrap">
                  {socialLinks.map((social, idx) => {
                    const Icon = social.icon;
                    return (
                      <a 
                        key={idx}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-14 h-14 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-gray-300 transition-all duration-300 scale-100 active:scale-90 ${social.color} hover:shadow-[0_0_25px_rgba(255,122,0,0.35)] hover:-translate-y-1.5`}
                        aria-label={social.label}
                        title={social.label}
                      >
                        <Icon className="h-5 w-5" />
                      </a>
                    );
                  })}
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* =========================================================================
              SECTION 7: PREMIUM NEWSLETTER SECTION (Orange Sunset Gradient)
              ========================================================================= */}
          <section className="py-24 px-4 relative overflow-hidden border-b border-white/5 flex items-center justify-center">
            {/* Gorgeous Orange Sunset Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF7A00] via-orange-600 to-red-700 pointer-events-none" />
            
            {/* Soft glowing bubbles for depth */}
            <div className="absolute w-[500px] h-[500px] bg-yellow-400/20 blur-[130px] rounded-full top-[-100px] right-[-100px] pointer-events-none" />
            <div className="absolute w-[400px] h-[400px] bg-red-500/25 blur-[120px] rounded-full bottom-[-100px] left-[-100px] pointer-events-none" />

            <div className="relative page-container max-w-4xl z-10 text-center space-y-6 text-white">
              <ScrollReveal delay={100} direction="fade">
                <Globe className="h-10 w-10 text-white mx-auto opacity-90 mb-2 animate-pulse" />
              </ScrollReveal>

              <ScrollReveal delay={250} direction="up" className="space-y-3">
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
                  Get the Secret Map
                </h2>
                <p className="text-base md:text-lg text-white/90 max-w-xl mx-auto font-semibold">
                  Subscribe to receive offbeat itinerary planning sheets, seasonal discounts, and hand-written guides straight to your inbox.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={400} direction="up">
                <div className="max-w-md mx-auto">
                  {subscribed ? (
                    <div className="p-4 bg-white/10 border border-white/20 text-white rounded-2xl text-sm font-bold text-center backdrop-blur-md">
                      ✓ Subscribed successfully! Get ready for adventure.
                    </div>
                  ) : (
                    <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                      <input 
                        type="email" 
                        required
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        placeholder="Enter email address" 
                        className="bg-black/25 text-sm font-semibold px-5 py-4 rounded-2xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-white flex-1 text-white placeholder:text-white/60 backdrop-blur-md transition-all font-sans"
                      />
                      <button 
                        type="submit" 
                        className="px-8 py-4 bg-white hover:bg-orange-50 hover:text-[#FF7A00] transition-colors duration-300 rounded-2xl text-[#FF7A00] active:scale-95 font-bold flex items-center justify-center cursor-pointer shadow-lg"
                      >
                        Subscribe
                      </button>
                    </form>
                  )}
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* =========================================================================
              SECTION 8: FOOTER (Matches TravelMate branding)
              ========================================================================= */}
          <footer className="bg-[#0f0f0f] border-t border-white/5 pt-16 pb-8 relative z-20">
            <div className="page-container space-y-12">
              
              {/* Brand and Links Upper Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                
                {/* Logo & Bio */}
                <div className="lg:col-span-4 space-y-4">
                  <Link to="/" className="flex items-center gap-2">
                    <Plane className="h-7 w-7 text-[#FF7A00] -rotate-45" />
                    <span className="text-xl font-bold tracking-wider text-white">
                      Travel<span className="text-[#FF7A00]">Mate</span>
                    </span>
                  </Link>
                  <p className="text-sm text-gray-400 max-w-xs leading-relaxed font-medium">
                    Connecting adventurous minds to raw, unforgettable routes across India and the globe.
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <a href="https://instagram.com/travelmate" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-[#FF7A00] hover:text-white transition-colors" title="Instagram"><Instagram className="h-4 w-4" /></a>
                    <a href="https://linkedin.com/company/travelmate" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-[#FF7A00] hover:text-white transition-colors" title="LinkedIn"><Linkedin className="h-4 w-4" /></a>
                    <a href="https://youtube.com/travelmate" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-[#FF7A00] hover:text-white transition-colors" title="YouTube"><Youtube className="h-4 w-4" /></a>
                  </div>
                </div>

                {/* Quick Navigation Links */}
                <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-bold text-sm text-white uppercase tracking-wider mb-4 border-l-2 border-[#FF7A00] pl-2">Explore</h5>
                    <ul className="space-y-2 text-sm text-gray-400 font-medium">
                      <li><Link to="/" className="hover:text-[#FF7A00] transition-colors">Home</Link></li>
                      <li><Link to="/packages" className="hover:text-[#FF7A00] transition-colors">Packages</Link></li>
                      <li><Link to="/blog" className="hover:text-[#FF7A00] transition-colors">Stories</Link></li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white uppercase tracking-wider mb-4 border-l-2 border-[#FF7A00] pl-2">About Us</h5>
                    <ul className="space-y-2 text-sm text-gray-400 font-medium">
                      <li><Link to="/about" className="hover:text-[#FF7A00] transition-colors">About Page</Link></li>
                      <li><Link to="/contact" className="hover:text-[#FF7A00] transition-colors text-white font-bold">Contact Support</Link></li>
                      <li><Link to="/profile" className="hover:text-[#FF7A00] transition-colors">Profile Details</Link></li>
                    </ul>
                  </div>
                </div>

                {/* Interactive Subscription */}
                <div className="lg:col-span-4 space-y-4">
                  <h5 className="font-bold text-sm text-white uppercase tracking-wider border-l-2 border-[#FF7A00] pl-2">Newsletter</h5>
                  <p className="text-xs text-gray-400 font-medium">Get the latest travel deals and visual guides straight to your mailbox.</p>
                  
                  {subscribed ? (
                    <div className="p-3 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold text-center">
                      ✓ Subscribed successfully!
                    </div>
                  ) : (
                    <form onSubmit={handleSubscribe} className="flex gap-2">
                      <input 
                        type="email" 
                        required
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        placeholder="Enter email address" 
                        className="bg-[#1a1a1a] text-xs font-bold px-4 py-3 rounded-xl border border-white/5 focus:outline-none focus:ring-2 focus:ring-[#FF7A00] flex-1 text-white placeholder:text-gray-500 transition-all"
                      />
                      <button 
                        type="submit" 
                        className="p-3 bg-[#FF7A00] hover:bg-orange-600 transition-colors rounded-xl text-white active:scale-95 flex items-center justify-center cursor-pointer"
                        title="Subscribe"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </div>

              </div>

              {/* Lower details */}
              <div className="border-t border-white/5 pt-8 text-center text-xs text-gray-400 space-y-4 font-medium">
                <div className="flex flex-wrap items-center justify-center gap-6 text-gray-400 text-[13px]">
                  <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-[#FF7A00]" /> +91 93421 80670</span>
                  <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-[#FF7A00]" /> travemate713@gmail.com</span>
                  <span>📍 Chennai Head Office | Bangalore Corporate Office</span>
                </div>
                <p>&copy; {new Date().getFullYear()} TravelMate Pvt Ltd. Designed with absolute cinematic precision. All rights reserved.</p>
              </div>

            </div>
          </footer>

        </div>
      </PageTransition>
    </Layout>
  );
};

export default Contact;
