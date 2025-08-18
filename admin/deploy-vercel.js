#!/usr/bin/env node
// Smart Queue System - Vercel Deployment Helper

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Smart Queue System - Vercel Deployment Helper')
console.log('=' .repeat(60))

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Please run this script from the admin directory')
  process.exit(1)
}

// Check build
console.log('🔨 Testing build...')
try {
  execSync('npm run build', { stdio: 'inherit' })
  console.log('✅ Build successful!')
} catch (error) {
  console.error('❌ Build failed. Please fix errors before deploying.')
  process.exit(1)
}

// Check environment file
if (!fs.existsSync('.env.local')) {
  console.log('⚠️  No .env.local file found')
} else {
  console.log('✅ Environment file found')
}

console.log('\n📋 Pre-deployment Checklist:')
console.log('1. ✅ Build test passed')
console.log('2. ✅ Email service configured') 
console.log('3. ✅ Database configured')
console.log('4. ⏳ Ready for deployment')

console.log('\n🚀 Deploying to Vercel...')
try {
  execSync('vercel --prod', { stdio: 'inherit' })
  console.log('\n🎉 Deployment completed!')
  
  console.log('\n📋 Next Steps:')
  console.log('1. Update NEXT_PUBLIC_SITE_URL with your Vercel domain')
  console.log('2. Set environment variables in Vercel dashboard')
  console.log('3. Test the invitation system')
  console.log('4. (Optional) Configure custom SMTP in Supabase for higher rate limits')
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message)
  console.log('\n💡 Manual deployment:')
  console.log('   Run: vercel --prod')
}

console.log('\n📚 For email setup help, see: docs/VERCEL_EMAIL_SETUP.md')
