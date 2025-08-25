# Production Email Configuration

## Required Environment Variables

Add these to your .env.local file:

```bash
# Resend API Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx  # Get from resend.com
FROM_EMAIL=noreply@yourdomain.com   # Must be verified domain

# Alternative: SendGrid Configuration  
# SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxx
# FROM_EMAIL=noreply@yourdomain.com

# Alternative: Mailgun Configuration
# MAILGUN_API_KEY=xxxxxxxxxxxxxxxx
# MAILGUN_DOMAIN=mg.yourdomain.com
```

## Installation Commands

```bash
# Install Resend (Recommended)
cd admin
npm install resend

# Alternative: Install SendGrid
# npm install @sendgrid/mail

# Alternative: Install Mailgun
# npm install mailgun.js
```

## Domain Setup

1. **Resend.com**: Add and verify your sending domain
2. **Custom Domain**: Set up DNS records (SPF, DKIM, DMARC)
3. **Testing**: Start with resend's test domain, then switch to custom

## Rate Limits Comparison

| Service | Rate Limit | Cost |
|---------|-----------|------|
| Supabase | 5/hour | Free (but unusable) |
| Resend | 100/day → 50k/month | $0 → $20/month |
| SendGrid | 100/day → 40k/month | $0 → $20/month |
| Mailgun | 5k/month → unlimited | $0 → $35/month |

## Implementation Priority

1. **Immediate**: Install Resend and get API key
2. **Test**: Send real invitation with new email service  
3. **Production**: Configure custom domain for professional emails
4. **Monitor**: Track delivery rates and bounces
