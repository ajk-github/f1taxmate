# F1 Tax Filing

A tax form preparation website specifically designed for F1 students in the USA. This Next.js application helps F1 students prepare their tax forms (8843, 1040 Federal/State, 832) without requiring a backend or database.

## Features

- **Multi-step Form**: Collects all necessary information across 5 steps:
  1. Personal Information
  2. University/College Information
  3. Residency Information
  4. Income Documents and Bank Details
  5. Review

- **Tax Calculation**: Calculates federal and state taxes based on:
  - Country of citizenship
  - US state of residence
  - Income information
  - Tax residency status

- **Form Generation**: Automatically generates required tax forms:
  - Form 8843 (Statement for Exempt Individuals)
  - Form 1040 Federal (U.S. Individual Income Tax Return)
  - Form 1040 State (State-specific tax return)
  - Form 832 (FICA Tax Refund Request, if applicable)

- **Payment Integration**: Stripe integration for secure payment processing

- **Document Delivery**: 
  - Download tax forms as a ZIP file
  - Email delivery of completed forms

## Current Support

- **Country**: India
- **State**: Illinois

The tax calculation structure is organized by country and state, making it easy to add support for additional countries and states in the future.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file:
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── page.tsx           # Landing page
│   ├── disclaimer/        # Disclaimer page
│   ├── form/              # Multi-step form
│   ├── success/           # Success page after calculation
│   └── payment/           # Payment page
├── components/            # React components
│   ├── forms/            # Form step components
│   └── ProgressBar.tsx   # Progress indicator
├── lib/                   # Library functions
│   ├── tax-calculation/  # Tax calculation logic
│   │   └── countries/
│   │       └── india/
│   │           └── states/
│   │               └── illinois/
│   │                   ├── federal.ts
│   │                   └── state.ts
│   ├── form-generation/  # Form generation logic
│   └── email/            # Email sending logic
└── types/                # TypeScript type definitions
```

## Tax Calculation Structure

Tax calculations are organized separately:
- **Federal taxes**: Organized by country (country-specific)
- **State taxes**: Organized by state only (country doesn't matter)

```
lib/tax-calculation/
├── federal/
│   └── india.ts          # Federal tax calculation for Indian students
└── state/
    └── illinois.ts       # State tax calculation for Illinois (any country)
```

To add support:
- **New country (federal tax)**: Create `lib/tax-calculation/federal/{country}.ts`
- **New state (state tax)**: Create `lib/tax-calculation/state/{state}.ts`
- Update the main calculation function in `lib/tax-calculation/index.ts` to import the new files

## Form Generation

The form generation module creates PDF forms based on the collected data and tax calculation results. Currently, the structure is in place but the actual PDF generation logic needs to be implemented.

Forms generated:
- **Form 8843**: Always generated for F1 students
- **Form 1040 Federal**: Generated if the student had US income
- **Form 1040 State**: Generated if the student had US income (state-specific)
- **Form 832**: Generated if FICA taxes were wrongly paid

## Payment Integration

Stripe is used for payment processing. The payment page uses Stripe Elements for secure card input. After successful payment:
1. Tax forms are generated
2. Forms are packaged into a ZIP file
3. ZIP file is made available for download
4. Forms are sent to the user's email address

## Environment Variables

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key

## Next Steps

1. **Implement Tax Calculation Logic**: Add the actual tax calculation formulas in the federal and state tax calculation files
2. **Implement Form Generation**: Add PDF generation logic for each tax form
3. **Set up Email Service**: Integrate with an email service provider (SendGrid, AWS SES, etc.)
4. **Add More Countries/States**: Extend support to additional countries and US states
5. **Add Form Validation**: Implement comprehensive form validation
6. **Add Error Handling**: Improve error handling and user feedback

## License

This project is for educational purposes.
