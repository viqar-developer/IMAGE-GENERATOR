import userModel from "../models/userModel.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import razorpay from 'razorpay';
import transactionModel from "../models/transactionModel.js";
import crypto from 'crypto';

// Initialize Razorpay instance
const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Middleware for authenticating user via JWT token
const authenticateUser = (req, res, next) => {
  const token = req.headers['token'];
  if (!token) {
    return res.json({ success: false, message: 'No token provided.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.json({ success: false, message: 'Invalid token' });
    }
    req.userId = decoded.id;  // Attach the userId to the request object
    next();
  });
};

// Register User
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, message: 'Missing Details' });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: 'Email already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = { name, email, password: hashedPassword };
    const newUser = new userModel(userData);
    const user = await newUser.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({ success: true, token, user: { name: user.name } });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

// Login User
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: 'User does not exist' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ success: true, token, user: { name: user.name } });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'Login failed. Please try again.' });
  }
};

// Get User Credits
const userCredits = async (req, res) => {
  try {
    const user = await userModel.findById(req.userId);  // Use userId from JWT
    if (!user) {
      return res.json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, credits: user.creditBalance, user: { name: user.name } });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'Unable to fetch credits.' });
  }
};

// Payment with Razorpay
const paymentRazorpay = async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.json({ success: false, message: 'Missing plan details' });
    }

    const userData = await userModel.findById(req.userId);  // Use userId from JWT
    if (!userData) {
      return res.json({ success: false, message: 'User not found' });
    }

    let credits, plan, amount;
    switch (planId) {
      case 'Basic':
        plan = 'Basic';
        credits = 100;
        amount = 10;
        break;
      case 'Advanced':
        plan = 'Advanced';
        credits = 500;
        amount = 50;
        break;
      case 'Business':
        plan = 'Business';
        credits = 5000;
        amount = 250;
        break;
      default:
        return res.json({ success: false, message: 'Plan not found' });
    }

    const transactionData = { userId: req.userId, plan, amount, credits, date: Date.now() };
    const newTransaction = await transactionModel.create(transactionData);

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: process.env.CURRENCY || 'INR',
      receipt: newTransaction._id.toString(),
    };

    const order = await razorpayInstance.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'Payment initiation failed', error: error.message });
  }
};

// Verify Razorpay Payment
const verifyRazorpay = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.json({ success: false, message: 'Invalid Razorpay signature' });
    }

    const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);
    if (orderInfo.status === 'paid') {
      const transactionData = await transactionModel.findById(orderInfo.receipt);
      if (!transactionData || transactionData.payment) {
        return res.json({ success: false, message: 'Transaction already processed or not found.' });
      }

      const userData = await userModel.findById(transactionData.userId);
      const updatedCredits = userData.creditBalance + transactionData.credits;

      await userModel.findByIdAndUpdate(userData._id, { creditBalance: updatedCredits });
      await transactionModel.findByIdAndUpdate(transactionData._id, { payment: true });

      res.json({ success: true, message: 'Credits added successfully!' });
    } else {
      res.json({ success: false, message: 'Payment failed.' });
    }
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'Payment verification failed.' });
  }
};

export { registerUser, loginUser, userCredits, paymentRazorpay, verifyRazorpay };


