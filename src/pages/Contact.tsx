import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  CheckCircle2, 
  MessageSquare, 
  Instagram, 
  Facebook, 
  Linkedin, 
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import { toast } from '@/components/ui/use-toast';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  phone: z.string().trim().min(1, 'Phone number is required').max(20),
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  message: z.string().trim().min(5, 'Message must be at least 5 characters').max(2000),
});

type ContactFormData = z.infer<typeof contactSchema>;

const resolveBackendUrl = () => {
  const configured = (import.meta.env.VITE_AUTH_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  const { hostname, origin } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  return isLocal ? 'http://localhost:3000' : origin;
};

const BACKEND_URL = resolveBackendUrl();

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Something went wrong');
      }

      setIsSuccess(true);
      toast({
        title: "Message Sent",
        description: "Thank you for contacting us. We'll be in touch soon!",
      });
      reset();
    } catch (error: any) {
      setServerError(error.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const socialLinks = [
    { icon: <Instagram className="h-5 w-5" />, href: "https://instagram.com/travelmate", label: "Instagram", color: "hover:text-pink-500" },
    { icon: <Facebook className="h-5 w-5" />, href: "https://facebook.com/travelmate", label: "Facebook", color: "hover:text-blue-600" },
    { icon: <Linkedin className="h-5 w-5" />, href: "https://linkedin.com/company/travelmate", label: "LinkedIn", color: "hover:text-blue-700" },
    { icon: <MessageSquare className="h-5 w-5" />, href: "https://wa.me/919342180670", label: "WhatsApp", color: "hover:text-green-500" },
  ];

  return (
    <Layout>
      <PageTransition>
        {/* Modern Hero Section */}
        <section className="relative h-[40vh] min-h-[400px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1920&q=80" 
              alt="Contact Hero" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background"></div>
          </div>
          
          <div className="page-container relative z-10 text-center text-white">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-6xl font-bold font-serif mb-6"
            >
              Get in Touch
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto font-medium"
            >
              Whether you have a question about our packages, need help with a booking, or just want to say hello, we're here for you.
            </motion.p>
          </div>
        </section>

        <section className="py-20 -mt-20">
          <div className="page-container">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              
              {/* Contact Form Section */}
              <div className="lg:col-span-7">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                  
                  {isSuccess ? (
                    <div className="text-center py-12">
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8"
                      >
                        <CheckCircle2 className="h-10 w-10 text-green-500" />
                      </motion.div>
                      <h3 className="text-3xl font-bold text-foreground mb-4">Message Sent!</h3>
                      <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
                        Thank you for reaching out to TravelMate. We've sent a confirmation to your email, and our team will get back to you shortly.
                      </p>
                      <button 
                        onClick={() => { setIsSuccess(false); setServerError(null); }} 
                        className="btn-primary px-8 py-3 text-lg font-semibold"
                      >
                        Send Another Message
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-10">
                        <h2 className="text-3xl font-bold text-foreground mb-2">Send us a Message</h2>
                        <p className="text-muted-foreground">Fill out the form below and we'll get back to you within 24 hours.</p>
                      </div>

                      {serverError && (
                        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center gap-3 text-destructive text-sm">
                          <AlertCircle className="h-5 w-5 flex-shrink-0" />
                          <p>{serverError}</p>
                        </div>
                      )}

                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground/80 ml-1">Full Name</label>
                            <input 
                              {...register('name')}
                              type="text" 
                              className={`w-full px-5 py-3 rounded-2xl bg-background border ${errors.name ? 'border-destructive' : 'border-border'} focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
                              placeholder="John Doe" 
                            />
                            {errors.name && <p className="text-xs text-destructive ml-1">{errors.name.message}</p>}
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground/80 ml-1">Email Address</label>
                            <input 
                              {...register('email')}
                              type="email" 
                              className={`w-full px-5 py-3 rounded-2xl bg-background border ${errors.email ? 'border-destructive' : 'border-border'} focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
                              placeholder="john@example.com" 
                            />
                            {errors.email && <p className="text-xs text-destructive ml-1">{errors.email.message}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground/80 ml-1">Phone Number</label>
                            <input 
                              {...register('phone')}
                              type="tel" 
                              className={`w-full px-5 py-3 rounded-2xl bg-background border ${errors.phone ? 'border-destructive' : 'border-border'} focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
                              placeholder="+91 98765 43210" 
                            />
                            {errors.phone && <p className="text-xs text-destructive ml-1">{errors.phone.message}</p>}
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground/80 ml-1">Subject</label>
                            <input 
                              {...register('subject')}
                              type="text" 
                              className={`w-full px-5 py-3 rounded-2xl bg-background border ${errors.subject ? 'border-destructive' : 'border-border'} focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
                              placeholder="Booking Inquiry" 
                            />
                            {errors.subject && <p className="text-xs text-destructive ml-1">{errors.subject.message}</p>}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-foreground/80 ml-1">Message</label>
                          <textarea 
                            {...register('message')}
                            rows={5} 
                            className={`w-full px-5 py-3 rounded-2xl bg-background border ${errors.message ? 'border-destructive' : 'border-border'} focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none`}
                            placeholder="How can we help you plan your perfect trip?" 
                          />
                          {errors.message && <p className="text-xs text-destructive ml-1">{errors.message.message}</p>}
                        </div>

                        <button 
                          type="submit" 
                          disabled={isSubmitting}
                          className="btn-primary w-full py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 group transition-all"
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            <>
                              Send Message
                              <Send className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </>
                          )}
                        </button>
                      </form>
                    </>
                  )}
                </motion.div>
              </div>

              {/* Contact Information Section */}
              <div className="lg:col-span-5 space-y-8">
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="bg-card border border-border rounded-3xl p-8 shadow-xl"
                >
                  <h2 className="text-2xl font-bold text-foreground mb-8">Contact Information</h2>
                  <div className="space-y-8">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Phone className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1 font-medium underline underline-offset-4 decoration-primary/30">Phone Number</p>
                        <p className="text-lg font-bold text-foreground">+91 93421 80670</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Mail className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1 font-medium underline underline-offset-4 decoration-primary/30">Email Address</p>
                        <p className="text-lg font-bold text-foreground">hello@travelmate.com</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1 font-medium underline underline-offset-4 decoration-primary/30">Our Office</p>
                        <p className="text-lg font-bold text-foreground">No. 42, Marina Beach Road, Chennai, Tamil Nadu 600001</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Clock className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1 font-medium underline underline-offset-4 decoration-primary/30">Working Hours</p>
                        <p className="text-lg font-bold text-foreground">Mon - Sat: 9:00 AM - 8:00 PM</p>
                        <p className="text-sm text-muted-foreground">Sunday: 10:00 AM - 2:00 PM</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 pt-10 border-t border-border/50">
                    <p className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">Follow our Journey</p>
                    <div className="flex items-center gap-4">
                      {socialLinks.map((social, idx) => (
                        <a 
                          key={idx}
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`w-12 h-12 bg-background border border-border rounded-2xl flex items-center justify-center transition-all ${social.color} hover:border-primary/50 hover:shadow-lg`}
                          aria-label={social.label}
                        >
                          {social.icon}
                        </a>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Google Map Box */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="rounded-3xl border border-border overflow-hidden shadow-2xl h-[300px] mb-8"
                >
                  <iframe
                    title="TravelMate Location"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.918519495146!2d80.25266947514937!3d13.047190187213444!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a52662c12401f11%3A0xed0176d6556e4c27!2sMarina%20Beach!5e0!3m2!1sen!2sin!4v1709400000000!5m2!1sen!2sin"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default Contact;
