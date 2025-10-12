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
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.error('Authentication error:', userError)
    redirect('/signin')
  }
  
  const { error: updateError } = await supabase
    .from('notes')
    .update({
      title,
      content: content || '',
      updated_at: new Date().toISOString()
    })
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
}

export type Project = {
  id: string
  name: string
  description: string | null
  color: string
}

// Props type for the page
type PageProps = {
  params: {
    id: string
  }
}

export default async function ProjectNotesPage({ params }: PageProps) {
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
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
    
  if (projectError || !project) {
    console.error('Project fetch error:', projectError)
    console.log(params.id)
    notFound()
  }
  
  // Fetch project notes
  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('id, title, content, created_at, updated_at')
    .eq('project_id', params.id)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    
  if (notesError) {
    console.error('Error fetching notes:', notesError)
  }
  
  return (
    <NotesClient 
      project={project}
      notes={notes || []}
      projectId={params.id}
      createNoteAction={createNote}
      deleteNoteAction={deleteNote}
      updateNoteAction={updateNote}
    />
  )
}