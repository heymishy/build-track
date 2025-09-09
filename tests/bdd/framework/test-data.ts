/**
 * Test Data Fixtures for BDD Tests
 * Provides consistent test data across scenarios
 */

export interface TestUser {
  email: string
  password: string
  role: 'ADMIN' | 'USER' | 'VIEWER'
  name?: string
}

export interface TestProject {
  name: string
  description: string
  budget: number
  type: 'Commercial' | 'Residential' | 'Infrastructure'
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED'
  ownerId?: string
}

export interface TestMilestone {
  name: string
  description: string
  targetDate: string
  amount: number
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
}

export interface TestTeamMember {
  email: string
  role: 'ADMIN' | 'CONTRIBUTOR' | 'VIEWER'
  name?: string
}

export interface TestInvoice {
  fileName: string
  amount: number
  supplier: string
  description: string
  date: string
}

// Test Users
export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: 'admin@buildtrack.com',
    password: 'admin123',
    role: 'ADMIN',
    name: 'Admin User',
  },
  user: {
    email: 'user@buildtrack.com',
    password: 'user123',
    role: 'USER',
    name: 'Project Manager',
  },
  viewer: {
    email: 'viewer@buildtrack.com',
    password: 'viewer123',
    role: 'VIEWER',
    name: 'Viewer User',
  },
  john: {
    email: 'john@buildtrack.com',
    password: 'john123',
    role: 'USER',
    name: 'John Smith',
  },
  jane: {
    email: 'jane@buildtrack.com',
    password: 'jane123',
    role: 'USER',
    name: 'Jane Doe',
  },
  supplier: {
    email: 'supplier@contractor.com',
    password: 'supplier123',
    role: 'VIEWER',
    name: 'Supplier User',
  },
}

// Test Projects
export const TEST_PROJECTS: Record<string, TestProject> = {
  downtown_office: {
    name: 'Downtown Office Complex',
    description: '12-story commercial office building',
    budget: 5000000,
    type: 'Commercial',
    status: 'PLANNING',
  },
  retail_plaza: {
    name: 'Retail Plaza',
    description: 'Shopping center with 20 retail units',
    budget: 3500000,
    type: 'Commercial',
    status: 'COMPLETED',
  },
  residential_towers: {
    name: 'Residential Towers',
    description: 'Two 15-story residential towers',
    budget: 8000000,
    type: 'Residential',
    status: 'IN_PROGRESS',
  },
  government_building: {
    name: 'Government Building',
    description: 'Secure government facility',
    budget: 12000000,
    type: 'Infrastructure',
    status: 'PLANNING',
  },
}

// Test Milestones
export const TEST_MILESTONES: Record<string, TestMilestone> = {
  foundation_complete: {
    name: 'Foundation Complete',
    description: 'Foundation and basement completed',
    targetDate: '2024-06-01',
    amount: 750000,
    status: 'PENDING',
  },
  frame_complete: {
    name: 'Frame Complete',
    description: 'Structural frame completed',
    targetDate: '2024-09-01',
    amount: 1500000,
    status: 'PENDING',
  },
  rough_mechanical: {
    name: 'Rough Mechanical',
    description: 'Mechanical, electrical, plumbing roughed in',
    targetDate: '2024-11-01',
    amount: 800000,
    status: 'PENDING',
  },
  final_inspection: {
    name: 'Final Inspection',
    description: 'Final building inspection and occupancy permit',
    targetDate: '2025-03-01',
    amount: 200000,
    status: 'PENDING',
  },
}

// Test Team Members
export const TEST_TEAM_MEMBERS: Record<string, TestTeamMember> = {
  john_contributor: {
    email: 'john@buildtrack.com',
    role: 'CONTRIBUTOR',
    name: 'John Smith',
  },
  jane_viewer: {
    email: 'jane@buildtrack.com',
    role: 'VIEWER',
    name: 'Jane Doe',
  },
  architect: {
    email: 'architect@firm.com',
    role: 'CONTRIBUTOR',
    name: 'Lead Architect',
  },
  contractor: {
    email: 'contractor@company.com',
    role: 'CONTRIBUTOR',
    name: 'General Contractor',
  },
}

// Test Invoices
export const TEST_INVOICES: Record<string, TestInvoice> = {
  electrical_work: {
    fileName: 'electrical-invoice-001.pdf',
    amount: 15000,
    supplier: 'ABC Electrical',
    description: 'Electrical rough-in work',
    date: '2024-02-15',
  },
  plumbing_materials: {
    fileName: 'plumbing-materials-002.pdf',
    amount: 8500,
    supplier: 'Plumbing Supply Co',
    description: 'Plumbing fixtures and materials',
    date: '2024-02-20',
  },
  concrete_pour: {
    fileName: 'concrete-invoice-003.pdf',
    amount: 25000,
    supplier: 'Ready Mix Concrete',
    description: 'Foundation concrete pour',
    date: '2024-01-30',
  },
}

// Supplier Portal Test Data
export const SUPPLIER_EMAILS = [
  'contractor@abc.com',
  'supplier@materials.com',
  'electrician@power.com',
  'plumber@pipes.com',
  'heymishy@gmail.com', // Test email used in development
]

// Google Drive Test Data
export const GOOGLE_DRIVE_TEST_DATA = {
  shared_folder_url: 'https://drive.google.com/drive/folders/test123456',
  invalid_urls: [
    'not-a-google-drive-url',
    'https://drive.google.com/file/d/abc123', // File URL, not folder
    'https://example.com/folder',
  ],
  test_files: [
    {
      name: 'invoice-001.pdf',
      size: '245760', // 240KB
      id: 'test_file_1',
    },
    {
      name: 'invoice-002.pdf',
      size: '512000', // 500KB
      id: 'test_file_2',
    },
    {
      name: 'document.docx',
      size: '102400', // Should be filtered out (not PDF)
      id: 'test_file_3',
    },
  ],
}

// OAuth2 Test Data
export const OAUTH2_TEST_DATA = {
  client_id: 'test-client-id.googleusercontent.com',
  client_secret: 'test-client-secret',
  redirect_uri: 'http://localhost:3006/api/auth/google/callback',
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  test_tokens: {
    access_token: 'test_access_token',
    refresh_token: 'test_refresh_token',
    expiry_date: Date.now() + 3600000, // 1 hour from now
  },
}

// Helper functions to get test data
export class TestDataManager {
  static getUser(key: string): TestUser {
    const user = TEST_USERS[key]
    if (!user) {
      throw new Error(`Test user '${key}' not found`)
    }
    return user
  }

  static getUserByRole(role: TestUser['role']): TestUser {
    const user = Object.values(TEST_USERS).find(u => u.role === role)
    if (!user) {
      throw new Error(`No test user found with role '${role}'`)
    }
    return user
  }

  static getProject(key: string): TestProject {
    const project = TEST_PROJECTS[key]
    if (!project) {
      throw new Error(`Test project '${key}' not found`)
    }
    return project
  }

  static getMilestone(key: string): TestMilestone {
    const milestone = TEST_MILESTONES[key]
    if (!milestone) {
      throw new Error(`Test milestone '${key}' not found`)
    }
    return milestone
  }

  static getTeamMember(key: string): TestTeamMember {
    const member = TEST_TEAM_MEMBERS[key]
    if (!member) {
      throw new Error(`Test team member '${key}' not found`)
    }
    return member
  }

  static getInvoice(key: string): TestInvoice {
    const invoice = TEST_INVOICES[key]
    if (!invoice) {
      throw new Error(`Test invoice '${key}' not found`)
    }
    return invoice
  }

  static isValidSupplierEmail(email: string): boolean {
    return SUPPLIER_EMAILS.includes(email)
  }

  static createTestProject(overrides: Partial<TestProject> = {}): TestProject {
    return {
      ...TEST_PROJECTS.downtown_office,
      ...overrides,
    }
  }

  static createTestUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
      ...TEST_USERS.user,
      ...overrides,
    }
  }

  static generateTestData(scenario: string): any {
    switch (scenario) {
      case 'authentication':
        return {
          users: TEST_USERS,
          validCredentials: TEST_USERS.user,
          invalidCredentials: {
            email: 'invalid@email.com',
            password: 'wrongpassword',
          },
        }

      case 'project_management':
        return {
          projects: TEST_PROJECTS,
          milestones: TEST_MILESTONES,
          teamMembers: TEST_TEAM_MEMBERS,
          newProject: TEST_PROJECTS.downtown_office,
        }

      case 'google_drive_integration':
        return {
          googleDrive: GOOGLE_DRIVE_TEST_DATA,
          oauth2: OAUTH2_TEST_DATA,
          supplierEmails: SUPPLIER_EMAILS,
        }

      case 'supplier_portal':
        return {
          supplierEmails: SUPPLIER_EMAILS,
          invoices: TEST_INVOICES,
          googleDrive: GOOGLE_DRIVE_TEST_DATA,
        }

      default:
        throw new Error(`No test data defined for scenario: ${scenario}`)
    }
  }
}

// Environment-specific data
export const getEnvironmentData = () => {
  const isCI = !!process.env.CI
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3006'

  return {
    baseUrl,
    isCI,
    timeouts: {
      navigation: isCI ? 30000 : 10000,
      element: isCI ? 10000 : 5000,
      api: isCI ? 15000 : 5000,
    },
    retries: isCI ? 2 : 0,
  }
}
