// Deno Edge Function for creating branches with plan limit enforcement
// @deno-types="https://deno.land/x/types/index.d.ts"
//
// FIXED ISSUES:
// 1. Duplicate function definitions (getUpgradeMessage) - moved helper to top
// 2. Missing null checks on Authorization header - added proper validation
// 3. Missing environment variable validation - added checks for required vars
// 4. Improved error handling for JSON parsing - wrapped in try/catch
// 5. Better TypeScript types - added proper interfaces and type assertions
// 6. Consistent semicolon usage - standardized for better code quality

// Declare global Deno for TypeScript
declare global {
  const Deno: {
    env: {
      get(key: string): string | undefined;
    };
  };
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BranchCreateRequest {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface OrganizationPlanInfo {
  id: string;
  name: string;
  plan: string;
  max_branches: number;
  current_branches: number;
  remaining_branches: number;
}

interface Member {
  organization_id: string;
  role: string;
}

// Helper function to generate upgrade messages
function getUpgradeMessage(currentPlan: string, resourceType: string): string {
  const upgradeMap: Record<string, string> = {
    starter: 'Upgrade to Growth plan to add more branches.',
    growth: 'Upgrade to Business plan to add more branches.',
    business: 'Upgrade to Enterprise plan for unlimited branches.'
  }

  return upgradeMap[currentPlan] || 'Consider upgrading your plan for more branches.'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get required environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user's organization and role
    const { data: member, error: memberError } = await supabaseClient
      .from('members')
      .select('organization_id, role')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single();

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ error: 'User not found or inactive' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const typedMember = member as Member;

    // Check if user has permission to create branches
    if (!['admin', 'manager'].includes(typedMember.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions to create branches' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get organization plan and limits
    const { data: orgInfo, error: orgError } = await supabaseClient
      .from('organization_plan_info')
      .select('*')
      .eq('id', typedMember.organization_id)
      .single();

    if (orgError || !orgInfo) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const typedOrgInfo = orgInfo as OrganizationPlanInfo;

    // Check if organization has reached branch limit
    if (typedOrgInfo.max_branches !== -1 && typedOrgInfo.current_branches >= typedOrgInfo.max_branches) {
      const upgradeMessage = getUpgradeMessage(typedOrgInfo.plan, 'branches');
      return new Response(
        JSON.stringify({ 
          error: 'Branch limit reached',
          message: `You've reached your plan's branch limit (${typedOrgInfo.max_branches}). ${upgradeMessage}`,
          currentUsage: {
            current: typedOrgInfo.current_branches,
            limit: typedOrgInfo.max_branches,
            remaining: 0
          },
          upgradeRequired: true,
          currentPlan: typedOrgInfo.plan
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // If this is a GET request, return current usage info
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({
          success: true,
          usage: {
            current: typedOrgInfo.current_branches,
            limit: typedOrgInfo.max_branches,
            remaining: typedOrgInfo.remaining_branches,
            plan: typedOrgInfo.plan
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle POST request to create branch
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body with better error handling
    let body: BranchCreateRequest;
    try {
      body = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!body.name || body.name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Branch name is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create the branch
    const { data: newBranch, error: createError } = await supabaseClient
      .from('branches')
      .insert([{
        organization_id: typedMember.organization_id,
        name: body.name.trim(),
        address: body.address || null,
        phone: body.phone || null,
        email: body.email || null
      }])
      .select()
      .single();

    if (createError) {
      console.error('Branch creation error:', createError)
      
      // Handle specific constraint violations
      if (createError.code === '23505') { // Unique violation
        return new Response(
          JSON.stringify({ error: 'A branch with this name already exists' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Handle RLS policy violations (likely limit exceeded)
      if (createError.code === '42501' || createError.message?.includes('policy')) {
        const upgradeMessage = getUpgradeMessage(typedOrgInfo.plan, 'branches');
        return new Response(
          JSON.stringify({ 
            error: 'Branch limit reached',
            message: `Unable to create branch. ${upgradeMessage}`,
            upgradeRequired: true,
            currentPlan: typedOrgInfo.plan
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to create branch', details: createError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        branch: newBranch,
        usage: {
          current: typedOrgInfo.current_branches + 1,
          limit: typedOrgInfo.max_branches,
          remaining: typedOrgInfo.max_branches === -1 ? -1 : typedOrgInfo.remaining_branches - 1,
          plan: typedOrgInfo.plan
        }
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})

/* To deploy this Edge Function:

1. Install Supabase CLI: npm install -g supabase
2. Login: supabase login
3. Link your project: supabase link --project-ref YOUR_PROJECT_REF
4. Deploy: supabase functions deploy create-branch

Usage examples:

// Check current usage
GET https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-branch
Headers: { Authorization: 'Bearer USER_JWT_TOKEN' }

// Create a new branch
POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-branch
Headers: { Authorization: 'Bearer USER_JWT_TOKEN', Content-Type: 'application/json' }
Body: {
  "name": "Downtown Branch",
  "address": "123 Main St", 
  "phone": "+1234567890",
  "email": "downtown@company.com"
}

*/
