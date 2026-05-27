import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, ChevronDown, ChevronRight, GripVertical, Flag, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '../../hooks/useQuery.js'
import { tasksApi, sprintsApi } from '../../api/index.js'
import { Button, Badge, Spinner, Avatar } from '../../components/ui/index.jsx'
import { priorityColor, statusColor, cn } from '../../lib/utils.js'
import { TaskModal } from '../tasks/TaskModal'

function TaskRow({ task, sprints, onMoveToSprint }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 hover:bg-muted/40 group border-b border-border/50 last:border-0">
      <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
        {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
      </div>
      <Badge className={cn('text-xs', priorityColor(task.priority))}>{task.priority}</Badge>
      <Badge className={cn('text-xs', statusColor(task.status))}>{task.status}</Badge>
      {task.storyPoints && <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{task.storyPoints} pts</span>}
      {task.assignee && (
        <Avatar src={task.assignee.avatar} name={`${task.assignee.firstName} ${task.assignee.lastName}`} size="sm" />
      )}
      {sprints.length > 0 && (
        <select
          onChange={e => onMoveToSprint(task._id, e.target.value)}
          className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          defaultValue=""
        >
          <option value="" disabled>Move to sprint</option>
          {sprints.filter(s => s.status !== 'completed').map(s => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
      )}
    </div>
  )
}

function SprintSection({ sprint, tasks, sprints, onMoveToSprint }) {
  const [expanded, setExpanded] = useState(true)
  const sprintTasks = tasks.filter((t) => {
    const taskSprintId = typeof t.sprint === 'object' ? t.sprint?._id : t.sprint
    return sprint ? String(taskSprintId) === String(sprint._id) : !t.sprint
  })

  return (
    <div className="border border-border rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/60 transition-colors"
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <span className="font-semibold text-foreground text-sm">{sprint ? sprint.name : 'Backlog'}</span>
        <Badge variant="secondary">{sprintTasks.length}</Badge>
        {sprint?.status && <Badge variant={sprint.status === 'active' ? 'success' : 'secondary'} className="text-xs">{sprint.status}</Badge>}
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          {sprint?.startDate && <span>{new Date(sprint.startDate).toLocaleDateString()} – {new Date(sprint.endDate).toLocaleDateString()}</span>}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            {sprintTasks.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">No tasks in this {sprint ? 'sprint' : 'backlog'}</div>
            ) : (
              sprintTasks.map(task => (
                <TaskRow key={task._id} task={task} sprints={sprints} onMoveToSprint={onMoveToSprint} />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function BacklogPage() {
  const { projectId } = useParams()
  const [createOpen, setCreateOpen] = useState(false)
  const { data: tasksData, loading: tasksLoading, refetch } = useQuery(
    () => tasksApi.list({ project: projectId, limit: 200 }),
    [projectId]
  )
  const { data: sprintsData } = useQuery(
    () => sprintsApi.list({ project: projectId, limit: 50 }),
    [projectId]
  )

  const tasks = tasksData?.data || tasksData?.tasks || []
  const sprints = sprintsData?.data || sprintsData?.sprints || []

  const { mutate: moveToSprint } = useMutation(
    ({ taskId, sprintId }) => tasksApi.update(taskId, { sprint: sprintId }),
    { onSuccess: refetch }
  )

  if (tasksLoading) return (
    <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Backlog</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and prioritize your project backlog</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />Create Issue</Button>
      </div>

      {/* Active and future sprints */}
      {sprints.filter(s => s.status !== 'completed').map(sprint => (
        <SprintSection
          key={sprint._id}
          sprint={sprint}
          tasks={tasks}
          sprints={sprints}
          onMoveToSprint={(taskId, sprintId) => moveToSprint({ taskId, sprintId })}
        />
      ))}

      {/* Unassigned backlog */}
      <SprintSection
        sprint={null}
        tasks={tasks}
        sprints={sprints}
        onMoveToSprint={(taskId, sprintId) => moveToSprint({ taskId, sprintId })}
      />

      {createOpen && (
        <TaskModal
          isNew
          projectId={projectId}
          onClose={() => setCreateOpen(false)}
          onUpdated={refetch}
        />
      )}
    </div>
  )
}
