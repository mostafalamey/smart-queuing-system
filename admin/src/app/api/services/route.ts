import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('department_id')
    const includeInactive = searchParams.get('include_inactive') === 'true'

    let query = supabase
      .from('services')
      .select(`
        *,
        departments (
          id,
          name,
          branches (
            id,
            name,
            organization_id
          )
        ),
        service_queue_settings (
          current_serving,
          last_ticket_number,
          daily_tickets_count,
          is_service_active,
          average_service_time
        )
      `)
      .order('created_at', { ascending: false })

    if (departmentId) {
      query = query.eq('department_id', departmentId)
    }

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching services:', error)
      return NextResponse.json(
        { error: 'Failed to fetch services' },
        { status: 500 }
      )
    }

    return NextResponse.json({ services: data || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      department_id,
      name,
      description,
      service_code,
      estimated_duration = 15,
      max_daily_capacity,
      priority_weight = 1,
      color_code,
      icon_name
    } = body

    // Validate required fields
    if (!department_id || !name || !service_code) {
      return NextResponse.json(
        { error: 'Department ID, name, and service code are required' },
        { status: 400 }
      )
    }

    // Check if service code is unique within the department
    const { data: existingService } = await supabase
      .from('services')
      .select('id')
      .eq('department_id', department_id)
      .eq('service_code', service_code)
      .single()

    if (existingService) {
      return NextResponse.json(
        { error: 'Service code already exists in this department' },
        { status: 400 }
      )
    }

    // Create the service
    const { data, error } = await supabase
      .from('services')
      .insert({
        department_id,
        name,
        description,
        service_code: service_code.toUpperCase(),
        estimated_duration,
        max_daily_capacity,
        priority_weight,
        color_code,
        icon_name,
        is_active: true
      })
      .select(`
        *,
        departments (
          id,
          name,
          branches (
            id,
            name,
            organization_id
          )
        )
      `)
      .single()

    if (error) {
      console.error('Error creating service:', error)
      return NextResponse.json(
        { error: 'Failed to create service' },
        { status: 500 }
      )
    }

    return NextResponse.json({ service: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      name,
      description,
      service_code,
      estimated_duration,
      max_daily_capacity,
      priority_weight,
      color_code,
      icon_name,
      is_active
    } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (service_code !== undefined) updateData.service_code = service_code.toUpperCase()
    if (estimated_duration !== undefined) updateData.estimated_duration = estimated_duration
    if (max_daily_capacity !== undefined) updateData.max_daily_capacity = max_daily_capacity
    if (priority_weight !== undefined) updateData.priority_weight = priority_weight
    if (color_code !== undefined) updateData.color_code = color_code
    if (icon_name !== undefined) updateData.icon_name = icon_name
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        departments (
          id,
          name,
          branches (
            id,
            name,
            organization_id
          )
        ),
        service_queue_settings (
          current_serving,
          last_ticket_number,
          daily_tickets_count,
          is_service_active,
          average_service_time
        )
      `)
      .single()

    if (error) {
      console.error('Error updating service:', error)
      return NextResponse.json(
        { error: 'Failed to update service' },
        { status: 500 }
      )
    }

    return NextResponse.json({ service: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get('id')

    if (!serviceId) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      )
    }

    // Check if there are any active tickets for this service
    const { data: activeTickets } = await supabase
      .from('tickets')
      .select('id')
      .eq('service_id', serviceId)
      .in('status', ['waiting', 'called'])

    if (activeTickets && activeTickets.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete service with active tickets. Please serve or cancel all tickets first.' },
        { status: 400 }
      )
    }

    // Delete the service (cascade will handle queue_settings and analytics)
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)

    if (error) {
      console.error('Error deleting service:', error)
      return NextResponse.json(
        { error: 'Failed to delete service' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Service deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
