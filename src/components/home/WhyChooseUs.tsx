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
    <section className="py-20 bg-secondary/30">
      <div className="page-container">
        <div className="text-center mb-12">
          <h2 className="section-title">Why Choose TravelWise</h2>
          <p className="section-subtitle max-w-2xl mx-auto">
            We're committed to making your travel experience exceptional from start to finish
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card p-6 rounded-xl text-center shadow-card hover:shadow-lg transition-shadow"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <feature.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm">
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
