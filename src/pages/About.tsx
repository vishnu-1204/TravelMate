import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Compass, 
  Globe, 
  Calendar, 
  Sparkles, 
  Heart, 
  ShieldCheck, 
  Users, 
  Mail, 
  Phone, 
  Plane, 
  ArrowRight, 
  Award, 
  Instagram, 
  Linkedin, 
  Twitter, 
  Youtube,
  Send,
  MessageSquare,
  Map,
  Star
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';

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
    
    const rotateX = ((y - centerY) / centerY) * -7; 
    const rotateY = ((x - centerX) / centerX) * 7;
    
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
 * High-performance numerical counter that rolls smoothly ONLY when in viewport
 */
const RollingCounter = ({ target, duration = 1500, suffix = "" }: { target: number | string; duration?: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const [start, setStart] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);
  
  const numericTarget = typeof target === 'number' ? target : parseFloat(target.toString().replace(/[^0-9.]/g, ''));

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStart(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = elementRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  useEffect(() => {
    if (!start) return;
    
    let startTimestamp: number | null = null;
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      if (target === 4.9) {
        setCount(progress * 4.9);
      } else {
        setCount(Math.floor(progress * numericTarget));
      }
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [start, numericTarget, duration, target]);

  return (
    <span ref={elementRef} className="tabular-nums">
      {target === 4.9 
        ? count.toFixed(1)
        : count.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
};

// =========================================================================
// --- CORE DATA CONFIGURATIONS ---
// =========================================================================

const whyChooseUsData = [
  {
    icon: Compass,
    title: 'Smart Destination Discovery',
    description: 'Banish the endless scroll. Our smart, location-aware matching engine naturally pairs your vibe with the perfect, offbeat hideaway.'
  },
  {
    icon: Calendar,
    title: 'Easy Trip Planning',
    description: 'Customize itineraries, secure tickets, and select dates via a unified space built entirely around human simplicity.'
  },
  {
    icon: Sparkles,
    title: 'Personalized Recommendations',
    description: 'Handcrafted travel blueprints tailored around raw local insights, flexible budgets, and the type of explorer you are.'
  },
  {
    icon: Heart,
    title: 'Beautiful User Experience',
    description: 'Navigate an immersive, sunset-accented charcoal design made to feel like a high-end travel journal.'
  },
  {
    icon: ShieldCheck,
    title: 'Secure Booking Guarantee',
    description: 'Protected data frameworks, authenticated host interfaces, and verified Razorpay gateways ensure peace of mind.'
  },
  {
    icon: Users,
    title: 'Community First guided Tours',
    description: 'Support local ecosystems. All packages dynamically assign one of our 190+ vetted Indian guides for deep cultural roots.'
  }
];

const milestoneData = [
  {
    icon: Users,
    title: 'Active Travelers',
    description: 'Helping a diverse, curious collective of modern seekers step out of their comfort zones and map authentic memories.',
    metric: 10,
    suffix: 'K+'
  },
  {
    icon: Map,
    title: 'Destinations Explored',
    description: 'From the hidden, mist-veiled falls of Munnar to the pristine, forgotten high passes of the Himalayan borders.',
    metric: 500,
    suffix: '+'
  },
  {
    icon: Calendar,
    title: 'Trips Planned',
    description: 'Handcrafted itineraries mapped out with zero logistical friction, enabling pure, uninterrupted immersion.',
    metric: 25,
    suffix: 'K+'
  },
  {
    icon: Star,
    title: 'User Satisfaction',
    description: 'Consistently rated as an exceptional journey companion by independent backpackers, groups, and honeymooners.',
    metric: 4.9,
    suffix: '★'
  },
  {
    icon: Award,
    title: 'Featured in Travel Communities',
    description: 'Widely celebrated in international indie travel circles for championing localized tourism and authentic guiding.',
    label: 'Top 100'
  },
  {
    icon: Globe,
    title: 'Fast Growing Travel Platform',
    description: 'Setting a new digital gold standard for modern exploration while securing fair wages for regional guides.',
    label: '2x Growth'
  }
];

const teamData = [
  {
    name: 'Aarav Sharma',
    role: 'Founder & CEO',
    bio: 'Left a decade-long software career to map 4,000 miles of offbeat Indian trails. He believes TravelMate is a way to share the magic of raw, unchoreographed wandering.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'
  },
  {
    name: 'Sneha Nair',
    role: 'Head of Operations',
    bio: 'An expert mountaineer who has crossed 12 high-altitude passes. She makes sure every custom route has safe shelter, local trust, and zero corporate bureaucracy.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face'
  },
  {
    name: 'Kabir Verma',
    role: 'Lead Expedition Architect',
    bio: 'Spends eight months a year living out of a backpack to discover hidden homestays and maintain our direct network of 190+ professional local guides.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face'
  },
  {
    name: 'Ananya Reddy',
    role: 'Customer Care Lead',
    bio: 'Believes hospitality is a silent art form. Her 24/7 care team does not read from scripts—they are real travelers helping you navigate any unexpected detour.',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face'
  }
];

// =========================================================================
// --- MAIN ABOUT US PAGE ---
// =========================================================================

const About = () => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubscribed(true);
    setNewsletterEmail('');
    setTimeout(() => setSubscribed(false), 4000);
  };

  return (
    <Layout hideFooter>
      <PageTransition>
        <div className="bg-[#111111] text-white min-h-screen font-sans selection:bg-[#FF7A00] selection:text-white overflow-hidden relative">
          
          {/* Custom Cinematic Keyframes Injection */}
          <style>{`
            @keyframes growUnderline {
              from { transform: scaleX(0); }
              to { transform: scaleX(1); }
            }
            @keyframes floatEffect {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-8px); }
            }
            @keyframes softPulseGlow {
              0%, 100% { opacity: 0.15; filter: blur(140px); }
              50% { opacity: 0.25; filter: blur(160px); }
            }
            .animate-float {
              animation: floatEffect 6s ease-in-out infinite;
            }
            .animate-float-delayed {
              animation: floatEffect 6s ease-in-out infinite;
              animation-delay: 2s;
            }
            .animate-pulse-glow {
              animation: softPulseGlow 8s ease-in-out infinite;
            }
          `}</style>

          {/* =========================================================================
              SECTION 1: CINEMATIC HERO SECTION
              ========================================================================= */}
          <section className="relative min-h-[95vh] flex items-center justify-center py-20 px-4 overflow-hidden border-b border-white/5">
            {/* Parallax Hero Sunset Backdrop */}
            <ParallaxBackground 
              imageUrl="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80" 
              className="opacity-70 scale-105"
              speed={0.08}
            />
            
            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/85 to-black/35 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF7A00]/10 via-transparent to-orange-500/10 pointer-events-none" />

            {/* Glowing Sunset Ambient Backdrop */}
            <div className="absolute w-[600px] h-[600px] bg-orange-600/15 rounded-full top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse-glow" />

            <div className="relative page-container text-center max-w-4xl z-10 space-y-6">
              {/* Premium Glow Badge */}
              <ScrollReveal delay={100} direction="fade">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-[#FF7A00] hover:border-[#FF7A00]/40 transition-colors">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Built By Travelers, For Travelers
                </div>
              </ScrollReveal>

              {/* Bold Cinematic Heading */}
              <ScrollReveal delay={250} direction="up">
                <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight md:leading-none text-white">
                  Travel Beyond <br />
                  <span className="bg-gradient-to-r from-[#FF7A00] via-[#FFA000] to-orange-400 bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(255,122,0,0.3)]">
                    Boundaries
                  </span>
                </h1>
              </ScrollReveal>

              {/* Connected Emotional Subtitle */}
              <ScrollReveal delay={400} direction="up">
                <p className="text-lg md:text-xl text-gray-300 font-medium max-w-2xl mx-auto leading-relaxed">
                  Travel is not about ticking off boxes on a map. It's about the late-night tea at a roadside shack in the Himalayas, the sudden downpour that forces you to laugh, and the strangers who become lifelong friends. We build TravelMate because we've lived these moments, and we want you to live yours.
                </p>
              </ScrollReveal>

              {/* Action Buttons with Micro-animations */}
              <ScrollReveal delay={550} direction="up">
                <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link 
                    to="/packages" 
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#FF7A00] to-orange-600 hover:brightness-110 hover:shadow-[0_0_35px_rgba(255,122,0,0.45)] active:scale-95 text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer"
                  >
                    Explore Destinations <ArrowRight className="h-5 w-5" />
                  </Link>
                  <a 
                    href="#our-story" 
                    className="w-full sm:w-auto px-8 py-4 bg-[#222222]/50 hover:bg-[#333333]/70 border border-white/10 hover:border-orange-500/30 backdrop-blur-md active:scale-95 text-white font-bold rounded-2xl flex items-center justify-center transition-all duration-300"
                  >
                    Read Our Story
                  </a>
                </div>
              </ScrollReveal>
            </div>

          </section>

          {/* =========================================================================
              SECTION 2: OUR STORY SECTION (Campfire Storytelling)
              ========================================================================= */}
          <section id="our-story" className="py-24 bg-[#111111] relative border-b border-white/5">
            <div className="page-container">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                
                {/* Emotional Startup-style Narrative */}
                <div className="lg:col-span-6 space-y-6">
                  <ScrollReveal delay={100} direction="left" className="space-y-4">
                    <span className="text-sm font-bold uppercase tracking-wider text-[#FF7A00] block">Driven by the Call of the Wild</span>
                    
                    {/* Animated Underline on Heading */}
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white inline-block relative pb-4 group">
                      How a Campfire Sparked TravelMate
                      <span className="absolute bottom-0 left-0 w-24 h-[3px] bg-gradient-to-r from-[#FF7A00] to-orange-500 rounded-full scale-x-100 origin-left transition-transform duration-700" />
                    </h2>
                  </ScrollReveal>
                  
                  <ScrollReveal delay={200} direction="up" className="space-y-4 text-gray-300 leading-relaxed text-base pt-2 font-medium">
                    <p>
                      It began under a blanket of a million stars in a silent high-altitude meadow in Spiti. Huddled around a crackling pine campfire, holding metal cups of hot chai, three childhood friends had a realization: we had never felt more alive, yet we had never found a travel platform that understood <span className="text-[#FF7A00] font-bold">this</span> feeling. Everything online was a corporate catalog—packaged, sterilized, and optimized for transactions rather than transcendence.
                    </p>
                    <p>
                      So we quit our comfortable desk jobs to build something different. We created TravelMate as a sanctuary for the curious, a living bridge between you and the heartbeat of the land. We hand-mapped routes that aren't on tourist brochures. We forged direct friendships with local home hosts, horsemen, and village guides. When you plan a trip with us, you are not booking a package; you are stepping into a story carefully curated by someone who calls that mountain or coast their home.
                    </p>
                  </ScrollReveal>
                  
                  <ScrollReveal delay={300} direction="up">
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/20 backdrop-blur-md flex items-start gap-4 transition-all duration-500 group shadow-lg">
                      <Award className="h-8 w-8 text-[#FF7A00] flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-white mb-1">Our Immutable Pledge</h4>
                        <p className="text-sm text-gray-400">No tourist traps. No sterile itineraries. We commit to preserving local economies, protecting wild spaces, and ensuring every single trip supports regional guiding communities.</p>
                      </div>
                    </div>
                  </ScrollReveal>
                </div>

                {/* Overlapping Sunset Graphic Grid */}
                <div className="lg:col-span-6 relative">
                  <ScrollReveal delay={200} direction="right">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-400 rounded-3xl blur-[35px] opacity-15 pointer-events-none" />
                    
                    {/* Tilt Card with interactive glow */}
                    <TiltCard className="relative rounded-3xl overflow-hidden border border-white/10 group shadow-2xl">
                      <img 
                        src="https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=800&q=80" 
                        alt="Travel adventure campfire sunset" 
                        className="w-full h-[450px] object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      {/* Floating Accent Border Glass Card */}
                      <div className="absolute bottom-6 left-6 right-6 p-6 rounded-2xl bg-[#111111]/85 backdrop-blur border border-white/10 text-left">
                        <p className="text-[#FF7A00] font-bold text-xs uppercase tracking-wider mb-1">Our Philosophy</p>
                        <h4 className="text-white font-bold italic text-base">"We build with love, travel with humility, and welcome you to a collective that lives for the extraordinary."</h4>
                      </div>
                    </TiltCard>
                  </ScrollReveal>
                </div>

              </div>
            </div>
          </section>

          {/* =========================================================================
              SECTION 3: MISSION & VISION CARDS (3D Tilt & Gradient Borders)
              ========================================================================= */}
          <section className="py-24 bg-[#141414] relative border-b border-white/5">
            <div className="absolute w-[300px] h-[300px] bg-orange-600/10 blur-[100px] rounded-full top-1/2 left-10 pointer-events-none" />
            
            <div className="page-container">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                
                {/* Mission Card with Dynamic 3D Tilt */}
                <ScrollReveal delay={100} direction="up">
                  <TiltCard className="relative p-[1px] rounded-3xl bg-gradient-to-br from-orange-500/15 via-white/5 to-[#FF7A00]/25 hover:from-orange-500/40 transition-all duration-500 group shadow-xl">
                    <div className="bg-[#181818] rounded-[23px] p-8 h-full flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF7A00]/5 blur-2xl group-hover:bg-[#FF7A00]/10 transition-all rounded-full pointer-events-none" />
                      <div>
                        <div className="w-14 h-14 rounded-2xl bg-[#FF7A00]/10 border border-[#FF7A00]/25 flex items-center justify-center mb-6 group-hover:bg-[#FF7A00]/20 transition-all">
                          <Compass className="h-7 w-7 text-[#FF7A00]" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3 text-white">Our Mission</h3>
                        <p className="text-gray-300 leading-relaxed font-medium text-sm">
                          To simplify travel planning and make extraordinary, authentic journeys accessible to everyone. We handle the technical and logistical complexities so you can fully immerse yourself in the pure, unfiltered joy of discovery.
                        </p>
                      </div>
                    </div>
                  </TiltCard>
                </ScrollReveal>

                {/* Vision Card with Dynamic 3D Tilt */}
                <ScrollReveal delay={250} direction="up">
                  <TiltCard className="relative p-[1px] rounded-3xl bg-gradient-to-br from-orange-500/15 via-white/5 to-[#FF7A00]/25 hover:from-orange-500/40 transition-all duration-500 group shadow-xl">
                    <div className="bg-[#181818] rounded-[23px] p-8 h-full flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF7A00]/5 blur-2xl group-hover:bg-[#FF7A00]/10 transition-all rounded-full pointer-events-none" />
                      <div>
                        <div className="w-14 h-14 rounded-2xl bg-[#FF7A00]/10 border border-[#FF7A00]/25 flex items-center justify-center mb-6 group-hover:bg-[#FF7A00]/20 transition-all">
                          <Globe className="h-7 w-7 text-[#FF7A00]" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3 text-white">Our Vision</h3>
                        <p className="text-gray-300 leading-relaxed font-medium text-sm">
                          To connect humanity through shared, respectful travel experiences. We envision a future where responsible tourism is the default—fostering cultural preservation, protecting nature, and enriching local economies.
                        </p>
                      </div>
                    </div>
                  </TiltCard>
                </ScrollReveal>

              </div>
            </div>
          </section>

          {/* =========================================================================
              SECTION 4: MILESTONES WE'RE PROUD OF (Milestones Timeline/Grid UI)
              ========================================================================= */}
          <section className="py-24 bg-[#111111] relative border-b border-white/5">
            {/* Glowing Sunset Ambient Backdrop */}
            <div className="absolute w-[450px] h-[450px] bg-orange-600/10 blur-[130px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

            <div className="page-container relative z-10">
              
              <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                <ScrollReveal delay={100} direction="up" className="space-y-4">
                  <span className="text-sm font-bold uppercase tracking-wider text-[#FF7A00] block">Milestones We’re Proud Of</span>
                  
                  {/* Underline grows dynamically on reveal */}
                  <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white inline-block relative pb-4 group">
                    Milestones We’re Proud Of
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-[3px] bg-gradient-to-r from-[#FF7A00] to-orange-500 rounded-full" />
                  </h2>
                  <p className="text-gray-400 font-medium max-w-xl mx-auto pt-2">
                    Every milestone is a testament to the trust of our travelers, the safety of our pathways, and the passion of our community guides.
                  </p>
                </ScrollReveal>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {milestoneData.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <ScrollReveal key={index} delay={index * 100} direction="up">
                      <TiltCard 
                        className="relative p-[1px] rounded-3xl bg-gradient-to-br from-orange-500/15 via-white/5 to-[#FF7A00]/20 hover:from-orange-500/40 transition-all duration-500 group shadow-md"
                      >
                        <div className="bg-[#161616] p-6 rounded-[23px] h-full flex flex-col justify-between relative overflow-hidden group-hover:bg-[#1a1a1a] transition-colors">
                          {/* Inner soft glow background */}
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                          
                          <div>
                            <div className="w-12 h-12 rounded-xl bg-orange-600/10 border border-orange-600/10 group-hover:border-orange-500/35 flex items-center justify-center mb-4 transition-colors">
                              <IconComponent className="h-5 w-5 text-[#FF7A00] group-hover:scale-110 transition-transform duration-300" />
                            </div>
                            
                            {/* Counter rolls dynamically when scrolled into view */}
                            <div className="flex items-baseline gap-1 mb-2">
                              <h4 className="text-4xl font-black text-white group-hover:text-[#FF7A00] transition-colors tracking-tight">
                                {item.label ? item.label : <RollingCounter target={item.metric} suffix={item.suffix} />}
                              </h4>
                            </div>

                            <h5 className="font-bold text-base text-gray-200 mb-2">{item.title}</h5>
                            <p className="text-xs text-gray-400 leading-relaxed font-medium">{item.description}</p>
                          </div>
                        </div>
                      </TiltCard>
                    </ScrollReveal>
                  );
                })}
              </div>

            </div>
          </section>

          {/* =========================================================================
              SECTION 5: WHY CHOOSE TRAVELMATE GRID (Engineered for Exploration)
              ========================================================================= */}
          <section className="py-24 bg-[#141414] relative border-b border-white/5">
            <div className="page-container">
              
              <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                <ScrollReveal delay={100} direction="up" className="space-y-4">
                  <span className="text-sm font-bold uppercase tracking-wider text-[#FF7A00] block">Engineered For Exploration</span>
                  <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white inline-block relative pb-4 group">
                    Built to Make Travel Pure Again
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-[3px] bg-gradient-to-r from-[#FF7A00] to-orange-500 rounded-full" />
                  </h2>
                  <p className="text-gray-400 font-medium max-w-xl mx-auto pt-2">
                    We stripped out the corporate clutter and hidden fees to design an intuitive booking and routing experience that supports real regional guides.
                  </p>
                </ScrollReveal>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {whyChooseUsData.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <ScrollReveal key={index} delay={index * 80} direction="up">
                      <div 
                        className="group p-6 rounded-2xl bg-[#1e1e1e]/40 border border-white/5 hover:border-orange-500/20 backdrop-blur-md transition-all duration-300 hover:shadow-[0_8px_30px_rgba(255,122,0,0.08)] hover:-translate-y-1"
                      >
                        <div className="w-12 h-12 rounded-xl bg-orange-600/10 border border-orange-600/10 group-hover:border-orange-500/40 flex items-center justify-center mb-4 transition-colors">
                          <IconComponent className="h-5 w-5 text-[#FF7A00] group-hover:rotate-12 transition-transform duration-300" />
                        </div>
                        <h4 className="font-bold text-lg text-white mb-2 group-hover:text-orange-400 transition-colors">{item.title}</h4>
                        <p className="text-sm text-gray-400 leading-relaxed font-medium">{item.description}</p>
                      </div>
                    </ScrollReveal>
                  );
                })}
              </div>

            </div>
          </section>

          {/* =========================================================================
              SECTION 6: TEAM SECTION (Modern Startup profile cards)
              ========================================================================= */}
          <section className="py-24 bg-[#111111] relative border-b border-white/5">
            <div className="page-container">
              
              <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                <ScrollReveal delay={100} direction="up" className="space-y-4">
                  <span className="text-sm font-bold uppercase tracking-wider text-[#FF7A00] block">The Custodians</span>
                  <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white inline-block relative pb-4 group">
                    Meet Our Team
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-[3px] bg-gradient-to-r from-[#FF7A00] to-orange-500 rounded-full" />
                  </h2>
                  <p className="text-gray-400 font-medium max-w-xl mx-auto pt-2">
                    A wild collective of mountaineers, software engineers, and global backpackers working to make your lifetime memories flawless.
                  </p>
                </ScrollReveal>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {teamData.map((member, index) => (
                  <ScrollReveal key={index} delay={index * 120} direction="up" className="flex">
                    <div 
                      className="group rounded-3xl overflow-hidden bg-[#1a1a1a]/60 border border-white/5 hover:border-orange-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-600/5 hover:-translate-y-1.5 text-center flex flex-col w-full"
                    >
                      {/* Profile Photo */}
                      <div className="relative h-64 overflow-hidden">
                        <img 
                          src={member.image} 
                          alt={member.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent opacity-80" />
                      </div>

                      {/* Details */}
                      <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <h4 className="text-lg font-bold text-white group-hover:text-[#FF7A00] transition-colors">{member.name}</h4>
                          <p className="text-xs uppercase tracking-wider font-bold text-gray-400 mb-2">{member.role}</p>
                          <p className="text-xs text-gray-400 leading-relaxed font-medium">{member.bio}</p>
                        </div>

                        {/* Social handles */}
                        <div className="flex items-center justify-center gap-3 pt-3">
                          <a href="#" className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-[#FF7A00] hover:text-white transition-all" title="Instagram">
                            <Instagram className="h-3.5 w-3.5" />
                          </a>
                          <a href="#" className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-[#FF7A00] hover:text-white transition-all" title="LinkedIn">
                            <Linkedin className="h-3.5 w-3.5" />
                          </a>
                          <a href="#" className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-[#FF7A00] hover:text-white transition-all" title="Twitter">
                            <Twitter className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>

            </div>
          </section>

          {/* =========================================================================
              SECTION 7: PREMIUM CUSTOM CINEMATIC QUOTE BANNER (No generic Wanderer text)
              ========================================================================= */}
          <section className="relative py-36 px-4 overflow-hidden border-b border-white/5 text-center flex items-center justify-center">
            {/* High-fidelity parallax background layout */}
            <ParallaxBackground 
              imageUrl="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1920&q=80"
              className="opacity-25"
              speed={0.15}
            />
            
            {/* Cinematic dark gradients */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#111111] via-[#111111]/70 to-[#111111] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF7A00]/5 via-transparent to-orange-500/5 pointer-events-none" />

            <div className="relative page-container max-w-4xl z-10 space-y-6">
              <ScrollReveal delay={100} direction="fade">
                <MessageSquare className="h-10 w-10 text-[#FF7A00] mx-auto opacity-70 mb-2 animate-bounce" />
              </ScrollReveal>
              
              {/* Premium Centered Custom Quote Banner */}
              <ScrollReveal delay={250} direction="up">
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight md:px-12">
                  “Every destination holds a story — <br className="hidden md:inline" />
                  TravelMate helps you <span className="text-[#FF7A00] italic">live it</span>.”
                </h2>
              </ScrollReveal>
              
              <ScrollReveal delay={400} direction="fade">
                <div className="w-16 h-[3px] bg-gradient-to-r from-[#FF7A00] to-orange-500 rounded-full mx-auto mt-4" />
              </ScrollReveal>
            </div>
          </section>

          {/* =========================================================================
              SECTION 8: PREMIUM SUNSET CUSTOM FOOTER
              ========================================================================= */}
          <footer className="bg-[#0f0f0f] border-t border-white/5 pt-16 pb-8 relative z-20">
            <div className="page-container space-y-12">
              
              {/* Brand, Navigation Links, and Interactive Newsletter Subscription */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                
                {/* Brand and Bio */}
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
                    <a href="#" className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-[#FF7A00] hover:text-white transition-colors" title="Instagram"><Instagram className="h-4 w-4" /></a>
                    <a href="#" className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-[#FF7A00] hover:text-white transition-colors" title="LinkedIn"><Linkedin className="h-4 w-4" /></a>
                    <a href="#" className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-[#FF7A00] hover:text-white transition-colors" title="YouTube"><Youtube className="h-4 w-4" /></a>
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
                      <li><Link to="/about" className="hover:text-[#FF7A00] transition-colors text-white font-bold">About Page</Link></li>
                      <li><Link to="/contact" className="hover:text-[#FF7A00] transition-colors">Contact Support</Link></li>
                      <li><Link to="/profile" className="hover:text-[#FF7A00] transition-colors">Profile Details</Link></li>
                    </ul>
                  </div>
                </div>

                {/* Interactive Subscription Form */}
                <div className="lg:col-span-4 space-y-4">
                  <h5 className="font-bold text-sm text-white uppercase tracking-wider border-l-2 border-[#FF7A00] pl-2">Newsletter Subscription</h5>
                  <p className="text-xs text-gray-400 font-medium">Get the latest travel deals, offbeat destination guides, and visual inspiration straight in your mailbox.</p>
                  
                  {subscribed ? (
                    <div className="p-3 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold text-center">
                      ✓ Subscribed successfully! Check your inbox soon.
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

              {/* Standardized support details, office coordinates, and copyright */}
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

export default About;
