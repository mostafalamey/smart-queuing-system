# Smart Queue Landing Page — Next.js + Tailwind + Stripe Checkout + Webhooks

Below is the landing page with Stripe Checkout integration (already included) **plus a webhook handler** so that subscription changes in Stripe automatically update the organization’s plan and limits in Supabase.

---

## 1. Webhook Handler (Next.js API)

Create `/pages/api/stripe-webhook.ts` (Pages Router) or `/app/api/stripe-webhook/route.ts` (App Router).

```ts
// pages/api/stripe-webhook.ts
import { buffer } from "micro";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const sig = req.headers["stripe-signature"] as string;
  const buf = await buffer(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      buf.toString(),
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = session.subscription as string;
      const customerId = session.customer as string;

      // Retrieve subscription to know which price/plan
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0].price.id;

      // Map priceId to plan + limits
      const planMap: Record<string, any> = {
        price_starter_monthly: {
          plan: "starter",
          max_branches: 1,
          max_departments: 3,
          max_staff: 5,
          ticket_cap: 2000,
        },
        price_growth_monthly: {
          plan: "growth",
          max_branches: 5,
          max_departments: 50,
          max_staff: 20,
          ticket_cap: 10000,
        },
        price_business_monthly: {
          plan: "business",
          max_branches: 999,
          max_departments: 999,
          max_staff: 999,
          ticket_cap: 100000,
        },
      };

      const limits = planMap[priceId];
      if (limits) {
        // Find org by Stripe customer ID (store this link at org signup)
        const { error } = await supabase
          .from("organizations")
          .update(limits)
          .eq("stripe_customer_id", customerId);

        if (error) console.error("Supabase update error", error);
      }
    }

    // Handle subscription updates (downgrade/upgrade)
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0].price.id;
      const customerId = subscription.customer as string;

      // Reuse mapping logic above
      const planMap: Record<string, any> = {
        price_starter_monthly: {
          plan: "starter",
          max_branches: 1,
          max_departments: 3,
          max_staff: 5,
          ticket_cap: 2000,
        },
        price_growth_monthly: {
          plan: "growth",
          max_branches: 5,
          max_departments: 50,
          max_staff: 20,
          ticket_cap: 10000,
        },
        price_business_monthly: {
          plan: "business",
          max_branches: 999,
          max_departments: 999,
          max_staff: 999,
          ticket_cap: 100000,
        },
      };

      const limits = planMap[priceId];
      if (limits) {
        await supabase
          .from("organizations")
          .update(limits)
          .eq("stripe_customer_id", customerId);
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error", err);
    res.status(500).send("Server error");
  }
}
```

---

## 2. Linking Stripe Customers to Organizations

* When an organization signs up, create a Stripe customer and store its `id` in your `organizations` table under `stripe_customer_id`.
* This allows the webhook to map subscription updates back to the correct org.

---

## 3. Environment Variables Needed

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://xyzcompany.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

> ⚠️ Use the **service role key** only in server-side code (never client-side) because it has elevated privileges.

---

## 4. Flow

1. User clicks plan → Stripe Checkout.
2. Stripe sends `checkout.session.completed` webhook.
3. Webhook updates `organizations` row with new `plan` + limits.
4. RLS policies in Supabase automatically enforce those limits.

---

## 5. Next Steps

* Deploy webhook endpoint (`/api/stripe-webhook`) to Vercel.
* Register it in Stripe Dashboard → Webhooks.
* Test with `stripe listen` + `stripe trigger checkout.session.completed` locally.
* Confirm Supabase `organizations` table updates.

---

✅ With this webhook, your SaaS now auto-syncs billing and authorization: users can’t exceed plan limits because Supabase enforces them, and upgrades/downgrades update instantly when Stripe fires events.
