'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline'

export interface GanttTask {
  id: string
  name: string
  startDate: Date
  endDate: Date
  progress: number // 0-100
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold' | 'overdue'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee?: string
  dependencies?: string[]
  children?: GanttTask[]
  milestone?: boolean
  estimatedHours?: number
  actualHours?: number
  description?: string
  parentId?: string
}

interface GanttChartProps {
  tasks: GanttTask[]
  onTaskUpdate?: (taskId: string, updates: Partial<GanttTask>) => void
  onTaskClick?: (task: GanttTask) => void
  onDateRangeChange?: (startDate: Date, endDate: Date) => void
  viewMode?: 'days' | 'weeks' | 'months'
  showCriticalPath?: boolean
  className?: string
}

export function GanttChart({
  tasks,
  onTaskUpdate,
  onTaskClick,
  onDateRangeChange,
  viewMode = 'weeks',
  showCriticalPath = false,
  className = ''
}: GanttChartProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [viewStart, setViewStart] = useState<Date>(new Date())
  const [viewEnd, setViewEnd] = useState<Date>(new Date())
  
  const chartRef = useRef<HTMLDivElement>(null)

  // Calculate view range based on tasks
  useEffect(() => {
    if (tasks.length === 0) return

    const allDates = tasks.flatMap(task => [task.startDate, task.endDate])
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))
    
    // Add padding
    const padding = viewMode === 'days' ? 7 : viewMode === 'weeks' ? 14 : 30
    const startPadding = new Date(minDate.getTime() - padding * 24 * 60 * 60 * 1000)
    const endPadding = new Date(maxDate.getTime() + padding * 24 * 60 * 60 * 1000)
    
    setViewStart(startPadding)
    setViewEnd(endPadding)
    
    onDateRangeChange?.(startPadding, endPadding)
  }, [tasks, viewMode, onDateRangeChange])

  // Generate time periods for the header
  const timePeriods = useMemo(() => {
    const periods = []
    const current = new Date(viewStart)
    
    while (current <= viewEnd) {
      periods.push(new Date(current))
      
      if (viewMode === 'days') {
        current.setDate(current.getDate() + 1)
      } else if (viewMode === 'weeks') {
        current.setDate(current.getDate() + 7)
      } else {
        current.setMonth(current.getMonth() + 1)
      }
    }
    
    return periods
  }, [viewStart, viewEnd, viewMode])

  // Calculate task position and width
  const calculateTaskGeometry = (task: GanttTask) => {
    const totalDays = (viewEnd.getTime() - viewStart.getTime()) / (24 * 60 * 60 * 1000)
    const taskStartDays = (task.startDate.getTime() - viewStart.getTime()) / (24 * 60 * 60 * 1000)
    const taskDurationDays = (task.endDate.getTime() - task.startDate.getTime()) / (24 * 60 * 60 * 1000)
    
    const left = (taskStartDays / totalDays) * 100
    const width = (taskDurationDays / totalDays) * 100
    
    return { left: Math.max(0, left), width: Math.max(0.5, width) }
  }

  // Get task status color and styling
  const getTaskStyling = (task: GanttTask) => {
    const isOverdue = task.status === 'overdue' || (task.endDate < new Date() && task.progress < 100)
    const isCritical = task.priority === 'critical'
    
    let backgroundColor = 'bg-blue-500'
    let progressColor = 'bg-blue-600'
    let textColor = 'text-white'
    
    if (isOverdue) {
      backgroundColor = 'bg-red-500'
      progressColor = 'bg-red-600'
    } else if (task.status === 'completed') {
      backgroundColor = 'bg-green-500'
      progressColor = 'bg-green-600'
    } else if (task.status === 'on-hold') {
      backgroundColor = 'bg-yellow-500'
      progressColor = 'bg-yellow-600'
    } else if (isCritical) {
      backgroundColor = 'bg-purple-500'
      progressColor = 'bg-purple-600'
    }

    if (task.milestone) {
      backgroundColor = 'bg-orange-500'
      progressColor = 'bg-orange-600'
    }
    
    return {
      backgroundColor,
      progressColor,
      textColor,
      borderColor: isOverdue ? 'border-red-600' : isCritical ? 'border-purple-600' : 'border-transparent'
    }
  }

  // Handle task expansion/collapse
  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedTasks(newExpanded)
  }

  // Flatten tasks for display (respecting expansion state)
  const flattenTasks = (tasks: GanttTask[], level = 0): Array<GanttTask & { level: number; isVisible: boolean }> => {
    const result: Array<GanttTask & { level: number; isVisible: boolean }> = []
    
    for (const task of tasks) {
      result.push({ ...task, level, isVisible: true })
      
      if (task.children && expandedTasks.has(task.id)) {
        const childTasks = flattenTasks(task.children, level + 1)
        result.push(...childTasks)
      }
    }
    
    return result
  }

  const flatTasks = useMemo(() => flattenTasks(tasks), [tasks, expandedTasks])

  // Format date for display
  const formatDate = (date: Date) => {
    if (viewMode === 'days') {
      return date.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short' })
    } else if (viewMode === 'weeks') {
      return date.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short' })
    } else {
      return date.toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' })
    }
  }

  // Get status icon
  const getStatusIcon = (task: GanttTask) => {
    switch (task.status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />
      case 'in-progress':
        return <PlayIcon className="h-4 w-4 text-blue-600" />
      case 'on-hold':
        return <PauseIcon className="h-4 w-4 text-yellow-600" />
      case 'overdue':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CalendarDaysIcon className="h-5 w-5 mr-2 text-blue-500" />
              Project Timeline
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Interactive Gantt chart with task dependencies and progress tracking
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* View Mode Selector */}
            <div className="flex rounded-lg bg-gray-100 p-1">
              {(['days', 'weeks', 'months'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewStart(new Date())} // Trigger recalculation
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize ${
                    viewMode === mode
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
              Options
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-sm font-medium text-blue-900">Total Tasks</div>
            <div className="text-lg font-bold text-blue-600">{flatTasks.length}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-sm font-medium text-green-900">Completed</div>
            <div className="text-lg font-bold text-green-600">
              {flatTasks.filter(t => t.status === 'completed').length}
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="text-sm font-medium text-yellow-900">In Progress</div>
            <div className="text-lg font-bold text-yellow-600">
              {flatTasks.filter(t => t.status === 'in-progress').length}
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-sm font-medium text-red-900">Overdue</div>
            <div className="text-lg font-bold text-red-600">
              {flatTasks.filter(t => t.status === 'overdue' || (t.endDate < new Date() && t.status !== 'completed')).length}
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div ref={chartRef} className="overflow-x-auto">
        <div className="min-w-full">
          {/* Time Header */}
          <div className="flex border-b border-gray-200">
            <div className="w-80 flex-shrink-0 bg-gray-50 px-6 py-4 border-r border-gray-200">
              <div className="text-sm font-medium text-gray-900">Task</div>
            </div>
            <div className="flex-1 bg-gray-50">
              <div className="flex">
                {timePeriods.map((period, index) => (
                  <div
                    key={period.toISOString()}
                    className={`px-2 py-4 text-center border-r border-gray-200 text-xs font-medium text-gray-600 ${
                      viewMode === 'days' ? 'min-w-[60px]' : 
                      viewMode === 'weeks' ? 'min-w-[80px]' : 'min-w-[100px]'
                    }`}
                  >
                    {formatDate(period)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-gray-200">
            {flatTasks.map((task) => {
              const geometry = calculateTaskGeometry(task)
              const styling = getTaskStyling(task)
              const hasChildren = task.children && task.children.length > 0
              
              return (
                <div key={task.id} className="flex hover:bg-gray-50">
                  {/* Task Info Column */}
                  <div className="w-80 flex-shrink-0 px-6 py-4 border-r border-gray-200">
                    <div className="flex items-center space-x-2" style={{ marginLeft: `${task.level * 20}px` }}>
                      {hasChildren && (
                        <button
                          onClick={() => toggleTaskExpansion(task.id)}
                          className="p-0.5 hover:bg-gray-100 rounded"
                        >
                          {expandedTasks.has(task.id) ? (
                            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                      )}
                      
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {getStatusIcon(task)}
                        
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => {
                              setSelectedTask(task.id)
                              onTaskClick?.(task)
                            }}
                            className={`text-left text-sm font-medium truncate block w-full ${
                              selectedTask === task.id ? 'text-blue-600' : 'text-gray-900 hover:text-blue-600'
                            }`}
                          >
                            {task.name}
                          </button>
                          
                          {task.assignee && (
                            <div className="text-xs text-gray-500 truncate">
                              Assigned to: {task.assignee}
                            </div>
                          )}
                        </div>
                        
                        {task.milestone && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" title="Milestone" />
                        )}
                        
                        {task.priority === 'critical' && (
                          <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" title="Critical Priority" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Timeline Column */}
                  <div className="flex-1 relative py-4" style={{ minHeight: '60px' }}>
                    <div className="absolute inset-0">
                      {/* Task Bar */}
                      <div
                        className={`absolute top-1/2 transform -translate-y-1/2 h-6 rounded ${styling.backgroundColor} ${styling.textColor} border-2 ${styling.borderColor} flex items-center justify-between px-2 shadow-sm`}
                        style={{
                          left: `${geometry.left}%`,
                          width: `${geometry.width}%`
                        }}
                      >
                        {/* Progress Bar */}
                        <div
                          className={`absolute left-0 top-0 h-full ${styling.progressColor} rounded-l opacity-80`}
                          style={{ width: `${task.progress}%` }}
                        />
                        
                        {/* Task Label (if width allows) */}
                        {geometry.width > 10 && (
                          <div className="relative z-10 text-xs font-medium truncate px-1">
                            {task.name.substring(0, 20)}
                          </div>
                        )}
                        
                        {/* Progress Percentage */}
                        {geometry.width > 8 && (
                          <div className="relative z-10 text-xs font-bold">
                            {task.progress}%
                          </div>
                        )}
                      </div>

                      {/* Dependencies (simplified lines) */}
                      {task.dependencies?.map((depId) => {
                        const depTask = flatTasks.find(t => t.id === depId)
                        if (!depTask) return null
                        
                        const depGeometry = calculateTaskGeometry(depTask)
                        return (
                          <div
                            key={depId}
                            className="absolute border-t-2 border-gray-400 border-dashed opacity-50"
                            style={{
                              left: `${depGeometry.left + depGeometry.width}%`,
                              top: '50%',
                              width: `${Math.max(0, geometry.left - (depGeometry.left + depGeometry.width))}%`
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Today Indicator */}
      <div className="absolute inset-0 pointer-events-none">
        {(() => {
          const today = new Date()
          const todayPosition = ((today.getTime() - viewStart.getTime()) / (viewEnd.getTime() - viewStart.getTime())) * 100
          
          if (todayPosition >= 0 && todayPosition <= 100) {
            return (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                style={{ left: `calc(320px + ${todayPosition}%)` }}
              >
                <div className="absolute -top-2 -left-8 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                  Today
                </div>
              </div>
            )
          }
          return null
        })()}
      </div>
    </div>
  )
}