import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET is required');
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Initialize Firebase Admin
if (!getApps().length) {
  if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('Firebase admin credentials are required');
  }

  initializeApp({
    credential: cert({
      projectId: "cellular-unity-440317-d2",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

const updateUserPremiumStatus = async (
  userId: string,
  sessionId: string,
  customerId: string,
  subscriptionId: string,
  isActive: boolean = true
) => {
  const batch = db.batch();
  const timestamp = new Date().toISOString();

  // Update user document
  const userRef = db.collection('users').doc(userId);
  batch.update(userRef, {
    isPremium: isActive,
    premiumSince: timestamp,
    lastVerified: timestamp,
    stripeSessionId: sessionId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripeSubscriptionActive: isActive,
    webhookConfirmed: true,
    updatedAt: timestamp
  });

  // Update premium users collection
  const premiumUserRef = db.collection('premiumUsers').doc(userId);
  batch.set(premiumUserRef, {
    userId,
    active: isActive,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripeSessionId: sessionId,
    webhookConfirmed: true,
    createdAt: timestamp,
    updatedAt: timestamp
  }, { merge: true });

  await batch.commit();
  console.log(`Updated premium status for user ${userId} to ${isActive}`);
};

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const sig = event.headers['stripe-signature'];
    if (!sig) {
      throw new Error('No Stripe signature found');
    }

    const stripeEvent = stripe.webhooks.constructEvent(
      event.body || '',
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log('Processing Stripe webhook:', stripeEvent.type);

    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        
        if (!userId) {
          throw new Error('No userId found in session');
        }

        if (!session.subscription || !session.customer) {
          throw new Error('Missing subscription or customer ID');
        }

        await updateUserPremiumStatus(
          userId,
          session.id,
          session.customer as string,
          session.subscription as string
        );

        // Update checkout session if ID exists in metadata
        if (session.metadata?.checkoutSessionId) {
          const checkoutRef = db.collection('stripeCheckoutSessions').doc(session.metadata.checkoutSessionId);
          await checkoutRef.update({
            status: 'completed',
            webhookReceived: true,
            completedAt: new Date().toISOString(),
            stripeSessionId: session.id,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription
          });
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by Stripe customer ID
        const usersSnapshot = await db.collection('users')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const userId = usersSnapshot.docs[0].id;
          await updateUserPremiumStatus(
            userId,
            usersSnapshot.docs[0].data().stripeSessionId,
            customerId,
            subscription.id,
            false
          );
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const isActive = subscription.status === 'active';

        const usersSnapshot = await db.collection('users')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const userId = usersSnapshot.docs[0].id;
          await updateUserPremiumStatus(
            userId,
            usersSnapshot.docs[0].data().stripeSessionId,
            customerId,
            subscription.id,
            isActive
          );
        }

        break;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown webhook error'
      })
    };
  }
};