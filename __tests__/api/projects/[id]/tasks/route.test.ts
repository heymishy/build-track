/**
 * Test Suite for Tasks API Routes
 * Testing task CRUD operations and project timeline management
 */

import { POST, GET, PUT, DELETE } from '@/app/api/projects/[id]/tasks/route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/middleware', () => ({
  withAuth: (handler: any) => handler,
}))

const mockPrisma = {
  task: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  projectUser: {
    findFirst: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'ADMIN' as const,
}

const mockProject = {
  id: 'project-1',
  name: 'Test Project',
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-12-31T00:00:00Z',
  status: 'ACTIVE',
}

const mockTask = {
  id: 'task-1',
  name: 'Foundation Work',
  description: 'Complete foundation excavation and pouring',
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-01-15T00:00:00Z',
  duration: 14,
  progress: 50,
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  assignedTo: 'John Doe',
  dependencies: [],
  projectId: 'project-1',
  parentId: null,
  sortOrder: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-08T00:00:00Z',
}

describe('Tasks API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.projectUser.findFirst.mockResolvedValue({ userId: 'user-1', projectId: 'project-1' })
  })

  describe('POST /api/projects/[id]/tasks', () => {
    it('should create a new task successfully', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject)
      mockPrisma.task.create.mockResolvedValue(mockTask)
      mockPrisma.task.count.mockResolvedValue(0) // For sort order

      const taskData = {
        name: 'Foundation Work',
        description: 'Complete foundation excavation and pouring',
        startDate: '2024-01-01',
        endDate: '2024-01-15',
        priority: 'HIGH',
        assignedTo: 'John Doe',
      }

      const request = new NextRequest('http://localhost/api/projects/project-1/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' },
      })

      const params = Promise.resolve({ id: 'project-1' })
      const response = await POST(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.task).toEqual(mockTask)
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Foundation Work',
          description: 'Complete foundation excavation and pouring',
          projectId: 'project-1',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          duration: 14,
          progress: 0,
          status: 'PENDING',
          priority: 'HIGH',
          assignedTo: 'John Doe',
        }),
      })
    })

    it('should create task with dependencies', async () => {
      const existingTask = { ...mockTask, id: 'existing-task' }
      mockPrisma.project.findUnique.mockResolvedValue(mockProject)
      mockPrisma.task.create.mockResolvedValue({ ...mockTask, dependencies: ['existing-task'] })
      mockPrisma.task.count.mockResolvedValue(1)

      const taskData = {
        name: 'Framing Work',
        description: 'Structural framing',
        startDate: '2024-01-16',
        endDate: '2024-02-15',
        dependencies: ['existing-task'],
      }

      const request = new NextRequest('http://localhost/api/projects/project-1/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      })

      const params = Promise.resolve({ id: 'project-1' })
      const response = await POST(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dependencies: ['existing-task'],
          sortOrder: 2, // Should be incremented
        }),
      })
    })

    it('should validate task dates', async () => {
      const taskData = {
        name: 'Invalid Task',
        startDate: '2024-02-01',
        endDate: '2024-01-01', // End before start
      }

      const request = new NextRequest('http://localhost/api/projects/project-1/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      })

      const params = Promise.resolve({ id: 'project-1' })
      const response = await POST(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('End date must be after start date')
    })

    it('should reject unauthorized access', async () => {
      mockPrisma.projectUser.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/projects/project-1/tasks', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Task' }),
      })

      const params = Promise.resolve({ id: 'project-1' })
      const response = await POST(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toContain('access to this project')
    })

    it('should validate required fields', async () => {
      const taskData = {
        description: 'Task without name',
        // Missing required 'name' field
      }

      const request = new NextRequest('http://localhost/api/projects/project-1/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      })

      const params = Promise.resolve({ id: 'project-1' })
      const response = await POST(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Task name is required')
    })
  })

  describe('GET /api/projects/[id]/tasks', () => {
    it('should retrieve all project tasks', async () => {
      const mockTasks = [mockTask, { ...mockTask, id: 'task-2', name: 'Framing Work' }]
      mockPrisma.task.findMany.mockResolvedValue(mockTasks)

      const request = new NextRequest('http://localhost/api/projects/project-1/tasks')
      const params = Promise.resolve({ id: 'project-1' })
      const response = await GET(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.tasks).toEqual(mockTasks)
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        orderBy: [{ sortOrder: 'asc' }, { startDate: 'asc' }],
      })
    })

    it('should filter tasks by status', async () => {
      const inProgressTasks = [{ ...mockTask, status: 'IN_PROGRESS' }]
      mockPrisma.task.findMany.mockResolvedValue(inProgressTasks)

      const request = new NextRequest(
        'http://localhost/api/projects/project-1/tasks?status=IN_PROGRESS'
      )
      const params = Promise.resolve({ id: 'project-1' })
      const response = await GET(request, mockUser, { params })

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId: 'project-1',
          status: 'IN_PROGRESS',
        },
        orderBy: [{ sortOrder: 'asc' }, { startDate: 'asc' }],
      })
    })

    it('should filter tasks by assignee', async () => {
      mockPrisma.task.findMany.mockResolvedValue([mockTask])

      const request = new NextRequest(
        'http://localhost/api/projects/project-1/tasks?assignedTo=John Doe'
      )
      const params = Promise.resolve({ id: 'project-1' })
      const response = await GET(request, mockUser, { params })

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId: 'project-1',
          assignedTo: 'John Doe',
        },
        orderBy: [{ sortOrder: 'asc' }, { startDate: 'asc' }],
      })
    })

    it('should return empty array for no tasks', async () => {
      mockPrisma.task.findMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/projects/project-1/tasks')
      const params = Promise.resolve({ id: 'project-1' })
      const response = await GET(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.tasks).toEqual([])
    })
  })

  describe('PUT /api/projects/[id]/tasks/[taskId]', () => {
    it('should update task successfully', async () => {
      const updatedTask = { ...mockTask, progress: 75, status: 'IN_PROGRESS' }
      mockPrisma.task.findUnique.mockResolvedValue(mockTask)
      mockPrisma.task.update.mockResolvedValue(updatedTask)

      const updateData = {
        progress: 75,
        status: 'IN_PROGRESS',
      }

      const request = new NextRequest('http://localhost/api/projects/project-1/tasks/task-1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const params = Promise.resolve({ id: 'project-1', taskId: 'task-1' })
      const response = await PUT(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.task).toEqual(updatedTask)
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: expect.objectContaining({
          progress: 75,
          status: 'IN_PROGRESS',
          updatedAt: expect.any(Date),
        }),
      })
    })

    it('should update task dates and recalculate duration', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockTask)
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, duration: 21 })

      const updateData = {
        startDate: '2024-01-01',
        endDate: '2024-01-22', // 21 days
      }

      const request = new NextRequest('http://localhost/api/projects/project-1/tasks/task-1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const params = Promise.resolve({ id: 'project-1', taskId: 'task-1' })
      const response = await PUT(request, mockUser, { params })

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: expect.objectContaining({
          duration: 21,
        }),
      })
    })

    it('should handle task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/projects/project-1/tasks/nonexistent', {
        method: 'PUT',
        body: JSON.stringify({ progress: 50 }),
      })

      const params = Promise.resolve({ id: 'project-1', taskId: 'nonexistent' })
      const response = await PUT(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Task not found')
    })

    it('should validate progress values', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockTask)

      const updateData = {
        progress: 150, // Invalid progress > 100
      }

      const request = new NextRequest('http://localhost/api/projects/project-1/tasks/task-1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const params = Promise.resolve({ id: 'project-1', taskId: 'task-1' })
      const response = await PUT(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Progress must be between 0 and 100')
    })
  })

  describe('DELETE /api/projects/[id]/tasks/[taskId]', () => {
    it('should delete task successfully', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockTask)
      mockPrisma.task.delete.mockResolvedValue(mockTask)

      const request = new NextRequest('http://localhost/api/projects/project-1/tasks/task-1', {
        method: 'DELETE',
      })

      const params = Promise.resolve({ id: 'project-1', taskId: 'task-1' })
      const response = await DELETE(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockPrisma.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-1' },
      })
    })

    it('should prevent deletion of tasks with dependencies', async () => {
      const dependentTask = { ...mockTask, id: 'dependent-task' }
      const tasksWithDependency = [dependentTask]

      mockPrisma.task.findUnique.mockResolvedValue(mockTask)
      mockPrisma.task.findMany.mockResolvedValue(tasksWithDependency)

      const request = new NextRequest('http://localhost/api/projects/project-1/tasks/task-1', {
        method: 'DELETE',
      })

      const params = Promise.resolve({ id: 'project-1', taskId: 'task-1' })
      const response = await DELETE(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Cannot delete task with dependencies')
    })

    it('should handle task not found for deletion', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/projects/project-1/tasks/nonexistent', {
        method: 'DELETE',
      })

      const params = Promise.resolve({ id: 'project-1', taskId: 'nonexistent' })
      const response = await DELETE(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Task not found')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.task.findMany.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost/api/projects/project-1/tasks')
      const params = Promise.resolve({ id: 'project-1' })
      const response = await GET(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Failed to fetch tasks')
    })

    it('should handle malformed JSON in requests', async () => {
      const request = new NextRequest('http://localhost/api/projects/project-1/tasks', {
        method: 'POST',
        body: 'invalid-json',
        headers: { 'Content-Type': 'application/json' },
      })

      const params = Promise.resolve({ id: 'project-1' })
      const response = await POST(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid JSON')
    })
  })

  describe('Project Timeline Updates', () => {
    it('should update project timeline when tasks are modified', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject)
      mockPrisma.task.create.mockResolvedValue(mockTask)
      mockPrisma.task.count.mockResolvedValue(0)
      mockPrisma.task.findMany.mockResolvedValue([mockTask])

      const taskData = {
        name: 'New Task',
        startDate: '2023-12-01', // Before project start
        endDate: '2025-01-01', // After project end
      }

      const request = new NextRequest('http://localhost/api/projects/project-1/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      })

      const params = Promise.resolve({ id: 'project-1' })
      await POST(request, mockUser, { params })

      // Should update project dates if task extends beyond project timeline
      expect(mockPrisma.project.update).toHaveBeenCalled()
    })

    it('should maintain project timeline integrity', async () => {
      const multipleTasks = [
        { ...mockTask, startDate: '2024-01-01T00:00:00Z', endDate: '2024-01-15T00:00:00Z' },
        {
          ...mockTask,
          id: 'task-2',
          startDate: '2024-02-01T00:00:00Z',
          endDate: '2024-02-28T00:00:00Z',
        },
      ]

      mockPrisma.task.findMany.mockResolvedValue(multipleTasks)
      mockPrisma.project.findUnique.mockResolvedValue(mockProject)

      const request = new NextRequest('http://localhost/api/projects/project-1/tasks')
      const params = Promise.resolve({ id: 'project-1' })
      const response = await GET(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.tasks).toHaveLength(2)
    })
  })
})
