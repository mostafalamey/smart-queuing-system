# Optional: Enhanced Admin Cleanup Button
# This would make the admin button also clean notification_logs

# Add this to your TicketCleanupService if you want manual notification cleanup too:

/**
 * Enhanced emergency cleanup that also cleans notification_logs
 */
static async enhancedEmergencyCleanup(): Promise<{
  tickets: CleanupResult | null,
  notifications: any
}> {
  // Clean tickets (existing functionality)
  const ticketResult = await this.emergencyCleanup(true)
  
  // Also call the Edge Function for notification cleanup
  const notificationResult = await fetch('/api/cleanup-notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adminKey: 'SmartQueue_Admin_2025_Secure',
      successfulNotificationRetentionMinutes: 0, // Clean all
      failedNotificationRetentionHours: 0 // Clean all
    })
  })
  
  return {
    tickets: ticketResult,
    notifications: await notificationResult.json()
  }
}
