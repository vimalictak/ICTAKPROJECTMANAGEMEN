import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card, CardContent, Button, Badge, Skeleton,
  EmptyState, Input, Textarea, FormField, Select, Modal
} from '../../components/ui/index';
import { useQuery, useMutation } from '../../hooks/useQuery';
import { storiesApi, projectsApi } from '../../api';
import { cn } from '../../lib/utils';

export const StoriesPage = () => {
  const { projectId } = useParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [storyPoints, setStoryPoints] = useState('');

  const { data: projectData } = useQuery(
    () => projectsApi.getOne(projectId),
    [projectId],
    { enabled: !!projectId }
  );
  const project = projectData?.data;

  const { data, loading, refetch } = useQuery(
    () => storiesApi.getAll(projectId ? { project: projectId } : {}),
    [projectId]
  );
  const stories = data?.data || [];

  const { mutate: createStory, loading: creating } = useMutation(
    (payload) => storiesApi.create(payload),
    {
      onSuccess: () => {
        setCreateOpen(false);
        setTitle('');
        setDescription('');
        setPriority('medium');
        setStoryPoints('');
        refetch();
        toast.success('Story created!');
      },
      onError: (e) => toast.error(e),
    }
  );

  const canCreate = Boolean(projectId && project?.organization);
  const createLabel = projectId
    ? project?.organization ? 'New Story' : 'Loading project...'
    : 'Open a project to create stories';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Stories</h1>
          <p className="text-sm text-muted-foreground mt-1">Product backlog and user stories</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={!canCreate} className="gap-2">
          <Plus className="h-4 w-4" />{createLabel}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : stories.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No stories yet"
          description={projectId ? 'Create user stories to define your product backlog.' : 'Browse stories across projects. Open a project to add new stories.'}
          action={projectId ? <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />New Story</Button> : null}
        />
      ) : (
        <div className="space-y-3">
          {stories.map((story) => (
            <Card key={story._id} className="hover:border-primary/50 cursor-pointer transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-sm mb-1">{story.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{story.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {story.storyPoints && <Badge variant="outline" className="text-xs">{story.storyPoints} pts</Badge>}
                    <Badge className={cn('text-xs', story.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700')}>
                      {story.priority}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Story" size="lg">
        <div className="space-y-4">
          <FormField label="Title" required>
            <Input placeholder="Story title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField label="Description">
            <Textarea placeholder="Describe the story" value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Priority">
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </FormField>
            <FormField label="Story Points">
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              loading={creating}
              disabled={!title || !canCreate}
              onClick={() => createStory({
                title,
                description,
                priority,
                storyPoints: storyPoints ? Number(storyPoints) : undefined,
                project: projectId,
                organization: project?.organization,
              })}
            >
              Create Story
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
