import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Play, CheckCircle, Zap, ChevronRight, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import {
  Card, CardContent, CardHeader, CardTitle, Button, Modal, FormField,
  Input, Textarea, Select, Badge, Skeleton, EmptyState, Progress, Tabs
} from '../../components/ui/index';
import { useQuery, useMutation } from '../../hooks/useQuery';
import { sprintsApi, projectsApi } from '../../api';
import { formatDate, statusColor, cn } from '../../lib/utils';

const sprintSchema = z.object({
  name: z.string().min(1, 'Sprint name is required'),
  goal: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  capacity: z.number().optional(),
  project: z.string().min(1, 'Project is required'),
});

const SprintCard = ({ sprint, onStart, onComplete, onClick }) => {
  const statusColors = {
    planning: 'text-gray-600 bg-gray-100',
    active: 'text-blue-700 bg-blue-100',
    completed: 'text-green-700 bg-green-100',
  };
  const daysLeft = Math.ceil((new Date(sprint.endDate) - new Date()) / (1000 * 60 * 60 * 24));
  const totalPoints = sprint.totalPoints || 0;
  const completedPoints = sprint.completedPoints || 0;
  const progress = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  return (
    <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={onClick}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">{sprint.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{sprint.project?.name}</p>
          </div>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColors[sprint.status])}>
            {sprint.status}
          </span>
        </div>

        {sprint.goal && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">🎯 {sprint.goal}</p>}

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <span>📅 {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}</span>
          {sprint.status === 'active' && daysLeft >= 0 && (
            <span className={daysLeft <= 3 ? 'text-orange-600 font-medium' : ''}>{daysLeft}d left</span>
          )}
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span>{completedPoints} / {totalPoints} pts</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">{sprint.taskCount || 0} tasks</div>
          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
            {sprint.status === 'planning' && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onStart(sprint._id)}>
                <Play className="h-3 w-3" /> Start
              </Button>
            )}
            {sprint.status === 'active' && (
              <Button size="sm" className="h-7 text-xs gap-1" onClick={() => onComplete(sprint._id)}>
                <CheckCircle className="h-3 w-3" /> Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const SprintsPage = () => {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, loading, refetch } = useQuery(() => sprintsApi.getAll({ status: statusFilter }), [statusFilter]);
  const sprints = data?.data || [];

  const { data: projectsData } = useQuery(() => projectsApi.getAll({ limit: 50 }), []);
  const projects = projectsData?.data || [];

  const { register, handleSubmit, formState: { errors }, reset } = useForm({ resolver: zodResolver(sprintSchema) });

  const { mutate: createSprint, loading: creating } = useMutation(
    (data) => sprintsApi.create(data),
    { onSuccess: () => { toast.success('Sprint created!'); reset(); setCreateOpen(false); refetch(); }, onError: (e) => toast.error(e) }
  );

  const { mutate: startSprint } = useMutation(
    (id) => sprintsApi.start(id),
    { onSuccess: () => { toast.success('Sprint started!'); refetch(); }, onError: (e) => toast.error(e) }
  );

  const { mutate: completeSprint } = useMutation(
    (id) => sprintsApi.complete(id, {}),
    { onSuccess: () => { toast.success('Sprint completed!'); refetch(); }, onError: (e) => toast.error(e) }
  );

  const tabs = [
    { value: '', label: 'All', count: sprints.length },
    { value: 'active', label: 'Active', count: sprints.filter(s => s.status === 'active').length },
    { value: 'planning', label: 'Planning', count: sprints.filter(s => s.status === 'planning').length },
    { value: 'completed', label: 'Completed', count: sprints.filter(s => s.status === 'completed').length },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sprints</h1>
          <p className="text-sm text-muted-foreground mt-1">{sprints.length} sprints</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Sprint
        </Button>
      </div>

      <Tabs tabs={tabs} activeTab={statusFilter} onChange={setStatusFilter} className="mb-6" />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      ) : sprints.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No sprints found"
          description="Create your first sprint to start managing your work."
          action={<Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Create Sprint</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sprints.map((sprint) => (
            <SprintCard
              key={sprint._id}
              sprint={sprint}
              onStart={startSprint}
              onComplete={completeSprint}
              onClick={() => navigate(`/sprints/${sprint._id}`)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Sprint" size="lg">
        <form onSubmit={handleSubmit(createSprint)} className="space-y-4">
          <FormField label="Sprint Name" error={errors.name?.message} required>
            <Input placeholder="Sprint 1" {...register('name')} />
          </FormField>
          <FormField label="Project" error={errors.project?.message} required>
            <Select {...register('project')}>
              <option value="">Select project...</option>
              {projects?.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Sprint Goal">
            <Textarea placeholder="What do we plan to achieve in this sprint?" {...register('goal')} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date" error={errors.startDate?.message} required>
              <Input type="date" {...register('startDate')} />
            </FormField>
            <FormField label="End Date" error={errors.endDate?.message} required>
              <Input type="date" {...register('endDate')} />
            </FormField>
            <FormField label="Capacity (points)">
              <Input type="number" placeholder="40" {...register('capacity', { valueAsNumber: true })} />
            </FormField>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>Create Sprint</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const SprintDetailPage = () => {
  const { id } = useParams();
  const { data, loading } = useQuery(() => sprintsApi.getOne(id), [id]);
  const { data: burndownData } = useQuery(() => sprintsApi.getBurndown(id), [id]);
  const sprint = data?.data;

  if (loading) return <div className="p-6"><Skeleton className="h-32 w-full mb-4" /><Skeleton className="h-64 w-full" /></div>;
  if (!sprint) return <div className="p-6 text-center text-muted-foreground">Sprint not found</div>;

  const chartData = burndownData?.data || Array.from({ length: 10 }, (_, i) => ({
    day: `Day ${i + 1}`,
    remaining: Math.max(0, (sprint.totalPoints || 20) - i * 2.5),
    ideal: Math.max(0, (sprint.totalPoints || 20) - (sprint.totalPoints || 20) / 9 * i),
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{sprint.name}</h1>
          <p className="text-sm text-muted-foreground">{sprint.project?.name}</p>
        </div>
        <span className={cn('ml-2 text-sm px-2.5 py-0.5 rounded-full font-medium', statusColor(sprint.status))}>
          {sprint.status}
        </span>
      </div>

      {sprint.goal && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-1">Sprint Goal</p>
            <p className="text-sm text-muted-foreground">{sprint.goal}</p>
          </CardContent>
        </Card>
      )}

      {/* Burndown chart */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Burndown Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="remaining" stroke="#6366f1" strokeWidth={2} name="Remaining" dot={false} />
              <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" name="Ideal" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: sprint.taskCount || 0 },
          { label: 'Completed', value: sprint.completedTaskCount || 0 },
          { label: 'Story Points', value: `${sprint.completedPoints || 0}/${sprint.totalPoints || 0}` },
          { label: 'Days Left', value: Math.max(0, Math.ceil((new Date(sprint.endDate) - new Date()) / (1000 * 60 * 60 * 24))) },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
