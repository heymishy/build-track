# BuildTrack Testing Strategy

## Testing Pyramid Structure

Following the test pyramid pattern for optimal testing efficiency and reliability:

```
        /\
       /  \    E2E Tests (4 tests)
      /____\   - Critical user journeys
     /      \  - Cross-browser compatibility 
    /        \ - Full system integration
   /__________\
  /            \  Integration Tests (8 tests)
 /              \ - API endpoint testing
/________________\ - Component integration
                  - Database interactions
                  - External service mocking

         Unit Tests (42 tests)
    - Component logic & rendering
    - Utility functions
    - Business logic
    - State management
    - Hooks behavior
```

## Current Test Distribution

### 📊 **Test Count by Layer**
- **Unit Tests**: 42 tests (75%)
- **Integration Tests**: 8 tests (17%)
- **E2E Tests**: 4 tests (8%)

**Total**: 54 tests (target: 70%/20%/10% distribution)

## Unit Tests (75% - Target: 70%)

### Core Components (18 tests)
- `Button.test.tsx` - UI component behavior
- `Input.test.tsx` - Form input validation
- `Navigation.test.tsx` - Navigation states & interactions
- `Breadcrumb.test.tsx` - Path navigation logic
- `TabNavigation.test.tsx` - Tab switching behavior
- `ProjectDashboard.test.tsx` - Dashboard component logic

### Business Logic (12 tests)
- `state-manager.test.ts` - State management patterns
- `auth.test.ts` - Authentication flows
- `middleware.test.ts` - Request/response processing
- `pdf-parser.test.ts` - Document parsing logic
- `currency.test.ts` - Financial calculations

### Custom Hooks (6 tests)
- `useAuth.test.tsx` - Authentication hook behavior
- `useProjects.test.tsx` - Project management hooks
- `useSettings.test.tsx` - Settings management

### Forms & User Input (6 tests)
- `LoginForm.test.tsx` - Login validation & submission
- `RegisterForm.test.tsx` - Registration validation
- `InvoiceForm.test.tsx` - Invoice data handling

## Integration Tests (17% - Target: 20%)

### API Integration (4 tests)
- `api/auth.test.ts` - Authentication endpoints
- `api/projects.test.ts` - Project CRUD operations
- `api/invoices.test.ts` - Invoice processing flow

### Component Integration (4 tests)
- `integration/dashboard.test.tsx` - Dashboard page integration
- `integration/project-flow.test.tsx` - Complete project workflow
- `integration/invoice-processing.test.tsx` - Invoice upload & processing
- `integration/settings-management.test.tsx` - Settings persistence

## E2E Tests (8% - Target: 10%)

### Critical User Journeys (4 tests)
- `e2e/auth-flow.spec.ts` - Complete authentication journey
- `e2e/project-management.spec.ts` - Project creation to completion
- `e2e/invoice-processing.spec.ts` - PDF upload and processing
- `e2e/pdf-upload-basic.spec.ts` - Basic file upload functionality

## Test Quality Standards

### Unit Test Requirements
- **Coverage**: ≥90% for utilities, ≥80% for components
- **Isolation**: Mocked external dependencies
- **Fast**: <1s execution per test suite
- **Focused**: Single responsibility testing

### Integration Test Requirements
- **Realistic**: Use test database
- **API Focused**: Full HTTP request/response cycle
- **State Persistent**: Test data consistency
- **Error Handling**: Network failure scenarios

### E2E Test Requirements
- **User-Centric**: Real user workflows
- **Cross-Browser**: Chrome, Firefox, Safari
- **Performance**: Core Web Vitals validation
- **Accessibility**: WCAG compliance checks

## Testing Tools & Setup

### Unit & Integration Tests
- **Framework**: Jest 29+ with jsdom environment
- **React Testing**: @testing-library/react
- **Mocking**: Jest mocks for external APIs
- **Assertions**: jest-dom matchers

### E2E Tests
- **Framework**: Playwright
- **Browsers**: Chromium, Firefox, WebKit
- **Viewport**: Desktop (1280x720) and Mobile (375x667)
- **Network**: Slow 3G simulation

### Code Coverage
- **Target**: 80% overall coverage
- **Critical Paths**: 95% coverage
- **Reports**: HTML and LCOV formats
- **CI Integration**: Codecov integration

## Test Commands

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch

# Specific test file
npm test Button.test.tsx
```

## Continuous Integration

### Pre-commit Hooks
- Run unit tests
- Lint validation
- Type checking

### CI Pipeline
1. Unit tests (parallel)
2. Integration tests
3. Build validation
4. E2E tests (parallel browsers)
5. Coverage reporting

### Quality Gates
- All tests must pass
- Coverage ≥80%
- No critical security issues
- Performance budget met

## Best Practices

### Test Organization
- Co-locate component tests with components
- Separate API tests by endpoint
- Group E2E tests by user journey

### Test Data Management
- Factory functions for test data
- Isolated test databases
- Cleanup after each test

### Mocking Strategy
- Mock external APIs in unit tests
- Use MSW for integration tests
- Real services in E2E tests

### Accessibility Testing
- Include accessibility tests in component suites
- Use @testing-library/jest-dom a11y matchers
- Validate ARIA attributes and keyboard navigation