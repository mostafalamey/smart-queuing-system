import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}

/**
 * Subscribe to push notifications
 * POST /api/notifications/subscribe
 * 
 * Body:
 * {
 *   organizationId: string,
 *   customerPhone: string,
 *   subscription: {
 *     endpoint: string,
 *     keys: {
 *       p256dh: string,
 *       auth: string
 *     }
 *   },
 *   userAgent?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { organizationId, customerPhone, subscription, userAgent } = body

    // Validate required fields
    if (!organizationId || !customerPhone || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if subscription already exists
    const { data: existingSubscription, error: selectError } = await supabase
      .from('push_subscriptions')
      .select('id, is_active')
      .eq('organization_id', organizationId)
      .eq('customer_phone', customerPhone)
      .eq('endpoint', subscription.endpoint)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Database error', details: selectError.message },
        { status: 500, headers: corsHeaders }
      )
    }

    if (existingSubscription) {
      // Update existing subscription to active
      const { error: updateError } = await supabase
        .from('push_subscriptions')
        .update({ 
          is_active: true,
          last_used_at: new Date().toISOString(),
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          user_agent: userAgent || null
        })
        .eq('id', existingSubscription.id)

      if (updateError) {
        console.error('Error updating subscription:', updateError)
        return NextResponse.json(
          { error: 'Failed to update subscription', details: updateError.message },
          { status: 500, headers: corsHeaders }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription updated successfully',
        subscriptionId: existingSubscription.id
      }, { headers: corsHeaders })
    }

    // Create new subscription
    const { data: newSubscription, error: insertError } = await supabase
      .from('push_subscriptions')
      .insert({
        organization_id: organizationId,
        customer_phone: customerPhone,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        user_agent: userAgent || null,
        is_active: true
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error creating subscription:', insertError)
      return NextResponse.json(
        { error: 'Failed to create subscription', details: insertError.message },
        { status: 500, headers: corsHeaders }
      )
    }

    // Update or create notification preferences
    await upsertNotificationPreferences(organizationId, customerPhone, true, false)

    return NextResponse.json({
      success: true,
      message: 'Subscription created successfully',
      subscriptionId: newSubscription.id
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Subscribe API error:', error)
    return NextResponse.json(
      { 
        error: 'Database error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * Update notification preferences when push is denied
 * PUT /api/notifications/subscribe
 * 
 * Body:
 * {
 *   organizationId: string,
 *   customerPhone: string,
 *   pushDenied: boolean
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const { organizationId, customerPhone, pushDenied } = await request.json()

    // Validate required fields
    if (!organizationId || !customerPhone || typeof pushDenied !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Update notification preferences
    await upsertNotificationPreferences(organizationId, customerPhone, !pushDenied, pushDenied)

    // If push was denied, deactivate any existing subscriptions
    if (pushDenied) {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('organization_id', organizationId)
        .eq('customer_phone', customerPhone)
    }

    return NextResponse.json({
      success: true,
      message: pushDenied ? 'Push notifications disabled, WhatsApp fallback enabled' : 'Push notifications enabled'
    })

  } catch (error) {
    console.error('Update preferences API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get notification preferences for a customer
 * GET /api/notifications/subscribe?organizationId=xxx&customerPhone=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const customerPhone = searchParams.get('customerPhone')

    if (!organizationId || !customerPhone) {
      return NextResponse.json(
        { error: 'Missing organizationId or customerPhone' },
        { status: 400 }
      )
    }

    // Get notification preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('customer_phone', customerPhone)
      .single()

    // Get active subscriptions count
    const { data: subscriptions, count } = await supabase
      .from('push_subscriptions')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('customer_phone', customerPhone)
      .eq('is_active', true)

    return NextResponse.json({
      success: true,
      preferences: preferences || {
        push_enabled: true,
        push_denied: false,
        whatsapp_fallback: true
      },
      activeSubscriptions: count || 0
    })

  } catch (error) {
    console.error('Get preferences API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Helper function to upsert notification preferences
 */
async function upsertNotificationPreferences(
  organizationId: string,
  customerPhone: string,
  pushEnabled: boolean,
  pushDenied: boolean
) {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({
      organization_id: organizationId,
      customer_phone: customerPhone,
      push_enabled: pushEnabled,
      push_denied: pushDenied,
      push_denied_at: pushDenied ? new Date().toISOString() : null,
      whatsapp_fallback: true // Always enable WhatsApp as fallback
    }, {
      onConflict: 'organization_id,customer_phone'
    })

  if (error) {
    console.error('Error upserting notification preferences:', error)
  }
}
