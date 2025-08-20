/**
 * Test Suite for Project API Endpoints
 * Testing project CRUD operations and cost tracking
 */

import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  })),
}))

const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>

// Mock auth middleware with the existing pattern
jest.mock('@/lib/middleware', () => ({
  withAuth: jest.fn((handler: any) => handler),
  AuthUser: {},
}))

// Mock prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: new PrismaClient(),
}))

// Import after mocking
const { withAuth } = require('@/lib/middleware')

// Create mock user
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'ADMIN',
}

describe('/api/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAuthUser.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN',
    })
  })

  describe('POST /api/projects', () => {
    it('should create a new project successfully', async () => {
      const projectData = {
        name: 'Auckland Office Building',
        description: 'Modern office complex in downtown Auckland',
        budget: 850000,
        startDate: '2024-02-01',
        expectedEndDate: '2024-12-31',
        status: 'PLANNING',
      }

      const mockProject = {
        id: 'project-1',
        ...projectData,
        startDate: new Date(projectData.startDate),
        expectedEndDate: new Date(projectData.expectedEndDate),
        actualCost: 0,
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.project.create.mockResolvedValue(mockProject)

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(projectData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.project.name).toBe(projectData.name)
      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: {
          ...projectData,
          startDate: new Date(projectData.startDate),
          expectedEndDate: new Date(projectData.expectedEndDate),
          ownerId: 'user-1',
        },
      })
    })

    it('should handle validation errors for missing required fields', async () => {
      const invalidData = {
        description: 'Missing required fields',
      }

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('validation')
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.project.create.mockRejectedValue(new Error('Database error'))

      const projectData = {
        name: 'Test Project',
        budget: 100000,
        startDate: '2024-02-01',
        expectedEndDate: '2024-12-31',
        status: 'PLANNING',
      }

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(projectData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to create project')
    })
  })

  describe('GET /api/projects', () => {
    it('should fetch user projects successfully', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Auckland Office',
          description: 'Office building',
          budget: 850000,
          actualCost: 125000,
          status: 'IN_PROGRESS',
          ownerId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          startDate: new Date('2024-02-01'),
          expectedEndDate: new Date('2024-12-31'),
        },
      ]

      mockPrisma.project.findMany.mockResolvedValue(mockProjects)

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.projects).toHaveLength(1)
      expect(data.projects[0].name).toBe('Auckland Office')
    })

    it('should filter projects based on query parameters', async () => {
      mockPrisma.project.findMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/projects?status=COMPLETED')
      const response = await GET(request)

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: {
          AND: [{ ownerId: 'user-1' }, { status: 'COMPLETED' }],
        },
        orderBy: { updatedAt: 'desc' },
      })
    })
  })

  describe('GET /api/projects/[id]', () => {
    it('should fetch a specific project successfully', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Auckland Office',
        budget: 850000,
        actualCost: 125000,
        ownerId: 'user-1',
      }

      mockPrisma.project.findUnique.mockResolvedValue(mockProject)

      const response = await GetProject(
        new NextRequest('http://localhost:3000/api/projects/project-1'),
        { params: { id: 'project-1' } }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.project.id).toBe('project-1')
    })

    it('should return 404 for non-existent project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null)

      const response = await GetProject(
        new NextRequest('http://localhost:3000/api/projects/non-existent'),
        { params: { id: 'non-existent' } }
      )
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Project not found')
    })
  })

  describe('PUT /api/projects/[id]', () => {
    it('should update a project successfully', async () => {
      const updateData = {
        name: 'Updated Project Name',
        budget: 950000,
        status: 'IN_PROGRESS',
      }

      const mockUpdatedProject = {
        id: 'project-1',
        ...updateData,
        ownerId: 'user-1',
      }

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        ownerId: 'user-1',
      })
      mockPrisma.project.update.mockResolvedValue(mockUpdatedProject)

      const response = await PUT(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }),
        { params: { id: 'project-1' } }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.project.name).toBe(updateData.name)
    })

    it('should prevent unauthorized updates', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        ownerId: 'different-user',
      })

      const response = await PUT(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Hacked' }),
        }),
        { params: { id: 'project-1' } }
      )
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Access denied')
    })
  })

  describe('DELETE /api/projects/[id]', () => {
    it('should delete a project successfully', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        ownerId: 'user-1',
      })
      mockPrisma.project.delete.mockResolvedValue({ id: 'project-1' })

      const response = await DELETE(
        new NextRequest('http://localhost:3000/api/projects/project-1'),
        { params: { id: 'project-1' } }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Project deleted successfully')
    })
  })
})
