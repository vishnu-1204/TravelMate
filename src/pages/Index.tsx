import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import HeroSection from '@/components/home/HeroSection';
import FeaturedPackages from '@/components/home/FeaturedPackages';
import WhyChooseUs from '@/components/home/WhyChooseUs';
import Testimonials from '@/components/home/Testimonials';

const Index = () => {
  return (
    <Layout>
      <PageTransition>
        <HeroSection />
        <FeaturedPackages />
        <WhyChooseUs />
        <Testimonials />
      </PageTransition>
    </Layout>
  );
};

export default Index;
