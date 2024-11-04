import { loadStripe } from '@stripe/stripe-js';
import { auth, db } from './firebase';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { logAnalyticsEvent } from '../services/analytics';

const stripePromise = loadStripe('pk_test_51QGTC8Csm96Q1cqsYUBh721olyEc8XZGdRWfVXYMGgvjGoXzJvJRYvnZ8pdG6OPDY7yls084RrRiC2naDRKm2qGm00GAxAEnhT');

const getDomain = () => {
  const hostname = window.location.hostname;
  return hostname.includes('localhost') ? 'http://localhost:5173' : `https://${hostname}`;
};

export const handlePremiumCheckout = async () => {
  if (!auth.currentUser) {
    throw new Error('Must be signed in to upgrade to premium');
  }

  try {
    const stripe = await stripePromise;
    if (!stripe) throw new Error('Stripe failed to initialize');

    const domain = getDomain();
    const timestamp = new Date().toISOString();

    // Create a checkout session in Firestore
    const checkoutSessionsRef = collection(db, 'stripeCheckoutSessions');
    const sessionDoc = await addDoc(checkoutSessionsRef, {
      userId: auth.currentUser.uid,
      email: auth.currentUser.email,
      createdAt: timestamp,
      status: 'pending',
      webhookReceived: false
    });

    // Pre-update user document to indicate pending premium status
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, {
      premiumPending: true,
      premiumCheckoutSessionId: sessionDoc.id,
      updatedAt: timestamp
    });

    // Create Stripe Checkout Session
    const response = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: auth.currentUser.uid,
        email: auth.currentUser.email,
        checkoutSessionId: sessionDoc.id,
        successUrl: `${domain}/success`,
        cancelUrl: `${domain}/`
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    const { sessionId } = await response.json();

    const result = await stripe.redirectToCheckout({
      sessionId
    });
    
    if (result.error) {
      throw new Error(result.error.message);
    }

    logAnalyticsEvent('premium_checkout_started', {
      userId: auth.currentUser.uid,
      checkoutSessionId: sessionDoc.id,
      timestamp
    });
  } catch (error) {
    console.error('Payment error:', error);
    logAnalyticsEvent('premium_checkout_error', {
      userId: auth.currentUser?.uid,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const handleSuccessfulPayment = async (sessionId: string) => {
  if (!auth.currentUser) {
    throw new Error('No authenticated user found during payment completion');
  }

  try {
    // Update user document with temporary premium status
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const timestamp = new Date().toISOString();
    
    await updateDoc(userRef, {
      isPremium: true,
      premiumSince: timestamp,
      lastVerified: timestamp,
      stripeSessionId: sessionId,
      stripeSubscriptionActive: true,
      updatedAt: timestamp,
      webhookConfirmed: false
    });

    // Create premium user document
    const premiumUsersRef = collection(db, 'premiumUsers');
    await addDoc(premiumUsersRef, {
      userId: auth.currentUser.uid,
      email: auth.currentUser.email?.toLowerCase(),
      active: true,
      stripeSessionId: sessionId,
      stripeSubscriptionActive: true,
      webhookConfirmed: false,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    logAnalyticsEvent('premium_upgrade_initiated', {
      userId: auth.currentUser.uid,
      sessionId,
      timestamp
    });

    return {
      success: true,
      sessionId
    };
  } catch (error) {
    console.error('Error processing payment:', error);
    logAnalyticsEvent('premium_upgrade_error', {
      userId: auth.currentUser.uid,
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    throw new Error('Failed to process premium upgrade. Please contact support.');
  }
};