# Home Planning Solution

A comprehensive financial planning application for first-time home buyers in Vietnam. This application helps users plan and analyze their financial readiness to purchase a home.

## Features

- **User Authentication**: Secure user authentication with Clerk
- **Multi-step Questionnaire**: Collect user information about their financial situation and home buying goals
- **Affordability Analysis**: Calculate and visualize if and when the user can afford to buy a home
- **AI-powered Insights**: Generate personalized advice and analysis using Google's Gemini AI
- **Financial Projections**: View detailed financial projections over time
- **Dashboard**: Track and manage multiple home buying plans

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Form Handling**: React Hook Form with Zod validation
- **Authentication**: Clerk
- **Database**: PostgreSQL with Prisma ORM
- **AI Integration**: Google Gemini API

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Clerk account for authentication
- Google Gemini API key

### Environment Setup

1. Clone the repository
2. Copy the `.env.local.example` file to `.env.local` and fill in the required environment variables:
   - Clerk authentication keys
   - Database URL
   - Google Gemini API key

### Installation

```bash
# Install dependencies
npm install

# Set up the database
npx prisma migrate dev

# Start the development server
npm run dev
```

### Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Sign up or sign in using Clerk authentication
3. Create a new plan by filling out the questionnaire
4. View the affordability analysis and results

## Implementation Details

### Affordability Calculation

The application calculates affordability based on:
- Current savings and income
- Projected income growth
- Projected expenses
- Projected house price growth
- Loan terms and interest rates
- Life events (marriage, children)

Two scenarios are considered:
- **Scenario A**: User can afford the house in their target year
- **Scenario B**: User cannot afford the house in their target year but can in a later year

### AI Integration

The application uses two different Gemini models:
- **gemini-2.5-flash-preview**: For intermediate analysis (faster, more efficient)
- **gemini-2.5-pro-preview**: For final report narrative (more advanced reasoning)

The AI provides:
1. Analysis of trade-offs between different viable purchase years
2. Detailed financial advice and recommendations
3. Personalized insights based on the user's specific situation

## License

This project is licensed under the MIT License - see the LICENSE file for details.
