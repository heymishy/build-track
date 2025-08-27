'use client'

import { useState, useEffect } from 'react'
import { GanttChart, GanttTask } from './GanttChart'
import {
  PlusIcon,
  CalendarDaysIcon,
  UserIcon,
  ClockIcon,
  FlagIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'

interface TaskManagerProps {
  projectId: string
  className?: string
}

export function TaskManager({ projectId, className = '' }: TaskManagerProps) {
  const [tasks, setTasks] = useState<GanttTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [viewMode, setViewMode] = useState<'days' | 'weeks' | 'months'>('weeks')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all')

  useEffect(() => {
    fetchTasks()
  }, [projectId])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/tasks`)
      if (response.ok) {
        const data = await response.json()
        setTasks(transformTasksData(data.tasks || []))
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      // Use mock data for development
      setTasks(generateMockTasks())
    } finally {
      setLoading(false)
    }
  }

  // Transform API data to GanttTask format
  const transformTasksData = (apiTasks: any[]): GanttTask[] => {
    return apiTasks.map((task: any) => ({
      id: task.id,
      name: task.name,
      startDate: new Date(task.startDate),
      endDate: new Date(task.endDate),
      progress: task.progress || 0,
      status: task.status || 'not-started',
      priority: task.priority || 'medium',
      assignee: task.assignee,
      dependencies: task.dependencies || [],
      milestone: task.milestone || false,
      estimatedHours: task.estimatedHours,
      actualHours: task.actualHours,
      description: task.description,
      children: task.children ? transformTasksData(task.children) : undefined
    }))
  }

  // Generate mock tasks for development
  const generateMockTasks = (): GanttTask[] => {
    const today = new Date()
    const addDays = (date: Date, days: number) => {
      const result = new Date(date)
      result.setDate(result.getDate() + days)
      return result
    }

    return [
      {
        id: '1',
        name: 'Project Planning Phase',
        startDate: addDays(today, -10),
        endDate: addDays(today, 5),
        progress: 85,
        status: 'in-progress',
        priority: 'high',
        assignee: 'Project Manager',
        estimatedHours: 80,
        actualHours: 68,
        children: [
          {
            id: '1.1',
            name: 'Site Survey',
            startDate: addDays(today, -10),
            endDate: addDays(today, -7),
            progress: 100,
            status: 'completed',
            priority: 'high',
            assignee: 'Survey Team',
            estimatedHours: 16,
            actualHours: 18,
            parentId: '1'
          },
          {
            id: '1.2',
            name: 'Design Review',
            startDate: addDays(today, -5),
            endDate: addDays(today, 2),
            progress: 70,
            status: 'in-progress',
            priority: 'medium',
            assignee: 'Design Team',
            estimatedHours: 24,
            actualHours: 20,
            parentId: '1'
          }
        ]
      },
      {
        id: '2',
        name: 'Foundation Work',
        startDate: addDays(today, 5),
        endDate: addDays(today, 25),
        progress: 0,
        status: 'not-started',
        priority: 'critical',
        assignee: 'Foundation Crew',
        estimatedHours: 160,
        dependencies: ['1'],
        children: [
          {
            id: '2.1',
            name: 'Excavation',
            startDate: addDays(today, 5),
            endDate: addDays(today, 12),
            progress: 0,
            status: 'not-started',
            priority: 'critical',
            assignee: 'Excavation Team',
            estimatedHours: 40,
            parentId: '2'
          },
          {
            id: '2.2',
            name: 'Concrete Pour',
            startDate: addDays(today, 12),
            endDate: addDays(today, 18),
            progress: 0,
            status: 'not-started',
            priority: 'critical',
            assignee: 'Concrete Team',
            estimatedHours: 60,
            dependencies: ['2.1'],
            parentId: '2'
          }
        ]
      },
      {
        id: '3',
        name: 'Framing Phase',
        startDate: addDays(today, 25),
        endDate: addDays(today, 45),
        progress: 0,
        status: 'not-started',
        priority: 'high',
        assignee: 'Framing Crew',
        estimatedHours: 200,
        dependencies: ['2'],
        children: [
          {
            id: '3.1',
            name: 'Wall Framing',
            startDate: addDays(today, 25),
            endDate: addDays(today, 35),
            progress: 0,
            status: 'not-started',
            priority: 'high',
            assignee: 'Framing Team A',
            estimatedHours: 120,
            parentId: '3'
          },
          {
            id: '3.2',
            name: 'Roof Framing',
            startDate: addDays(today, 35),
            endDate: addDays(today, 45),
            progress: 0,
            status: 'not-started',
            priority: 'high',
            assignee: 'Framing Team B',
            estimatedHours: 80,
            dependencies: ['3.1'],
            parentId: '3'
          }
        ]
      },
      {
        id: '4',
        name: 'Milestone: Foundation Complete',
        startDate: addDays(today, 25),
        endDate: addDays(today, 25),
        progress: 0,
        status: 'not-started',
        priority: 'critical',
        milestone: true,
        dependencies: ['2']
      }
    ]
  }

  const handleTaskUpdate = async (taskId: string, updates: Partial<GanttTask>) => {
    try {
      // Update locally first for immediate feedback
      setTasks(prevTasks => updateTaskInTree(prevTasks, taskId, updates))

      // Then update on server
      await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
    } catch (error) {
      console.error('Failed to update task:', error)
      // Revert changes on error
      await fetchTasks()
    }
  }

  const updateTaskInTree = (tasks: GanttTask[], taskId: string, updates: Partial<GanttTask>): GanttTask[] => {
    return tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, ...updates }
      }
      if (task.children) {
        return { ...task, children: updateTaskInTree(task.children, taskId, updates) }
      }
      return task
    })
  }

  const handleTaskClick = (task: GanttTask) => {
    setSelectedTask(task)
    setShowTaskModal(true)
  }

  const getFilteredTasks = () => {
    if (filter === 'all') return tasks
    
    const filterTask = (task: GanttTask): boolean => {
      switch (filter) {
        case 'active':
          return task.status === 'in-progress' || task.status === 'not-started'
        case 'completed':
          return task.status === 'completed'
        case 'overdue':
          return task.status === 'overdue' || (task.endDate < new Date() && task.status !== 'completed')
        default:
          return true
      }
    }

    const filterTasksRecursively = (tasks: GanttTask[]): GanttTask[] => {
      return tasks.filter(task => {
        const matchesFilter = filterTask(task)
        const hasMatchingChildren = task.children ? filterTasksRecursively(task.children).length > 0 : false
        return matchesFilter || hasMatchingChildren
      }).map(task => ({
        ...task,
        children: task.children ? filterTasksRecursively(task.children) : undefined
      }))
    }

    return filterTasksRecursively(tasks)
  }

  const getTaskStats = () => {
    const flatTasks: GanttTask[] = []
    
    const flatten = (tasks: GanttTask[]) => {
      for (const task of tasks) {
        flatTasks.push(task)
        if (task.children) flatten(task.children)
      }
    }
    
    flatten(tasks)
    
    return {
      total: flatTasks.length,
      completed: flatTasks.filter(t => t.status === 'completed').length,
      inProgress: flatTasks.filter(t => t.status === 'in-progress').length,
      overdue: flatTasks.filter(t => t.status === 'overdue' || (t.endDate < new Date() && t.status !== 'completed')).length,
      avgProgress: flatTasks.length > 0 ? Math.round(flatTasks.reduce((sum, t) => sum + t.progress, 0) / flatTasks.length) : 0
    }
  }

  const stats = getTaskStats()
  const filteredTasks = getFilteredTasks()

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Task Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Total Tasks</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <CalendarDaysIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-900">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-900">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
            </div>
            <PlayIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-900">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-900">Avg Progress</p>
              <p className="text-2xl font-bold text-purple-600">{stats.avgProgress}%</p>
            </div>
            <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold text-sm">{stats.avgProgress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter Tasks</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Tasks</option>
              <option value="active">Active Tasks</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">View Mode</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedTask(null)
              setShowTaskModal(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Task
          </button>
        </div>
      </div>

      {/* Gantt Chart */}
      <GanttChart
        tasks={filteredTasks}
        onTaskUpdate={handleTaskUpdate}
        onTaskClick={handleTaskClick}
        viewMode={viewMode}
        className="min-h-96"
      />

      {/* Task Details Modal */}
      {showTaskModal && (
        <TaskModal
          task={selectedTask}
          onClose={() => {
            setShowTaskModal(false)
            setSelectedTask(null)
          }}
          onSave={(taskData) => {
            // Handle task save
            console.log('Save task:', taskData)
            setShowTaskModal(false)
            setSelectedTask(null)
          }}
        />
      )}
    </div>
  )
}

// Task Modal Component
interface TaskModalProps {
  task: GanttTask | null
  onClose: () => void
  onSave: (task: Partial<GanttTask>) => void
}

function TaskModal({ task, onClose, onSave }: TaskModalProps) {
  const [formData, setFormData] = useState({
    name: task?.name || '',
    description: task?.description || '',
    startDate: task?.startDate?.toISOString().split('T')[0] || '',
    endDate: task?.endDate?.toISOString().split('T')[0] || '',
    progress: task?.progress || 0,
    status: task?.status || 'not-started',
    priority: task?.priority || 'medium',
    assignee: task?.assignee || '',
    estimatedHours: task?.estimatedHours || 0
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate)
    })
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {task ? 'Edit Task' : 'New Task'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Task Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="not-started">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Progress (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Save Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}