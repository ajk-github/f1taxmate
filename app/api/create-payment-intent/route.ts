import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/** Stripe minimum for USD is 50 cents */
const MIN_AMOUNT_CENTS = 50

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const amountCents = Math.round(Number(body.amountCents) || 0)
    const selectedProductIds = Array.isArray(body.selectedProductIds)
      ? body.selectedProductIds
      : []

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not set')
      return NextResponse.json(
        { error: 'Payment configuration error' },
        { status: 500 }
      )
    }

    if (amountCents < MIN_AMOUNT_CENTS) {
      return NextResponse.json(
        { error: `Minimum charge is $${(MIN_AMOUNT_CENTS / 100).toFixed(2)}` },
        { status: 400 }
      )
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        selectedProducts: selectedProductIds.join(','),
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    })
  } catch (err) {
    console.error('Create PaymentIntent error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create payment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
