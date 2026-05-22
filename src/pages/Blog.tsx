import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Calendar, 
  Clock, 
  User, 
  ArrowRight, 
  Bookmark, 
  MapPin, 
  Compass, 
  Mail, 
  Send, 
  ChevronRight, 
  BookOpen, 
  ArrowUp,
  Heart,
  Quote,
  TrendingUp,
  Sparkles,
  Award
} from 'lucide-react';
import { FaInstagram, FaLinkedinIn, FaYoutube, FaGoogle, FaXTwitter, FaFacebookF } from 'react-icons/fa6';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import blogsData from '@/data/blogs.json';
import { toast } from 'sonner';

/**
 * Premium 3D Tilt Card with dynamic, cursor-tracking radial spotlight glow
 */
const TiltCard = ({ children, className = "", glowColor = "rgba(255, 122, 0, 0.15)" }: { children: React.ReactNode; className?: string; glowColor?: string }) => {
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
        className="absolute inset-0 rounded-3xl pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
        style={{
          background: `radial-gradient(circle at var(--mx, 50%) var(--my, 50%), ${glowColor} 0%, transparent 60%)`
        }}
      />
      {children}
    </div>
  );
};

const Blog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [scrollY, setScrollY] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Parallax scrolling hooks
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setShowScrollTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle Bookmarks from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('travelmate_bookmarked_blogs');
    if (saved) {
      try {
        setBookmarkedIds(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let updated: string[];
    if (bookmarkedIds.includes(id)) {
      updated = bookmarkedIds.filter(bId => bId !== id);
      toast.info('Removed article from your saved collection.');
    } else {
      updated = [...bookmarkedIds, id];
      toast.success('Article bookmarked! Access it anytime in your dashboard.');
    }
    setBookmarkedIds(updated);
    localStorage.setItem('travelmate_bookmarked_blogs', JSON.stringify(updated));
  };

  // Preset categories as requested
  const categories = [
    'All',
    'Adventure',
    'Beach',
    'Mountains',
    'Food & Culture',
    'Solo Travel',
    'Luxury',
    'Road Trips',
    'Travel Tips'
  ];

  // Filtering blogs
  const filteredBlogs = useMemo(() => {
    return blogsData.filter((blog) => {
      const matchesSearch =
        blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blog.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blog.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = activeCategory === 'All' || blog.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  // Featured article: Picks the first Adventure or Mountain blog (conquering Ladakh or similar)
  const featuredArticle = useMemo(() => {
    return blogsData.find(b => b.id === "1") || blogsData[0];
  }, []);

  // Filter out featured article from the main grid to keep it premium and diverse
  const gridBlogs = useMemo(() => {
    if (activeCategory !== 'All') return filteredBlogs;
    return filteredBlogs.filter(b => b.id !== featuredArticle?.id);
  }, [filteredBlogs, featuredArticle, activeCategory]);

  // Handle Subscription
  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setIsSubscribed(true);
    toast.success('Welcome aboard! Immersive stories are flying to your inbox soon.', {
      icon: <Sparkles className="h-5 w-5 text-[#FF7A00]" />
    });
    setNewsletterEmail('');
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout hideFooter>
      <PageTransition>
        <div className="bg-[#111111] text-white min-h-screen relative overflow-hidden font-sans selection:bg-[#FF7A00] selection:text-white">
          
          {/* Ambient Glow Elements */}
          <div className="absolute w-[600px] h-[600px] bg-[#FF7A00]/5 rounded-full top-[-100px] left-[-200px] blur-[150px] pointer-events-none" />
          <div className="absolute w-[500px] h-[500px] bg-orange-600/5 rounded-full bottom-[10%] right-[-100px] blur-[130px] pointer-events-none" />

          {/* ================= SECTION 1: HERO SECTION ================= */}
          <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20">
            {/* Cinematic Background Image with Dark Vignette */}
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600"
                alt="Cinematic Landscape Road Trip" 
                className="w-full h-full object-cover brightness-[0.4] contrast-[1.05] transition-transform duration-700"
                style={{ transform: `translateY(${scrollY * 0.15}px) scale(1.05)` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#111111]/30 via-[#111111]/80 to-[#111111]" />
              <div className="absolute inset-0 bg-radial-vignette opacity-80" />
            </div>

            {/* Floating Animated Gradients */}
            <div className="absolute w-80 h-80 bg-[#FF7A00]/10 rounded-full top-1/3 left-1/4 blur-[100px] animate-pulse-glow pointer-events-none" />
            <div className="absolute w-96 h-96 bg-red-600/10 rounded-full bottom-1/4 right-1/4 blur-[120px] animate-pulse-glow pointer-events-none" style={{ animationDelay: '2s' }} />

            <div className="page-container relative z-10 text-center px-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[11px] font-bold uppercase tracking-widest text-[#FF7A00] mb-6 animate-fade-in shadow-lg">
                <Sparkles className="h-3.5 w-3.5" />
                The Storytellers Collective
              </div>

              <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight max-w-5xl mx-auto">
                Stories From Every
                <span className="block mt-2 bg-gradient-to-r from-[#FF7A00] via-[#FFA000] to-orange-400 bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(255,122,0,0.3)]">
                  Corner of the World
                </span>
              </h1>

              <div className="w-32 h-[3px] bg-gradient-to-r from-transparent via-[#FF7A00] to-transparent mx-auto mb-8 rounded-full" />

              <p className="text-gray-300 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10 font-light">
                Discover immersive narratives, hidden paths, and local secrets curated by TravelMate’s global community of passionate explorers.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => scrollToSection('featured')}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#FF7A00] to-orange-600 hover:brightness-110 hover:shadow-[0_0_35px_rgba(255,122,0,0.45)] active:scale-95 text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer shadow-lg"
                >
                  <BookOpen className="h-5 w-5" /> Start Reading
                </button>
                <button
                  onClick={() => scrollToSection('categories')}
                  className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md active:scale-95 text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-300"
                >
                  Explore Articles <ArrowRight className="h-5 w-5 text-[#FF7A00]" />
                </button>
              </div>
            </div>

            {/* Bottom Section Divider fading into dark backdrop */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#111111] to-transparent pointer-events-none" />
          </section>


          {/* ================= SECTION 2: FEATURED BLOG SECTION ================= */}
          {featuredArticle && (
            <section id="featured" className="py-16 md:py-24 page-container relative z-10">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-1.5 h-8 bg-gradient-to-b from-[#FF7A00] to-orange-600 rounded-full" />
                <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wide text-white">
                  Featured Odyssey
                </h2>
              </div>

              <TiltCard className="relative rounded-3xl overflow-hidden border border-white/5 group shadow-2xl bg-[#1c1c1c]/50 backdrop-blur-xl">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                  {/* Left Column: Image */}
                  <div className="lg:col-span-7 relative h-[300px] sm:h-[400px] lg:h-[500px] overflow-hidden">
                    <img 
                      src={featuredArticle.image} 
                      alt={featuredArticle.title} 
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-transparent lg:hidden" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1c1c1c]/20 to-[#1c1c1c]/90 hidden lg:block" />
                    <span className="absolute top-6 left-6 bg-[#FF7A00] text-white text-xs font-extrabold tracking-widest uppercase px-4 py-2 rounded-xl shadow-lg">
                      {featuredArticle.category}
                    </span>
                  </div>

                  {/* Right Column: Details */}
                  <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-center bg-[#1c1c1c]/90 backdrop-blur-xl">
                    <div className="flex flex-wrap items-center gap-4 text-gray-400 text-xs mb-4">
                      <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-[#FF7A00]" /> {new Date(featuredArticle.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-[#FF7A00]" /> {featuredArticle.readTime}</span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-4 line-clamp-3 group-hover:text-[#FF7A00] transition-colors leading-tight">
                      {featuredArticle.title}
                    </h3>

                    <p className="text-gray-300 text-sm leading-relaxed mb-6 font-light">
                      {featuredArticle.shortDescription}
                    </p>

                    <div className="flex items-center justify-between mt-4 pt-6 border-t border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF7A00] to-orange-600 p-[1.5px]">
                          <div className="w-full h-full bg-[#111] rounded-full flex items-center justify-center text-xs font-bold text-[#FF7A00]">
                            {featuredArticle.author.split(' ').map(n => n[0]).join('')}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white leading-none mb-1">{featuredArticle.author}</p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Travel Writer</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button 
                          onClick={(e) => toggleBookmark(featuredArticle.id, e)}
                          className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-[#FF7A00] hover:bg-white/10 transition-colors"
                        >
                          <Bookmark className={`h-4.5 w-4.5 ${bookmarkedIds.includes(featuredArticle.id) ? 'fill-[#FF7A00] text-[#FF7A00]' : ''}`} />
                        </button>

                        <Link 
                          to={`/blog/${featuredArticle.id}`}
                          className="px-5 py-3 bg-[#FF7A00] text-white hover:bg-orange-600 font-bold text-xs rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-md"
                        >
                          Read Story <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </section>
          )}


          {/* ================= SECTION 3: BLOG CATEGORIES SECTION ================= */}
          <section id="categories" className="py-12 bg-[#171717] border-y border-white/5 relative z-10">
            <div className="page-container px-4">
              <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                
                {/* Search Bar */}
                <div className="relative w-full md:w-80 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-[#FF7A00] transition-colors" />
                  <input
                    type="text"
                    placeholder="Search epic narratives..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#111111]/80 border border-white/10 focus:border-[#FF7A00] rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/25 transition-all duration-300 shadow-inner"
                  />
                </div>

                {/* Horizontal Scroll Categories */}
                <div className="w-full md:w-auto overflow-x-auto no-scrollbar scroll-smooth flex gap-2 pb-2 md:pb-0 pointer-events-auto">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 uppercase tracking-widest whitespace-nowrap active:scale-95 cursor-pointer ${
                        activeCategory === cat
                          ? 'bg-[#FF7A00] text-white shadow-lg shadow-orange-500/20 ring-2 ring-orange-500/35 border-transparent'
                          : 'bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>


          {/* ================= SECTION 4: BLOG GRID LAYOUT ================= */}
          <section className="py-20 page-container relative z-10">
            {gridBlogs.length === 0 ? (
              <div className="text-center py-20 bg-[#1c1c1c]/30 rounded-3xl border border-white/5 backdrop-blur-md">
                <Compass className="h-16 w-16 text-gray-600 mx-auto mb-4 animate-spin-slow" />
                <p className="text-gray-400 text-lg font-light">No travelogues found matching your criteria.</p>
                <button 
                  onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                  className="mt-4 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-[#FF7A00] transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {gridBlogs.map((blog) => (
                  <Link 
                    key={blog.id} 
                    to={`/blog/${blog.id}`}
                    className="group"
                  >
                    <TiltCard className="relative rounded-3xl overflow-hidden border border-white/5 bg-[#1c1c1c]/50 backdrop-blur-xl h-full flex flex-col hover:border-orange-500/20 transition-all duration-500 shadow-lg">
                      
                      {/* Image container */}
                      <div className="relative h-56 overflow-hidden">
                        <img 
                          src={blog.image} 
                          alt={blog.title} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="lazy"
                        />
                        {/* Shadow Gradients */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        
                        <span className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-md">
                          {blog.category}
                        </span>

                        <button
                          onClick={(e) => toggleBookmark(blog.id, e)}
                          className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-[#FF7A00] backdrop-blur-md border border-white/10 text-white rounded-xl transition-all duration-300 shadow-md group/bookmark cursor-pointer active:scale-90"
                        >
                          <Bookmark className={`h-4 w-4 ${bookmarkedIds.includes(blog.id) ? 'fill-white text-white' : 'text-gray-300'}`} />
                        </button>
                      </div>

                      {/* Card Body */}
                      <div className="p-6 flex flex-col flex-1">
                        <div className="flex items-center gap-3.5 text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-3">
                          <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-[#FF7A00]" /> {new Date(blog.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-[#FF7A00]" /> {blog.readTime}</span>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-3 line-clamp-2 leading-snug group-hover:text-[#FF7A00] transition-colors">
                          {blog.title}
                        </h3>

                        <p className="text-gray-400 text-xs leading-relaxed mb-6 line-clamp-2 min-h-[2.5rem] font-light">
                          {blog.shortDescription}
                        </p>

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-[#FF7A00]">
                              {blog.author.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-xs font-semibold text-gray-300">{blog.author}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-widest text-[#FF7A00] group-hover:translate-x-0.5 transition-transform">
                            Explore
                            <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>
                    </TiltCard>
                  </Link>
                ))}
              </div>
            )}
          </section>


          {/* ================= SECTION 5: TRAVEL QUOTE BANNER ================= */}
          <section className="relative py-28 md:py-36 overflow-hidden">
            {/* Parallax Background */}
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=1600" 
                alt="Starlit sky quote backdrop"
                className="w-full h-full object-cover brightness-[0.35]"
                style={{ transform: `translateY(${(scrollY - 2000) * 0.12}px) scale(1.1)` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#111111] via-transparent to-[#111111]" />
            </div>

            <div className="page-container relative z-10 text-center max-w-4xl px-4">
              <div className="w-16 h-16 rounded-full bg-[#FF7A00]/10 border border-[#FF7A00]/25 flex items-center justify-center mx-auto mb-8 shadow-md">
                <Quote className="h-6 w-6 text-[#FF7A00]" />
              </div>

              <blockquote className="text-2xl sm:text-4xl font-extrabold tracking-wide text-white leading-relaxed font-serif italic mb-8 drop-shadow-md">
                “Travel isn’t just about places — it’s about the <span className="bg-gradient-to-r from-[#FF7A00] to-orange-400 bg-clip-text text-transparent">moments that stay</span> with you forever.”
              </blockquote>

              <div className="w-12 h-1 bg-[#FF7A00] rounded-full mx-auto" />
            </div>
          </section>



          {/* ================= SECTION 7: TRENDING DESTINATIONS SECTION ================= */}
          <section className="py-20 bg-[#171717]/80 backdrop-blur-xl border-y border-white/5 relative z-10">
            <div className="page-container px-4">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1.5 h-8 bg-gradient-to-b from-[#FF7A00] to-orange-600 rounded-full" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[#FF7A00]">Curated Hotspots</span>
                  </div>
                  <h2 className="text-3xl font-extrabold text-white">Trending Destinations</h2>
                </div>
                <Link to="/packages" className="text-sm font-bold text-[#FF7A00] flex items-center gap-1.5 hover:text-orange-400 transition-colors mt-4 md:mt-0 active:scale-95">
                  View All Packages <ChevronRight className="h-4.5 w-4.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { name: "Ladakh", country: "India", desc: "The cold desert valley of high mountain passes and monasteries.", img: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800" },
                  { name: "Munnar", country: "India", desc: "Verdant rolling tea plantations and mist-laden valley paths.", img: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800" },
                  { name: "Goa", country: "India", desc: "Sunkissed sandy coves and slow coastal life by the sea.", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800" },
                  { name: "Udaipur", country: "India", desc: "Timeless palace architecture floating on majestic lake waters.", img: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800" }
                ].map((dest, idx) => (
                  <div key={idx} className="group relative h-80 rounded-3xl overflow-hidden border border-white/5 shadow-lg">
                    <img src={dest.img} alt={dest.name} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    
                    <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col justify-end h-full">
                      <div className="flex items-center gap-1 text-[#FF7A00] text-[9px] uppercase tracking-widest font-bold mb-1">
                        <MapPin className="h-3 w-3" />
                        {dest.country}
                      </div>
                      <h4 className="text-xl font-bold text-white mb-2">{dest.name}</h4>
                      <p className="text-gray-400 text-xs mb-4 line-clamp-2 leading-relaxed font-light">{dest.desc}</p>
                      
                      <Link 
                        to={`/packages?search=${dest.name}`}
                        className="px-4 py-2.5 bg-white/10 hover:bg-[#FF7A00] hover:text-white border border-white/10 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 w-full active:scale-95"
                      >
                        Explore <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>


          {/* ================= SECTION 8: NEWSLETTER SUBSCRIPTION ================= */}
          <section className="py-24 page-container relative z-10 px-4">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              {/* Gorgeous Sunset Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF7A00] via-orange-600 to-red-700 pointer-events-none" />
              <div className="absolute inset-0 bg-radial-vignette opacity-30" />
              <div className="absolute w-[500px] h-[500px] bg-yellow-400/25 blur-[120px] rounded-full top-[-100px] right-[-100px] pointer-events-none animate-pulse-glow" />

              <div className="relative z-10 px-6 sm:px-12 py-16 md:py-20 max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-[10px] uppercase font-bold tracking-widest text-white mb-6">
                  <Mail className="h-3.5 w-3.5" /> Journal Subscription
                </div>

                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight">
                  Let Travel Inspire Your Inbox
                </h2>

                <p className="text-white/80 text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-8 font-light">
                  Join 45,000+ wanderers who receive our monthly hand-picked itineraries, secret trails, and epic destination storytelling.
                </p>

                {isSubscribed ? (
                  <div className="p-6 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md max-w-md mx-auto text-white font-bold flex items-center justify-center gap-3 animate-fade-in shadow-lg">
                    <Sparkles className="h-5 w-5 text-yellow-300" />
                    Subscription Active! Safe Travels.
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pointer-events-auto">
                    <input
                      type="email"
                      required
                      placeholder="Enter your email address"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      className="flex-1 bg-black/25 border border-white/20 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white transition-all shadow-inner"
                    />
                    <button
                      type="submit"
                      className="px-8 py-4 bg-white hover:bg-orange-50 text-[#FF7A00] hover:text-orange-600 transition-all duration-300 rounded-2xl active:scale-95 font-bold flex items-center justify-center gap-2 shadow-lg shadow-black/10 cursor-pointer"
                    >
                      Subscribe <Send className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </section>


          {/* ================= SECTION 9: FOOTER ================= */}
          <footer className="bg-[#0b0b0b] border-t border-white/5 pt-20 pb-12 relative z-10">
            <div className="page-container px-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 pb-16 border-b border-white/5">
                
                {/* Brand Column */}
                <div className="md:col-span-4">
                  <Link to="/" className="inline-flex items-center gap-2 mb-6">
                    <Compass className="h-8 w-8 text-[#FF7A00]" />
                    <span className="text-xl font-black uppercase tracking-wider text-white">
                      Travel<span className="text-[#FF7A00]">Mate</span>
                    </span>
                  </Link>
                  <p className="text-gray-400 text-xs leading-relaxed max-w-sm mb-6 font-light">
                    An immersive travel ecosystem curating grand adventures, sustainable village guiding, and premium vacation design since 2026.
                  </p>
                  
                  {/* Social Handles */}
                  <div className="flex items-center gap-3">
                    {[
                      { icon: FaInstagram, href: "#" },
                      { icon: FaLinkedinIn, href: "#" },
                      { icon: FaYoutube, href: "#" },
                      { icon: FaXTwitter, href: "#" },
                      { icon: FaFacebookF, href: "#" }
                    ].map((soc, sIdx) => (
                      <a 
                        key={sIdx} 
                        href={soc.href} 
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:border-[#FF7A00] text-gray-400 hover:text-white flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#FF7A00]/10"
                      >
                        <soc.icon className="w-4.5 h-4.5" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Quick Navigation Links */}
                <div className="md:col-span-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-6">Explore</h5>
                  <ul className="space-y-4">
                    {[
                      { name: "Destinations", link: "/packages" },
                      { name: "About Us", link: "/about" },
                      { name: "Group Tours", link: "/packages?type=group" },
                      { name: "Adventure", link: "/packages?category=adventure" }
                    ].map((item, idx) => (
                      <li key={idx}>
                        <Link to={item.link} className="text-gray-400 hover:text-[#FF7A00] text-xs font-semibold transition-colors flex items-center gap-1 group">
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#FF7A00]" />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Company Coordinates */}
                <div className="md:col-span-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-6">Contact Us</h5>
                  <ul className="space-y-4 text-gray-400 text-xs font-semibold">
                    <li className="flex items-start gap-2.5">
                      <Mail className="h-4 w-4 text-[#FF7A00] shrink-0 mt-0.5" />
                      <a href="mailto:travemate713@gmail.com" className="hover:text-[#FF7A00] transition-colors">travemate713@gmail.com</a>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Compass className="h-4 w-4 text-[#FF7A00] shrink-0 mt-0.5" />
                      <a href="tel:+919342180670" className="hover:text-[#FF7A00] transition-colors">+91 93421 80670</a>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <MapPin className="h-4 w-4 text-[#FF7A00] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">Novel Tech Park, Opp. 1 MG Mall, MG Road, Bangalore, KA - 560042</span>
                    </li>
                  </ul>
                </div>

                {/* Safe Travels / Legal Columns */}
                <div className="md:col-span-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-6">Accreditations</h5>
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md flex items-start gap-3.5 shadow-md">
                    <Award className="h-5 w-5 text-[#FF7A00] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-white mb-1">Ministry of Tourism Approved</p>
                      <p className="text-[10px] text-gray-500 font-medium">Official Inbound & Outbound Vacation Operators. Reg: #TM-89410-KA</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Copyright & Subscriptions */}
              <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-gray-500 text-[10px] font-semibold uppercase tracking-widest gap-4">
                <p>&copy; {new Date().getFullYear()} TravelMate Pvt LTD. All rights reserved.</p>
                <div className="flex items-center gap-6">
                  <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                  <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                  <a href="#" className="hover:text-white transition-colors">Sitemap</a>
                </div>
              </div>

            </div>
          </footer>

          {/* Smooth Scroll-To-Top Button */}
          <button
            onClick={handleScrollTop}
            className={`fixed bottom-6 right-6 z-50 p-4 bg-[#FF7A00] hover:bg-orange-600 text-white rounded-2xl active:scale-95 transition-all duration-500 cursor-pointer shadow-lg shadow-orange-500/20 border border-orange-400/20 flex items-center justify-center ${
              showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
            aria-label="Scroll to top"
          >
            <ArrowUp className="h-5 w-5" />
          </button>

        </div>
      </PageTransition>
    </Layout>
  );
};

export default Blog;
