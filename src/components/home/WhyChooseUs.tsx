import { Shield, Headphones, Award, Heart } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Safe & Secure',
    description: 'Your safety is our priority with 24/7 support and secure bookings.',
  },
  {
    icon: Award,
    title: 'Best Price Guarantee',
    description: 'We offer competitive prices and will match any lower price found.',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Our travel experts are available round the clock to assist you.',
  },
  {
    icon: Heart,
    title: 'Handpicked Hotels',
    description: 'We carefully select the best accommodations for your comfort.',
  },
];

const WhyChooseUs = () => {
  return (
    <section className="py-20 bg-white">
      <div className="page-container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Why Choose TravelMate
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto font-medium">
            We're committed to making your travel experience exceptional from start to finish
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-slate-50 border border-slate-100 p-6 rounded-2xl text-center shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all duration-300"
            >
              <div className="w-14 h-14 bg-[#FF7A00]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <feature.icon className="h-6 w-6 text-[#FF7A00]" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600 text-xs font-medium leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
