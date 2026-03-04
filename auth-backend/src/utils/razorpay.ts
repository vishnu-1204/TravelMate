import Razorpay = require("razorpay");
import { config } from "../config/env";

export const razorpay = config.razorpayKeyId && config.razorpayKeySecret
  ? new Razorpay({
      key_id: config.razorpayKeyId,
      key_secret: config.razorpayKeySecret,
    })
  : null;

console.log(`[Razorpay] Initialized: ${!!razorpay} (KeyID: ${config.razorpayKeyId ? 'Present' : 'Missing'})`);
