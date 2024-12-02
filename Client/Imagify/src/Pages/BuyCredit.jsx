import React, { useContext, useEffect } from 'react';
import { assets, plans } from '../assets/assets';
import { AppContext } from '../Context/AppContext';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const BuyCredit = () => {
  const { user, backendurl, loadCredits, token, setShowLogin } = useContext(AppContext);
  const navigate = useNavigate();

  // Load Razorpay script once
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => console.log('Razorpay script loaded successfully');
      script.onerror = () => console.error('Failed to load Razorpay script');
      document.body.appendChild(script);
    } else {
      console.log('Razorpay script already loaded');
    }
  }, []);

  const initPay = async (order) => {
    console.log("Order object:", order);  // Debugging: Check if the order object is correct
    if (!window.Razorpay || !order) {
      toast.error('Razorpay SDK or Order data not available. Please try again.');
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',  // Ensure this key is correctly set in your .env file
      amount: order.amount,
      currency: order.currency,
      name: 'Credits Payment',
      description: 'Credits Payment',
      order_id: order.id,
      receipt: order.receipt,
      handler: async (response) => {
        if (!response || !response.razorpay_payment_id || !response.razorpay_order_id) {
          toast.error('Invalid payment response. Please try again.');
          return;
        }

        try {
          const { data } = await axios.post(
            `${backendurl}/api/user/verify-razor`,
            response,
            { headers: { token } }
          );
          if (data.success) {
            loadCredits();
            navigate('/');
            toast.success('Credits added successfully!');
          } else {
            toast.error(data.message || 'Payment verification failed.');
          }
        } catch (error) {
          console.error('Payment verification error:', error.message);
          toast.error(error.response?.data?.message || 'Payment verification failed.');
        }
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const paymentRazorpay = async (planId) => {
    try {
      if (!user) {
        setShowLogin(true);
        return;
      }

      console.log('Backend URL:', backendurl);
      console.log('Plan ID:', planId);
      console.log('Token:', token);

      const { data } = await axios.post(
        `${backendurl}/api/user/pay-razor`,
        { planId },
        { headers: { token } }
      );

      console.log('Backend response:', data);  // Debugging: Check if backend response is correct

      if (data.success) {
        await initPay(data.order);
      } else {
        toast.error('Order creation failed!');
      }
    } catch (error) {
      console.error('Payment initiation error:', error.response || error);
      toast.error(error.response?.data?.message || 'Payment initiation failed.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0.2, y: 100 }}
      transition={{ duration: 1 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="min-h-[80vh] text-center pt-14 mb-10"
    >
      <button className="border border-gray-400 px-10 py-2 rounded-full mb-6">
        Our Plans
      </button>
      <h1 className="text-center text-3xl font-medium mb-6 sm:mb-10">Choose The Plan</h1>
      <div className="flex flex-wrap justify-center gap-6 text-left">
        {plans.map((item, index) => (
          <div
            key={index}
            className="bg-white drop-shadow-sm border rounded-lg py-12 px-8 text-gray-600 hover:scale-105 transition-all duration-500"
          >
            <img width={40} src={assets.logo_icon} alt="Plan Icon" />
            <p className="mt-3 mb-1 font-semibold">{item.id}</p>
            <p>{item.desc}</p>
            <p className="mt-6">
              <span className="text-3xl font-medium">${item.price}</span>/{item.credits} credits
            </p>
            <button
              onClick={() => paymentRazorpay(item.id)}
              className="w-full bg-gray-800 text-white mt-8 text-sm rounded-md py-2.5 min-w-52"
            >
              {user ? 'Purchase' : 'Get Started'}
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default BuyCredit;




