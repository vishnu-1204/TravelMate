import { Star, Quote } from 'lucide-react';
import testimonialsData from '@/data/testimonials.json';

const Testimonials = () => {
  return (
    <section className="py-20 bg-background">
      <div className="page-container">
        <div className="text-center mb-12">
          <h2 className="section-title">What Our Travelers Say</h2>
          <p className="section-subtitle max-w-2xl mx-auto">
            Real experiences from our satisfied customers around the world
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonialsData.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-card p-8 rounded-xl shadow-card relative"
            >
              <Quote className="absolute top-6 right-6 h-10 w-10 text-primary/10" />
              <div className="flex items-center gap-1 text-amber-500 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-foreground/80 mb-6 leading-relaxed">
                "{testimonial.text}"
              </p>
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
