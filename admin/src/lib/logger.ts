// Production-ready logging utility for Admin App
// Only logs in development mode, reduces console noise in production

type LogLevel = 'log' | 'warn' | 'error' | 'info'

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  
  // Allow enabling debug logs in production if needed (via environment variable)
  private debugMode = process.env.NEXT_PUBLIC_DEBUG_LOGS === 'true'

  log(...args: any[]) {
    if (this.isDevelopment || this.debugMode) {
      console.log(...args)
    }
  }

  warn(...args: any[]) {
    if (this.isDevelopment || this.debugMode) {
      console.warn(...args)
    }
  }

  error(...args: any[]) {
    // Always log errors, even in production
    console.error(...args)
  }

  info(...args: any[]) {
    if (this.isDevelopment || this.debugMode) {
      console.info(...args)
    }
  }

  // For critical production logging (errors, important events)
  production(...args: any[]) {
    console.log(...args)
  }
  
  // Debug method for troubleshooting in production (only when debug mode enabled)
  debug(...args: any[]) {
    if (this.debugMode) {
      console.log('[DEBUG]', ...args)
    }
  }
}

export const logger = new Logger()
