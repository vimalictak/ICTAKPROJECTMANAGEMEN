import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { FolderKanban, CheckSquare, Zap, TrendingUp, AlertCircle, Clock, Users, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Badge, Button, Progress, Avatar } from '../../components/ui/index';
import { useQuery } from '../../hooks/useQuery';
import { reportsApi, tasksApi, sprintsApi } from '../../api';
import { selectUser } from '../auth/authSlice';
import { formatRelativeTime, statusColor, priorityColor, cn } from '../../lib/utils';

const StatCard = ({ title, value, icon: Icon, trend, color, loading }) => (
  <Card>
    <CardContent className="p-5">
      {loading ? (
        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" /></div>
      ) : (
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value ?? '—'}</p>
            {trend && <p className={cn('text-xs mt-1', trend > 0 ? 'text-green-600' : 'text-red-600')}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last week
            </p>}
          </div>
          <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', color)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

const DashboardPage = () => {
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  const { data: dashboard, loading } = useQuery(() => reportsApi.getDashboard());
  const { data: recentTasks, loading: tasksLoading } = useQuery(() =>
    tasksApi.getAll({ limit: 5, assignee: user?._id, sort: '-updatedAt' })
  );
  const { data: sprints, loading: sprintsLoading } = useQuery(() =>
    sprintsApi.getAll({ status: 'active', limit: 3 })
  );

  const stats = dashboard?.stats || {};
  const tasksByStatus = dashboard?.tasksByStatus || [];
  const weeklyActivity = dashboard?.weeklyActivity || [];
  const teamWorkload = dashboard?.teamWorkload || [];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">Here's what's happening with your projects today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Projects" value={stats.activeProjects} icon={FolderKanban} color="bg-brand-500" loading={loading} trend={5} />
        <StatCard title="Open Tasks" value={stats.openTasks} icon={CheckSquare} color="bg-purple-500" loading={loading} trend={-2} />
        <StatCard title="Active Sprints" value={stats.activeSprints} icon={Zap} color="bg-orange-500" loading={loading} />
        <StatCard title="Team Members" value={stats.teamMembers} icon={Users} color="bg-teal-500" loading={loading} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-40 w-full" /> : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={weeklyActivity.length ? weeklyActivity : [
                  { day: 'Mon', completed: 4, created: 7 },
                  { day: 'Tue', completed: 6, created: 5 },
                  { day: 'Wed', completed: 8, created: 9 },
                  { day: 'Thu', completed: 5, created: 6 },
                  { day: 'Fri', completed: 10, created: 8 },
                  { day: 'Sat', completed: 3, created: 2 },
                  { day: 'Sun', completed: 1, created: 1 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#6366f1" radius={[3, 3, 0, 0]} name="Completed" />
                  <Bar dataKey="created" fill="#c7d2fe" radius={[3, 3, 0, 0]} name="Created" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tasks by status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-40 w-full" /> : (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={tasksByStatus.length ? tasksByStatus : [
                      { name: 'Todo', value: 12 }, { name: 'In Progress', value: 8 },
                      { name: 'Review', value: 5 }, { name: 'Done', value: 20 },
                    ]}
                    cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                    dataKey="value"
                  >
                    {(tasksByStatus.length ? tasksByStatus : [1,2,3,4]).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">My Recent Tasks</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')} className="gap-1 text-xs">
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {tasksLoading ? (
              Array.from({length:3}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : recentTasks?.tasks?.length > 0 ? (
              recentTasks.tasks.map((task) => (
                <div key={task._id} onClick={() => navigate(`/tasks/${task._id}`)}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', statusColor(task.status))}>{task.status}</span>
                      <span className="text-xs text-muted-foreground">{task.project?.name}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatRelativeTime(task.updatedAt)}</span>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground py-6">No tasks assigned to you</p>
            )}
          </CardContent>
        </Card>

        {/* Active sprints */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Active Sprints</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/sprints')} className="gap-1 text-xs">
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {sprintsLoading ? (
              Array.from({length:2}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : sprints?.sprints?.length > 0 ? (
              sprints.sprints.map((sprint) => {
                const daysLeft = Math.ceil((new Date(sprint.endDate) - new Date()) / (1000 * 60 * 60 * 24));
                const progress = sprint.completedPoints && sprint.totalPoints
                  ? Math.round((sprint.completedPoints / sprint.totalPoints) * 100) : 0;
                return (
                  <div key={sprint._id} onClick={() => navigate(`/sprints/${sprint._id}`)}
                    className="p-3 rounded-lg border cursor-pointer hover:border-primary transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{sprint.name}</p>
                        <p className="text-xs text-muted-foreground">{sprint.project?.name}</p>
                      </div>
                      {daysLeft <= 3 && daysLeft >= 0 && (
                        <Badge className="bg-orange-100 text-orange-700 text-xs">{daysLeft}d left</Badge>
                      )}
                    </div>
                    <Progress value={progress} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-sm text-muted-foreground py-6">No active sprints</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
