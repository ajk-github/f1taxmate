import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'F1 Tax Filing - Tax Forms for F1 Students',
  description: 'Prepare your tax forms as an F1 student in the USA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
