# DevMetrics Frontend Architecture

## Overview
The DevMetrics frontend is a modern, real-time dashboard built with Next.js 14+ (App Router), providing development teams with actionable insights into their GitHub repositories.

---

## Technology Stack

### Core Framework
- **Next.js 14+** with App Router
- **React 18+** with Server Components
- **TypeScript** for type safety

### UI & Styling
- **UI Library**: Shadcn/ui (recommended) or Material-UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React or Heroicons
- **Charts**: Recharts for standard charts, D3.js for advanced visualizations

### State Management
- **Global State**: Zustand (lightweight) or Redux Toolkit
- **Server State**: TanStack Query (React Query) for API data caching
- **Form State**: React Hook Form with Zod validation

### Real-time Communication
- **Socket.io Client** for WebSocket connections
- **Event-driven updates** for live metrics

### Additional Libraries
- **Date Handling**: date-fns or day.js
- **HTTP Client**: Axios or native fetch with React Query
- **Authentication**: NextAuth.js or custom JWT implementation
- **Notifications**: react-hot-toast or sonner
- **Data Tables**: TanStack Table
- **Code Highlighting**: Prism.js or Shiki (for PR diffs)

---

## Application Structure

```
apps/web/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── callback/             # OAuth callback
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/              # Protected route group
│   │   ├── layout.tsx            # Dashboard shell layout
│   │   ├── page.tsx              # Main dashboard
│   │   ├── repositories/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── metrics/
│   │   │   │   ├── pull-requests/
│   │   │   │   └── settings/
│   │   │   └── connect/
│   │   ├── team/
│   │   │   ├── page.tsx
│   │   │   ├── velocity/
│   │   │   └── members/
│   │   ├── analytics/
│   │   │   ├── page.tsx
│   │   │   ├── performance/
│   │   │   └── trends/
│   │   ├── pull-requests/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   ├── integrations/
│   │   │   ├── notifications/
│   │   │   └── team/
│   │   └── profile/
│   ├── api/                      # API routes (if needed)
│   │   └── auth/
│   ├── layout.tsx                # Root layout
│   ├── globals.css
│   └── not-found.tsx
├── components/
│   ├── ui/                       # Shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── chart.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── sheet.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── charts/                   # Chart components
│   │   ├── VelocityChart.tsx
│   │   ├── CommitFrequencyChart.tsx
│   │   ├── PRCycleTimeChart.tsx
│   │   ├── BurndownChart.tsx
│   │   └── ContributionHeatmap.tsx
│   ├── dashboard/
│   │   ├── DashboardHeader.tsx
│   │   ├── DashboardNav.tsx
│   │   ├── MetricCard.tsx
│   │   ├── ActivityFeed.tsx
│   │   ├── QuickStats.tsx
│   │   └── RecentPullRequests.tsx
│   ├── repository/
│   │   ├── RepositoryCard.tsx
│   │   ├── RepositoryList.tsx
│   │   ├── RepositorySelector.tsx
│   │   └── ConnectRepository.tsx
│   ├── pull-requests/
│   │   ├── PRList.tsx
│   │   ├── PRCard.tsx
│   │   ├── PRDetails.tsx
│   │   ├── AIInsights.tsx
│   │   └── CodeDiff.tsx
│   ├── team/
│   │   ├── TeamMetrics.tsx
│   │   ├── MemberCard.tsx
│   │   └── VelocityTrend.tsx
│   ├── notifications/
│   │   ├── NotificationBell.tsx
│   │   ├── NotificationList.tsx
│   │   └── NotificationItem.tsx
│   ├── settings/
│   │   ├── IntegrationSettings.tsx
│   │   ├── NotificationSettings.tsx
│   │   └── TeamSettings.tsx
│   └── layout/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       ├── Footer.tsx
│       └── MobileNav.tsx
├── lib/
│   ├── api/                      # API client
│   │   ├── client.ts             # Axios/fetch wrapper
│   │   ├── endpoints/
│   │   │   ├── auth.ts
│   │   │   ├── repositories.ts
│   │   │   ├── metrics.ts
│   │   │   ├── pull-requests.ts
│   │   │   └── notifications.ts
│   │   └── types.ts
│   ├── auth/
│   │   ├── auth-provider.tsx
│   │   ├── auth-context.tsx
│   │   └── session.ts
│   ├── socket/
│   │   ├── socket-client.ts
│   │   ├── socket-context.tsx
│   │   └── socket-hooks.ts
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useRepositories.ts
│   │   ├── useMetrics.ts
│   │   ├── usePullRequests.ts
│   │   ├── useRealtime.ts
│   │   ├── useNotifications.ts
│   │   └── useDebounce.ts
│   ├── utils/
│   │   ├── cn.ts                 # Class name utility
│   │   ├── format.ts             # Date/number formatting
│   │   ├── validators.ts         # Zod schemas
│   │   └── constants.ts
│   └── store/                    # Zustand stores
│       ├── auth-store.ts
│       ├── notification-store.ts
│       └── ui-store.ts
├── types/
│   ├── api.ts
│   ├── models.ts
│   ├── dashboard.ts
│   └── index.ts
├── styles/
│   └── globals.css
├── public/
│   ├── images/
│   └── icons/
├── middleware.ts                 # Auth middleware
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Core Features & Components

### 1. Authentication Flow

#### Components
- **LoginPage** (`app/(auth)/login/page.tsx`)
  - GitHub OAuth button
  - Loading states
  - Error handling

- **AuthCallback** (`app/(auth)/callback/page.tsx`)
  - Handle OAuth redirect
  - Exchange code for token
  - Store JWT in httpOnly cookies or localStorage

#### Authentication Implementation
```typescript
// lib/auth/session.ts
export interface Session {
  user: {
    id: string;
    githubId: string;
    email: string;
    name: string;
    avatarUrl: string;
  };
  accessToken: string;
  expiresAt: number;
}

// Storage: httpOnly cookies (recommended) or localStorage
```

#### Middleware Protection
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}
```

---

### 2. Dashboard Layout

#### Main Dashboard Structure
- **Header**: User profile, notifications, quick settings
- **Sidebar**: Navigation to repositories, team, analytics, settings
- **Main Content**: Metrics cards, charts, activity feed
- **Real-time Indicator**: Connection status badge

#### Key Metrics Cards
1. **Team Velocity** - Trend line, current vs. previous sprint
2. **PR Cycle Time** - Average time from open to merge
3. **Active PRs** - Count with breakdown (pending review, approved, changes requested)
4. **Code Review Coverage** - Percentage of PRs reviewed
5. **Deployment Frequency** - Deployments per week
6. **Build Success Rate** - Percentage from CI/CD

---

### 3. Repository Management

#### Repository List View
```typescript
interface Repository {
  id: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  language: string;
  stars: number;
  lastUpdated: Date;
  webhookStatus: 'active' | 'inactive' | 'error';
  metrics: {
    commits: number;
    pullRequests: number;
    issues: number;
  };
}
```

#### Features
- Search and filter repositories
- Connect/disconnect repositories
- View webhook status
- Quick stats per repository
- Navigate to repository detail view

---

### 4. Analytics & Visualizations

#### Chart Components

**VelocityChart**
- Line chart showing sprint-over-sprint velocity
- Weighted calculation (recent sprints weighted higher)
- Trend indicators (up/down arrows)
- Configurable time range

**CommitFrequencyChart**
- Heatmap showing commit activity by day/hour
- Color-coded intensity
- Interactive tooltips

**PRCycleTimeChart**
- Bar chart showing average PR cycle time
- Breakdown: time to review, time to merge
- Team member comparison

**BurndownChart**
- Traditional sprint burndown
- Ideal vs. actual line
- Scope change indicators

#### Data Fetching Strategy
```typescript
// Using React Query for caching
const useVelocityData = (teamId: string, range: DateRange) => {
  return useQuery({
    queryKey: ['velocity', teamId, range],
    queryFn: () => api.metrics.getVelocity(teamId, range),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
};
```

---

### 5. Pull Request Views

#### PR List
- Filterable by status, author, repository
- Sortable by date, review time, AI risk score
- Infinite scroll or pagination
- Bulk actions support

#### PR Detail View
```typescript
interface PullRequest {
  id: string;
  number: number;
  title: string;
  description: string;
  author: User;
  repository: Repository;
  status: 'open' | 'closed' | 'merged';
  createdAt: Date;
  updatedAt: Date;
  mergedAt?: Date;
  reviewers: User[];
  aiInsights?: AIInsights;
  metrics: {
    linesAdded: number;
    linesDeleted: number;
    filesChanged: number;
    commits: number;
    comments: number;
  };
}

interface AIInsights {
  riskScore: number; // 0-100
  complexity: 'low' | 'medium' | 'high';
  suggestions: string[];
  potentialBugs: Bug[];
  securityIssues: SecurityIssue[];
  estimatedReviewTime: number; // minutes
}
```

#### AI Insights Display
- Risk score badge with color coding
- Expandable suggestion cards
- Code snippets with highlighting
- Severity indicators

---

### 6. Real-time Updates

#### WebSocket Integration
```typescript
// lib/socket/socket-client.ts
import io from 'socket.io-client';

export const socket = io(process.env.NEXT_PUBLIC_WS_URL, {
  autoConnect: false,
  auth: {
    token: getAuthToken(),
  },
});

// lib/socket/socket-hooks.ts
export const useRealtimeMetrics = (repositoryId: string) => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    socket.on(`repository:${repositoryId}:metrics`, (data) => {
      setMetrics(data);
    });

    return () => {
      socket.off(`repository:${repositoryId}:metrics`);
    };
  }, [repositoryId]);

  return metrics;
};
```

#### Events to Subscribe
- `repository:${id}:metrics` - Updated metrics
- `pull-request:${id}:updated` - PR status changes
- `team:${id}:velocity` - Velocity recalculation
- `notification:new` - New notifications
- `ai:analysis:complete` - AI analysis finished

---

### 7. Notifications System

#### Notification Types
```typescript
type NotificationType = 
  | 'pr_review_required'
  | 'pr_approved'
  | 'pr_changes_requested'
  | 'build_failed'
  | 'sprint_risk'
  | 'ai_insights_ready';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, any>;
}
```

#### Features
- In-app notification center
- Badge count on notification bell
- Toast notifications for real-time events
- Mark as read/unread
- Notification preferences per type

---

### 8. Settings & Configuration

#### Integration Settings
- GitHub repository connections
- Slack workspace integration
- Discord webhook configuration
- API key management

#### Notification Settings
- Per-event type toggle
- Delivery channel selection
- Quiet hours configuration
- Email digest frequency

#### Team Settings
- Role management (Admin, Manager, Developer, Viewer)
- Invite team members
- Remove members
- Audit log viewer

---

## State Management Architecture

### Zustand Stores

**Auth Store**
```typescript
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}
```

**Notification Store**
```typescript
interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}
```

**UI Store**
```typescript
interface UIStore {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
```

### React Query for Server State
- Automatic caching with configurable stale time
- Background refetching
- Optimistic updates for mutations
- Query invalidation on WebSocket events

---

## API Client Architecture

### Client Configuration
```typescript
// lib/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Endpoint Organization
```typescript
// lib/api/endpoints/repositories.ts
export const repositoriesApi = {
  list: () => apiClient.get<Repository[]>('/repositories'),
  get: (id: string) => apiClient.get<Repository>(`/repositories/${id}`),
  connect: (data: ConnectRepoData) => apiClient.post('/repositories', data),
  disconnect: (id: string) => apiClient.delete(`/repositories/${id}`),
  metrics: (id: string, range: DateRange) => 
    apiClient.get(`/repositories/${id}/metrics`, { params: range }),
};
```

---

## Performance Optimization

### Code Splitting
- Dynamic imports for heavy components (charts, code editors)
- Route-based code splitting (automatic with App Router)
- Lazy load modals and dialogs

### Image Optimization
- Next.js Image component for all images
- WebP format with fallbacks
- Responsive images with srcset

### Data Fetching
- Server Components for initial data
- Client Components for interactive elements
- React Query for client-side caching
- Prefetch on hover for navigation

### Bundle Optimization
- Tree-shaking for unused code
- Minimize dependencies
- Use lighter alternatives (date-fns over moment.js)
- Dynamic imports for large libraries (D3.js)

---

## Security Considerations

### Authentication
- httpOnly cookies for token storage (recommended)
- CSRF protection with tokens
- Secure flag on all cookies
- Short-lived access tokens (7 days or less)

### API Security
- Authorization header validation
- Rate limiting on client side (prevent abuse)
- Input sanitization
- XSS prevention (React's built-in escaping)

### Data Handling
- No sensitive data in localStorage
- Encrypt sensitive data before storage
- Clear auth state on logout
- Session timeout handling

---

## Accessibility

### WCAG 2.1 AA Compliance
- Semantic HTML
- ARIA labels for interactive elements
- Keyboard navigation support
- Focus indicators
- Screen reader friendly
- Color contrast ratios meet standards

### Implementation
- Use Shadcn/ui components (built with accessibility)
- Test with screen readers (NVDA, JAWS)
- Keyboard-only navigation testing
- Use `next/link` for client-side routing

---

## Testing Strategy

### Unit Tests (Jest + React Testing Library)
```typescript
// components/__tests__/MetricCard.test.tsx
describe('MetricCard', () => {
  it('renders metric value correctly', () => {
    render(<MetricCard title="Velocity" value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows trend indicator when provided', () => {
    render(<MetricCard title="Velocity" value={42} trend="up" />);
    expect(screen.getByTestId('trend-up')).toBeInTheDocument();
  });
});
```

### Integration Tests
- API endpoint mocking with MSW (Mock Service Worker)
- Component integration tests
- Store integration tests

### E2E Tests (Playwright)
- Login flow
- Repository connection
- Dashboard navigation
- PR detail viewing
- Notification interaction

---

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id

# Server-side only
GITHUB_CLIENT_SECRET=your_github_client_secret
JWT_SECRET=your_jwt_secret
```

---

## Deployment

### Build Process
```bash
npm run build
npm run start # Production server
```

### Vercel Deployment (Recommended for Next.js)
- Automatic deployments from Git
- Preview deployments for PRs
- Edge functions support
- CDN for static assets

### Docker Deployment
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Performance Metrics

### Core Web Vitals Targets
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Bundle Size Targets
- Initial JavaScript: < 200kb (gzipped)
- Per-route chunks: < 50kb (gzipped)
- CSS: < 30kb (gzipped)

### Monitoring
- Vercel Analytics or Google Analytics 4
- Web Vitals reporting
- Error tracking with Sentry
- Performance monitoring with Web Vitals API

---

## Progressive Enhancement

### Offline Support (Optional P2)
- Service Worker for caching
- Offline page
- Queue API requests when offline

### PWA Features (Optional P2)
- Manifest file
- Install prompt
- Push notifications (browser)

---

## Internationalization (Future)

### i18n Setup (Post-MVP)
- next-intl or next-i18next
- Language detection
- RTL support
- Date/number localization

---

## Theming

### Dark Mode Support
```typescript
// Use next-themes
import { ThemeProvider } from 'next-themes';

// Tailwind dark mode configuration
// tailwind.config.ts
module.exports = {
  darkMode: 'class',
  // ...
};
```

### Custom Theme Variables
```css
:root {
  --color-primary: 59 130 246;
  --color-secondary: 99 102 241;
  --color-success: 34 197 94;
  --color-warning: 251 146 60;
  --color-error: 239 68 68;
}
```

---

## Monitoring & Analytics

### User Analytics
- Page views and navigation patterns
- Feature usage tracking
- Conversion funnels
- User session recordings (optional)

### Error Monitoring
- Sentry for error tracking
- Error boundaries at route level
- Custom error pages
- User feedback on errors

### Performance Monitoring
- Real User Monitoring (RUM)
- Synthetic monitoring
- API response time tracking
- WebSocket connection stability

---

## Development Workflow

### Local Development
```bash
npm run dev          # Start dev server
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm run test         # Run tests
npm run test:watch   # Watch mode
npm run test:e2e     # Playwright E2E tests
```

### Code Quality Tools
- **ESLint** with Next.js config
- **Prettier** for formatting
- **Husky** for git hooks
- **lint-staged** for pre-commit checks
- **TypeScript** strict mode

---

## Design System

### Component Library
Use Shadcn/ui as the base, customized with:
- Brand colors
- Custom animations
- Consistent spacing scale
- Typography system

### Design Tokens
```typescript
export const tokens = {
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
  animation: {
    fast: '150ms',
    base: '300ms',
    slow: '500ms',
  },
};
```

---

## Best Practices

### Component Patterns
1. **Separation of Concerns**: Container/Presentational pattern
2. **Composition**: Small, reusable components
3. **Props**: Typed with TypeScript interfaces
4. **Error Boundaries**: Wrap async components
5. **Loading States**: Skeleton screens for better UX

### Code Organization
- One component per file
- Co-locate tests with components
- Group related components in folders
- Shared utilities in lib/utils

### Performance
- Use React.memo for expensive components
- useMemo/useCallback for expensive computations
- Virtual scrolling for long lists
- Debounce search inputs

---

## Future Enhancements (Post-MVP)

1. **Advanced Analytics**
   - Custom metric builder
   - Predictive analytics visualization
   - Anomaly detection highlighting

2. **Collaboration Features**
   - Comments on metrics
   - Shared dashboards
   - Team annotations

3. **Mobile App**
   - React Native version
   - Native push notifications
   - Offline-first architecture

4. **Customization**
   - Drag-and-drop dashboard builder
   - Custom chart configurations
   - Saved views/filters

---

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [Shadcn/ui](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/)

### Design Inspiration
- [Vercel Analytics](https://vercel.com/analytics)
- [Linear](https://linear.app/)
- [GitHub Insights](https://github.com/features/insights)

---

**Last Updated**: November 4, 2025
**Version**: 1.0.0

