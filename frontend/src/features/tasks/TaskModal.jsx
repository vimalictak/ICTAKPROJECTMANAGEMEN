import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Plus, Clock, MessageSquare, Paperclip, Check, Trash2, X, ChevronDown, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Modal, Button, Input, Textarea, Select, FormField, Badge, Avatar,
  Checkbox, Progress, Separator, Skeleton, Tabs, Spinner
} from '../../components/ui/index';
import { useQuery, useMutation } from '../../hooks/useQuery';
import { tasksApi, commentsApi, projectsApi, usersApi, sprintsApi } from '../../api';
import { statusColor, priorityColor, formatRelativeTime, formatDate, cn } from '../../lib/utils';
import { useSelector } from 'react-redux';
import { selectUser } from '../auth/authSlice';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.string().default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  estimatedHours: z.number().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  storyPoints: z.number().optional(),
  project: z.string().optional(),
  sprint: z.string().optional(),
});

// ─── Comments Section ───────────────────────────────────
const CommentsSection = ({ taskId, onUpdated }) => {
  const currentUser = useSelector(selectUser);
  const [text, setText] = useState('');
  const { data, refetch } = useQuery(() => commentsApi.getAll({ task: taskId }), [taskId]);
  const comments = data?.data || data || [];

  const { mutate: addComment, loading } = useMutation(
    (content) => commentsApi.create({ task: taskId, content }),
    { onSuccess: () => { setText(''); refetch(); onUpdated?.(); }, onError: (e) => toast.error(e) }
  );

  const { mutate: deleteComment, loading: deletingComment } = useMutation(
    (id) => commentsApi.delete(id),
    { onSuccess: () => { refetch(); onUpdated?.(); toast.success('Comment deleted'); }, onError: (e) => toast.error(e) }
  );

  return (
    <div className="space-y-4">
      {/* New comment */}
      <div className="flex gap-3">
        <Avatar src={currentUser?.avatar} name={currentUser?.name} size="sm" className="mt-1 shrink-0" />
        <div className="flex-1">
          <Textarea
            placeholder="Add a comment... Use @name to mention someone"
            value={text}
            onChange={e => setText(e.target.value)}
            className="min-h-[60px] text-sm"
          />
          {text && (
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => setText('')}>Cancel</Button>
              <Button size="sm" loading={loading} onClick={() => addComment(text)}>Comment</Button>
            </div>
          )}
        </div>
      </div>

      {/* Comments list */}
      {comments.map((c) => (
        <div key={c._id} className="flex gap-3 items-start">
          <Avatar src={c.author?.avatar} name={c.author?.name} size="sm" className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">{c.author?.name}</span>
              <span className="text-xs text-muted-foreground">{formatRelativeTime(c.createdAt)}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{c.content}</p>
          </div>
          {currentUser?._id === c.author?._id && (
            <div className="shrink-0">
              <Button size="sm" variant="ghost" className="text-destructive" loading={deletingComment} onClick={() => deleteComment(c._id)}>
                Delete
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Time Log Section ───────────────────────────────────
const TimeLogSection = ({ task, onUpdated }) => {
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');

  const { mutate: logTime, loading } = useMutation(
    ({ id, hours, note }) => tasksApi.logTime(id, { hours, description: note }),
    { onSuccess: () => { setHours(''); setNote(''); onUpdated?.(); toast.success('Time logged'); }, onError: (e) => toast.error(e) }
  );

  const totalLogged = task.timeLogs?.reduce((sum, l) => sum + l.hours, 0) || 0;
  const progress = task.estimatedHours ? Math.min(100, (totalLogged / task.estimatedHours) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Time Tracking</span>
        <span className="text-muted-foreground">{totalLogged}h / {task.estimatedHours || '?'}h estimated</span>
      </div>
      <Progress value={progress} />

      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Hours"
          value={hours}
          onChange={e => setHours(e.target.value)}
          className="w-24"
          min="0.5"
          step="0.5"
        />
        <Input placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} className="flex-1" />
        <Button size="sm" loading={loading} disabled={!hours || !task?._id} onClick={() => {
          if (!task?._id) { toast.error('Task id missing'); return; }
          logTime({ id: task._id, hours: parseFloat(hours), note });
        }}>
          Log
        </Button>
      </div>

      {task.timeLogs?.map((log, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <Avatar src={log.user?.avatar} name={log.user?.name} size="sm" />
          <span className="font-medium">{log.hours}h</span>
          <span className="text-muted-foreground flex-1 truncate">{log.description || log.note || 'No note'}</span>
          <span className="text-xs text-muted-foreground">{formatDate(log.date)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Checklist Section ──────────────────────────────────
const ChecklistSection = ({ task, onUpdated }) => {
  const [newItem, setNewItem] = useState('');

  const checklist = task.checklist || [];
  const completed = checklist.filter(c => c.completed).length;

  const { mutate: updateTask } = useMutation(
    (checklist) => tasksApi.update(task._id, { checklist }),
    { onSuccess: onUpdated, onError: (e) => toast.error(e) }
  );

  const toggle = (i) => {
    const next = checklist.map((item, idx) => idx === i ? { ...item, completed: !item.completed } : item);
    updateTask(next);
  };
  const addItem = () => {
    if (!newItem.trim()) return;
    updateTask([...checklist, { text: newItem.trim(), completed: false }]);
    setNewItem('');
  };
  const deleteItem = (i) => {
    updateTask(checklist.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Checklist</span>
        <span className="text-muted-foreground">{completed}/{checklist.length}</span>
      </div>
      {checklist.length > 0 && <Progress value={checklist.length ? (completed / checklist.length) * 100 : 0} />}

      {checklist.map((item, i) => (
        <div key={i} className="flex items-center gap-2 group">
          <Checkbox checked={item.completed} onChange={() => toggle(i)} />
          <span className={cn('flex-1 text-sm', item.completed && 'line-through text-muted-foreground')}>{item.text}</span>
          <button onClick={() => deleteItem(i)} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <Input
          placeholder="Add checklist item..."
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          className="text-sm"
        />
        <Button size="sm" onClick={addItem} disabled={!newItem.trim()}>Add</Button>
      </div>
    </div>
  );
};

// ─── Task Modal ─────────────────────────────────────────
export const TaskModal = ({ task, isNew, defaultStatus, projectId, onClose, onUpdated }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [localTask, setLocalTask] = useState(task || null);
  const currentUser = useSelector(selectUser);

  const toInputDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().slice(0, 16);
  };

  const { data } = useQuery(() => projectsApi.getAll({ limit: 50 }), []);
  const { data: usersData } = useQuery(() => usersApi.getAll({ limit: 100 }), []);
  const projects = data?.data || [];

  // watch selected project from form (for new tasks) or use current projectId
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: task 
      ? { 
          ...task, 
          startDate: toInputDateTime(task.startDate),
          dueDate: toInputDateTime(task.dueDate),
          sprint: task.sprint && typeof task.sprint === 'object' ? task.sprint._id : (task.sprint || ''),
          project: task.project && typeof task.project === 'object' ? task.project._id : (task.project || projectId)
        } 
      : { status: defaultStatus || 'todo', priority: 'medium', project: projectId, sprint: '' },
  });

  const selectedProjectId = watch('project') || projectId || (task?.project && (typeof task.project === 'object' ? task.project._id : task.project)) || (localTask?.project && (typeof localTask.project === 'object' ? localTask.project._id : localTask.project));

  // Load sprints for the selected project
  const { data: sprintsData } = useQuery(
    () => selectedProjectId ? sprintsApi.list({ project: selectedProjectId, limit: 100 }) : Promise.resolve({ data: [] }),
    [selectedProjectId]
  );
  const sprints = sprintsData?.data || sprintsData?.sprints || [];

  // Show all available users for assignment (system-wide)
  // Backend returns { success: true, data: [users...] }
  const users = usersData?.data || [];

  const [selectedAssignees, setSelectedAssignees] = useState(() => (task?.assignees?.map(a => a._id) || []));
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const assigneeRef = useRef(null);

  // Keep selectedAssignees in sync when task prop updates (e.g., opening existing task)
  useEffect(() => {
    setSelectedAssignees(task?.assignees?.map(a => a._id) || []);
  }, [task]);

  useEffect(() => {
    setValue('assignees', selectedAssignees);
  }, [selectedAssignees, setValue]);

  // close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target)) {
        setShowAssigneeDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Keep sprint in sync when sprints or task loads
  useEffect(() => {
    if (task && sprints.length > 0) {
      const sprintId = task.sprint && typeof task.sprint === 'object' ? task.sprint._id : (task.sprint || '');
      setValue('sprint', sprintId);
    }
  }, [sprints, task, setValue]);

  const { mutate: createTask, loading: creating } = useMutation(
    (data) => tasksApi.create(data),
    {
      onSuccess: (d) => { toast.success('Task created!'); onUpdated?.(d.data || d.task); onClose(); },
      onError: (e) => toast.error(e),
    }
  );

  const { mutate: updateTask, loading: updating } = useMutation(
    (data) => tasksApi.update(task._id, data),
    {
      onSuccess: (d) => { setLocalTask(d.data || d.task); onUpdated?.(d.data || d.task); toast.success('Task updated'); },
      onError: (e) => toast.error(e),
    }
  );

  const refreshTask = async () => {
    const id = task?._id || localTask?._id;
    if (!id) return;
    try {
      const res = await tasksApi.getOne(id);
      const t = res.data || res.task || res;
      setLocalTask(t);
      // update form inputs to reflect latest values
      setValue('startDate', toInputDateTime(t.startDate));
      setValue('dueDate', toInputDateTime(t.dueDate));
      setValue('title', t.title || '');
      setValue('description', t.description || '');
      setValue('assignees', t.assignees?.map(a => a._id) || []);
    } catch (e) {
      // ignore
    }
  };

  const onSubmit = (data) => {
    const payload = {
      ...data,
      project: projectId || data.project,
      sprint: data.sprint === "" ? null : data.sprint,
      estimatedHours: data.estimatedHours ? parseFloat(data.estimatedHours) : undefined
    };
    // include assignees selected via the multi-select
    payload.assignees = selectedAssignees || [];
    if (isNew) createTask(payload);
    else updateTask(payload);
  };

  const tabs = [
    { value: 'details', label: 'Details' },
    { value: 'checklist', label: `Checklist ${localTask?.checklist?.length ? `(${localTask.checklist.length})` : ''}` },
    { value: 'comments', label: `Comments ${localTask?.commentsCount ? `(${localTask.commentsCount})` : ''}` },
    { value: 'time', label: 'Time' },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={isNew ? 'Create Task' : undefined}
    >
      <div className="flex flex-col gap-4">
        {!isNew && localTask && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">{localTask.taskKey}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColor(localTask.status))}>{localTask.status}</span>
          </div>
        )}

        {!isNew && <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />}

        <form id="task-form" onSubmit={handleSubmit(onSubmit)}>
          {(isNew || activeTab === 'details') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 items-stretch">
              {/* Left: main fields */}
              <div className="md:col-span-2 flex flex-col space-y-4 h-full">
                <FormField label="Title" error={errors.title?.message} required>
                  <Input placeholder="Task title..." {...register('title')} />
                </FormField>
                <FormField label="Description" className="flex-1 flex flex-col">
                  <Textarea 
                    placeholder="Describe the task in detail..." 
                    className="flex-1 min-h-[220px] md:min-h-[320px] resize-none"
                    {...register('description')} 
                  />
                </FormField>
              </div>

              {/* Right: metadata */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Status">
                    <Select {...register('status')}>
                      <option value="todo">To Do</option>
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="in-review">In Review</option>
                      <option value="completed">Completed</option>
                    </Select>
                  </FormField>
                  <FormField label="Priority">
                    <Select {...register('priority')}>
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🟠 High</option>
                      <option value="critical">🔴 Critical</option>
                    </Select>
                  </FormField>
                </div>

                <FormField label="Sprint" error={errors.sprint?.message}>
                  <Select {...register('sprint')}>
                    <option value="">No Sprint (Backlog)</option>
                    {sprints.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Assignees">
                  <div className="relative" ref={assigneeRef}>
                    <button type="button" onClick={() => setShowAssigneeDropdown(s => !s)} className="flex items-center gap-2 w-full p-2 border rounded-md text-sm text-left">
                      <div className="flex -space-x-2 mr-2">
                        {selectedAssignees.length === 0 ? (
                          <div className="flex items-center text-sm text-muted-foreground">Unassigned</div>
                        ) : (
                          selectedAssignees.slice(0, 4).map(id => {
                            const u = users.find(x => x._id === id);
                            if (!u) return null;
                            return <Avatar key={id} src={u.avatar} name={u.name} size="xs" className="ring-1 ring-background" />;
                          })
                        )}
                      </div>
                      <div className="flex-1 truncate">
                        {selectedAssignees.length === 0 ? 'Assign to...' : `${selectedAssignees.length} member${selectedAssignees.length>1?'s':''}`}
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>

                    {showAssigneeDropdown && (
                      <div className="absolute z-40 mt-2 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                        {users.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground">No members</div>
                        ) : (
                          users.map(u => (
                            <label key={u._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer">
                              <input type="checkbox" checked={selectedAssignees.includes(u._id)} onChange={() => {
                                setSelectedAssignees(prev => prev.includes(u._id) ? prev.filter(id => id !== u._id) : [...prev, u._id]);
                              }} className="form-checkbox h-4 w-4" />
                              <Avatar src={u.avatar} name={u.name} size="sm" />
                              <div className="flex-1 text-sm">
                                <div className="font-medium">{u.name}</div>
                                <div className="text-xs text-muted-foreground">{u.email}</div>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </FormField>

                {isNew && !projectId && (
                  <FormField label="Project" error={errors.project?.message}>
                    <Select {...register('project')}>
                      <option value="">Select project...</option>
                      {projects?.map(p => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </Select>
                  </FormField>
                )}

                <FormField label="Start Date">
                  <Input type="datetime-local" {...register('startDate')} />
                </FormField>
                <FormField label="Due Date">
                  <Input type="datetime-local" {...register('dueDate')} />
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Estimated Hours">
                    <Input type="number" min="0" step="0.5" placeholder="0" {...register('estimatedHours', { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Story Points">
                    <Input type="number" min="0" placeholder="0" {...register('storyPoints', { valueAsNumber: true })} />
                  </FormField>
                </div>
              </div>
            </div>
          )}
        </form>

        {!isNew && activeTab === 'checklist' && localTask && (
          <ChecklistSection task={localTask} onUpdated={refreshTask} />
        )}
        {!isNew && activeTab === 'comments' && localTask && (
          <CommentsSection taskId={localTask._id} onUpdated={refreshTask} />
        )}
        {!isNew && activeTab === 'time' && localTask && (
          <TimeLogSection task={localTask} onUpdated={refreshTask} />
        )}

        {/* Footer */}
        {(isNew || activeTab === 'details') && (
          <div className="flex justify-end gap-2 pt-2 border-t mt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="task-form" loading={creating || updating}>
              {isNew ? 'Create Task' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ─── Tasks List Page ────────────────────────────────────
export const TasksPage = () => {
  const navigate = useNavigate();
  const [selectedTask, setSelectedTask] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [page, setPage] = useState(1);

  const { data, loading, refetch } = useQuery(
    () => tasksApi.getAll({ ...filters, page, limit: 20 }),
    [JSON.stringify(filters), page]
  );
  const tasks = data?.data || data?.tasks || [];

  const columns = [
    { key: 'taskKey', label: 'Key', className: 'w-24', render: (v) => <span className="text-xs font-mono text-muted-foreground">{v}</span> },
    {
      key: 'title', label: 'Title',
      render: (v, row) => (
        <div>
          <p className="font-medium text-sm">{v}</p>
          <p className="text-xs text-muted-foreground">{row.project?.name}</p>
        </div>
      )
    },
    {
      key: 'status', label: 'Status',
      render: (v) => <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColor(v))}>{v}</span>
    },
    {
      key: 'priority', label: 'Priority',
      render: (v) => <span className={cn('text-xs px-2 py-0.5 rounded border font-medium', priorityColor(v))}>{v}</span>
    },
    {
      key: 'assignees', label: 'Assignee',
      render: (v) => v?.length > 0 ? (
        <div className="flex -space-x-1">
          {v.slice(0, 2).map(a => <Avatar key={a._id} src={a.avatar} name={a.name} size="sm" className="ring-1 ring-background" />)}
        </div>
      ) : <span className="text-xs text-muted-foreground">Unassigned</span>
    },
    { key: 'dueDate', label: 'Due Date', render: (v) => v ? <span className={cn('text-xs', new Date(v) < new Date() ? 'text-red-500' : 'text-muted-foreground')}>{formatDate(v)}</span> : '—' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">{data?.pagination?.total || data?.total || 0} tasks total</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <Input placeholder="Search tasks..." className="pl-9 w-48"
            value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        </div>
        <Select className="w-32" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="in-review">In Review</option>
          <option value="completed">Completed</option>
        </Select>
        <Select className="w-32" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
          <option value="">All Priority</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>{columns.map(c => <th key={c.key} className="px-4 py-3 text-left font-medium text-muted-foreground">{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {tasks.length > 0 ? tasks.map(task => (
                <tr key={task._id} onClick={() => setSelectedTask(task)} className="border-b hover:bg-muted/50 cursor-pointer transition-colors">
                  {columns.map(c => (
                    <td key={c.key} className="px-4 py-3">
                      {c.render ? c.render(task[c.key], task) : task[c.key]}
                    </td>
                  ))}
                </tr>
              )) : (
                <tr><td colSpan={columns.length} className="py-12 text-center text-muted-foreground">No tasks found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdated={refetch} />
      )}
      {createOpen && (
        <TaskModal isNew onClose={() => setCreateOpen(false)} onUpdated={refetch} />
      )}
    </div>
  );
};
