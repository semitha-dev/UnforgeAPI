// app/api/schedule/export/route.ts
// Export schedule to ICS format for Google Calendar, Apple Calendar, etc.
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('scheduleId');
    const format = searchParams.get('format') || 'ics'; // ics or json

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Missing schedule ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .eq('user_id', user.id)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Get all tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('schedule_tasks')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('task_date', { ascending: true });

    if (tasksError) {
      throw new Error('Failed to fetch tasks');
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json(
        { error: 'No tasks to export' },
        { status: 400 }
      );
    }

    // Map preferred times to actual hours
    const timeSlots: Record<string, { start: string; end: string }> = {
      morning: { start: '09:00', end: '10:00' },
      afternoon: { start: '14:00', end: '15:00' },
      evening: { start: '19:00', end: '20:00' }
    };

    // Get first preferred time slot
    const preferredTimes = schedule.preferred_times || ['morning'];
    const defaultSlot = timeSlots[preferredTimes[0]] || timeSlots.morning;

    if (format === 'json') {
      // Return JSON format for Google Calendar API integration
      const events = tasks.map(task => ({
        summary: task.task_name,
        description: generateTaskDescription(task),
        start: {
          dateTime: `${task.task_date}T${defaultSlot.start}:00`,
          timeZone: 'UTC'
        },
        end: {
          dateTime: `${task.task_date}T${defaultSlot.end}:00`,
          timeZone: 'UTC'
        },
        colorId: getColorIdForTask(task),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 }
          ]
        }
      }));

      return NextResponse.json({ events });
    }

    // Generate ICS file
    const icsContent = generateICS(tasks, schedule, defaultSlot);

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="study-schedule-${scheduleId.slice(0, 8)}.ics"`
      }
    });

  } catch (error: any) {
    console.error('Error exporting schedule:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export schedule' },
      { status: 500 }
    );
  }
}

function generateTaskDescription(task: any): string {
  const lines = [
    `📚 ${task.project_name}`,
    `📋 Type: ${formatTaskType(task.task_type)}`,
    `🎯 Priority: ${task.priority}`,
    `⏱️ Estimated: ${task.estimated_minutes || 30} minutes`
  ];

  if (task.status !== 'pending') {
    lines.push(`✅ Status: ${task.status}`);
  }

  if (task.lesson_reference) {
    lines.push(`📖 Reference: ${task.lesson_reference}`);
  }

  return lines.join('\n');
}

function formatTaskType(type: string): string {
  const typeMap: Record<string, string> = {
    lesson: 'New Lesson',
    flashcard: 'Flashcard Review',
    qa: 'Q&A Practice',
    revision: 'Full Revision',
    revise_mistake: 'Mistake Review'
  };
  return typeMap[type] || type;
}

function getColorIdForTask(task: any): string {
  // Google Calendar color IDs
  const priorityColors: Record<string, string> = {
    high: '11',    // Red
    medium: '5',   // Yellow
    low: '10'      // Green
  };
  return priorityColors[task.priority] || '7'; // Default: Cyan
}

function generateICS(tasks: any[], schedule: any, timeSlot: { start: string; end: string }): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  // ICS header
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LeafLearning//Study Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Study Schedule',
    'X-WR-TIMEZONE:UTC'
  ].join('\r\n');

  // Add each task as an event
  tasks.forEach((task, index) => {
    const taskDate = task.task_date.replace(/-/g, '');
    const startTime = timeSlot.start.replace(':', '') + '00';
    const endTime = timeSlot.end.replace(':', '') + '00';
    
    // Calculate end time based on estimated minutes
    const duration = task.estimated_minutes || 30;
    const [startHour, startMinute] = timeSlot.start.split(':').map(Number);
    const endMinutes = startHour * 60 + startMinute + duration;
    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const calculatedEndTime = `${String(endHour).padStart(2, '0')}${String(endMin).padStart(2, '0')}00`;

    const uid = `task-${task.id}@leaflearning.app`;
    const description = generateTaskDescription(task).replace(/\n/g, '\\n');
    const summary = escapeICSText(task.task_name);
    
    // Priority mapping (ICS uses 1-9, 1 = highest)
    const priorityMap: Record<string, number> = { high: 1, medium: 5, low: 9 };
    const priority = priorityMap[task.priority] || 5;

    // Status mapping
    const statusMap: Record<string, string> = {
      pending: 'NEEDS-ACTION',
      understood: 'COMPLETED',
      need_work: 'IN-PROCESS'
    };
    const status = statusMap[task.status] || 'NEEDS-ACTION';

    // Category based on task type
    const categoryMap: Record<string, string> = {
      lesson: 'Learning',
      flashcard: 'Review',
      qa: 'Practice',
      revision: 'Revision',
      revise_mistake: 'Review'
    };
    const category = categoryMap[task.task_type] || 'Study';

    ics += '\r\n' + [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${timestamp}`,
      `DTSTART:${taskDate}T${startTime}Z`,
      `DTEND:${taskDate}T${calculatedEndTime}Z`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `PRIORITY:${priority}`,
      `STATUS:${status}`,
      `CATEGORIES:${category}`,
      `X-TASK-TYPE:${task.task_type}`,
      `X-PROJECT:${escapeICSText(task.project_name)}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Study reminder: ${summary}`,
      'END:VALARM',
      'END:VEVENT'
    ].join('\r\n');
  });

  // Add exam date as final event
  const examDate = schedule.exam_date.replace(/-/g, '');
  ics += '\r\n' + [
    'BEGIN:VEVENT',
    `UID:exam-${schedule.id}@leaflearning.app`,
    `DTSTAMP:${timestamp}`,
    `DTSTART;VALUE=DATE:${examDate}`,
    `DTEND;VALUE=DATE:${examDate}`,
    'SUMMARY:📝 EXAM DAY',
    "DESCRIPTION:Your exam is today! You've got this! 💪",
    'PRIORITY:1',
    'STATUS:CONFIRMED',
    'CATEGORIES:Exam',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your exam is tomorrow! Get some rest.',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your exam starts in 2 hours!',
    'END:VALARM',
    'END:VEVENT'
  ].join('\r\n');

  ics += '\r\nEND:VCALENDAR';

  return ics;
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
