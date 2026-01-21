import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { User, Calendar, Lock, ArrowLeft, Check, Loader2, Smartphone } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import packagesData from '@/data/packages.json';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Payment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const packageData = packagesData.find((pkg) => pkg.id === id);

  const [formData, setFormData] = useState({
    travelers: 2,
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    upiId: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!packageData) {
    return (
      <Layout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-4">Package Not Found</h1>
              <Link to="/packages" className="btn-primary">
                View All Packages
              </Link>
            </div>
          </div>
        </PageTransition>
      </Layout>
    );
  }

  const totalPrice = packageData.price * formData.travelers;
  const taxes = Math.round(totalPrice * 0.1);
  const grandTotal = totalPrice + taxes;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUPIPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast.error('Please fill in all traveler information');
      return;
    }

    setLoading(true);

    const scriptLoaded = await loadRazorpayScript();
    
    if (!scriptLoaded) {
      toast.error('Failed to load payment gateway. Please try again.');
      setLoading(false);
      return;
    }

    // Razorpay options - Replace RAZORPAY_KEY_ID with your actual key
    const options = {
      key: 'rzp_test_YOUR_KEY_ID', // Replace with your Razorpay Key ID
      amount: grandTotal * 100, // Amount in paise
      currency: 'INR',
      name: 'TravelWonders',
      description: `Booking for ${packageData.title}`,
      image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=100',
      handler: function (response: any) {
        console.log('Payment successful:', response);
        setSuccess(true);
        setLoading(false);
      },
      prefill: {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        contact: formData.phone,
        vpa: formData.upiId, // UPI ID prefill
      },
      notes: {
        package_id: packageData.id,
        package_title: packageData.title,
        travelers: formData.travelers,
      },
      theme: {
        color: '#0066CC',
      },
      modal: {
        ondismiss: function () {
          setLoading(false);
          toast.info('Payment cancelled');
        },
      },
      config: {
        display: {
          blocks: {
            upi: {
              name: 'Pay using UPI',
              instruments: [
                {
                  method: 'upi',
                  flows: ['qrcode', 'collect', 'intent'],
                },
              ],
            },
          },
          sequence: ['block.upi'],
          preferences: {
            show_default_blocks: false,
          },
        },
      },
    };

    try {
      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        toast.error(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });
      razorpay.open();
    } catch (error) {
      console.error('Razorpay error:', error);
      toast.error('Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Layout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center py-12">
            <div className="bg-card rounded-2xl shadow-card p-8 max-w-md w-full text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Booking Confirmed!</h1>
              <p className="text-muted-foreground mb-6">
                Thank you for booking {packageData.title}. A confirmation email has been sent to {formData.email}.
              </p>
              <div className="bg-secondary/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-muted-foreground">Booking Reference</p>
                <p className="text-xl font-bold text-primary">TW-{Date.now().toString().slice(-8)}</p>
              </div>
              <Link to="/" className="btn-primary w-full">
                Return to Home
              </Link>
            </div>
          </div>
        </PageTransition>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageTransition>
        <div className="py-8 bg-background min-h-screen">
          <div className="page-container">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Package
            </button>

            <h1 className="text-3xl font-bold text-foreground mb-8">Complete Your Booking</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form */}
              <div className="lg:col-span-2 space-y-6">
                <form onSubmit={handleUPIPayment} className="space-y-6">
                  {/* Traveler Info */}
                  <div className="bg-card rounded-xl p-6 shadow-card">
                    <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Traveler Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">First Name</label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="form-label">Last Name</label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="form-label">Phone</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="input-field"
                          placeholder="+91 9876543210"
                          required
                        />
                      </div>
                      <div>
                        <label className="form-label">Number of Travelers</label>
                        <select
                          name="travelers"
                          value={formData.travelers}
                          onChange={handleChange}
                          className="input-field"
                        >
                          {[1, 2, 3, 4, 5, 6].map((num) => (
                            <option key={num} value={num}>
                              {num} {num === 1 ? 'Traveler' : 'Travelers'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* UPI Payment */}
                  <div className="bg-card rounded-xl p-6 shadow-card">
                    <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-primary" />
                      UPI Payment
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="form-label">UPI ID (Optional)</label>
                        <input
                          type="text"
                          name="upiId"
                          value={formData.upiId}
                          onChange={handleChange}
                          className="input-field"
                          placeholder="yourname@upi"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter your UPI ID or leave blank to scan QR code
                        </p>
                      </div>

                      <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
                        <img 
                          src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" 
                          alt="UPI" 
                          className="h-8 w-auto"
                        />
                        <div className="flex gap-2">
                          <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/7/71/Google_Pay_%28GPay%29_Logo_%282018-2020%29.svg" 
                            alt="Google Pay" 
                            className="h-6 w-auto"
                          />
                          <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.svg" 
                            alt="Paytm" 
                            className="h-6 w-auto"
                          />
                          <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/f/f2/PhonePe_Logo.svg" 
                            alt="PhonePe" 
                            className="h-6 w-auto"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4" />
                      <span>Your payment is secured by Razorpay</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Pay with UPI - ₹{grandTotal.toLocaleString()}
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-card rounded-xl p-6 shadow-card sticky top-24">
                  <h2 className="text-lg font-bold text-foreground mb-4">Order Summary</h2>

                  <div className="flex gap-4 mb-6">
                    <img
                      src={packageData.image}
                      alt={packageData.title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div>
                      <h3 className="font-semibold text-foreground">{packageData.title}</h3>
                      <p className="text-sm text-muted-foreground">{packageData.duration}</p>
                      <p className="text-sm text-muted-foreground">{packageData.location}</p>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-border pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Package Price × {formData.travelers}
                      </span>
                      <span className="text-foreground">₹{totalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxes & Fees</span>
                      <span className="text-foreground">₹{taxes.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-3 border-t border-border">
                      <span className="text-foreground">Total</span>
                      <span className="text-primary">₹{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-foreground mb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium">Free Cancellation</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cancel up to 7 days before departure for a full refund
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    </Layout>
  );
};

export default Payment;
