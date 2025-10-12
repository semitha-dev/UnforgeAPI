'use client'

import { useState } from 'react'
import { Note, Project } from './page'

interface NotesClientProps {
  project: Project
  notes: Note[]
  projectId: string
  createNoteAction: (formData: FormData) => Promise<void>
  deleteNoteAction: (formData: FormData) => Promise<void>
  updateNoteAction: (formData: FormData) => Promise<void>
}

export default function NotesClient({ 
  project, 
  notes, 
  projectId, 
  createNoteAction, 
  deleteNoteAction, 
  updateNoteAction 
}: NotesClientProps) {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note)
    setIsCreating(false)
  }

  const handleCreateNew = () => {
    setIsCreating(true)
    setSelectedNote(null)
  }

  const handleBackToList = () => {
    setSelectedNote(null)
    setIsCreating(false)
  }

  if (selectedNote) {
    return (
      <NoteEditor
        note={selectedNote}
        projectId={projectId}
        onBack={handleBackToList}
        updateNoteAction={updateNoteAction}
        deleteNoteAction={deleteNoteAction}
      />
    )
  }

  if (isCreating) {
    return (
      <CreateNote
        projectId={projectId}
        createNoteAction={createNoteAction}
        onBack={handleBackToList}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notes</h1>
          <p className="text-gray-600">Create and organize your project notes</p>
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Create New Note Card */}
          <button
            onClick={handleCreateNew}
            className="aspect-[3/4] bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center group"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center mb-3 transition-colors">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-600 group-hover:text-indigo-600">New Note</span>
          </button>

          {/* Existing Notes */}
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onClick={() => handleNoteClick(note)}
            />
          ))}
        </div>

        {/* Empty State */}
        {notes.length === 0 && (
          <div className="text-center py-12 mt-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No notes yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new note.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Note Card Component
interface NoteCardProps {
  note: Note
  onClick: () => void
}

function NoteCard({ note, onClick }: NoteCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  return (
    <button
      onClick={onClick}
      className="aspect-[3/4] bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all text-left overflow-hidden group"
    >
      <div className="h-full flex flex-col p-4">
        <div className="flex-1 overflow-hidden">
          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 text-sm">
            {note.title}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-4">
            {note.content || 'No content'}
          </p>
        </div>
        <div className="mt-auto pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">{formatDate(note.updated_at)}</span>
        </div>
      </div>
    </button>
  )
}

// Create Note Component
interface CreateNoteProps {
  projectId: string
  createNoteAction: (formData: FormData) => Promise<void>
  onBack: () => void
}

function CreateNote({ projectId, createNoteAction, onBack }: CreateNoteProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title')
      return
    }

    setIsSaving(true)
    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('title', title)
    formData.append('content', content)

    try {
      await createNoteAction(formData)
      onBack()
    } catch (error) {
      console.error('Error creating note:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm text-gray-600">Untitled Note</span>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg shadow-sm p-12 min-h-[800px]">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="w-full text-4xl font-bold text-gray-900 placeholder-gray-300 border-none focus:outline-none mb-8"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing..."
            className="w-full text-base text-gray-700 placeholder-gray-300 border-none focus:outline-none resize-none min-h-[600px] leading-relaxed"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          />
        </div>
      </div>
    </div>
  )
}

// Note Editor Component
interface NoteEditorProps {
  note: Note
  projectId: string
  onBack: () => void
  updateNoteAction: (formData: FormData) => Promise<void>
  deleteNoteAction: (formData: FormData) => Promise<void>
}

function NoteEditor({ note, projectId, onBack, updateNoteAction, deleteNoteAction }: NoteEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    const formData = new FormData()
    formData.append('noteId', note.id)
    formData.append('projectId', projectId)
    formData.append('title', title)
    formData.append('content', content)

    try {
      await updateNoteAction(formData)
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating note:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setTitle(note.title)
    setContent(note.content)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return
    }

    setIsDeleting(true)
    const formData = new FormData()
    formData.append('noteId', note.id)
    formData.append('projectId', projectId)

    try {
      await deleteNoteAction(formData)
      onBack()
    } catch (error) {
      console.error('Error deleting note:', error)
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm text-gray-600 truncate max-w-xs">{note.title}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !title.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
                  title="Edit note"
                >
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-2 hover:bg-red-50 rounded-full transition-colors group"
                  title="Delete note"
                >
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg shadow-sm p-12 min-h-[800px]">
          {isEditing ? (
            <>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-4xl font-bold text-gray-900 placeholder-gray-300 border-none focus:outline-none mb-8"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full text-base text-gray-700 placeholder-gray-300 border-none focus:outline-none resize-none min-h-[600px] leading-relaxed"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              />
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold text-gray-900 mb-8">{note.title}</h1>
              <div className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {note.content || 'No content'}
              </div>
            </>
          )}
          
          {!isEditing && (
            <div className="mt-12 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Created: {formatDate(note.created_at)}</span>
                {note.created_at !== note.updated_at && (
                  <span>Last edited: {formatDate(note.updated_at)}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}