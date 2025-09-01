// Test script to verify Phase 1 Analytics are working with real components
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: './admin/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPhase1Analytics() {
  console.log('🧪 Testing Phase 1 Analytics Components...')
  
  try {
    // Test 1: Check if daily_analytics table exists
    console.log('\n1. Checking daily_analytics table...')
    const { data: dailyData, error: dailyError } = await supabase
      .from('daily_analytics')
      .select('*')
      .limit(1)
    
    if (dailyError) {
      console.log('❌ daily_analytics table not found:', dailyError.message)
      console.log('💡 Need to apply phase1-analytics-tables.sql')
    } else {
      console.log('✅ daily_analytics table exists')
      console.log(`📊 Found ${dailyData?.length || 0} records`)
    }
    
    // Test 2: Check service_analytics table
    console.log('\n2. Checking service_analytics table...')
    const { data: serviceData, error: serviceError } = await supabase
      .from('service_analytics')
      .select('*')
      .limit(1)
    
    if (serviceError) {
      console.log('❌ service_analytics table not found:', serviceError.message)
    } else {
      console.log('✅ service_analytics table exists')
      console.log(`📊 Found ${serviceData?.length || 0} records`)
    }
    
    // Test 3: Check if we have any organizations to work with
    console.log('\n3. Checking organizations...')
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(5)
    
    if (orgError) {
      console.log('❌ Error fetching organizations:', orgError.message)
    } else {
      console.log('✅ Organizations available:')
      orgs?.forEach(org => console.log(`   - ${org.name} (${org.id})`))
    }
    
    // Test 4: Try to fetch tickets data
    console.log('\n4. Checking tickets data...')
    const { data: tickets, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        ticket_number,
        status,
        created_at,
        called_at,
        completed_at,
        departments (
          id,
          name,
          branches (
            organization_id
          )
        )
      `)
      .limit(10)
    
    if (ticketError) {
      console.log('❌ Error fetching tickets:', ticketError.message)
    } else {
      console.log(`✅ Found ${tickets?.length || 0} tickets`)
      if (tickets && tickets.length > 0) {
        console.log(`   Sample ticket: ${tickets[0].ticket_number} (${tickets[0].status})`)
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testPhase1Analytics().then(() => {
  console.log('\n✨ Phase 1 Analytics test completed!')
  process.exit(0)
}).catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})
