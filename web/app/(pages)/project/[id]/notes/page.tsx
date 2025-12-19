import { createClient } from '@/app/lib/supabaseServer'
import { redirect, notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import NotesClient from './NotesClient' // We'll create this client component

// Server Actions
async function createNote(formData: FormData) {
  'use server'
  
  const supabase = await createClient()
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const projectId = formData.get('projectId') as string
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.error('Authentication error:', userError)
    redirect('/signin')
  }
  
  // Verify user owns the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()
    
  if (projectError || !project) {
    console.error('Project verification error:', projectError)
    throw new Error('Project not found or unauthorized')
  }
  
  const { error: insertError } = await supabase
    .from('notes')
    .insert({
      title,
      content: content || '',
      project_id: projectId,
      user_id: user.id
    })
    
  if (insertError) {
    console.error('Error creating note:', insertError)
    throw new Error('Failed to create note')
  }
  
  revalidatePath(`/project/${projectId}/notes`)
}

async function deleteNote(formData: FormData) {
  'use server'
  
  const supabase = await createClient()
  const noteId = formData.get('noteId') as string
  const projectId = formData.get('projectId') as string
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.error('Authentication error:', userError)
    redirect('/signin')
  }
  
  const { error: deleteError } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', user.id)
    
  if (deleteError) {
    console.error('Error deleting note:', deleteError)
    throw new Error('Failed to delete note')
  }
  
  revalidatePath(`/project/${projectId}/notes`)
}

async function updateNote(formData: FormData) {
  'use server'
  
  const supabase = await createClient()
  const noteId = formData.get('noteId') as string
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const projectId = formData.get('projectId') as string
  const folder = formData.get('folder') as string | null
  const summary = formData.get('summary') as string | null
  const summaryType = formData.get('summaryType') as string | null
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.error('Authentication error:', userError)
    redirect('/signin')
  }
  
  // Build update object
  const updateData: Record<string, unknown> = {
    title,
    content: content || '',
    updated_at: new Date().toISOString()
  }
  
  // Only include folder if it was explicitly passed
  if (formData.has('folder')) {
    updateData.folder = folder || null
  }
  
  // Only include summary fields if passed
  if (formData.has('summary')) {
    updateData.summary = summary || null
  }
  if (formData.has('summaryType')) {
    updateData.summary_type = summaryType || null
    updateData.summary_generated_at = summaryType ? new Date().toISOString() : null
  }
  
  const { error: updateError } = await supabase
    .from('notes')
    .update(updateData)
    .eq('id', noteId)
    .eq('user_id', user.id)
    
  if (updateError) {
    console.error('Error updating note:', updateError)
    throw new Error('Failed to update note')
  }
  
  revalidatePath(`/project/${projectId}/notes`)
}

// Types
export type Note = {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
  summary?: string | null
  summary_type?: 'concise' | 'bullet' | 'detailed' | null
  summary_generated_at?: string | null
  folder?: string | null
}

export type Project = {
  id: string
  name: string
  description: string | null
  color: string
}

// Props type for the page
type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function ProjectNotesPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // Debug logging
  console.log('Auth check:', { user: !!user, authError })
  
  if (authError || !user) {
    console.log('No user found or auth error, redirecting to signin')
    redirect('/signin')
  }
  
  // Fetch project details
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, description, color')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
    
  if (projectError || !project) {
    console.error('Project fetch error:', projectError)
    console.log(id)
    notFound()
  }
  
  // Fetch project notes
  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('id, title, content, created_at, updated_at, summary, summary_type, summary_generated_at, folder')
    .eq('project_id', id)
    .eq('user_id', user.id)
    .order('folder', { ascending: true, nullsFirst: false })
    .order('updated_at', { ascending: false })
    
  if (notesError) {
    console.error('Error fetching notes:', notesError)
  }
  
  return (
    <NotesClient 
      project={project}
      notes={notes || []}
      projectId={id}
      createNoteAction={createNote}
      deleteNoteAction={deleteNote}
      updateNoteAction={updateNote}
    />
  )
}