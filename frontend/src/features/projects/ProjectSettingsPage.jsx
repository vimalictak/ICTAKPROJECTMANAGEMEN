import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trash2, AlertTriangle, Settings, Users, Tag, Workflow } from 'lucide-react'
import { useQuery, useMutation } from '../../hooks/useQuery.js'
import { projectsApi } from '../../api/index.js'
import { Card, CardHeader, CardContent, Button, Input, Label, FormField, Badge, Spinner, Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/index.jsx'
import toast from 'react-hot-toast'

const projectSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  key: z.string().min(2).max(10).toUpperCase(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['planning', 'active', 'on-hold', 'completed', 'archived']),
  visibility: z.enum(['public', 'private', 'internal']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export default function ProjectSettingsPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [activeTab, setActiveTab] = useState('general')

  const { data: projectData, loading } = useQuery(() => projectsApi.get(projectId), [projectId])
  const project = projectData?.data

  const form = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: { priority: 'medium', status: 'active', visibility: 'private' },
  })

  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        key: project.key,
        description: project.description || '',
        priority: project.priority,
        status: project.status,
        visibility: project.visibility,
        startDate: project.startDate ? project.startDate.split('T')[0] : '',
        endDate: project.endDate ? project.endDate.split('T')[0] : '',
      })
    }
  }, [project])

  const { mutate: updateProject, loading: updating } = useMutation(
    data => projectsApi.update(projectId, data),
    { onSuccess: () => toast.success('Project updated'), onError: e => toast.error(e.response?.data?.message || 'Update failed') }
  )

  const { mutate: deleteProject, loading: deleting } = useMutation(
    () => projectsApi.delete(projectId),
    { onSuccess: () => { toast.success('Project deleted'); navigate('/projects') }, onError: () => toast.error('Delete failed') }
  )

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Project Settings</h1>
        <p className="text-muted-foreground text-sm">{project?.name}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general"><Settings className="h-4 w-4 mr-1" />General</TabsTrigger>
          <TabsTrigger value="members"><Users className="h-4 w-4 mr-1" />Members</TabsTrigger>
          <TabsTrigger value="workflow"><Workflow className="h-4 w-4 mr-1" />Workflow</TabsTrigger>
          <TabsTrigger value="danger"><AlertTriangle className="h-4 w-4 mr-1" />Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader title="General Settings" subtitle="Update core project information" />
            <CardContent>
              <form onSubmit={form.handleSubmit(updateProject)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Project Name" error={form.formState.errors.name?.message}>
                    <Input {...form.register('name')} placeholder="My Project" />
                  </FormField>
                  <FormField label="Project Key" error={form.formState.errors.key?.message}>
                    <Input {...form.register('key')} placeholder="PROJ" className="uppercase" />
                  </FormField>
                  <FormField label="Priority">
                    <select {...form.register('priority')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {['low','medium','high','critical'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Status">
                    <select {...form.register('status')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {['planning','active','on-hold','completed','archived'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Visibility">
                    <select {...form.register('visibility')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {['public','private','internal'].map(v => <option key={v} value={v} className="capitalize">{v}</option>)}
                    </select>
                  </FormField>
                  <div className="grid grid-cols-2 gap-2 sm:col-span-1">
                    <FormField label="Start Date">
                      <Input {...form.register('startDate')} type="date" />
                    </FormField>
                    <FormField label="End Date">
                      <Input {...form.register('endDate')} type="date" />
                    </FormField>
                  </div>
                </div>
                <FormField label="Description">
                  <textarea
                    {...form.register('description')}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Project description..."
                  />
                </FormField>
                <div className="flex justify-end">
                  <Button type="submit" loading={updating}>Save Changes</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <Card>
            <CardHeader title="Project Members" subtitle="Manage who has access to this project" />
            <CardContent>
              <div className="space-y-3">
                {project?.members?.map(m => (
                  <div key={m.user?._id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{m.user?.firstName} {m.user?.lastName}</p>
                      <p className="text-xs text-muted-foreground">{m.user?.email}</p>
                    </div>
                    <Badge variant="secondary" className="capitalize">{m.role}</Badge>
                  </div>
                )) || <p className="text-sm text-muted-foreground">No members found</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="mt-6">
          <Card>
            <CardHeader title="Workflow Configuration" subtitle="Customize project statuses and workflow" />
            <CardContent>
              <div className="space-y-3">
                {['Todo', 'Pending', 'In Progress', 'In Review', 'Completed'].map((col, i) => (
                  <div key={col} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <div className="h-3 w-3 rounded-full" style={{ background: ['#94a3b8','#f59e0b','#3b82f6','#8b5cf6','#10b981'][i] }} />
                    <span className="text-sm font-medium text-foreground flex-1">{col}</span>
                    <Badge variant="secondary" className="text-xs">Default</Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Custom workflow configuration coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="mt-6">
          <Card className="border-red-500/30">
            <CardHeader title="Danger Zone" subtitle="Irreversible and destructive actions" />
            <CardContent>
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                <h4 className="font-semibold text-red-600 flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" /> Delete Project
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Permanently delete this project and all its data. This action cannot be undone.
                </p>
                <div className="space-y-3">
                  <p className="text-sm text-foreground">Type <strong>{project?.name}</strong> to confirm:</p>
                  <Input
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder={project?.name}
                  />
                  <Button
                    variant="danger"
                    onClick={() => deleteProject()}
                    disabled={deleteConfirm !== project?.name}
                    loading={deleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Project
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
