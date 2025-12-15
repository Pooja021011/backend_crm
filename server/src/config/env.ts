// #region agent log
fetch('http://127.0.0.1:7242/ingest/06111847-3345-4786-9a5d-89cc38601516',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'env.ts:1',message:'Environment config loaded',data:{hasTwilioSid:!!process.env.TWILIO_ACCOUNT_SID,hasTwilioToken:!!process.env.TWILIO_AUTH_TOKEN,twilioSidLength:process.env.TWILIO_ACCOUNT_SID?.length,appBaseUrl:process.env.APP_BASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'init',hypothesisId:'E'})}).catch(()=>{});
// #endregion

export const env = {
  PORT: Number(process.env.PORT || 4000),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'changeme',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'changeme',
  NODE_ENV: process.env.NODE_ENV || 'development',
  // Twilio Configuration
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  APP_BASE_URL: process.env.APP_BASE_URL || 'http://localhost:4000',
};

