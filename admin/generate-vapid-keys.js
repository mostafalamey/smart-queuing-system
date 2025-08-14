// VAPID Keys Generator
// Run this script to generate VAPID keys for push notifications
// Usage: node generate-vapid-keys.js

const webpush = require('web-push');

// VAPID Keys Generator
// Run this script to generate VAPID keys for push notifications
// Usage: node generate-vapid-keys.js

const webpush = require('web-push');

console.log('Generating VAPID Keys for Push Notifications...\n');

try {
  const vapidKeys = webpush.generateVAPIDKeys();
  
  console.log('Add these environment variables to your .env.local files:\n');
  
  console.log('# VAPID Keys for Push Notifications');
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log(`VAPID_SUBJECT=mailto:your-email@domain.com`); // Replace with your email
  
  console.log('\nVAPID Keys generated successfully!');
  console.log('\nNext steps:');
  console.log('1. Add these keys to both admin/.env.local and customer/.env.local');
  console.log('2. Replace "your-email@domain.com" with your actual email address');
  console.log('3. Keep the private key secure and never commit it to version control');
  
} catch (error) {
  console.error('Error generating VAPID keys:', error);
  process.exit(1);
}
