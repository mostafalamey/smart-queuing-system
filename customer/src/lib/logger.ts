// Production-ready logging utility
// Only logs in development mode, reduces console noise in production

type LogLevel = 'log' | 'warn' | 'error' | 'info'

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  log(...args: any[]) {
    if (this.isDevelopment) {
      console.log(...args)
    }
  }

  warn(...args: any[]) {
    if (this.isDevelopment) {
      console.warn(...args)
    }
  }

  error(...args: any[]) {
    // Always log errors, even in production
    console.error(...args)
  }

  info(...args: any[]) {
    if (this.isDevelopment) {
      console.info(...args)
    }
  }

  // For critical production logging (errors, important events)
  production(...args: any[]) {
    console.log(...args)
  }
}

export const logger = new Logger()
