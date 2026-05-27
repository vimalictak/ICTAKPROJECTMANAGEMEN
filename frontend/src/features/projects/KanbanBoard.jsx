import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MoreHorizontal, Filter, Search, User, Zap, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input, Badge, Skeleton, Avatar, Tooltip, Select, DropdownMenu } from '../../components/ui/index';
import { useQuery, useMutation } from '../../hooks/useQuery';
import { tasksApi, projectsApi, sprintsApi } from '../../api';
import { priorityColor, statusColor, formatDate, cn } from '../../lib/utils';
import { TaskModal } from '../tasks/TaskModal';
import { getSocket } from '../../hooks/useSocket';

const PRIORITY_ICONS = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };

// ─── Task Card ──────────────────────────────────────────
const TaskCard = ({ task, onClick, isDragging }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={cn(
        'group bg-card border rounded-lg p-3 cursor-grab hover:border-primary/50 hover:shadow-sm transition-all active:cursor-grabbing',
        isSortDragging && 'shadow-lg'
      )}
      onClick={onClick}
    >
      {/* Drag handle */}
      <div className="flex items-start gap-2">
        <div className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          {/* Task key & priority */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs text-muted-foreground font-mono">{task.taskKey}</span>
            <span className="text-xs">{PRIORITY_ICONS[task.priority]}</span>
          </div>

          {/* Title */}
          <p className="text-sm font-medium leading-snug mb-2 line-clamp-2">{task.title}</p>

          {/* Labels */}
          {task.labels?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.labels.slice(0, 3).map((label) => (
                <span key={label} className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{label}</span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {task.assignees?.length > 0 && (
                <div className="flex -space-x-1">
                  {task.assignees.slice(0, 2).map((a) => (
                    <Tooltip key={a._id} content={a.name}>
                      <Avatar src={a.avatar} name={a.name} size="sm" className="ring-1 ring-background" />
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {task.checklist?.length > 0 && (
                <span>✓ {task.checklist.filter(c => c.completed).length}/{task.checklist.length}</span>
              )}
              {task.commentsCount > 0 && <span>💬 {task.commentsCount}</span>}
              {task.dueDate && (
                <span className={new Date(task.dueDate) < new Date() ? 'text-red-500' : ''}>
                  {formatDate(task.dueDate, 'MMM d')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Column ─────────────────────────────────────────────
const Column = ({ column, tasks, onTaskClick, onAddTask }) => {
  const colorMap = {
    'todo': 'bg-gray-400',
    'pending': 'bg-yellow-400',
    'in-progress': 'bg-blue-400',
    'in-review': 'bg-purple-400',
    'completed': 'bg-green-400',
  };

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('h-2 w-2 rounded-full', colorMap[column.id] || 'bg-gray-400')} />
        <span className="text-sm font-semibold">{column.name}</span>
        <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{tasks.length}</span>
        <button onClick={() => onAddTask(column.id)} className="p-1 rounded hover:bg-accent transition-colors">
          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Tasks */}
      <div ref={setDroppableRef} className={"flex-1 min-h-[200px] rounded-xl p-2 space-y-2 " + (isOver ? 'ring-2 ring-primary/50 bg-muted/40' : 'bg-muted/30')}>
        <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {tasks.map((task) => (
              <motion.div key={task._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                <TaskCard task={task} onClick={() => onTaskClick(task)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            Drop tasks here
          </div>
        )}

        <button
          onClick={() => onAddTask(column.id)}
          className="w-full flex items-center gap-2 p-2 rounded-lg text-xs text-muted-foreground hover:bg-accent transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add task
        </button>
      </div>
    </div>
  );
};

// ─── Kanban Board ───────────────────────────────────────
export const KanbanBoard = () => {
  const { projectId } = useParams();
  const [columns, setColumns] = useState([
    { id: 'todo', name: 'To Do' },
    { id: 'pending', name: 'Pending' },
    { id: 'in-progress', name: 'In Progress' },
    { id: 'in-review', name: 'In Review' },
    { id: 'completed', name: 'Completed' },
  ]);
  const [tasksByColumn, setTasksByColumn] = useState({});
  const [activeTask, setActiveTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newTaskStatus, setNewTaskStatus] = useState(null);
  const [filters, setFilters] = useState({ search: '', assignee: '', priority: '', sprint: '' });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Load board columns
  const { data: colData } = useQuery(() => projectsApi.getBoardColumns(projectId), [projectId]);

  useEffect(() => {
    if (colData?.columns && colData.columns.length > 0) {
      setColumns(colData.columns);
    }
  }, [colData]);

  // Load tasks
  const { data: tasksData, refetch: refetchTasks } = useQuery(
    () => tasksApi.getAll({ project: projectId, ...filters, limit: 200 }),
    [projectId, JSON.stringify(filters)]
  );

  useEffect(() => {
    const list = tasksData?.data || tasksData?.tasks || [];
    if (list) {
      const byCol = {};
      columns.forEach(c => { byCol[c.id] = []; });
      list.forEach(t => {
        const colId = t.status;
        if (!byCol[colId]) byCol[colId] = [];
        byCol[colId].push(t);
      });
      setTasksByColumn(byCol);
    }
  }, [tasksData, columns]);

  // Socket real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('join:project', projectId);
    socket.on('task:updated', (task) => {
      setTasksByColumn(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(col => { next[col] = next[col].filter(t => t._id !== task._id); });
        if (!next[task.status]) next[task.status] = [];
        next[task.status] = [task, ...next[task.status]];
        return next;
      });
    });
    socket.on('task:created', (task) => {
      setTasksByColumn(prev => {
        const next = { ...prev };
        if (!next[task.status]) next[task.status] = [];
        next[task.status] = [task, ...next[task.status]];
        return next;
      });
    });
    return () => {
      socket.emit('leave:project', projectId);
      socket.off('task:updated');
      socket.off('task:created');
    };
  }, [projectId]);

  const { mutate: moveTask } = useMutation(
    ({ id, status, order }) => tasksApi.move(id, { status, order }),
    { onError: (e) => { toast.error(e); refetchTasks(); } }
  );

  const handleDragStart = ({ active }) => {
    const task = Object.values(tasksByColumn).flat().find(t => t._id === active.id);
    setActiveTask(task);
    getSocket()?.emit('task:drag-start', { taskId: active.id, projectId });
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find source column
    let srcCol = null;
    Object.entries(tasksByColumn).forEach(([col, tasks]) => {
      if (tasks.some(t => t._id === activeId)) srcCol = col;
    });

    // Over a column or a task in another column
    const destCol = tasksByColumn[overId] !== undefined ? overId
      : Object.entries(tasksByColumn).find(([, tasks]) => tasks.some(t => t._id === overId))?.[0];

    if (!srcCol || !destCol || srcCol === destCol) return;

    // Optimistic update
    setTasksByColumn(prev => {
      const next = { ...prev };
      const task = next[srcCol].find(t => t._id === activeId);
      next[srcCol] = next[srcCol].filter(t => t._id !== activeId);
      next[destCol] = [{ ...task, status: destCol }, ...next[destCol]];
      return next;
    });

    moveTask({ id: activeId, status: destCol, order: 0 });
    getSocket()?.emit('task:drag-end', { taskId: activeId, status: destCol, projectId });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Board toolbar */}
      <div className="border-b px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 w-48 text-xs"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        <Select className="h-8 w-32 text-xs" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
          <option value="">Priority</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setNewTaskStatus('todo')}>
            <Plus className="h-3.5 w-3.5" /> Add Task
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 p-4 h-full min-h-0">
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {columns.map((col) => (
              <Column
                key={col.id}
                column={col}
                tasks={tasksByColumn[col.id] || []}
                onTaskClick={setSelectedTask}
                onAddTask={(status) => setNewTaskStatus(status)}
              />
            ))}
            <DragOverlay>
              {activeTask ? <div className="rotate-2 opacity-90"><TaskCard task={activeTask} /></div> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Task modal */}
      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdated={refetchTasks} />
      )}
      {newTaskStatus && (
        <TaskModal
          defaultStatus={newTaskStatus}
          projectId={projectId}
          onClose={() => setNewTaskStatus(null)}
          onUpdated={() => { refetchTasks(); setNewTaskStatus(null); }}
          isNew
        />
      )}
    </div>
  );
};

export default KanbanBoard;
