'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { TaskManager } from '@/components/gantt/TaskManager'
import { useAuth } from '@/contexts/AuthContext'

interface ProjectManagementPageProps {}

export default function ProjectManagementPage({}: ProjectManagementPageProps) {
  const params = useParams()
  const { user } = useAuth()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const projectId = params?.id as string

  useEffect(() => {
    if (!projectId || !user) return

    fetchProject()
  }, [projectId, user])

  const fetchProject = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch project')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch project')
      }

      setProject(data.project)
    } catch (err) {
      console.error('Error fetching project:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h1>
          <p className="text-gray-600">Please log in to view project management.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project management...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-900 mb-2">Error Loading Project</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchProject}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h1>
          <p className="text-gray-600">The requested project could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {project.name} - Project Management
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Advanced project management with Gantt charts and task tracking
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Status: <span className="font-medium text-green-600">{project.status}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Budget:{' '}
                  <span className="font-medium">${project.budget?.toLocaleString() || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TaskManager projectId={projectId} project={project} />
      </div>
    </div>
  )
}
