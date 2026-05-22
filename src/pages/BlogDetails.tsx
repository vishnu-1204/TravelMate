import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  User, 
  ArrowLeft, 
  ArrowRight, 
  Bookmark, 
  Share2, 
  Heart, 
  MessageSquare, 
  Send, 
  ThumbsUp, 
  Compass, 
  Award, 
  Mail, 
  MapPin, 
  X,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { FaInstagram, FaLinkedinIn, FaYoutube, FaXTwitter, FaFacebookF } from 'react-icons/fa6';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import blogsData from '@/data/blogs.json';
import { toast } from 'sonner';

// Custom Type for Comments
interface CommentType {
  id: string;
  name: string;
  avatar: string;
  content: string;
  date: string;
  likes: number;
  isLiked?: boolean;
  replies?: CommentType[];
}

// Custom Author Profiles Mapping
const authorProfiles: Record<string, { role: string; bio: string; avatar: string }> = {
  "Aarav Sharma": {
    role: "Lead Photojournalist & Adventurer",
    bio: "A photojournalist and motorcycle enthusiast who has spent the last decade documenting remote high-altitude cultures across the Himalayas and Central Asia.",
    avatar: "AS"
  },
  "Ananya Sen": {
    role: "Slow-Travel Advocate & Coastal Correspondent",
    bio: "A marine biologist turned slow-travel advocate who spends her seasons uncovering hidden sandy coves, quiet fishing villages, and ocean conservation stories.",
    avatar: "AS"
  },
  "Amit Patel": {
    role: "Adventure Alpinist & Mountain Guide",
    bio: "An alpine climber and mountain safety expert who has successfully guided treks and summited twelve Himalayan peaks over 6,000 meters.",
    avatar: "AP"
  },
  "Kavita Nair": {
    role: "Culinary Anthropologist & Food Writer",
    bio: "A culinary anthropologist traveling from street stalls to royal kitchens, documenting spice routes, ancient recipes, and regional cooking traditions.",
    avatar: "KN"
  },
  "Rohan Verma": {
    role: "Solo Expeditionist & Author",
    bio: "A minimalist writer who believes in traveling with a single backpack and spending weeks in remote mountain villages to understand localized lifestyles.",
    avatar: "RV"
  },
  "Sneha Reddy": {
    role: "Heritage Curator & Architecture Designer",
    bio: "A luxury hospitality designer and heritage writer who curates historical stays, architectural restoration efforts, and royal history tours.",
    avatar: "SR"
  },
  "Vikram Singh": {
    role: "Overland Explorer & Off-Road Instructor",
    bio: "A professional driver and overland explorer who has driven across 24 Indian states, chasing severe monsoons and high-altitude mud trails.",
    avatar: "VS"
  },
  "Rahul Verma": {
    role: "Backpacking Evangelist & Hostel Founder",
    bio: "A budget backpacking pioneer and founder of several youth travel collectives. Dedicated to helping people see the world on a shoestring budget.",
    avatar: "RV"
  }
};

// Rich Visual Gallery Collections tailored to categories
const thematicGalleries: Record<string, string[]> = {
  "Adventure": [
    "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800",
    "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800",
    "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=800",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800"
  ],
  "Beach": [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
    "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=800",
    "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800"
  ],
  "Mountains": [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
    "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800",
    "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=800",
    "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800"
  ],
  "Food & Culture": [
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800",
    "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800",
    "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=800"
  ],
  "Solo Travel": [
    "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800",
    "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"
  ],
  "Luxury": [
    "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800",
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800",
    "https://images.unsplash.com/photo-1546548970-71785318a17b?w=800",
    "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=800"
  ],
  "Road Trips": [
    "https://images.unsplash.com/photo-1546548970-71785318a17b?w=800",
    "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800",
    "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=800"
  ],
  "Travel Tips": [
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800",
    "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800",
    "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800"
  ]
};

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

const BlogDetails = () => {
  const { id } = useParams();
  const blog = blogsData.find((b) => b.id === id);

  const [bookmarked, setBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(148);
  const [isLiked, setIsLiked] = useState(false);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [activeLightbox, setActiveLightbox] = useState<string | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Framer motion scroll listener for top progress bar
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Load Bookmarks and Mock Comments
  useEffect(() => {
    window.scrollTo({ top: 0 });

    if (blog) {
      // Check if bookmarked
      const saved = localStorage.getItem('travelmate_bookmarked_blogs');
      if (saved) {
        try {
          const list = JSON.parse(saved);
          setBookmarked(list.includes(blog.id));
        } catch (e) {
          console.error(e);
        }
      }

      // Populate unique high-quality mock comments tailored to the article
      const mockComments: CommentType[] = [
        {
          id: "c1",
          name: "Aarav Dev",
          avatar: "AD",
          content: `This is pure poetry! The descriptions of the places in your article are so vivid. I felt the crisp mountain air on my face. Definitely bookmarking this!`,
          date: "2 days ago",
          likes: 24,
          replies: [
            {
              id: "c1_r1",
              name: blog.author,
              avatar: blog.author.split(' ').map(n => n[0]).join(''),
              content: `Thank you, Aarav! Hearing that means a lot. Make sure to slow down and embrace the quiet corners when you embark on your next journey.`,
              date: "1 day ago",
              likes: 12
            }
          ]
        },
        {
          id: "c2",
          name: "Meera Iyer",
          avatar: "MI",
          content: `Absolutely beautiful read. The photography tips and cultural insights are extremely helpful. Did you hire local guides or navigate this completely solo?`,
          date: "3 days ago",
          likes: 15,
          replies: []
        }
      ];
      setComments(mockComments);
    }
  }, [blog]);

  if (!blog) {
    return (
      <Layout hideFooter>
        <PageTransition>
          <div className="min-h-[70vh] flex items-center justify-center bg-[#111] text-white">
            <div className="text-center p-8 bg-[#1c1c1c] border border-white/5 rounded-3xl backdrop-blur-md shadow-2xl">
              <Compass className="h-16 w-16 text-[#FF7A00] mx-auto mb-4 animate-spin-slow" />
              <h1 className="text-3xl font-extrabold mb-4">Wanderlust Lost</h1>
              <p className="text-gray-400 text-sm mb-6">The chronicle you are searching for has dissolved into the mountain mist.</p>
              <Link to="/blog" className="px-6 py-3 bg-[#FF7A00] hover:bg-orange-600 font-bold rounded-xl text-xs uppercase tracking-widest text-white inline-block transition-colors active:scale-95 shadow-lg">
                Back to Archives
              </Link>
            </div>
          </div>
        </PageTransition>
      </Layout>
    );
  }

  // Related articles filter
  const relatedBlogs = blogsData
    .filter((b) => b.category === blog.category && b.id !== blog.id)
    .slice(0, 3);

  // Author details mapping
  const authorInfo = authorProfiles[blog.author] || {
    role: "Co-Explorer & Travel Contributor",
    bio: "A passionate storytelling globetrotter bringing regional stories and landscape photography from quiet corners of the earth.",
    avatar: blog.author.split(' ').map(n => n[0]).join('')
  };

  // Thematic gallery images mapping
  const gallery = thematicGalleries[blog.category] || thematicGalleries["Adventure"];

  // Toggle Bookmark
  const handleToggleBookmark = () => {
    const saved = localStorage.getItem('travelmate_bookmarked_blogs');
    let list: string[] = [];
    if (saved) {
      try { list = JSON.parse(saved); } catch (e) {}
    }

    if (bookmarked) {
      list = list.filter(bId => bId !== blog.id);
      toast.info('Story removed from saved collection.');
    } else {
      list = [...list, blog.id];
      toast.success('Story bookmarked successfully! Access it on your profile.');
    }
    setBookmarked(!bookmarked);
    localStorage.setItem('travelmate_bookmarked_blogs', JSON.stringify(list));
  };

  // Toggle Like
  const handleLike = () => {
    if (isLiked) {
      setLikesCount(prev => prev - 1);
      setIsLiked(false);
    } else {
      setLikesCount(prev => prev + 1);
      setIsLiked(true);
      toast.success('Liked! Glad this travelogue resonated with you.', {
        icon: <Heart className="h-4.5 w-4.5 fill-red-500 text-red-500" />
      });
    }
  };

  // Submit comment
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName.trim() || !commentText.trim()) return;

    const newComment: CommentType = {
      id: `c_${Date.now()}`,
      name: commentName.trim(),
      avatar: commentName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || "X",
      content: commentText.trim(),
      date: "Just now",
      likes: 0,
      replies: []
    };

    setComments(prev => [newComment, ...prev]);
    toast.success('Comment published! Thank you for participating.');
    setCommentName('');
    setCommentText('');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard! Share the adventure.');
  };

  // Newsletter Submit
  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setIsSubscribed(true);
    toast.success('Welcome! Seamless storytelling coordinates are in flight to your inbox.', {
      icon: <Sparkles className="h-5 w-5 text-[#FF7A00]" />
    });
    setNewsletterEmail('');
  };

  // Parsing content paragraphs into cinematic subblocks
  const contentParagraphs = blog.content.split('\n\n');

  return (
    <Layout hideFooter>
      <PageTransition>
        <div className="bg-[#111111] text-white min-h-screen relative overflow-hidden font-sans selection:bg-[#FF7A00] selection:text-white">
          
          {/* ================= STICKY READING PROGRESS BAR ================= */}
          <motion.div 
            className="fixed top-16 left-0 right-0 h-[4px] bg-[#FF7A00] z-50 origin-left"
            style={{ scaleX }}
          />

          {/* Background Ambient Glows */}
          <div className="absolute w-[600px] h-[600px] bg-[#FF7A00]/5 rounded-full top-[-100px] left-[-200px] blur-[150px] pointer-events-none" />
          <div className="absolute w-[500px] h-[500px] bg-orange-600/5 rounded-full bottom-[20%] right-[-100px] blur-[130px] pointer-events-none" />

          {/* ================= SECTION 1: HERO BANNER SECTION ================= */}
          <section className="relative min-h-[95vh] flex items-end justify-center overflow-hidden pb-16 md:pb-24 pt-20">
            <div className="absolute inset-0 z-0">
              <motion.img 
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1.05, opacity: 0.4 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                src={blog.image} 
                alt={blog.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/70 to-black/40" />
              <div className="absolute inset-0 bg-radial-vignette opacity-70" />
            </div>

            <div className="page-container relative z-10 px-4 max-w-5xl">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex flex-col items-start"
              >
                {/* Category Badge */}
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[10px] font-extrabold uppercase tracking-widest text-[#FF7A00] mb-6 shadow-md shadow-black/10">
                  <Compass className="h-3.5 w-3.5 animate-spin-slow" />
                  {blog.category}
                </span>

                {/* Main Article Title */}
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight max-w-4xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                  {blog.title}
                </h1>

                {/* Subtitle / Excerpt */}
                <p className="text-gray-300 text-base sm:text-xl font-light leading-relaxed max-w-3xl mb-8">
                  {blog.shortDescription}
                </p>

                <div className="w-24 h-[3px] bg-gradient-to-r from-[#FF7A00] to-orange-500 rounded-full mb-8" />

                {/* Author Metadata */}
                <div className="flex flex-wrap items-center justify-between w-full gap-6 pt-6 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF7A00] to-orange-600 p-[1.5px] shadow-lg">
                      <div className="w-full h-full bg-[#111] rounded-full flex items-center justify-center text-sm font-bold text-[#FF7A00]">
                        {authorInfo.avatar}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white leading-none mb-1">{blog.author}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">{authorInfo.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-[#FF7A00]" /> {new Date(blog.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-[#FF7A00]" /> {blog.readTime}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ================= FLOATING ACTION DOCK (STICKY INTERACTION) ================= */}
          <div className="fixed left-6 bottom-8 z-40 hidden xl:flex flex-col gap-3">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLike}
              className={`p-3.5 rounded-2xl border backdrop-blur-md flex items-center justify-center shadow-lg transition-colors cursor-pointer group ${
                isLiked 
                  ? 'bg-red-500/10 border-red-500/35 text-red-500' 
                  : 'bg-[#1c1c1c]/90 border-white/5 text-gray-400 hover:text-red-500 hover:border-red-500/20'
              }`}
              aria-label="Like story"
            >
              <Heart className={`h-5 w-5 transition-transform group-hover:scale-110 ${isLiked ? 'fill-red-500' : ''}`} />
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleToggleBookmark}
              className={`p-3.5 rounded-2xl border backdrop-blur-md flex items-center justify-center shadow-lg transition-colors cursor-pointer group ${
                bookmarked 
                  ? 'bg-[#FF7A00]/10 border-[#FF7A00]/35 text-[#FF7A00]' 
                  : 'bg-[#1c1c1c]/90 border-white/5 text-gray-400 hover:text-[#FF7A00] hover:border-[#FF7A00]/20'
              }`}
              aria-label="Bookmark story"
            >
              <Bookmark className={`h-5 w-5 transition-transform group-hover:scale-110 ${bookmarked ? 'fill-[#FF7A00]' : ''}`} />
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className="p-3.5 bg-[#1c1c1c]/90 border border-white/5 backdrop-blur-md text-gray-400 hover:text-[#FF7A00] hover:border-[#FF7A00]/20 rounded-2xl flex items-center justify-center shadow-lg cursor-pointer transition-colors group"
              aria-label="Copy share link"
            >
              <Share2 className="h-5 w-5 transition-transform group-hover:rotate-12" />
            </motion.button>
          </div>


          {/* ================= SECTION 3: MAIN READING LAYOUT ================= */}
          <section className="py-16 md:py-24 page-container relative z-10 px-4">
            <div className="max-w-3xl mx-auto">
              
              {/* Drop-caps introduction */}
              <div className="prose prose-invert max-w-none">
                {contentParagraphs.map((para, idx) => {
                  if (para.startsWith('## ')) {
                    return (
                      <h2 key={idx} className="text-2xl sm:text-3xl font-extrabold text-white mt-12 mb-4 flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-gradient-to-b from-[#FF7A00] to-orange-600 rounded-full" />
                        {para.replace('## ', '')}
                      </h2>
                    );
                  }

                  // Apply Drop Cap style on the very first paragraph
                  if (idx === 0) {
                    const firstChar = para.charAt(0);
                    const restText = para.slice(1);
                    return (
                      <p key={idx} className="text-gray-300 text-base sm:text-lg leading-relaxed mb-6 font-light">
                        <span className="float-left text-5xl sm:text-6xl font-black text-[#FF7A00] pr-2.5 pt-1.5 leading-[0.8] bg-gradient-to-br from-[#FF7A00] to-orange-500 bg-clip-text text-transparent font-serif select-none">
                          {firstChar}
                        </span>
                        {restText}
                      </p>
                    );
                  }

                  return (
                    <p key={idx} className="text-gray-300 text-base sm:text-lg leading-relaxed mb-6 font-light">
                      {para}
                    </p>
                  );
                })}
              </div>

              {/* Cinematic Inline Quote Highlight Box */}
              <div className="my-10 p-8 rounded-3xl bg-[#1c1c1c]/40 border border-white/5 hover:border-[#FF7A00]/25 backdrop-blur-md flex gap-4 transition-all duration-500 group shadow-lg">
                <span className="text-4xl text-[#FF7A00] font-serif select-none leading-none opacity-50 shrink-0">“</span>
                <div>
                  <p className="text-gray-200 text-base sm:text-lg leading-relaxed font-light italic mb-2">
                    {blog.shortDescription}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-extrabold">— Core Revelation</p>
                </div>
              </div>


              {/* ================= SECTION 4: TRAVEL IMAGE GALLERY ================= */}
              <div className="my-14">
                <h3 className="text-xl font-bold uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-[#FF7A00] animate-pulse-glow" />
                  Chronicle Imagery
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {gallery.map((imgUrl, imgIdx) => (
                    <div 
                      key={imgIdx} 
                      onClick={() => setActiveLightbox(imgUrl)}
                      className={`group relative overflow-hidden rounded-2xl cursor-pointer border border-white/5 shadow-md ${
                        imgIdx === 0 || imgIdx === 3 ? 'col-span-2' : ''
                      }`}
                    >
                      <div className="h-44 sm:h-52 relative">
                        <img 
                          src={imgUrl} 
                          alt={`Chronicle visual ${imgIdx + 1}`} 
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="px-4 py-2 bg-black/60 border border-white/10 rounded-xl text-white text-[10px] uppercase font-bold tracking-wider backdrop-blur-sm">
                            Expand
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </section>


          {/* ================= LIGHTBOX PREVIEW MODAL ================= */}
          <AnimatePresence>
            {activeLightbox && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
              >
                <button 
                  onClick={() => setActiveLightbox(null)}
                  className="absolute top-6 right-6 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
                <motion.div 
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className="max-w-4xl max-h-[80vh] rounded-2xl overflow-hidden border border-white/10"
                >
                  <img src={activeLightbox} alt="Expanded visual preview" className="w-full h-full object-contain" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>


          {/* ================= SECTION 5: CINEMATIC FULL-WIDTH QUOTE BANNER ================= */}
          <section className="relative py-28 md:py-36 overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img 
                src={blog.image} 
                alt="Quote backdrop"
                className="w-full h-full object-cover brightness-[0.3]"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#111111] via-transparent to-[#111111]" />
            </div>

            <div className="page-container relative z-10 text-center max-w-4xl px-4">
              <span className="text-[#FF7A00] text-sm uppercase tracking-widest font-extrabold mb-6 block">Soul Expeditions</span>
              <blockquote className="text-2xl sm:text-4xl font-extrabold tracking-wide text-white leading-relaxed font-serif italic mb-8 drop-shadow-md">
                “Some journeys change your location. <span className="bg-gradient-to-r from-[#FF7A00] to-orange-400 bg-clip-text text-transparent">The best ones</span> change your soul.”
              </blockquote>
              <div className="w-12 h-1 bg-[#FF7A00] rounded-full mx-auto" />
            </div>
          </section>


          {/* ================= SECTION 6: AUTHOR SECTION ================= */}
          <section className="py-16 page-container relative z-10 px-4">
            <div className="max-w-3xl mx-auto">
              <TiltCard className="p-8 sm:p-10 rounded-3xl border border-white/5 bg-[#1c1c1c]/50 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF7A00]/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Author Initial Circle Avatar */}
                  <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-black text-[#FF7A00] shrink-0 shadow-lg">
                    {authorInfo.avatar}
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <h4 className="text-xl font-bold text-white">{blog.author}</h4>
                        <p className="text-xs text-[#FF7A00] font-bold uppercase tracking-wider mt-0.5">{authorInfo.role}</p>
                      </div>
                      
                      <div className="flex items-center justify-center sm:justify-start gap-2.5">
                        {[
                          { icon: FaInstagram, href: "#" },
                          { icon: FaLinkedinIn, href: "#" },
                          { icon: FaXTwitter, href: "#" }
                        ].map((soc, sIdx) => (
                          <a 
                            key={sIdx} 
                            href={soc.href} 
                            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-[#FF7A00] text-gray-400 hover:text-white transition-colors"
                          >
                            <soc.icon className="w-3.5 h-3.5" />
                          </a>
                        ))}
                      </div>
                    </div>

                    <p className="text-gray-400 text-sm leading-relaxed mb-6 font-light">
                      {authorInfo.bio}
                    </p>

                    <Link 
                      to="/blog"
                      className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
                    >
                      More Articles <ArrowRight className="h-3.5 w-3.5 text-[#FF7A00]" />
                    </Link>
                  </div>
                </div>
              </TiltCard>
            </div>
          </section>


          {/* ================= SECTION 7: RELATED ARTICLES SECTION ================= */}
          {relatedBlogs.length > 0 && (
            <section className="py-16 bg-[#171717]/80 backdrop-blur-xl border-y border-white/5 relative z-10 px-4">
              <div className="page-container max-w-5xl">
                <div className="flex items-center gap-3 mb-12">
                  <div className="w-1.5 h-8 bg-gradient-to-b from-[#FF7A00] to-orange-600 rounded-full" />
                  <h3 className="text-xl font-bold uppercase tracking-widest text-white">Related Chronologies</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {relatedBlogs.map((rb) => (
                    <Link key={rb.id} to={`/blog/${rb.id}`} className="group">
                      <TiltCard className="relative rounded-2xl overflow-hidden border border-white/5 bg-[#111]/70 backdrop-blur-md h-full flex flex-col hover:border-orange-500/20 transition-all duration-300 shadow-md">
                        <div className="h-44 overflow-hidden relative">
                          <img src={rb.image} alt={rb.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          <span className="absolute top-3 left-3 bg-black/60 border border-white/10 text-white text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded">
                            {rb.category}
                          </span>
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 inline-flex items-center gap-1"><Clock className="h-3 w-3 text-[#FF7A00]" /> {rb.readTime}</span>
                          <h4 className="font-bold text-sm text-white group-hover:text-[#FF7A00] transition-colors leading-snug line-clamp-2 mb-2">{rb.title}</h4>
                          <p className="text-gray-400 text-xs font-light leading-relaxed line-clamp-2 mb-4">{rb.shortDescription}</p>
                          <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-[#FF7A00] mt-auto">
                            Read story <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </TiltCard>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}


          {/* ================= SECTION 8: COMMENT SECTION UI ================= */}
          <section className="py-20 page-container relative z-10 px-4">
            <div className="max-w-3xl mx-auto">
              
              <div className="flex items-center gap-3 mb-10">
                <div className="w-1.5 h-8 bg-gradient-to-b from-[#FF7A00] to-orange-600 rounded-full" />
                <h3 className="text-xl font-bold uppercase tracking-widest text-white flex items-center gap-2">
                  Dialogue Collection
                  <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-[#FF7A00]">
                    {comments.length}
                  </span>
                </h3>
              </div>

              {/* Comment submission form */}
              <form onSubmit={handleSubmitComment} className="p-6 rounded-3xl bg-[#1c1c1c]/40 border border-white/5 shadow-lg mb-10">
                <h4 className="font-bold text-sm uppercase tracking-wider text-white mb-4">Add your thoughts</h4>
                <div className="grid grid-cols-1 gap-4">
                  <input 
                    type="text" 
                    required
                    placeholder="Enter your name"
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                    className="w-full bg-[#111111]/80 border border-white/10 focus:border-[#FF7A00] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/25 transition-all shadow-inner"
                  />
                  <textarea 
                    rows={4}
                    required
                    placeholder="Share your resonance, insights, or advice..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full bg-[#111111]/80 border border-white/10 focus:border-[#FF7A00] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/25 transition-all shadow-inner resize-none"
                  />
                  <button 
                    type="submit"
                    className="px-6 py-3.5 bg-[#FF7A00] hover:bg-orange-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 ml-auto cursor-pointer shadow-md"
                  >
                    Post Dialogue <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Comments Feed */}
              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-6 rounded-2xl bg-[#1c1c1c]/30 border border-white/5 shadow-md flex gap-4">
                    {/* Circle avatar */}
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-[#FF7A00] shrink-0 shadow-md">
                      {comment.avatar}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-bold text-white">{comment.name}</span>
                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{comment.date}</span>
                      </div>
                      
                      <p className="text-gray-300 text-xs sm:text-sm leading-relaxed mb-4 font-light">
                        {comment.content}
                      </p>

                      <div className="flex items-center gap-4 text-xs font-bold tracking-wider text-gray-500">
                        <button className="flex items-center gap-1.5 hover:text-red-500 transition-colors cursor-pointer select-none">
                          <ThumbsUp className="h-3.5 w-3.5" /> {comment.likes}
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-[#FF7A00] transition-colors cursor-pointer select-none">
                          <MessageSquare className="h-3.5 w-3.5" /> Reply
                        </button>
                      </div>

                      {/* Nested Replies */}
                      {comment.replies && comment.replies.map((reply) => (
                        <div key={reply.id} className="mt-5 pt-5 border-t border-white/5 flex gap-4">
                          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-[#FF7A00] shrink-0">
                            {reply.avatar}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold text-white flex items-center gap-1">
                                {reply.name} 
                                <span className="text-[8px] bg-[#FF7A00]/10 border border-[#FF7A00]/20 text-[#FF7A00] px-1.5 py-0.5 rounded uppercase tracking-widest font-extrabold">Author</span>
                              </span>
                              <span className="text-[8px] text-gray-500 font-semibold uppercase tracking-widest">{reply.date}</span>
                            </div>
                            <p className="text-gray-300 text-xs leading-relaxed font-light">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </section>


          {/* ================= SECTION 9: NEWSLETTER SUBSCRIPTION BANNER ================= */}
          <section className="py-24 page-container relative z-10 px-4">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              {/* Sunset Gradient Backdrop */}
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
                      className="px-8 py-4 bg-white hover:bg-orange-50 text-[#FF7A00] hover:text-orange-600 transition-all duration-300 rounded-2xl active:scale-95 font-bold flex items-center justify-center gap-2 shadow-lg shadow-black/10 cursor-pointer animate-glow"
                    >
                      Subscribe <Send className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </section>


          {/* ================= SECTION 10: PREMIUM FOOTER ================= */}
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

        </div>
      </PageTransition>
    </Layout>
  );
};

export default BlogDetails;
