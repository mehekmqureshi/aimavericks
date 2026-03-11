# Green Passport (GP) - AWS Native Serverless Platform

Digital Product Passport (DPP) system for tracking product lifecycle data and sustainability metrics.
- Home Page: https://d3jj1t5hp20hlp.cloudfront.net/
- Manufacturer Dashboard: https://d3jj1t5hp20hlp.cloudfront.net/login (ID: manufacturer@greenpassport.com | Passowrd: Test123!)
- Consumer Dashboard: https://d3jj1t5hp20hlp.cloudfront.net/consumer

## Architecture

- **Frontend**: React + Vite (TypeScript)
- **Backend**: AWS Lambda (Node.js 20.x, TypeScript)
- **Database**: Amazon DynamoDB
- **Storage**: Amazon S3
- **Authentication**: Amazon Cognito
- **AI**: Amazon Bedrock (Claude 3 Sonnet)
- **CDN**: Amazon CloudFront
- **API**: Amazon API Gateway

## Project Structure

```
├── backend/          # Lambda functions and services
├── frontend/         # React application
├── infrastructure/   # AWS infrastructure provisioning
├── shared/           # Shared TypeScript types and utilities
├── dist/             # Compiled output
└── node_modules/     # Dependencies
```

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm or yarn
- AWS CLI configured
- AWS MCP servers installed

### Installation

```bash
npm install
```

### Development

```bash
# Run tests
npm test

# Build backend
npm run build:backend

# Build frontend
npm run build:frontend

# Lint code
npm run lint
```

## Deployment

Deployment is fully automated via AWS MCP servers. See `infrastructure/` directory for deployment scripts.

## Testing

- Unit tests: Jest
- Property-based tests: fast-check
- Coverage target: 80%

## License

ISC
