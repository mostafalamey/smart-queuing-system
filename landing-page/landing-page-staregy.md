# SMART QUEUE — Landing Page Strategy & Copy (v1)

> Goal: Convert ops managers and owners into paid trials. Make value obvious in 5 seconds. Show credibility in 30 seconds. Remove risk within 2 minutes.

---

## 1) Who we’re selling to

**Primary ICPs**

* **Clinics & Labs** (1–10 branches): chaotic waiting rooms, walk‑ins, missed calls, staff juggling paper lists.
* **Banks & Government Service Centers** (5–100 branches): compliance, SLAs, peak hours, long queues.
* **Retail & Service Chains** (2–50 branches): device repair, tech support, telco stores, bill payment.

**Core pains**

* Long, uncertain waits → customer frustration & walk‑aways.
* Manual calling → errors, favoritism complaints.
* No visibility → managers can’t see load across branches.
* Alerts are ad‑hoc → receptionists make phone calls or shout names.

---

## 2) Non‑fluffy value proposition (options)

**Option A (punchy):**
**Kill the waiting room.** Give customers a ticket in 10 seconds, notify them automatically, and keep your branches flowing.

**Option B (outcomes):**
**Faster lines. Happier customers. Less chaos.** Smart Queue automates tickets, updates customers in real‑time, and gives managers live control across locations.

**Option C (enterprise‑friendly):**
**Operational flow, not just tickets.** Multi‑tenant, branded, and real‑time—built to scale from one branch to hundreds.

Pick one headline for A/B test, reuse the others further down-page as section headers.

---

## 3) Page architecture (wireframe → content)

**Above the fold**

* Headline + clear outcome subhead
* Primary CTA: **Start free** (14‑day, no credit card) or **Book a demo**
* Secondary CTA: **See live demo** (instant, no signup)
* Visual: mockup of dashboard + phone with a ticket notification
* Trust row: “Used by” logos (placeholders) + succinct proof points

**Section 1 — How it works (90 seconds)**

* **Customers**: Scan QR → pick department → pick service → get ticket → get notified → go to counter.
* **Staff**: Call next → update status → reset queues at close.
* **Managers**: Create branches/departments → invite staff → watch live load.
* Minimal diagram (3 tracks: Customer / Staff / Manager).

**Section 2 — Features that matter**

* Real‑time queues per department
* Alphanumeric ticketing (BA001, AR001, …)
* Role‑based access (Admin/Manager/Staff)
* QR codes per org/branch/department
* Push + WhatsApp notifications (“Your turn” / “Almost your turn”)
* Branding per organization (logo/colors)
* Mobile‑first customer flow

**Section 3 — Business outcomes**

* Shorter perceived wait, fewer walk‑aways
* Staff focus on service, not shouting names
* Throughput clarity across branches
* Professional, branded experience

**Section 4 — Proof**

* 2–3 short case vignettes (replace with real logos later)
* Metrics to showcase once available: e.g., “35% faster service at peak”, “-22% walk‑aways”.

**Section 5 — Pricing & plans**

* Clear plan cards (see §6)
* FAQ covering limits, notifications, and integrations

**Section 6 — Security & compliance**

* Auth, RBAC, RLS, encrypted transport, data residency notes, backups.

**Sticky footer CTA**

* **Start free** + **Book demo**

---

## 4) Draft page copy (ready to paste)

**Hero**

* **H1:** Kill the waiting room.
* **Subhead:** Instant tickets, real‑time updates, and branch‑level control—without the chaos.
* **Primary CTA:** Start free →
* **Secondary CTA:** See live demo →
* **Micro‑proof:** Multi‑branch, role‑based, mobile‑first.

**Trust row**

* “Built on a modern, secure stack.” (Replace with partner logos when available.)

**How it works**

* **Customers:** Scan a QR at the entrance, choose a department, get a ticket (like **BAK-001**) in seconds, and receive a “Your turn” alert when it’s time.
* **Staff:** Use a clean dashboard to call the next customer, update statuses, and reset queues at closing.
* **Managers:** Create branches and departments, invite staff, enforce roles, and watch live load across locations.

**Features that matter**

* **Real‑time queues** per department with independent numbering
* **Alphanumeric tickets** for clarity (BA001, AR001, …)
* **Role‑based access**: Admin, Manager, Staff
* **QR codes** per org and branch
* **Notifications**: ticket created, almost your turn, your turn
* **Branding**: logos, colors, welcome messages
* **Mobile‑first** customer flow; **dashboard** optimized for desktop

**Why teams switch**

* Reduce walk‑aways and complaints about “line jumping”
* Keep reception focused on service, not manual calling
* See bottlenecks across branches in real‑time
* Deliver a consistent, branded experience

**CTA band**

* Start free today. Be live in under 10 minutes.

**Security & reliability**

* Secure auth, per‑organization data isolation, and real‑time updates. Production‑ready infrastructure with error handling and retries.

**FAQ**

* **Do customers need an app?** No, it works in the browser via QR.
* **How do notifications work?** Customers can opt‑in to browser push; SMS/WhatsApp available where enabled.
* **Can I manage multiple branches?** Yes—each branch can have multiple departments.
* **Can staff roles be restricted?** Yes—Admin, Manager, and Staff roles.
* **What if the internet blips?** The system recovers gracefully; staff can refresh and continue.

---

## 5) Conversion assets to prepare

* 45‑second silent hero video (overlay captions) showing:

  1. Scan QR → pick department → receive ticket on phone
  2. Staff calling next ticket on dashboard
  3. Manager view with multi‑branch status
* Screenshots: customer flow (mobile) + dashboard (desktop)
* “See live demo” link with a seeded demo org/branch
* Case study placeholders you can swap later

---

## 6) Packaging & pricing (initial model)

**Principle:** Price by **branch** (location). Departments and staff seats scale with branches. Meter WhatsApp/SMS at cost + small margin. Keep it simple.

**What to meter**

* **Branches** (locations)
* **Monthly tickets** (soft caps → overage packs)
* **Notification channels** (pass‑through + small margin)
* **Optional add‑ons** (SSO, priority queues, API, advanced analytics)

**Starter (per branch / month)**

* 1 branch, up to 3 departments
* 5 staff seats
* 2,000 tickets/mo soft cap
* Browser push notifications
* Basic analytics & export
* Branding (logo + colors)

**Growth (per branch / month)**

* Up to 5 branches included
* Unlimited departments
* 20 staff seats
* 10,000 tickets/mo soft cap
* Push + WhatsApp notifications (bring‑your‑own provider)
* Advanced analytics (hourly throughput, wait time percentiles)
* Priority support (business hours)

**Business (per branch / month)**

* 10+ branches (volume pricing)
* Unlimited seats
* Custom ticket caps
* SLA (99.9%), SSO (SAML), audit logs
* API access & webhooks
* White‑label (custom domain + email templates)

**Enterprise**

* Custom contract, security review, data residency options, dedicated success manager.

**Add‑ons**

* Extra ticket packs
* WhatsApp/SMS bundles
* Priority Queues module
* Appointment Booking module
* Kiosk mode (tablet/TV)

> **Note:** Keep headline price per **branch** visible; list overages clearly to avoid confusion. Offer annual discount (e.g., 2 months free).

---

## 7) Payment & checkout design

**Default path:** "Start free" → create org → 14‑day full‑feature trial → in‑app upgrade via checkout.

**Checkout options (choose one for v1):**

* **Card‑first checkout** (global): Processor that supports subscriptions, trials, tax/VAT handling, and receipts.
* **Regional gateway** (for specific markets): Local cards/wallets where needed.

**Plan mechanics**

* 14‑day trial, no credit card → strongest for top‑funnel volume
* Or 14‑day trial with card → reduces fake signups; better enterprise signal
* Annual plans with discount; prorated upgrades when adding branches mid‑cycle
* Pass‑through messaging costs with transparent line items

**Pricing table UX**

* Toggle **Monthly/Annual** (save X%)
* “Per branch / month” emphasized
* Hover tooltips for caps/overages
* CTA buttons: **Start free** (Starter/Growth) and **Talk to sales** (Business/Enterprise)

---

## 8) Activation path (what happens after signup)

1. Create organization → upload logo → pick brand color
2. Add first branch & departments
3. Print QR posters (auto‑generated)
4. Invite staff (roles)
5. Test flow (join queue from your phone) → see live dashboard → call next
6. Enable notifications (push; optionally connect WhatsApp)

Include a **“Getting Started”** checklist on the landing page (or post‑signup welcome) with visual progress.

---

## 9) Forward‑looking differentiators (roadmap mentions, not promises)

* **Analytics**: wait‑time predictions, peak hour staffing suggestions
* **Appointments** + walk‑in merging
* **Priority queues & SLAs**
* **Open API** for CRMs/EMRs/POS
* **Multi‑language** (Arabic/English) + RTL layout
* **Offline‑aware client** for intermittent connectivity

Use these to reassure larger buyers that the platform won’t box them in.

---

## 10) SEO & tracking

* Keywords: queue management system, virtual queue, take‑a‑number system, customer flow, clinic queue, bank queue
* On‑page: one H1, descriptive H2s, 600–1,200 words of real copy
* Schema: Product + FAQ + Organization
* Tracking: pageview + CTA click + demo view + checkout start; plan for A/B on hero headline

---

## 11) Asset checklist

* 6 high‑res screenshots (mobile + desktop)
* 45‑sec demo video (muted, captions)
* Printable QR poster templates (A4 & A3)
* Case study placeholders
* Pricing table illustrations (simple line icons)

---

## 12) Next steps (actionable)

1. Pick your headline (A/B two variants for 7 days)
2. Approve the plan structure above (or tweak sections)
3. Confirm pricing **by branch** and initial caps (or choose per‑ticket pricing if preferred)
4. Choose your checkout approach for v1 (global card processor vs regional gateway)
5. Give me final copy edits and I’ll generate a production‑ready Next.js landing page with a pricing table and checkout hooks.

---

### Appendix: Micro‑copy snippets you can reuse

* **CTA:** Start free — be live in 10 minutes
* **Feature blurb:** Real‑time queues per department with clean ticket prefixes like BA001
* **Benefit blurb:** Cut perceived wait times and eliminate line‑jump complaints
* **Security blurb:** Role‑based access, per‑org data isolation, and secure auth
* **WhatsApp blurb:** Optional WhatsApp alerts for “Almost your turn” and “Your turn”
