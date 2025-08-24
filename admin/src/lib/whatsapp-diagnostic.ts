// WhatsApp Service Diagnostic Test
// This file helps debug WhatsApp API issues

console.log("🔧 WhatsApp Service Diagnostic Test");
console.log("=====================================");

// Test environment variables
console.log("Environment Variables:");
console.log("- WHATSAPP_ENABLED:", process.env.WHATSAPP_ENABLED);
console.log("- WHATSAPP_DEBUG:", process.env.WHATSAPP_DEBUG);
console.log(
  "- ULTRAMSG_INSTANCE_ID:",
  process.env.ULTRAMSG_INSTANCE_ID || "MISSING"
);
console.log(
  "- ULTRAMSG_TOKEN:",
  process.env.ULTRAMSG_TOKEN ? "SET" : "MISSING"
);
console.log(
  "- ULTRAMSG_BASE_URL:",
  process.env.ULTRAMSG_BASE_URL || "https://api.ultramsg.com"
);

// Test phone number formatting
const testPhone = "+201015544028";
const formattedPhone = testPhone.startsWith("+")
  ? testPhone.substring(1)
  : testPhone;
console.log("Phone Number Test:");
console.log("- Original:", testPhone);
console.log("- Formatted:", formattedPhone);

export {};
