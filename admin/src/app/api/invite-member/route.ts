// Server-side API route for sending invitations
// This will be at /api/invite-member

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // This is the key that enables admin functions
)

export async function POST(request: NextRequest) {
  try {
    const { email, role, organizationId, organizationName, testMode } = await request.json()

    let invitationData = null

    if (testMode) {
      // Test mode - skip email sending, just create member record
      // Debug log removed
      invitationData = { user: { email } } // Mock user data
    } else {
      // Normal mode - send invitation email
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          organization_id: organizationId,
          role: role,
          organization_name: organizationName,
          invitation_type: 'member' // Distinguish from organization creation
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/accept-invitation`
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      invitationData = data
    }

    // Create pending member record
    const { error: memberError } = await supabaseAdmin
      .from('members')
      .insert([
        {
          email: email,
          name: email.split('@')[0],
          role: role,
          organization_id: organizationId,
          is_active: false,
          auth_user_id: invitationData.user?.id || null
        }
      ])

    if (memberError) {
      // Debug log removed
      // Continue anyway - the auth invitation was successful
    }

    return NextResponse.json({ 
      success: true, 
      user: invitationData.user,
      testMode: testMode || false 
    })
  } catch (error) {
    // Debug log removed
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
  }
}
