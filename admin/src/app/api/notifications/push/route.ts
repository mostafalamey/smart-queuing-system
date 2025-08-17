import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
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

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: any
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  requireInteraction?: boolean
  silent?: boolean
  tag?: string
  renotify?: boolean
  vibrate?: number[]
}

/**
 * Send push notification to a specific customer
 * POST /api/notifications/push
 * 
 * Body:
 * {
 *   organizationId: string,
 *   ticketId: string,
 *   customerPhone?: string, // Optional for WhatsApp/SMS fallback
 *   payload: NotificationPayload,
 *   notificationType: 'ticket_created' | 'almost_your_turn' | 'your_turn',
 *   ticketNumber?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      organizationId,
      ticketId,
      customerPhone, // Now optional
      payload,
      notificationType,
      ticketNumber
    } = body

    // Validate required fields (ticketId is now required instead of customerPhone)
    if (!organizationId || !ticketId || !payload || !notificationType) {
      console.error('Push API missing required fields:', {
        organizationId: !!organizationId,
        ticketId: !!ticketId,
        payload: !!payload,
        notificationType: !!notificationType
      })
      return NextResponse.json(
        { error: 'Missing required fields', details: {
          organizationId: !organizationId ? 'missing' : 'present',
          ticketId: !ticketId ? 'missing' : 'present',
          payload: !payload ? 'missing' : 'present',
          notificationType: !notificationType ? 'missing' : 'present'
        }},
        { status: 400, headers: corsHeaders }
      )
    }

    // Get active push subscriptions for this ticket
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('ticket_id', ticketId)
      .eq('is_active', true)

    if (subscriptionError) {
      console.error('Error fetching subscriptions:', subscriptionError)
      
      // Check if this is a "table doesn't exist" error (migration not run)
      if (subscriptionError.code === 'PGRST204' || subscriptionError.message?.includes('does not exist') || subscriptionError.message?.includes('push_subscriptions')) {
        return NextResponse.json(
          { 
            error: 'Database migration required', 
            details: 'Please run the database migration script: sql/database-push-notifications-ticket-based.sql',
            migrationRequired: true
          },
          { status: 503, headers: corsHeaders }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions', details: subscriptionError.message },
        { status: 500, headers: corsHeaders }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      // Log that push failed, so we can trigger WhatsApp fallback
      await logNotificationAttempt(
        organizationId,
        ticketId,
        customerPhone || null,
        ticketNumber || '',
        notificationType,
        'push',
        false,
        'No active subscriptions found'
      )

      return NextResponse.json(
        { 
          success: false, 
          message: 'No active subscriptions found',
          shouldFallback: true 
        },
        { status: 200, headers: corsHeaders } // Changed from 404 to 200
      )
    }

    const pushResults = []
    let successCount = 0
    let failureCount = 0

    // Send notification to all active subscriptions
    for (const subscription of subscriptions) {
      try {
        const pushSubscription: PushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key
          }
        }

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        )

        // Update last_used_at for successful subscription
        await supabase
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', subscription.id)

        pushResults.push({
          subscriptionId: subscription.id,
          success: true
        })
        successCount++

      } catch (error: any) {
        console.error(`Push notification failed for subscription ${subscription.id}:`, error)
        
        // Handle specific error cases
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription is no longer valid, mark as inactive
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', subscription.id)
        }

        pushResults.push({
          subscriptionId: subscription.id,
          success: false,
          error: error.message
        })
        failureCount++
      }
    }

    // Log the notification attempt
    await logNotificationAttempt(
      organizationId,
      ticketId,
      customerPhone,
      ticketNumber || '',
      notificationType,
      'push',
      successCount > 0,
      failureCount > 0 ? `${successCount} success, ${failureCount} failed` : undefined
    )

    if (successCount > 0) {
      return NextResponse.json({
        success: true,
        message: `Push notification sent successfully`,
        results: {
          total: subscriptions.length,
          success: successCount,
          failed: failureCount,
          details: pushResults
        }
      }, { headers: corsHeaders })
    } else {
      return NextResponse.json({
        success: false,
        message: 'All push notifications failed',
        shouldFallback: true,
        results: {
          total: subscriptions.length,
          success: successCount,
          failed: failureCount,
          details: pushResults
        }
      }, { status: 500, headers: corsHeaders })
    }

  } catch (error) {
    console.error('Push notification API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * Helper function to log notification attempts
 */
async function logNotificationAttempt(
  organizationId: string,
  ticketId: string,
  customerPhone: string | null, // Now optional
  ticketNumber: string,
  notificationType: string,
  deliveryMethod: string,
  success: boolean,
  errorMessage?: string
) {
  try {
    await supabase
      .from('notification_logs')
      .insert({
        organization_id: organizationId,
        ticket_id: ticketId, // Use ticket ID as primary identifier
        customer_phone: customerPhone, // Optional
        ticket_number: ticketNumber,
        notification_type: notificationType,
        delivery_method: deliveryMethod,
        push_success: deliveryMethod === 'push' ? success : null,
        push_error: deliveryMethod === 'push' && !success ? errorMessage : null,
        whatsapp_success: deliveryMethod === 'whatsapp' ? success : null,
        whatsapp_error: deliveryMethod === 'whatsapp' && !success ? errorMessage : null
      })
  } catch (error) {
    console.error('Failed to log notification attempt:', error)
  }
}
