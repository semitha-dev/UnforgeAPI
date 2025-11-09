'use client'

import { useState, useRef, useEffect } from 'react'
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

  // Strip HTML tags for preview
  const getPlainText = (html: string) => {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent || div.innerText || ''
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
            {getPlainText(note.content || 'No content')}
          </p>
        </div>
        <div className="mt-auto pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">{formatDate(note.updated_at)}</span>
        </div>
      </div>
    </button>
  )
}

// Rich Text Toolbar Component
interface ToolbarProps {
  onFormat: (command: string, value?: string) => void
}

function RichTextToolbar({ onFormat }: ToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  
  const colors = [
    '#000000', '#e60000', '#ff9900', '#ffff00', '#008a00', 
    '#0066cc', '#9933ff', '#ffffff', '#facccc', '#ffebcc',
    '#ffffcc', '#cce8cc', '#cce0f5', '#ebd6ff', '#bbbbbb',
    '#f06666', '#ffc266', '#ffff66', '#66b966', '#66a3e0',
    '#c285ff', '#888888', '#a10000', '#b26b00', '#b2b200',
    '#006100', '#0047b2', '#6b24b2', '#444444', '#5c0000'
  ]

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
      {/* Text Formatting */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
        <button
          onClick={() => onFormat('bold')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Bold (Ctrl+B)"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>
          </svg>
        </button>
        <button
          onClick={() => onFormat('italic')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Italic (Ctrl+I)"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/>
          </svg>
        </button>
        <button
          onClick={() => onFormat('underline')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Underline (Ctrl+U)"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/>
          </svg>
        </button>
        <button
          onClick={() => onFormat('strikeThrough')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Strikethrough"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/>
          </svg>
        </button>
      </div>

      {/* Text Color */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-300 relative">
        <button
          onClick={() => {
            setShowColorPicker(!showColorPicker)
            setShowHighlightPicker(false)
          }}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Text Color"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9.62 12L12 5.67 14.38 12H9.62zM11 3L5.5 17h2.25l1.12-3h6.25l1.12 3h2.25L13 3h-2z"/>
          </svg>
        </button>
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50">
            <div className="grid grid-cols-10 gap-1">
              {colors.map(color => (
                <button
                  key={color}
                  onClick={() => {
                    onFormat('foreColor', color)
                    setShowColorPicker(false)
                  }}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
        
        <button
          onClick={() => {
            setShowHighlightPicker(!showHighlightPicker)
            setShowColorPicker(false)
          }}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Highlight Color"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.75 7L14 3.25l-10 10V17h3.75l10-10zm2.96-2.96c.39-.39.39-1.02 0-1.41L18.37.29c-.39-.39-1.02-.39-1.41 0L15 2.25 18.75 6l1.96-1.96z"/>
            <path d="M0 20h24v4H0z" fillOpacity=".36"/>
          </svg>
        </button>
        {showHighlightPicker && (
          <div className="absolute top-full left-12 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50">
            <div className="grid grid-cols-10 gap-1">
              {colors.map(color => (
                <button
                  key={color}
                  onClick={() => {
                    onFormat('hiliteColor', color)
                    setShowHighlightPicker(false)
                  }}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lists */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
        <button
          onClick={() => onFormat('insertUnorderedList')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Bullet List"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>
          </svg>
        </button>
        <button
          onClick={() => onFormat('insertOrderedList')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Numbered List"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>
          </svg>
        </button>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
        <button
          onClick={() => onFormat('justifyLeft')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Align Left"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/>
          </svg>
        </button>
        <button
          onClick={() => onFormat('justifyCenter')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Align Center"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z"/>
          </svg>
        </button>
        <button
          onClick={() => onFormat('justifyRight')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Align Right"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/>
          </svg>
        </button>
        <button
          onClick={() => onFormat('justifyFull')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Justify"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z"/>
          </svg>
        </button>
      </div>

      {/* Indentation */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
        <button
          onClick={() => onFormat('indent')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Increase Indent"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 21h18v-2H3v2zM3 8v8l4-4-4-4zm8 9h10v-2H11v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/>
          </svg>
        </button>
        <button
          onClick={() => onFormat('outdent')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Decrease Indent"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11 17h10v-2H11v2zm-8-5l4 4V8l-4 4zm0 9h18v-2H3v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/>
          </svg>
        </button>
      </div>

      {/* Clear Formatting */}
      <button
        onClick={() => onFormat('removeFormat')}
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        title="Clear Formatting"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21 18 19.73 3.55 5.27 3.27 5zM6 5v.18L8.82 8h2.4l-.72 1.68 2.1 2.1L14.21 8H20V5H6z"/>
        </svg>
      </button>
    </div>
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
  const [isSaving, setIsSaving] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus()
    }
  }, [])

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title')
      return
    }

    setIsSaving(true)
    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('title', title)
    formData.append('content', editorRef.current?.innerHTML || '')

    try {
      await createNoteAction(formData)
      onBack()
    } catch (error) {
      console.error('Error creating note:', error)
      alert('Failed to create note. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
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
              <span className="text-sm text-gray-600">New Note</span>
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
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Toolbar */}
          <RichTextToolbar onFormat={handleFormat} />
          
          {/* Content */}
          <div className="p-12">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className="w-full text-4xl font-bold text-gray-900 placeholder-gray-300 border-none focus:outline-none mb-8"
            />
            <div
              ref={editorRef}
              contentEditable
              className="min-h-[600px] text-base text-gray-700 focus:outline-none leading-relaxed"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              suppressContentEditableWarning
            />
          </div>
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
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (viewRef.current && !isEditing) {
      viewRef.current.innerHTML = note.content || 'No content'
    }
    if (editorRef.current && isEditing) {
      editorRef.current.innerHTML = note.content || ''
    }
  }, [note.content, isEditing])

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    const formData = new FormData()
    formData.append('noteId', note.id)
    formData.append('projectId', projectId)
    formData.append('title', title)
    formData.append('content', editorRef.current?.innerHTML || '')

    try {
      await updateNoteAction(formData)
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating note:', error)
      alert('Failed to update note. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setTitle(note.title)
    if (editorRef.current) {
      editorRef.current.innerHTML = note.content || ''
    }
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
      alert('Failed to delete note. Please try again.')
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
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
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
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isEditing && (
            <RichTextToolbar onFormat={handleFormat} />
          )}
          
          <div className="p-12">
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-4xl font-bold text-gray-900 placeholder-gray-300 border-none focus:outline-none mb-8"
                />
                <div
                  ref={editorRef}
                  contentEditable
                  className="min-h-[600px] text-base text-gray-700 focus:outline-none leading-relaxed"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  suppressContentEditableWarning
                />
              </>
            ) : (
              <>
                <h1 className="text-4xl font-bold text-gray-900 mb-8">{note.title}</h1>
                <div
                  ref={viewRef}
                  className="text-base text-gray-700 leading-relaxed prose max-w-none"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                />
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
    </div>
  )
}