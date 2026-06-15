import { Resend } from 'resend';
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const resend = new Resend(process.env.EMAIL_PROVIDER_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev"; // Default for Resend free tier

/**
 * Enhanced sendEmail function for diagnostics
 */
export const sendEmail = async () => {
  try {
    console.log("🔍 Testing Resend Configuration...");
    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: 'delivered@resend.dev', // Safe test endpoint
      subject: "Resend API TEST",
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4B775E;">RESEND WORKING SUCCESSFULLY</h2>
          <p>Your Resend setup is working correctly for Nexus Proctor.</p>
          <hr />
          <p style="font-size: 0.8em; color: #666;">Sent from your local development server.</p>
        </div>
      `,
    });

    console.log("✅ TEST MAIL SENT:", data);
    return data;
  } catch (err) {
    console.error("❌ MAIL ERROR:", err);
    throw err;
  }
};

/**
 * Dynamic Test Email function (Restored for Admin Controller)
 */
export const sendTestEmail = async (to) => {
  try {
    console.log(`🧪 Sending dynamic test to: ${to}...`);
    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: "NEXUS: Email Provider Diagnostic Test",
      text: "Your email configuration is working perfectly! 🚀",
      html: "<b>Your email configuration is working perfectly! 🚀</b>"
    });
    return data;
  } catch (err) {
    console.error("❌ DYNAMIC TEST ERROR:", err);
    throw err;
  }
};

/**
 * Standard faculty credential dispatch
 */
export const sendFacultyCredentials = async (faculty) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const mailOptions = {
      from: EMAIL_FROM,
      to: faculty.email,
      subject: "Nexus Proctor: Faculty Portal Credentials",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eef2f3; border-radius: 20px;">
          <h2 style="color: #4B775E;">Faculty Portal Access</h2>
          <p>Your faculty account has been successfully created.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px dashed #cbd5e1;">
            <p><b>Login Email:</b> ${faculty.email}</p>
            <p><b>Faculty ID:</b> ${faculty.facultyId}</p>
            <p><b>Password:</b> ${faculty.tempPassword}</p>
          </div>
          
          <p>
            <b>Portal URL:</b><br/>
            <a href="${frontendUrl}/faculty/login" style="color: #4B775E; font-weight: bold;">${frontendUrl}/faculty/login</a>
          </p>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 0.8em; color: #ef4444; font-weight: bold;">
            🛡️ Security Notice: Please change your password immediately after logging in.
          </p>
        </div>
      `,
    };

    const data = await resend.emails.send(mailOptions);
    console.log("✅ FACULTY CREDENTIAL MAIL SENT");
    return data;
  } catch (err) {
    console.error("❌ EMAIL DISPATCH ERROR:", err);
    throw err;
  }
};
