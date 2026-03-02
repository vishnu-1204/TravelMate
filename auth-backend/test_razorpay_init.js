const Razorpay = require('razorpay');
try {
  const rzp = new Razorpay({
    key_id: '',
    key_secret: ''
  });
  console.log('Razorpay initialized successfully with empty keys');
} catch (error) {
  console.error('Razorpay initialization failed:', error.message);
}
