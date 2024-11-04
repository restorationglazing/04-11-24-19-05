import { Handler } from '@netlify/functions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId, email, checkoutSessionId, successUrl, cancelUrl } = JSON.parse(event.body || '{}');

    if (!userId || !email || !checkoutSessionId || !successUrl || !cancelUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: 'price_1QH2KpCsm96Q1cqshQTDWV37',
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      customer_email: email,
      metadata: {
        userId,
        checkoutSessionId,
        source: 'web_client'
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        sessionId: session.id
      })
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create checkout session'
      })
    };
  }
};