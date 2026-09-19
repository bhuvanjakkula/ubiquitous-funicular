import { NextResponse } from 'next/server';
import { stripeClient, appUrl } from '@/server/billing/stripe';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(`${appUrl()}/app/billing`);
  }

  try {
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.customer) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: session.customer as string,
        return_url: `${appUrl()}/app/billing`,
      });
      return NextResponse.redirect(portalSession.url);
    }
  } catch (error) {
    console.error('Error redirecting to billing portal:', error);
  }

  return NextResponse.redirect(`${appUrl()}/app/billing?billing=success`);
}
