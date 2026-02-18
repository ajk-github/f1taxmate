import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'F1TaxMate <noreply@f1taxmate.com>'

export async function POST(request: Request) {
  if (!resend) {
    return NextResponse.json(
      { error: 'Email is not configured. Set RESEND_API_KEY.' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const to = typeof body.to === 'string' ? body.to.trim() : ''
    const zipBase64 = typeof body.zipBase64 === 'string' ? body.zipBase64 : ''

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      )
    }

    if (!zipBase64) {
      return NextResponse.json(
        { error: 'No attachment provided' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(zipBase64, 'base64')
    const filename = `tax-forms-${new Date().getFullYear()}.zip`

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Your tax forms are ready',
      html: `
        <p>Your tax forms are attached to this email.</p>
        <p>Thank you for using our service.</p>
      `,
      attachments: [
        {
          filename,
          content: buffer,
        },
      ],
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Send forms error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
