import { Target, Eye, Globe, Users, Shield, Headphones } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';

const teamMembers = [
  { name: 'Arun Kumar', role: 'Founder & CEO', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face' },
  { name: 'Priya Sharma', role: 'Head of Operations', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&crop=face' },
  { name: 'Rahul Verma', role: 'Lead Travel Expert', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face' },
  { name: 'Sneha Reddy', role: 'Customer Success', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face' },
];

const services = [
  { icon: Globe, title: 'Curated Packages', description: 'Handpicked travel experiences across India and international destinations.' },
  { icon: Users, title: 'Group Tours', description: 'Organized group tours with expert guides and seamless logistics.' },
  { icon: Shield, title: 'Secure Booking', description: 'Safe and reliable payment processing with instant confirmation.' },
  { icon: Headphones, title: '24/7 Support', description: 'Round-the-clock assistance from our dedicated travel experts.' },
];

const About = () => {
  return (
    <Layout>
      <PageTransition>
        {/* Hero */}
        <section className="hero-section py-20 md:py-28">
          <div className="page-container text-center">
            <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4">About TravelMate</h1>
            <p className="text-lg opacity-80 max-w-2xl mx-auto">
              Your trusted partner for unforgettable travel experiences since 2020
            </p>
          </div>
        </section>

        {/* Introduction */}
        <section className="py-16 bg-background">
          <div className="page-container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="section-title">Who We Are</h2>
              <p className="text-muted-foreground leading-relaxed text-lg">
                TravelMate is a passionate travel company based in Chennai, Tamil Nadu. We believe that travel has the power to transform lives, broaden perspectives, and create lasting memories. Our team of experienced travel enthusiasts works tirelessly to craft personalized journeys that cater to every type of traveler — from solo adventurers to families and honeymooners.
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-16 bg-secondary/30">
          <div className="page-container">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-card rounded-xl p-8 shadow-card">
                <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4">
                  <Target className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">Our Mission</h3>
                <p className="text-muted-foreground leading-relaxed">
                  To make world-class travel experiences accessible and affordable for everyone. We strive to provide seamless end-to-end travel solutions that exceed expectations and inspire a lifelong love for exploration.
                </p>
              </div>
              <div className="bg-card rounded-xl p-8 shadow-card">
                <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4">
                  <Eye className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">Our Vision</h3>
                <p className="text-muted-foreground leading-relaxed">
                  To become India's most trusted and innovative travel company, connecting people with extraordinary destinations while promoting sustainable and responsible tourism practices.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="py-16 bg-background">
          <div className="page-container">
            <div className="text-center mb-12">
              <h2 className="section-title">What We Offer</h2>
              <p className="section-subtitle">Comprehensive travel services tailored to your needs</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service) => (
                <div key={service.title} className="bg-card rounded-xl p-6 shadow-card text-center hover:translate-y-[-4px] transition-transform duration-300">
                  <div className="p-3 bg-primary/10 rounded-xl w-fit mx-auto mb-4">
                    <service.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-bold text-foreground mb-2">{service.title}</h4>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-16 bg-secondary/30">
          <div className="page-container">
            <div className="text-center mb-12">
              <h2 className="section-title">Meet Our Team</h2>
              <p className="section-subtitle">The passionate people behind your perfect trips</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {teamMembers.map((member) => (
                <div key={member.name} className="bg-card rounded-xl overflow-hidden shadow-card text-center hover:translate-y-[-4px] transition-transform duration-300">
                  <img src={member.image} alt={member.name} className="w-full h-48 object-cover" loading="lazy" />
                  <div className="p-4">
                    <h4 className="font-bold text-foreground">{member.name}</h4>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default About;
