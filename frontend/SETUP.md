# Frontend Setup Documentation

## Project Structure

The frontend is built with React 19, TypeScript, and Vite for optimal development experience and production builds.

### Directory Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page-level components
│   ├── services/       # API clients and external services
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions and helpers
│   ├── config/         # Configuration files
│   └── assets/         # Static assets (images, fonts, etc.)
├── public/             # Public static files
└── dist/               # Production build output
```

## Installed Dependencies

### Core Dependencies
- **react** (^19.2.0) - React library
- **react-dom** (^19.2.0) - React DOM rendering
- **react-router-dom** (^7.13.1) - Client-side routing
- **axios** (^1.13.6) - HTTP client for API requests
- **recharts** (^3.7.0) - Charting library for data visualization
- **@yudiel/react-qr-scanner** (^2.5.1) - QR code scanning component
- **canvas-confetti** (^1.9.4) - Confetti animation for success feedback

### Development Dependencies
- **vite** (^7.3.1) - Build tool and dev server
- **typescript** (~5.9.3) - TypeScript compiler
- **@vitejs/plugin-react** (^5.1.1) - Vite React plugin
- **terser** (^5.46.0) - JavaScript minifier for production builds
- **eslint** (^9.39.1) - Code linting
- **@types/canvas-confetti** (^1.9.0) - TypeScript types for canvas-confetti

## Configuration

### Vite Configuration

The Vite config includes:
- Path aliases for cleaner imports (@components, @pages, @services, @hooks, @utils)
- Production build optimization with Terser minification
- Code splitting for vendor chunks (react-vendor, chart-vendor)
- Dev server on port 3000 with auto-open

### TypeScript Configuration

TypeScript is configured with:
- Strict mode enabled
- Path aliases matching Vite configuration
- ES2022 target with DOM libraries
- React JSX transform

## Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Path Aliases

The following path aliases are configured for cleaner imports:

```typescript
import Component from '@components/Component'
import Page from '@pages/Page'
import { apiClient } from '@services/apiClient'
import { useCustomHook } from '@hooks/useCustomHook'
import { formatDate } from '@utils/dateUtils'
```

## Production Build

The production build is optimized with:
- Terser minification for smaller bundle sizes
- Code splitting for better caching
- Source maps disabled for security
- Vendor chunk separation for optimal caching

Build output is generated in the `dist/` directory.

## Next Steps

1. Implement authentication service in `src/services/`
2. Create reusable UI components in `src/components/`
3. Build page components in `src/pages/`
4. Add custom hooks in `src/hooks/`
5. Implement utility functions in `src/utils/`
