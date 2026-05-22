import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, Smartphone, CheckCircle2, Loader2, ArrowLeft, ShieldCheck, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Layout from '@/components/layout/Layout';
import PageTransition from '@/components/layout/PageTransition';
import { useAuth } from '@/hooks/useAuth';
import { BACKEND_URL } from '@/lib/apiConfig';

const DummyPayment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'card' | 'other'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form states
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const bookingData = location.state?.bookingData || {};
  const amount = bookingData.totalAmount || 0;
  const packageTitle = bookingData.packageTitle || 'Travel Package';

  const backendUrl = BACKEND_URL;

  useEffect(() => {
    if (!location.state && !import.meta.env.DEV) {
      toast.error("No booking data found. Please start from the package page.");
      navigate('/packages');
    }
  }, [location.state, navigate]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'card') {
      if (cardNumber.length < 16 || !expiry || cvc.length < 3) {
        toast.error("Please fill in all card details correctly.");
        return;
      }
    }

    setIsProcessing(true);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // Trigger backend email confirmation
      const response = await fetch(`${backendUrl}/api/booking/process-dummy-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          bookingData: {
            ...bookingData,
            paymentId: `dummy_pay_${Date.now()}`,
            paymentStatus: 'paid',
            email: user?.email || bookingData.email
          }
        })
      });

      const result = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast.success("Payment successful! Confirmation email sent.");
        
        // Final delay before redirect
        setTimeout(() => {
          navigate('/booking-confirmed', { 
            state: { 
              booking: {
                ...bookingData,
                bookingRef: result.bookingReference || bookingData.bookingReference,
                paymentId: result.paymentId
              } 
            } 
          });
        }, 1500);
      } else {
        throw new Error(result.message || "Failed to process booking on server");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err.message || "Something went wrong during payment processing.");
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <PageTransition>
        <div className="min-h-screen bg-slate-50 py-12">
          <div className="container max-w-2xl mx-auto px-4">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Details</span>
            </button>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
              {/* Header */}
              <div className="bg-slate-900 p-8 text-white relative">
                <div className="relative z-10">
                  <h1 className="text-2xl font-bold mb-2">Secure Checkout</h1>
                  <p className="text-slate-400 text-sm">Completing booking for <span className="text-sky-400 font-medium">{packageTitle}</span></p>
                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">₹{amount.toLocaleString('en-IN')}</span>
                    <span className="text-slate-400 text-sm">Total Amount</span>
                  </div>
                </div>
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <ShieldCheck className="w-24 h-24 text-white" />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => setActiveTab('card')}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all ${
                    activeTab === 'card' 
                    ? 'text-sky-600 bg-sky-50/50 border-b-2 border-sky-600' 
                    : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Credit / Debit Card
                </button>
                <button
                  onClick={() => setActiveTab('other')}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all ${
                    activeTab === 'other' 
                    ? 'text-sky-600 bg-sky-50/50 border-b-2 border-sky-600' 
                    : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  UPI / Net Banking
                </button>
              </div>

              {/* Content */}
              <div className="p-8">
                <AnimatePresence mode="wait">
                  {isSuccess ? (
                    <motion.div 
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-8"
                    >
                      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
                      <p className="text-slate-500">Redirecting to confirmation page...</p>
                    </motion.div>
                  ) : (
                    <motion.form 
                      key={activeTab}
                      initial={{ opacity: 0, x: activeTab === 'card' ? -10 : 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: activeTab === 'card' ? 10 : -10 }}
                      onSubmit={handlePayment}
                      className="space-y-6"
                    >
                      {activeTab === 'card' ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Card Number</label>
                            <div className="relative">
                              <input 
                                type="text" 
                                placeholder="0000 0000 0000 0000"
                                maxLength={16}
                                value={cardNumber}
                                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none bg-slate-50"
                              />
                              <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry Date</label>
                              <input 
                                type="text" 
                                placeholder="MM/YY"
                                maxLength={5}
                                value={expiry}
                                onChange={(e) => setExpiry(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none bg-slate-50"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CVC</label>
                              <input 
                                type="password" 
                                placeholder="***"
                                maxLength={3}
                                value={cvc}
                                onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none bg-slate-50"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 text-center">
                          <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Smartphone className="w-6 h-6 text-sky-600" />
                          </div>
                          <p className="text-slate-600 mb-4">Choose your preferred UPI app or Banks for Net Banking in the next step.</p>
                          <div className="flex justify-center gap-4 grayscale opacity-60">
                            {/* Mock logos placeholder */}
                            <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                            <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                            <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                          </div>
                        </div>
                      )}

                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={isProcessing}
                          className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-slate-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Processing Payment...</span>
                            </>
                          ) : (
                            <>
                              <span>Pay ₹{amount.toLocaleString('en-IN')}</span>
                              <ShieldCheck className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-start gap-3 bg-sky-50 p-4 rounded-lg border border-sky-100">
                        <Info className="w-5 h-5 text-sky-600 mt-0.5" />
                        <p className="text-xs text-sky-800 leading-relaxed">
                          This is a demo payment environment. No actual funds will be deducted from your account. 
                          Upon completion, you will receive a mock booking confirmation.
                        </p>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-8 text-center text-slate-400 text-sm">
              <p>&copy; 2026 TravelMate Solutions. Secure Dummy Payment Gateway.</p>
            </div>
          </div>
        </div>
      </PageTransition>
    </Layout>
  );
};

export default DummyPayment;
