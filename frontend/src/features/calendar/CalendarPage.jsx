import { useState, useMemo } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, addWeeks, subWeeks,
  parseISO, addDays
} from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, List, LayoutGrid } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '../../hooks/useQuery.js'
import { tasksApi } from '../../api/index.js'
import { Button, Badge, Spinner } from '../../components/ui/index.jsx'
import { priorityColor, cn } from '../../lib/utils.js'

const PRIORITY_COLORS = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
}

function CalendarDay({ date, tasks, currentMonth, onTaskClick }) {
  const dayTasks = tasks.filter(t => {
    const due = t.dueDate ? parseISO(t.dueDate) : null
    return due && isSameDay(due, date)
  })
  const isCurrentMonth = isSameMonth(date, currentMonth)
  const isCurrentDay = isToday(date)

  return (
    <div className={cn(
      'min-h-[100px] p-1 border-b border-r border-border',
      !isCurrentMonth && 'bg-muted/30',
    )}>
      <div className={cn(
        'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1',
        isCurrentDay ? 'bg-primary text-white' : 'text-muted-foreground',
        isCurrentMonth && !isCurrentDay && 'text-foreground',
      )}>
        {format(date, 'd')}
      </div>
      <div className="space-y-0.5">
        {dayTasks.slice(0, 3).map(task => (
          <button
            key={task._id}
            onClick={() => onTaskClick(task)}
            className={cn(
              'w-full text-left text-xs px-1.5 py-0.5 rounded truncate font-medium',
              'hover:opacity-80 transition-opacity',
              PRIORITY_COLORS[task.priority] || 'bg-primary',
              'text-white',
            )}
          >
            {task.title}
          </button>
        ))}
        {dayTasks.length > 3 && (
          <p className="text-xs text-muted-foreground pl-1">+{dayTasks.length - 3} more</p>
        )}
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('month') // month | week
  const [selectedTask, setSelectedTask] = useState(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

  // Fetch tasks with due dates in range
  const { data, loading } = useQuery(
    () => tasksApi.list({
      dueDateFrom: format(calStart, 'yyyy-MM-dd'),
      dueDateTo: format(calEnd, 'yyyy-MM-dd'),
      limit: 200,
    }),
    [currentDate],
  )
  const tasks = data?.data || data?.tasks || []

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate),
    end: endOfWeek(currentDate),
  })

  function prev() {
    if (view === 'month') setCurrentDate(d => subMonths(d, 1))
    else setCurrentDate(d => subWeeks(d, 1))
  }
  function next() {
    if (view === 'month') setCurrentDate(d => addMonths(d, 1))
    else setCurrentDate(d => addWeeks(d, 1))
  }

  const headerLabel = view === 'month'
    ? format(currentDate, 'MMMM yyyy')
    : `${format(weekDays[0], 'MMM d')} – ${format(weekDays[6], 'MMM d, yyyy')}`

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="text-sm text-muted-foreground">View tasks and deadlines by date</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setView('month')}
              className={cn('px-3 py-1.5 text-sm flex items-center gap-1', view === 'month' ? 'bg-primary text-white' : 'bg-background text-foreground hover:bg-muted')}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Month
            </button>
            <button
              onClick={() => setView('week')}
              className={cn('px-3 py-1.5 text-sm flex items-center gap-1', view === 'week' ? 'bg-primary text-white' : 'bg-background text-foreground hover:bg-muted')}
            >
              <List className="h-3.5 w-3.5" /> Week
            </button>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
        <h2 className="text-lg font-semibold text-foreground min-w-[200px] text-center">{headerLabel}</h2>
        <Button variant="outline" size="sm" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
        {loading && <Spinner size="sm" />}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto rounded-lg border border-border bg-surface">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {view === 'month' ? (
          <div className="grid grid-cols-7">
            {calDays.map(day => (
              <CalendarDay
                key={day.toISOString()}
                date={day}
                tasks={tasks}
                currentMonth={currentDate}
                onTaskClick={setSelectedTask}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 h-full">
            {weekDays.map(day => {
              const dayTasks = tasks.filter(t => {
                const due = t.dueDate ? parseISO(t.dueDate) : null
                return due && isSameDay(due, day)
              })
              return (
                <div key={day.toISOString()} className="border-r border-border p-2 min-h-[400px]">
                  <div className={cn(
                    'text-sm font-semibold mb-2 w-7 h-7 flex items-center justify-center rounded-full',
                    isToday(day) ? 'bg-primary text-white' : 'text-foreground',
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.map(task => (
                      <button
                        key={task._id}
                        onClick={() => setSelectedTask(task)}
                        className={cn(
                          'w-full text-left text-xs px-2 py-1.5 rounded font-medium text-white',
                          PRIORITY_COLORS[task.priority] || 'bg-primary',
                        )}
                      >
                        <div className="truncate">{task.title}</div>
                        <div className="opacity-80 truncate">{task.project?.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Task detail modal */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedTask(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-surface rounded-xl shadow-xl p-6 max-w-md w-full border border-border"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-semibold text-foreground text-lg mb-2">{selectedTask.title}</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Project:</span> {selectedTask.project?.name || '—'}</p>
                <p><span className="font-medium text-foreground">Status:</span> {selectedTask.status}</p>
                <p><span className="font-medium text-foreground">Priority:</span> {selectedTask.priority}</p>
                {selectedTask.dueDate && <p><span className="font-medium text-foreground">Due:</span> {format(parseISO(selectedTask.dueDate), 'MMM d, yyyy')}</p>}
                {selectedTask.assignee && <p><span className="font-medium text-foreground">Assignee:</span> {selectedTask.assignee.firstName} {selectedTask.assignee.lastName}</p>}
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>Close</Button>
                <Button size="sm" onClick={() => { window.location.href = `/tasks?id=${selectedTask._id}`; setSelectedTask(null) }}>View Task</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
