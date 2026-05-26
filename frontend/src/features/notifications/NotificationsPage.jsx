import React, { useState } from 'react';
import { Bell, Check, CheckCheck, MessageSquare, Plus, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card, CardContent, CardHeader, CardTitle, Button, Badge, Skeleton,
  EmptyState, Input, Textarea, FormField, Select, Switch, Modal
} from '../../components/ui/index';
import { useQuery, useMutation } from '../../hooks/useQuery';
import { notificationsApi, feedbackApi } from '../../api';
import { useDispatch, useSelector } from 'react-redux';
import { markAllRead, markRead, selectNotifications, setNotifications } from './notificationsSlice';
import { formatRelativeTime, cn } from '../../lib/utils';

// ─── Notifications Page ─────────────────────────────────
export const NotificationsPage = () => {
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const { data, loading } = useQuery(() => notificationsApi.getAll({ limit: 50 }), [], {
    onSuccess: (d) => dispatch(setNotifications(d.notifications || [])),
  });

  const { mutate: readAll } = useMutation(() => notificationsApi.markAllAsRead(), {
    onSuccess: () => { dispatch(markAllRead()); toast.success('All marked as read'); },
  });

  const { mutate: readOne } = useMutation((id) => notificationsApi.markAsRead(id), {
    onSuccess: (_, id) => dispatch(markRead(id)),
  });

  const iconMap = {
    task_assigned: '📋',
    task_comment: '💬',
    sprint_ending: '⚡',
    deadline_approaching: '⏰',
    mention: '🔔',
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">Stay up to date with your team</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => readAll()} className="gap-2">
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => !n.isRead && readOne(n._id)}
              className={cn(
                'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                n.isRead ? 'bg-background' : 'bg-primary/5 border-primary/20'
              )}
            >
              <span className="text-xl">{iconMap[n.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(n.createdAt)}</p>
              </div>
              {!n.isRead && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Settings Page ──────────────────────────────────────
export const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [notifSettings, setNotifSettings] = useState({
    emailNotifications: true,
    taskAssignment: true,
    mentions: true,
    sprintUpdates: true,
    deadlineAlerts: true,
  });

  const sections = [
    { id: 'general', label: 'General' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
    { id: 'organization', label: 'Organization' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and workspace preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 shrink-0">
          <nav className="space-y-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                  activeSection === s.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent'
                )}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeSection === 'general' && (
            <Card>
              <CardHeader><CardTitle>Profile Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Full Name"><Input placeholder="John Doe" /></FormField>
                <FormField label="Email"><Input type="email" placeholder="you@example.com" /></FormField>
                <FormField label="Department"><Input placeholder="Engineering" /></FormField>
                <FormField label="Designation"><Input placeholder="Senior Developer" /></FormField>
                <FormField label="Timezone">
                  <Select>
                    <option>UTC</option>
                    <option>America/New_York</option>
                    <option>America/Los_Angeles</option>
                    <option>Europe/London</option>
                    <option>Asia/Kolkata</option>
                    <option>Asia/Tokyo</option>
                  </Select>
                </FormField>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Card>
              <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(notifSettings).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="text-xs text-muted-foreground">Receive notifications for this event</p>
                    </div>
                    <Switch checked={val} onChange={(v) => setNotifSettings(s => ({ ...s, [key]: v }))} />
                  </div>
                ))}
                <Button>Save Preferences</Button>
              </CardContent>
            </Card>
          )}

          {activeSection === 'security' && (
            <Card>
              <CardHeader><CardTitle>Security Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Current Password"><Input type="password" placeholder="••••••••" /></FormField>
                <FormField label="New Password"><Input type="password" placeholder="••••••••" /></FormField>
                <FormField label="Confirm New Password"><Input type="password" placeholder="••••••••" /></FormField>
                <Button>Change Password</Button>
              </CardContent>
            </Card>
          )}

          {activeSection === 'organization' && (
            <Card>
              <CardHeader><CardTitle>Organization Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Organization Name"><Input placeholder="Acme Corp" /></FormField>
                <FormField label="Organization Slug"><Input placeholder="acme-corp" /></FormField>
                <FormField label="Website"><Input placeholder="https://example.com" /></FormField>
                <Button>Save Organization</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Feedback Page ──────────────────────────────────────
export const FeedbackPage = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { data, loading, refetch } = useQuery(() => feedbackApi.getAll({}));
  const feedbacks = data?.feedbacks || [];

  const { mutate: submit, loading: submitting } = useMutation(
    (data) => feedbackApi.submit(data),
    { onSuccess: () => { setCreateOpen(false); setTitle(''); setDescription(''); refetch(); toast.success('Feedback submitted!'); }, onError: (e) => toast.error(e) }
  );

  const { mutate: convertToStory } = useMutation(
    (id) => feedbackApi.convertToStory(id),
    { onSuccess: () => { toast.success('Converted to story!'); refetch(); }, onError: (e) => toast.error(e) }
  );

  const statusColors = {
    new: 'bg-blue-100 text-blue-700',
    under_review: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    converted: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Feedback</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage client feedback and feature requests</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Submit Feedback
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : feedbacks.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No feedback yet"
          description="Submit your first feedback or feature request."
          action={<Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Submit Feedback</Button>}
        />
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb) => (
            <Card key={fb._id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm">{fb.title}</h3>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColors[fb.status] || 'bg-gray-100 text-gray-700')}>
                        {fb.status?.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{fb.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">By {fb.submittedBy?.name} • {formatRelativeTime(fb.createdAt)}</p>
                  </div>
                  {fb.status === 'accepted' && (
                    <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => convertToStory(fb._id)}>
                      Convert to Story
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Submit Feedback">
        <div className="space-y-4">
          <FormField label="Title" required>
            <Input placeholder="Brief title of your feedback" value={title} onChange={e => setTitle(e.target.value)} />
          </FormField>
          <FormField label="Description" required>
            <Textarea placeholder="Describe your feedback or feature request in detail..." value={description} onChange={e => setDescription(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={submitting} disabled={!title || !description} onClick={() => submit({ title, description })}>Submit</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─── Stories Page ───────────────────────────────────────
export const StoriesPage = () => {
  const { data, loading, refetch } = useQuery(() => import('../../api').then(m => m.storiesApi.getAll({})));
  const stories = data?.stories || [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Stories</h1>
          <p className="text-sm text-muted-foreground mt-1">Product backlog and user stories</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />New Story</Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : stories.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No stories yet"
          description="Create user stories to define your product backlog."
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
    </div>
  );
};
