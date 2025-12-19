// app/project/[id]/schedule/CreateScheduleModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabaseClient'

interface Project {
  id: string
  name: string
}

interface Lesson {
  name: string
  priority: 'high' | 'medium' | 'low'
}

interface ProjectSelection {
  projectId: string
  projectName: string
  lessons: Lesson[]
}

interface CreateScheduleModalProps {
  onClose: () => void
  onSuccess: () => void
  isEdit: boolean
  existingSchedule?: any
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
]

export default function CreateScheduleModal({ 
  onClose, 
  onSuccess, 
  isEdit,
  existingSchedule 
}: CreateScheduleModalProps) {
  const supabase = createClient()
  
  const [examDate, setExamDate] = useState('')
  const [difficulty, setDifficulty] = useState<'low' | 'medium' | 'high'>('medium')
  const [preferredDays, setPreferredDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [preferredTimes, setPreferredTimes] = useState<string[]>(['morning'])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjects, setSelectedProjects] = useState<ProjectSelection[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProjects()
    if (isEdit && existingSchedule) {
      setExamDate(existingSchedule.exam_date)
      setDifficulty(existingSchedule.difficulty)
      setPreferredDays(existingSchedule.preferred_days)
      // Handle both old single value and new array format
      const times = existingSchedule.preferred_times || existingSchedule.preferred_time
      setPreferredTimes(Array.isArray(times) ? times : [times || 'morning'])
    }
  }, [])

  const loadProjects = async () => {
    setIsLoadingProjects(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setIsLoadingProjects(false)
    }
  }

  const handleProjectToggle = (project: Project) => {
    const exists = selectedProjects.find(p => p.projectId === project.id)
    if (exists) {
      setSelectedProjects(selectedProjects.filter(p => p.projectId !== project.id))
    } else {
      setSelectedProjects([
        ...selectedProjects,
        {
          projectId: project.id,
          projectName: project.name,
          lessons: [{ name: 'Lesson 1', priority: 'medium' }]
        }
      ])
    }
  }

  const handleAddLesson = (projectId: string) => {
    setSelectedProjects(selectedProjects.map(p => {
      if (p.projectId === projectId) {
        return {
          ...p,
          lessons: [...p.lessons, { name: `Lesson ${p.lessons.length + 1}`, priority: 'medium' }]
        }
      }
      return p
    }))
  }

  const handleRemoveLesson = (projectId: string, lessonIndex: number) => {
    setSelectedProjects(selectedProjects.map(p => {
      if (p.projectId === projectId) {
        return {
          ...p,
          lessons: p.lessons.filter((_, i) => i !== lessonIndex)
        }
      }
      return p
    }))
  }

  const handleLessonChange = (
    projectId: string, 
    lessonIndex: number, 
    field: 'name' | 'priority', 
    value: string
  ) => {
    setSelectedProjects(selectedProjects.map(p => {
      if (p.projectId === projectId) {
        return {
          ...p,
          lessons: p.lessons.map((l, i) => 
            i === lessonIndex ? { ...l, [field]: value } : l
          )
        }
      }
      return p
    }))
  }

  const handleDayToggle = (day: number) => {
    if (preferredDays.includes(day)) {
      setPreferredDays(preferredDays.filter(d => d !== day))
    } else {
      setPreferredDays([...preferredDays, day].sort())
    }
  }

  const handleTimeToggle = (time: string) => {
    setPreferredTimes(prev => {
      if (prev.includes(time)) {
        // Don't allow deselecting if it's the only one selected
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== time);
      }
      return [...prev, time];
    });
  }

  const validateSchedule = () => {
    if (!examDate) {
      setError('Please select an exam date')
      return false
    }

    const examDateTime = new Date(examDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (examDateTime <= today) {
      setError('Exam date must be in the future')
      return false
    }

    if (preferredDays.length === 0) {
      setError('Please select at least one study day')
      return false
    }

    if (selectedProjects.length === 0) {
      setError('Please select at least one project')
      return false
    }

    for (const project of selectedProjects) {
      if (project.lessons.length === 0) {
        setError(`Please add lessons for ${project.projectName}`)
        return false
      }
    }

    // Calculate available study days
    const daysUntilExam = Math.ceil((examDateTime.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const totalStudyDays = Math.floor(daysUntilExam * (preferredDays.length / 7))
    
    // Calculate required study sessions
    const totalLessons = selectedProjects.reduce((sum, p) => sum + p.lessons.length, 0)
    const hoursPerDay = difficulty === 'low' ? 1 : difficulty === 'medium' ? 2 : 4
    const revisionDays = Math.floor(daysUntilExam / 7)
    
    // Each lesson needs study time + flashcard + QA
    const requiredDays = totalLessons * 3 + revisionDays
    
    if (totalStudyDays < requiredDays) {
      setError(`Not enough study days. You need at least ${requiredDays} study days, but only have ${totalStudyDays} available. Try adding more study days or extending your exam date.`)
      return false
    }

    return true
  }

  const handleGenerate = async () => {
    if (!validateSchedule()) return

    setIsGenerating(true)
    setError('')

    try {
      const response = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examDate,
          difficulty,
          preferredDays,
          preferredTimes,
          projects: selectedProjects,
          isEdit,
          existingScheduleId: existingSchedule?.id
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate schedule')
      }

      // Dispatch event to notify layout to refresh token balance
      window.dispatchEvent(new CustomEvent('tokensUpdated'))
      
      onSuccess()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Add More Subjects' : 'Create Study Schedule'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Exam Date */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exam Date *
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Difficulty */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Study Intensity *
              </label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'low', label: 'Low', hours: '1 hour/day' },
                  { value: 'medium', label: 'Medium', hours: '2 hours/day' },
                  { value: 'high', label: 'High', hours: '4 hours/day' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDifficulty(option.value as any)}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      difficulty === option.value
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-semibold">{option.label}</div>
                    <div className="text-sm mt-1">{option.hours}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preferred Study Days */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Study Days *
              </label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => handleDayToggle(day.value)}
                    className={`p-3 rounded-lg border-2 transition-colors text-sm ${
                      preferredDays.includes(day.value)
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {day.label.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preferred Time */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Time of Day * <span className="text-xs text-gray-500">(select one or more)</span>
              </label>
              <div className="grid grid-cols-3 gap-4">
                {['morning', 'afternoon', 'evening'].map((time) => (
                  <button
                    key={time}
                    onClick={() => handleTimeToggle(time)}
                    className={`p-4 rounded-lg border-2 transition-colors capitalize ${
                      preferredTimes.includes(time)
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Subjects *
            </label>
            {isLoadingProjects ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">No projects found</p>
                <p className="text-xs text-gray-500 mt-1">Create a project first to build a schedule</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectToggle(project)}
                    className={`p-3 rounded-lg border-2 transition-colors text-sm ${
                      selectedProjects.find(p => p.projectId === project.id)
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {project.name}
                  </button>
                ))}
              </div>
            )}

            {/* Lessons for Selected Projects */}
            {!isLoadingProjects && selectedProjects.map((project) => (
              <div key={project.projectId} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">{project.projectName}</h3>
                <div className="space-y-3">
                  {project.lessons.map((lesson, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={lesson.name}
                        onChange={(e) => handleLessonChange(project.projectId, index, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Lesson name"
                      />
                      <select
                        value={lesson.priority}
                        onChange={(e) => handleLessonChange(project.projectId, index, 'priority', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      <button
                        onClick={() => handleRemoveLesson(project.projectId, index)}
                        disabled={project.lessons.length === 1}
                        className={`p-2 rounded-lg transition-colors ${
                          project.lessons.length === 1 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                        title={project.lessons.length === 1 ? 'At least one lesson required' : 'Remove lesson'}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => handleAddLesson(project.projectId)}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                  >
                    + Add Lesson
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{isEdit ? 'Adding Subjects...' : 'Generating Schedule...'}</span>
              </>
            ) : (
              <span>{isEdit ? 'Add to Schedule' : 'Generate Schedule'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}