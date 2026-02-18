/**
 * Email Module
 * 
 * This module handles sending tax forms via email.
 * Since there's no backend, this will be a placeholder structure
 * that can be integrated with an email service later.
 */

import { GeneratedForms } from '../form-generation'

/**
 * Send tax forms to user's email
 */
export async function sendTaxFormsEmail(
  email: string,
  forms: GeneratedForms
): Promise<void> {
  // TODO: Implement email sending
  // This could use:
  // - SendGrid
  // - AWS SES
  // - Resend
  // - Nodemailer with SMTP
  
  // For now, this is a placeholder
  console.log(`Would send tax forms to ${email}`)
  
  // In a real implementation:
  // 1. Create email template with form attachments
  // 2. Attach PDF files
  // 3. Send email via email service
}
