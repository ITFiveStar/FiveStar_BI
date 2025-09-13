# FiveStar BI Frontend

A React-based dashboard application for business intelligence and performance analytics.

## Project Overview

This frontend application provides comprehensive business intelligence dashboards including:
- **Automate Accounting Section**: COGS management, Amazon proceeds processing, and QuickBooks integration
- **Evaluate Performance Section**: Financial overview, PnL reports, and profitability analysis  
- **Elevate Strategy Section**: Revenue strategy and vendor payment planning

## Architecture

### Technology Stack
- **React 18** with TypeScript for type safety and modern development
- **Material-UI (MUI)** for consistent, professional UI components
- **Nivo Charts** for interactive data visualizations
- **Axios** for HTTP client and API communication
- **React Router** for navigation and routing

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── Charts/         # Data visualization components
│   ├── common/         # Shared components (headers, dialogs, etc.)
│   ├── PagesLayout/    # Page-specific layouts
│   ├── styling/        # Custom styled components
│   └── Tables/         # Data table components
├── pages/              # Main application pages
│   ├── a_Home/         # Landing page
│   ├── b_Automate_Accounting_Section/  # Accounting automation
│   ├── c_Evaluate_Performance_Section/ # Performance analytics
│   └── d_Elevate_Strategy_Section/     # Strategic planning
├── services/           # API service layer
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── store/              # State management
```

## Environment Configuration

### API Base URL Setup

The application uses environment variables to configure the backend API endpoint:

1. **Create a `.env` file** in the `frontend/` directory:
   ```bash
   # For production deployment to five-star-bi.vercel.app
   REACT_APP_API_BASE_URL=https://your-app-runner-url.region.awsapprunner.com
   
   # For local development
   # REACT_APP_API_BASE_URL=http://127.0.0.1:5000
   ```

2. **Environment Variable Usage**:
   - The app automatically reads `REACT_APP_API_BASE_URL` from environment variables
   - Falls back to `http://127.0.0.1:5000` for local development if not set
   - All API calls use this configured base URL

### Deployment to Vercel

1. **Prepare Environment Variables**:
   - Set `REACT_APP_API_BASE_URL` to your AWS App Runner backend URL
   - Ensure your backend is configured to accept requests from `https://five-star-bi.vercel.app`

2. **Deploy Steps**:
   ```bash
   # Install dependencies
   npm install
   
   # Build the application
   npm run build
   
   # Deploy to Vercel
   vercel --prod
   ```

3. **Vercel Configuration**:
   - Add environment variables in Vercel dashboard
   - Set `REACT_APP_API_BASE_URL` to your production backend URL
   - Configure build settings if needed

4. **Backend CORS Configuration**:
   - In your AWS App Runner backend, set the `ALLOWED_ORIGINS` environment variable to `https://five-star-bi.vercel.app`
   - This ensures your backend accepts requests from your Vercel domain
   - For multiple domains, use comma separation: `https://five-star-bi.vercel.app,https://localhost:3000`

## Development Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your backend URL

# Start development server
npm start
```

The application will be available at `http://localhost:3000`

### Available Scripts
- `npm start` - Start development server
- `npm run build` - Build production bundle
- `npm test` - Run test suite
- `npm run eject` - Eject from Create React App (not recommended)

## API Integration

### Service Architecture
The application uses a centralized API service pattern:

- **`services/api.ts`**: Base Axios configuration with environment-based URL
- **Service Files**: Individual service files for different data domains
  - `amazonBIService.ts` - Amazon business intelligence data
  - `cogsService.ts` - Cost of goods sold operations
  - `financialOverviewService.ts` - Financial reporting
  - Additional services for various business domains

### Error Handling
- Centralized error handling through Axios interceptors
- User-friendly error messages and loading states
- Automatic retry logic for transient failures

## UI/UX Design

### Design System
- **Material Design** principles with custom theming
- **Responsive Design** ensuring compatibility across devices
- **Accessibility** compliant with WCAG guidelines
- **Semantic HTML** for better SEO and screen reader support

### Key Features
- **Interactive Charts**: Real-time data visualization with drill-down capabilities
- **Data Tables**: Sortable, filterable tables with export functionality
- **Dashboard Layouts**: Customizable widget-based dashboards
- **Navigation**: Intuitive sidebar navigation with breadcrumbs

## Performance Optimization

### Loading Optimization
- **Code Splitting**: Lazy loading of route components
- **Image Optimization**: Compressed and responsive images
- **Bundle Analysis**: Webpack bundle analyzer for size monitoring

### Best Practices
- **TypeScript**: Full type safety and better developer experience
- **ESLint & Prettier**: Code quality and formatting standards
- **CSS-in-JS**: Styled components for better performance
- **Memoization**: React.memo and useMemo for expensive operations

## Browser Compatibility

### Supported Browsers
- **Chrome** (latest 2 versions)
- **Firefox** (latest 2 versions)
- **Safari** (latest 2 versions)
- **Edge** (latest 2 versions)

### Responsive Breakpoints
- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px
- **Desktop**: 1024px and above

## Troubleshooting

### Common Issues

1. **API Connection Errors**:
   - Verify `REACT_APP_API_BASE_URL` is correctly set
   - Check backend server is running and accessible
   - Ensure CORS is properly configured on backend

2. **Build Errors**:
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility
   - Verify all environment variables are set

3. **Performance Issues**:
   - Check network requests in browser dev tools
   - Monitor bundle size and loading times
   - Verify data caching is working correctly

### Development Tips
- Use React DevTools for component debugging
- Monitor network requests for API optimization
- Test responsive design across different screen sizes
- Validate accessibility with screen readers

## Future Enhancements

### Planned Features
- **Real-time Data**: WebSocket integration for live updates
- **Advanced Analytics**: Machine learning insights and predictions  
- **Mobile App**: React Native version for mobile access
- **Offline Support**: Progressive Web App capabilities

### Technical Improvements
- **Performance**: Further optimization of chart rendering
- **Testing**: Increased test coverage and E2E testing
- **Documentation**: Interactive component documentation
- **Monitoring**: Application performance monitoring integration

## Deployment Checklist for five-star-bi.vercel.app

### Frontend (Vercel) Setup:
- [ ] Create `.env` file in `frontend/` directory with your AWS App Runner URL
- [ ] Set `REACT_APP_API_BASE_URL=https://your-actual-app-runner-url.region.awsapprunner.com`
- [ ] Run `npm run build` to test build locally
- [ ] Deploy to Vercel: `vercel --prod`
- [ ] Add `REACT_APP_API_BASE_URL` environment variable in Vercel dashboard
- [ ] Verify deployment at `https://five-star-bi.vercel.app`

### Backend (AWS App Runner) Setup:
- [ ] Set `ALLOWED_ORIGINS=https://five-star-bi.vercel.app` environment variable
- [ ] Optionally add local development: `ALLOWED_ORIGINS=https://five-star-bi.vercel.app,http://localhost:3000`
- [ ] Redeploy your AWS App Runner service with new environment variables
- [ ] Test CORS by making a request from your Vercel domain

### Testing the Connection:
1. Open browser developer tools on `https://five-star-bi.vercel.app`
2. Check Network tab for API requests
3. Verify no CORS errors in Console
4. Test a few dashboard features to ensure data loads correctly

### Quick Commands:
```bash
# Frontend deployment
cd frontend
npm install
npm run build
vercel --prod

# Test API connection locally
curl -X GET "https://your-app-runner-url/api/health" \
  -H "Origin: https://five-star-bi.vercel.app"
```

---

For technical support or questions, please refer to the project documentation or contact the development team.
