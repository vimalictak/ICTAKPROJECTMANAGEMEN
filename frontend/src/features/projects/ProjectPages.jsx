import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation, Outlet, useOutletContext } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Plus, Search, MoreHorizontal, Archive, Trash2, Users, BarChart3, FolderKanban, Settings, ExternalLink, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card, CardContent, CardHeader, CardTitle, Button, Input, Badge, Modal,
  FormField, Select, Skeleton, EmptyState, DropdownMenu, Avatar, Progress, Tabs
} from '../../components/ui/index';
import { useQuery, useMutation, usePaginatedQuery } from '../../hooks/useQuery';
import { projectsApi, usersApi } from '../../api';
import { statusColor, priorityColor, formatDate, cn } from '../../lib/utils';

const projectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  key: z.string().min(2).max(6).toUpperCase().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  visibility: z.enum(['private', 'internal', 'public']).default('internal'),
});

const ProjectCard = ({ project, onArchive, onDelete }) => {
  const navigate = useNavigate();
  const progress = project.taskStats
    ? Math.round((project.taskStats.completed / (project.taskStats.total || 1)) * 100)
    : 0;

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full"
        onClick={() => navigate(`/projects/${project._id}`)}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderKanban className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{project.name}</p>
                <p className="text-xs text-muted-foreground">{project.key}</p>
              </div>
            </div>
            <DropdownMenu
              trigger={<button onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-accent"><MoreHorizontal className="h-4 w-4" /></button>}
              items={[
                { label: 'Open Board', icon: FolderKanban, onClick: (e) => { navigate(`/projects/${project._id}/board`); } },
                { label: 'Stories', icon: ExternalLink, onClick: () => navigate(`/projects/${project._id}/stories`) },
                { label: 'Settings', icon: Settings, onClick: () => navigate(`/projects/${project._id}/settings`) },
                { separator: true },
                { label: 'Archive', icon: Archive, onClick: () => onArchive(project._id) },
                { label: 'Delete', icon: Trash2, onClick: () => onDelete(project._id), destructive: true },
              ]}
            />
          </div>

          {project.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
          )}

          <div className="flex items-center gap-2 mb-3">
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColor(project.status))}>
              {project.status}
            </span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium border', priorityColor(project.priority))}>
              {project.priority}
            </span>
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex -space-x-1.5">
              {project.members?.slice(0, 4).map((m) => (
                <Avatar key={m._id} src={m.user?.avatar} name={m.user?.name} size="sm" className="ring-2 ring-background" />
              ))}
              {project.members?.length > 4 && (
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs ring-2 ring-background">
                  +{project.members.length - 4}
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {project.taskStats?.total || 0} tasks
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const CreateProjectModal = ({ open, onClose, onCreated }) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm({ resolver: zodResolver(projectSchema) });
  const { mutate, loading } = useMutation((data) => projectsApi.create(data), {
    onSuccess: (data) => {
      const createdProject = data?.data || data?.project || data;
      if (!createdProject?._id) {
        toast.error('Project created, but response was invalid.');
        return;
      }
      toast.success('Project created!');
      reset();
      onCreated?.(createdProject);
      onClose();
    },
    onError: (err) => toast.error(err),
  });

  return (
    <Modal open={open} onClose={onClose} title="Create Project" size="lg">
      <form onSubmit={handleSubmit(mutate)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Project Name" error={errors.name?.message} required className="col-span-2">
            <Input placeholder="My Awesome Project" {...register('name')} />
          </FormField>
          <FormField label="Project Key" error={errors.key?.message}>
            <Input placeholder="PROJ" maxLength={6} style={{ textTransform: 'uppercase' }} {...register('key')} />
          </FormField>
          <FormField label="Priority" error={errors.priority?.message}>
            <Select {...register('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </FormField>
          <FormField label="Start Date">
            <Input type="date" {...register('startDate')} />
          </FormField>
          <FormField label="End Date">
            <Input type="date" {...register('endDate')} />
          </FormField>
          <FormField label="Visibility" className="col-span-2">
            <Select {...register('visibility')}>
              <option value="private">Private</option>
              <option value="internal">Internal</option>
              <option value="public">Public</option>
            </Select>
          </FormField>
          <FormField label="Description" className="col-span-2">
            <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" placeholder="Project description..." {...register('description')} />
          </FormField>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Project</Button>
        </div>
      </form>
    </Modal>
  );
};

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, loading, refetch } = useQuery(
    () => projectsApi.getAll({ search, status: statusFilter }),
    [search, statusFilter]
  );
  const projects = data?.data || [];

  const { mutate: archiveProject } = useMutation((id) => projectsApi.archive(id), {
    onSuccess: () => { toast.success('Project archived'); refetch(); },
    onError: (e) => toast.error(e),
  });
  const { mutate: deleteProject } = useMutation((id) => projectsApi.delete(id), {
    onSuccess: () => { toast.success('Project deleted'); refetch(); },
    onError: (e) => toast.error(e),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">{projects.length} projects</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search projects..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-36">
          <option value="">All Status</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="on-hold">On Hold</option>
          <option value="completed">Completed</option>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to get started with ProjectFlow."
          action={<Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Create Project</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onArchive={archiveProject}
              onDelete={deleteProject}
            />
          ))}
        </div>
      )}

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(p) => p?._id && navigate(`/projects/${p._id}`)}
      />
    </div>
  );
};

export const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('board');

  useEffect(() => {
    if (location.pathname.endsWith('/board')) setActiveTab('board')
    else if (location.pathname.endsWith('/backlog')) setActiveTab('backlog')
    else if (location.pathname.endsWith('/timeline')) setActiveTab('timeline')
    else if (location.pathname.endsWith('/stories')) setActiveTab('stories')
    else if (location.pathname.endsWith('/settings')) setActiveTab('settings')
    else if (location.pathname.endsWith('/members')) setActiveTab('members')
    else if (location.pathname.includes('/sprints')) setActiveTab('sprints')
    else setActiveTab('board')
  }, [location.pathname]);

  const { data, loading } = useQuery(() => projectsApi.getOne(projectId), [projectId]);
  const project = data?.data;

  if (loading) return <div className="p-6"><Skeleton className="h-32 w-full mb-4" /><Skeleton className="h-64 w-full" /></div>;
  if (!project) return <div className="p-6 text-center text-muted-foreground">Project not found</div>;

  const tabs = [
    { value: 'board', label: 'Board' },
    { value: 'backlog', label: 'Backlog' },
    { value: 'timeline', label: 'Timeline' },
    { value: 'sprints', label: 'Sprints' },
    { value: 'stories', label: 'Stories' },
    { value: 'members', label: 'Members' },
    { value: 'settings', label: 'Settings' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div className="border-b px-6 py-4 bg-background">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FolderKanban className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{project.name}</h1>
              <p className="text-xs text-muted-foreground">{project.key}</p>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColor(project.status))}>
                {project.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${projectId}/stories`)}>
              <BookOpen className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${projectId}/settings`)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={(t) => {
          setActiveTab(t);
          if (t === 'board') navigate(`/projects/${projectId}/board`);
          else if (t === 'backlog') navigate(`/projects/${projectId}/backlog`);
          else if (t === 'timeline') navigate(`/projects/${projectId}/timeline`);
          else if (t === 'sprints') navigate(`/projects/${projectId}/sprints`);
          else if (t === 'stories') navigate(`/projects/${projectId}/stories`);
          else if (t === 'members') navigate(`/projects/${projectId}/members`);
          else if (t === 'settings') navigate(`/projects/${projectId}/settings`);
        }} />
      </div>

      {/* Content based on tab */}
      <div className="flex-1 overflow-auto p-6">
        <Outlet context={{ project }} />
      </div>
    </div>
  );
};

const ProjectMembersTab = ({ project }) => {
  const { data, loading, refetch } = useQuery(() => projectsApi.getMembers(project._id), [project._id]);
  const members = data?.data?.members || [];

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('developer');

  // Fetch all users in organization/system to allow adding them
  const { data: usersData } = useQuery(() => usersApi.getAll({ limit: 100 }), []);
  const allUsers = usersData?.data || [];

  // Filter out users who are already project members
  const addableUsers = useMemo(() => {
    const memberUserIds = new Set(members.map(m => m.user?._id));
    return allUsers.filter(u => !memberUserIds.has(u._id));
  }, [allUsers, members]);

  const { mutate: removeMember } = useMutation((userId) => projectsApi.removeMember(project._id, userId), {
    onSuccess: () => { toast.success('Member removed'); refetch(); },
    onError: (e) => toast.error(e),
  });

  const { mutate: addMember, loading: adding } = useMutation(
    (data) => projectsApi.addMember(project._id, data),
    {
      onSuccess: () => {
        toast.success('Member added successfully');
        setAddModalOpen(false);
        setSelectedUserId('');
        setSelectedRole('developer');
        refetch();
      },
      onError: (e) => toast.error(e),
    }
  );

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }
    addMember({ userId: selectedUserId, role: selectedRole });
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Team Members ({members.length})</h2>
        <Button size="sm" className="gap-2" onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4" /> Add Member
        </Button>
      </div>
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No team members added yet. Click Add Member to invite someone.
          </div>
        ) : (
          members.map((m) => (
            <div key={m._id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <Avatar src={m.user?.avatar} name={m.user?.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{m.user?.name || 'Unknown User'}</p>
                <p className="text-xs text-muted-foreground">{m.user?.email || 'No email'}</p>
              </div>
              <Badge className="text-xs capitalize">{m.role}</Badge>
              {m.role !== 'owner' && (
                <Button variant="ghost" size="sm" onClick={() => removeMember(m.user?._id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Team Member">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <FormField label="Select User" required>
            <Select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
              <option value="">Select a user...</option>
              {addableUsers.map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Project Role" required>
            <Select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
              <option value="developer">Developer</option>
              <option value="manager">Manager</option>
              <option value="qa">QA</option>
              <option value="admin">Admin</option>
              <option value="client">Client</option>
            </Select>
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={adding}>Add Member</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const ProjectMembersRoute = () => {
  const { project } = useOutletContext();
  return <ProjectMembersTab project={project} />;
};
