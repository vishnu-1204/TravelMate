import { Star, MapPin } from 'lucide-react';
import testimonialsData from '@/data/testimonials.json';

const Testimonials = () => {
  // Double the testimonials data to ensure seamless infinite looping
  const doubleTestimonials = [...testimonialsData, ...testimonialsData];

  return (
    <section className="py-24 bg-[#0A0709] relative overflow-hidden">
      {/* Background Decorative Ambient Sunset Glows */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[350px] h-[350px] bg-primary/10 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[450px] h-[450px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[150px] bg-gradient-to-r from-primary/5 via-amber-500/10 to-transparent rounded-full blur-[80px] pointer-events-none z-0" />

      <div className="w-full relative z-10">
        {/* Section Heading */}
        <div className="page-container text-center mb-16">
          <span className="text-primary text-xs md:text-sm font-bold tracking-[0.25em] uppercase block mb-3 animate-pulse">
            TRAVELER STORIES
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-5 tracking-tight font-sans">
            What Our <span className="bg-gradient-to-r from-[#FF7A00] to-[#FFC857] bg-clip-text text-transparent">Travelers Say</span>
          </h2>
          <p className="text-white/60 text-sm md:text-base max-w-2xl mx-auto font-light leading-relaxed">
            Real experiences from adventurers who have discovered extraordinary moments worldwide with TravelMate.
          </p>
        </div>

        {/* Testimonial Slider Container with Gradient Fade Blur Edges */}
        <div className="relative w-full overflow-hidden py-4">
          {/* Left cinematic fade edge */}
          <div className="absolute inset-y-0 left-0 w-16 md:w-48 bg-gradient-to-r from-[#0A0709] to-transparent z-20 pointer-events-none" />
          
          {/* Right cinematic fade edge */}
          <div className="absolute inset-y-0 right-0 w-16 md:w-48 bg-gradient-to-l from-[#0A0709] to-transparent z-20 pointer-events-none" />

          {/* Scrolling Marquee wrapper */}
          <div className="flex w-full">
            <div className="animate-marquee-left pause-on-hover flex gap-6 px-3">
              {doubleTestimonials.map((testimonial, idx) => (
                <div
                  key={`${testimonial.id}-${idx}`}
                  className="w-[300px] md:w-[360px] flex-shrink-0 bg-[#140D10]/60 backdrop-blur-lg border border-white/5 hover:border-primary/30 rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-2xl transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-[0_15px_40px_rgba(255,122,0,0.15)] group"
                >
                  <div>
                    {/* Top Section: Profile info & Rating */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <img
                          src={testimonial.image}
                          alt={testimonial.name}
                          className="w-12 h-12 rounded-full border-2 border-primary/20 object-cover group-hover:border-primary/60 transition-colors duration-300"
                        />
                        <div>
                          <h4 className="font-bold text-white text-sm md:text-base leading-tight group-hover:text-primary transition-colors duration-300">
                            {testimonial.name}
                          </h4>
                          <span className="text-white/40 text-xs flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-primary/60" />
                            {testimonial.country}
                          </span>
                        </div>
                      </div>
                      
                      {/* 5 Star Rating */}
                      <div className="flex gap-0.5 text-[#FFC857]">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </div>
                    </div>

                    {/* Middle Section: Review Text */}
                    <blockquote className="text-white/80 text-xs md:text-sm leading-relaxed mb-6 font-light italic line-clamp-3 group-hover:text-white transition-colors duration-300">
                      "{testimonial.review}"
                    </blockquote>
                  </div>

                  {/* Bottom Section: Destination Tag */}
                  <div className="mt-auto">
                    <span className="inline-block text-[10px] md:text-xs bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary/20 group-hover:text-white group-hover:border-primary/40 px-3 py-1 rounded-full font-medium transition-all duration-300">
                      {testimonial.trip}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
