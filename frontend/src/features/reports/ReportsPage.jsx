import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, Select, Skeleton, Tabs } from '../../components/ui/index';
import { useQuery } from '../../hooks/useQuery';
import { reportsApi } from '../../api';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

export const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: summary, loading } = useQuery(() => reportsApi.getSummary({}));
  const { data: velocity } = useQuery(() => reportsApi.getVelocity({}));
  const { data: workload } = useQuery(() => reportsApi.getWorkload({}));

  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'velocity', label: 'Velocity' },
    { value: 'workload', label: 'Workload' },
    { value: 'burndown', label: 'Burndown' },
  ];

  const priorityData = summary?.data?.tasksByPriority || [];
  const velocityData = velocity?.data || [];
  const workloadData = workload?.data || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your team's performance and project health</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tasks by priority */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tasks by Priority</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-60 w-full" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={priorityData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {priorityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Sprint completion trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sprint Completion Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="sprint" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="completed" stroke="#6366f1" fill="#e0e7ff" name="Completed" />
                  <Area type="monotone" dataKey="planned" stroke="#8b5cf6" fill="transparent" strokeDasharray="5 5" name="Planned" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'velocity' && (
        <Card>
          <CardHeader>
            <CardTitle>Sprint Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="sprint" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="planned" fill="#c7d2fe" name="Planned" radius={[3, 3, 0, 0]} />
                <Bar dataKey="completed" fill="#6366f1" name="Completed" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 'workload' && (
        <Card>
          <CardHeader>
            <CardTitle>Team Workload</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workloadData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={60} />
                <Tooltip />
                <Legend />
                <Bar dataKey="tasks" fill="#6366f1" name="Tasks" radius={[0, 3, 3, 0]} />
                <Bar dataKey="hours" fill="#8b5cf6" name="Hours" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 'burndown' && (
        <div className="text-center py-16 text-muted-foreground">
          <p>Select a sprint to view its burndown chart</p>
          <p className="text-sm mt-1">Visit a sprint detail page for individual burndown charts</p>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
