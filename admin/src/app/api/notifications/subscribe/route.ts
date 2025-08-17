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
 *   ticketId: string,
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
    
    const { organizationId, ticketId, subscription, userAgent } = body

    // Validate required fields (ticket ID instead of phone)
    if (!organizationId || !ticketId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if subscription already exists for this ticket
    const { data: existingSubscription, error: selectError } = await supabase
      .from('push_subscriptions')
      .select('id, is_active')
      .eq('organization_id', organizationId)
      .eq('ticket_id', ticketId)
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
        ticket_id: ticketId,
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

    // Get customer phone from ticket for notification preferences (if available)
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .select('customer_phone')
      .eq('id', ticketId)
      .single()

    if (ticketError) {
      console.error('Error fetching ticket data:', ticketError)
      // Continue without updating preferences if ticket lookup fails
    } else if (ticketData?.customer_phone) {
      // Update notification preferences only if phone number exists
      await upsertNotificationPreferences(organizationId, ticketData.customer_phone, true, false)
    }

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
 *   ticketId: string,
 *   pushDenied: boolean
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const { organizationId, ticketId, pushDenied } = await request.json()

    // Validate required fields
    if (!organizationId || !ticketId || typeof pushDenied !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get ticket data to find customer phone (if exists)
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .select('customer_phone')
      .eq('id', ticketId)
      .single()

    if (ticketError) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Update preferences only if customer has a phone number
    if (ticketData?.customer_phone) {
      await upsertNotificationPreferences(organizationId, ticketData.customer_phone, !pushDenied, pushDenied)
    }

    // If push was denied, deactivate any existing subscriptions for this ticket
    if (pushDenied) {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('organization_id', organizationId)
        .eq('ticket_id', ticketId)
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
 * GET /api/notifications/subscribe?organizationId=xxx&ticketId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const ticketId = searchParams.get('ticketId')

    if (!organizationId || !ticketId) {
      return NextResponse.json(
        { error: 'Missing organizationId or ticketId' },
        { status: 400 }
      )
    }

    // Get customer phone from ticket (might be null)
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .select('customer_phone')
      .eq('id', ticketId)
      .single()

    if (ticketError) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // If customer has phone, get their preferences
    let preferences = null
    if (ticketData?.customer_phone) {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('customer_phone', ticketData.customer_phone)
        .single()
      preferences = data
    }

    // Get active subscriptions count for this ticket
    const { data: subscriptions, count } = await supabase
      .from('push_subscriptions')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('ticket_id', ticketId)
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
