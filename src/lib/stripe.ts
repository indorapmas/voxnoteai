import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

export const PLANS = {
  starter: {
    name: 'Starter',
    price: 12,
    minutes: 120,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID!,
  },
  pro: {
    name: 'Pro',
    price: 25,
    minutes: 300,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!,
  },
  power: {
    name: 'Power',
    price: 59,
    minutes: 900,
    priceId: process.env.NEXT_PUBLIC_STRIPE_POWER_PRICE_ID!,
  },
}
