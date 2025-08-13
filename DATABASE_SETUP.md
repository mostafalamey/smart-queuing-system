# Database Setup Guide

## Queue Settings Table Setup

The `queue_settings` table is essential for proper queue management in the Smart Queue System. It provides:

### Key Benefits

1. **Atomic Ticket Generation**: Prevents duplicate ticket numbers during concurrent requests
2. **Centralized State Management**: Single source of truth for queue status
3. **Performance Optimization**: Avoids expensive queries on the tickets table
4. **Real-time Queue Tracking**: Maintains current serving ticket and counters

### Table Structure

```sql
queue_settings:
- id (uuid, primary key)
- department_id (uuid, foreign key to departments)
- current_serving (text, nullable) - Current ticket being served
- last_ticket_number (integer) - Last issued ticket number for this department
- created_at (timestamp)
- updated_at (timestamp)
```

### Setup Instructions

1. **Open Supabase Dashboard**
   - Go to your project dashboard
   - Navigate to SQL Editor

2. **Run the Migration**
   - Copy the contents of `database-setup.sql`
   - Paste and execute in the SQL Editor

3. **Verify Setup**
   - Check that the `queue_settings` table exists
   - Verify RLS policies are enabled
   - Confirm existing departments have queue_settings records

### How It Works

#### Customer App Flow

1. Customer scans QR code and selects department
2. System checks `queue_settings` for that department
3. If no record exists, creates one with `last_ticket_number: 0`
4. Generates new ticket with `last_ticket_number + 1`
5. Updates `queue_settings.last_ticket_number` atomically
6. Creates ticket record

#### Admin App Flow

1. Admin calls next ticket
2. System updates `queue_settings.current_serving`
3. Updates ticket status to 'called'
4. Sends notification to customer

### Troubleshooting

If you get 404 errors on `queue_settings`:

1. Ensure the table exists in your database
2. Check RLS policies allow your user access
3. Verify the table is in the `public` schema
4. Run the setup SQL script

### Migration Notes

- The setup script is safe to run multiple times
- It will initialize queue settings for existing departments
- It extracts the highest ticket number from existing tickets
- All operations are wrapped in conditional statements
