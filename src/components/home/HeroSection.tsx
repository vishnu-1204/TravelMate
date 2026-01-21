import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const heroSlides = [
  {
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920',
    accent: 'extraordinary',
    title: 'travel, worldclass',
    quote: 'The real voyage of discovery consists not in seeking new landscapes, but in having new eyes.'
  },
  {
    image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920',
    accent: 'unforgettable',
    title: 'journeys, memories',
    quote: 'Travel is the only thing you buy that makes you richer.'
  },
  {
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920',
    accent: 'breathtaking',
    title: 'adventures, await',
    quote: 'Life is either a daring adventure or nothing at all.'
  }
];

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const slide = heroSlides[currentSlide];

  const textVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const accentVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.1 }
  };

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background Images */}
      {heroSlides.map((s, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img 
            src={s.image} 
            alt="Travel destination"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col items-center"
          >
            {/* Accent Text */}
            <motion.p 
              variants={accentVariants}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-[hsl(var(--cyan-accent))] text-xl md:text-2xl mb-4"
              style={{ fontFamily: "'Pacifico', cursive" }}
            >
              {slide.accent}
            </motion.p>
            
            {/* Main Title */}
            <motion.h1 
              variants={textVariants}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className="text-4xl md:text-6xl lg:text-7xl text-white mb-6 tracking-wide"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 }}
            >
              {slide.title.split(',')[0]}
              <span className="text-[hsl(var(--cyan-accent))]">, </span>
              {slide.title.split(',')[1]?.trim()}
            </motion.h1>
            
            {/* Quote */}
            <motion.p 
              variants={textVariants}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="text-white/80 text-sm md:text-base max-w-xl leading-relaxed"
              style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
            >
              {slide.quote}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded transition-colors"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded transition-colors"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSlide 
                ? 'bg-[hsl(var(--cyan-accent))] w-6' 
                : 'bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroSection;
