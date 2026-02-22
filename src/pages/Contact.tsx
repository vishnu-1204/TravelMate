import { useState } from 'react';
import { Mail, Phone, MapPin, Send, Check } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  message: z.string().trim().min(1, 'Message is required').max(1000),
});

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setSubmitted(true);
  };

  return (
    <Layout>
      <PageTransition>
        {/* Hero */}
        <section className="hero-section py-20 md:py-28">
          <div className="page-container text-center">
            <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4">Contact Us</h1>
            <p className="text-lg opacity-80 max-w-2xl mx-auto">
              Have a question or need help planning your trip? We'd love to hear from you.
            </p>
          </div>
        </section>

        <section className="py-16 bg-background">
          <div className="page-container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div className="bg-card rounded-xl p-6 md:p-8 shadow-card">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">Message Sent!</h3>
                    <p className="text-muted-foreground mb-6">Thank you for reaching out. We'll get back to you within 24 hours.</p>
                    <button onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', message: '' }); }} className="btn-primary">
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-foreground mb-6">Send us a Message</h2>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <label className="form-label">Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-field" placeholder="Your full name" />
                        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
                      </div>
                      <div>
                        <label className="form-label">Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field" placeholder="you@example.com" />
                        {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                      </div>
                      <div>
                        <label className="form-label">Message</label>
                        <textarea name="message" value={formData.message} onChange={handleChange} rows={5} className="input-field resize-none" placeholder="Tell us about your travel plans..." />
                        {errors.message && <p className="text-sm text-destructive mt-1">{errors.message}</p>}
                      </div>
                      <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                        <Send className="h-4 w-4" /> Send Message
                      </button>
                    </form>
                  </>
                )}
              </div>

              {/* Contact Info & Map */}
              <div className="space-y-8">
                <div className="bg-card rounded-xl p-6 md:p-8 shadow-card">
                  <h2 className="text-2xl font-bold text-foreground mb-6">Get in Touch</h2>
                  <ul className="space-y-5">
                    <li className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl flex-shrink-0">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">Phone</h4>
                        <p className="text-muted-foreground">+91 9342180670</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl flex-shrink-0">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">Email</h4>
                        <p className="text-muted-foreground">hello@travelmate.com</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl flex-shrink-0">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">Address</h4>
                        <p className="text-muted-foreground">Chennai, Tamil Nadu, India</p>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Map Placeholder */}
                <div className="bg-card rounded-xl overflow-hidden shadow-card">
                  <iframe
                    title="TravelMate Location"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d497699.9973874144!2d79.87933364999999!3d13.047985949999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a5265ea4f7d3361%3A0x6e61a70b6571f800!2sChennai%2C%20Tamil%20Nadu!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default Contact;
