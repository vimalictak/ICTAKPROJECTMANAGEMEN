import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Calendar, Search, Filter, Plus, CalendarRange, Clock, 
  ChevronRight, ChevronDown, User, AlertCircle, RefreshCw 
} from 'lucide-react';
import { 
  format, addDays, differenceInDays, startOfDay, endOfDay,
  eachDayOfInterval, isSameDay, isAfter, isBefore, parseISO, subDays,
  startOfWeek, endOfWeek, eachWeekOfInterval
} from 'date-fns';
import toast from 'react-hot-toast';
import { 
  Button, Input, Badge, Skeleton, Avatar, Tooltip, Select, Card, CardContent 
} from '../../components/ui/index';
import { useQuery, useMutation } from '../../hooks/useQuery';
import { tasksApi, projectsApi } from '../../api';
import { priorityColor, statusColor, formatDate, cn } from '../../lib/utils';
import { TaskModal } from '../tasks/TaskModal';

export default function TimelinePage() {
  const { projectId } = useParams();
  const [scale, setScale] = useState('weeks'); // 'weeks' | 'months'
  const [selectedTask, setSelectedTask] = useState(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [filters, setFilters] = useState({ search: '', assignee: '', priority: '', status: '' });
  const [groupBy, setGroupBy] = useState('none'); // 'none' | 'status' | 'priority'

  // Load project details
  const { data: projectData } = useQuery(() => projectsApi.getOne(projectId), [projectId]);
  const project = projectData?.data;

  // Load tasks
  const { data: tasksData, loading: tasksLoading, refetch: refetchTasks } = useQuery(
    () => tasksApi.getAll({ project: projectId, limit: 500 }),
    [projectId]
  );
  
  const tasks = useMemo(() => {
    return tasksData?.data || tasksData?.tasks || [];
  }, [tasksData]);

  // Load project members for filter dropdown
  const { data: membersData } = useQuery(() => projectsApi.getMembers(projectId), [projectId]);
  const members = membersData?.data?.members || [];

  // Filter tasks based on search & filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = !filters.search || 
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.taskKey.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesAssignee = !filters.assignee || 
        task.assignees?.some(a => a._id === filters.assignee);
      
      const matchesPriority = !filters.priority || 
        task.priority === filters.priority;
      
      const matchesStatus = !filters.status || 
        task.status === filters.status;

      return matchesSearch && matchesAssignee && matchesPriority && matchesStatus;
    });
  }, [tasks, filters]);

  // Separate tasks into dated and undated
  const { datedTasks, undatedTasks } = useMemo(() => {
    const dated = [];
    const undated = [];
    filteredTasks.forEach(task => {
      if (task.startDate || task.dueDate) {
        dated.push(task);
      } else {
        undated.push(task);
      }
    });
    return { datedTasks: dated, undatedTasks: undated };
  }, [filteredTasks]);

  // Quick schedule action for undated tasks
  const { mutate: quickSchedule } = useMutation(
    ({ id, startDate, dueDate }) => tasksApi.update(id, { startDate, dueDate }),
    {
      onSuccess: () => {
        toast.success('Task scheduled successfully');
        refetchTasks();
      },
      onError: (err) => {
        toast.error(`Scheduling failed: ${err}`);
      }
    }
  );

  const handleQuickSchedule = (task) => {
    const today = startOfDay(new Date());
    const threeDaysLater = addDays(today, 3);
    quickSchedule({
      id: task._id,
      startDate: today.toISOString(),
      dueDate: threeDaysLater.toISOString()
    });
  };

  // Determine timeline calendar range
  const { gridStart, gridEnd, calendarInterval } = useMemo(() => {
    const today = startOfDay(new Date());
    
    // Find min and max dates from tasks
    let minDate = today;
    let maxDate = addDays(today, 30);

    const dates = [];
    datedTasks.forEach(t => {
      if (t.startDate) dates.push(startOfDay(new Date(t.startDate)));
      if (t.dueDate) dates.push(startOfDay(new Date(t.dueDate)));
    });

    if (dates.length > 0) {
      const minTaskDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxTaskDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      // Pad by a few days for visual buffer
      minDate = subDays(minTaskDate, 3);
      maxDate = addDays(maxTaskDate, 7);
    } else {
      // Default padding
      minDate = subDays(today, 5);
      maxDate = addDays(today, 25);
    }

    // Align to start/end of weeks to keep columns aligned
    const alignedStart = startOfWeek(minDate, { weekStartsOn: 1 });
    const alignedEnd = endOfWeek(maxDate, { weekStartsOn: 1 });

    let interval = [];
    if (scale === 'weeks') {
      // List of all days
      interval = eachDayOfInterval({ start: alignedStart, end: alignedEnd });
    } else {
      // List of all weeks start dates
      interval = eachWeekOfInterval({ start: alignedStart, end: alignedEnd }, { weekStartsOn: 1 });
    }

    return {
      gridStart: alignedStart,
      gridEnd: alignedEnd,
      calendarInterval: interval
    };
  }, [datedTasks, scale]);

  // Compute total duration of grid in days and the visible column width
  const totalGridDays = useMemo(() => {
    return differenceInDays(gridEnd, gridStart) + 1;
  }, [gridStart, gridEnd]);

  const columnWidth = scale === 'weeks' ? 40 : 120;

  // Compute exact pixel width of the calendar grid columns
  const gridWidth = useMemo(() => {
    return calendarInterval.length * columnWidth;
  }, [calendarInterval.length, columnWidth]);

  // Group tasks if requested
  const groupedSections = useMemo(() => {
    if (groupBy === 'none') {
      return [{ id: 'all', title: 'Tasks', tasks: datedTasks }];
    }
    
    const groups = {};
    datedTasks.forEach(task => {
      const key = task[groupBy] || 'unassigned';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(task);
    });

    return Object.entries(groups).map(([key, val]) => ({
      id: key,
      title: key.toUpperCase().replace('-', ' '),
      tasks: val
    }));
  }, [datedTasks, groupBy]);


  // Render timeline bar helper
  const getTimelineBarStyles = (task) => {
    const today = startOfDay(new Date());
    const start = task.startDate
      ? startOfDay(new Date(task.startDate))
      : task.dueDate
      ? startOfDay(new Date(task.dueDate))
      : today;
    const end = task.dueDate ? startOfDay(new Date(task.dueDate)) : start;
    
    // Calculate difference relative to gridStart
    const startDiff = differenceInDays(start, gridStart);
    const durationDays = differenceInDays(end, start) + 1;
    const totalUnits = scale === 'weeks' ? totalGridDays : calendarInterval.length;
    const startUnits = scale === 'weeks' ? startDiff : startDiff / 7;
    const durationUnits = scale === 'weeks' ? durationDays : durationDays / 7;

    // Calculate percentage positioning
    let leftPercent = (startUnits / totalUnits) * 100;
    let widthPercent = (durationUnits / totalUnits) * 100;

    // Clamp values
    if (leftPercent < 0) {
      widthPercent = widthPercent + leftPercent;
      leftPercent = 0;
    }
    if (leftPercent + widthPercent > 100) {
      widthPercent = 100 - leftPercent;
    }
    if (widthPercent <= 0) {
      widthPercent = 1.5; // Minimum visible bar width
    }

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9 w-52 text-xs"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            />
          </div>

          {/* Member Filter */}
          <Select 
            className="h-9 w-40 text-xs" 
            value={filters.assignee} 
            onChange={e => setFilters(f => ({ ...f, assignee: e.target.value }))}
          >
            <option value="">All Assignees</option>
            {members.map(m => (
              <option key={m.user?._id} value={m.user?._id}>{m.user?.name}</option>
            ))}
          </Select>

          {/* Status Filter */}
          <Select 
            className="h-9 w-32 text-xs" 
            value={filters.status} 
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="in-review">In Review</option>
            <option value="completed">Completed</option>
          </Select>

          {/* Grouping */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Group By:</span>
            <Select 
              className="h-9 w-32 text-xs" 
              value={groupBy} 
              onChange={e => setGroupBy(e.target.value)}
            >
              <option value="none">No Grouping</option>
              <option value="status">Status</option>
              <option value="priority">Priority</option>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom/Scale Controls */}
          <div className="flex items-center rounded-lg bg-muted p-0.5 border">
            <button
              onClick={() => setScale('weeks')}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                scale === 'weeks' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Days
            </button>
            <button
              onClick={() => setScale('months')}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                scale === 'months' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Weeks
            </button>
          </div>

          <Button size="sm" className="h-9 gap-1.5" onClick={() => setNewTaskOpen(true)}>
            <Plus className="h-4 w-4" /> Add Task
          </Button>
          
          <Button size="sm" variant="outline" className="h-9 p-2.5" onClick={refetchTasks}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 bg-card border rounded-xl overflow-hidden flex flex-col min-h-[450px]">
        {tasksLoading ? (
          <div className="flex-1 flex flex-col justify-center items-center py-20 gap-3">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="w-48 h-4 text-center" />
          </div>
        ) : datedTasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <CalendarRange className="h-12 w-12 text-muted-foreground/60 mb-3" />
            <h3 className="text-base font-semibold">No scheduled tasks in this timeline</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Use filters or configure start and due dates for your tasks to visualize them here.
            </p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => setNewTaskOpen(true)}>
              <Plus className="h-4 w-4" /> Create Scheduled Task
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT SIDE PANEL - Tasks List */}
            <div className="w-72 shrink-0 border-r flex flex-col bg-muted/10">
              {/* Header column placeholder */}
              <div className="h-[73px] border-b bg-muted/20 flex items-center px-4 shrink-0 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                Task Name
              </div>
              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto divide-y">
                {groupedSections.map(section => (
                  <div key={section.id} className="flex flex-col">
                    {groupBy !== 'none' && (
                      <div className="bg-muted/30 px-3 py-1.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase border-b select-none">
                        {section.title} ({section.tasks.length})
                      </div>
                    )}
                    {section.tasks.map(task => (
                      <div 
                        key={task._id} 
                        onClick={() => setSelectedTask(task)}
                        className="h-12 px-4 flex items-center justify-between hover:bg-accent/40 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-mono truncate">{task.taskKey}</span>
                            <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-bold", statusColor(task.status))}>
                              {task.status}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-foreground truncate mt-0.5" title={task.title}>
                            {task.title}
                          </p>
                        </div>
                        {task.assignees?.length > 0 && (
                          <Avatar src={task.assignees[0].avatar} name={task.assignees[0].name} size="sm" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT SIDE PANEL - Timeline Grid */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="overflow-x-auto overflow-y-hidden flex-1">
                <div className="min-w-full" style={{ minWidth: gridWidth }}>
                  <div className="flex flex-col shrink-0">
                    <div className="flex h-9 border-b relative bg-muted/10">
                      {calendarInterval.map((date, index) => {
                        const isNewMonth = index === 0 || format(date, 'MMM') !== format(calendarInterval[index - 1], 'MMM');
                        const widthClass = scale === 'weeks' ? 'w-[40px]' : 'w-[120px]';
                        return (
                          <div
                            key={`m-${index}`}
                            className={cn(
                              "h-full shrink-0 border-r flex items-center px-2 text-[11px] font-bold text-foreground bg-muted/15",
                              widthClass
                            )}
                          >
                            {isNewMonth && format(date, 'MMMM yyyy')}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex h-9 relative">
                      {calendarInterval.map((date, index) => {
                        const widthClass = scale === 'weeks' ? 'w-[40px]' : 'w-[120px]';
                        const isToday = isSameDay(date, new Date());

                        return (
                          <div
                            key={`sub-${index}`}
                            className={cn(
                              "h-full shrink-0 border-r flex flex-col justify-center items-center text-[10px] text-muted-foreground font-medium",
                              widthClass,
                              isToday && "bg-primary/5 text-primary font-bold"
                            )}
                          >
                            {scale === 'weeks' ? (
                              <>
                                <span className="opacity-70">{format(date, 'EE').slice(0, 1)}</span>
                                <span className={cn("text-xs", isToday && "h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center mt-0.5")}>
                                  {format(date, 'd')}
                                </span>
                              </>
                            ) : (
                              <span>Week of {format(date, 'MMM dd')}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto overflow-x-hidden relative divide-y">
                    {groupedSections.map(section => (
                      <div key={`timeline-sec-${section.id}`} className="flex flex-col">
                        {groupBy !== 'none' && (
                          <div className="bg-muted/10 h-[29px] border-b" style={{ width: gridWidth }} />
                        )}

                        {section.tasks.map(task => {
                          const barStyle = getTimelineBarStyles(task);
                          const isCompleted = task.status === 'completed';

                          return (
                            <div
                              key={`timeline-row-${task._id}`}
                              className="h-12 relative flex items-center hover:bg-accent/10 transition-colors"
                              style={{ width: gridWidth }}
                            >
                              <div className="absolute inset-0 flex pointer-events-none">
                                {calendarInterval.map((_, idx) => (
                                  <div
                                    key={`line-${idx}`}
                                    className={cn(
                                      "h-full shrink-0 border-r border-border/40",
                                      scale === 'weeks' ? 'w-[40px]' : 'w-[120px]'
                                    )}
                                  />
                                ))}
                              </div>

                              <Tooltip
                                content={
                                  <div className="p-2 space-y-1 max-w-[220px]">
                                    <p className="font-semibold text-xs truncate">{task.title}</p>
                                    <p className="text-[10px] text-gray-300">
                                      📅 {formatDate(task.startDate)} - {formatDate(task.dueDate)}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <Badge className={cn("text-[9px] px-1 py-0", statusColor(task.status))}>
                                        {task.status}
                                      </Badge>
                                      <span className="text-[10px] text-gray-300">
                                        Progress: {task.progress}%
                                      </span>
                                    </div>
                                  </div>
                                }
                                side="top"
                                style={barStyle}
                                className="absolute h-6"
                              >
                                <div
                                  onClick={() => setSelectedTask(task)}
                                  className={cn(
                                    "w-full h-full rounded-md shadow-sm border flex items-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/40 active:scale-[0.99] transition-all",
                                    isCompleted
                                      ? "bg-green-500/10 border-green-500/30 text-green-700"
                                      : "bg-primary/10 border-primary/20 text-primary-foreground"
                                  )}
                                >
                                  <div
                                    style={{ width: `${task.progress || 0}%` }}
                                    className={cn(
                                      "absolute left-0 top-0 bottom-0 opacity-20 pointer-events-none transition-all",
                                      isCompleted ? "bg-green-500" : "bg-primary"
                                    )}
                                  />

                                  <span className="relative z-10 px-2 text-[10px] font-bold text-foreground truncate select-none">
                                    {task.progress > 0 && `${task.progress}% — `}{task.title}
                                  </span>
                                </div>
                              </Tooltip>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Undated Tasks Section */}
      {!tasksLoading && undatedTasks.length > 0 && (
        <Card className="border border-amber-200/50 bg-amber-50/10 dark:bg-amber-950/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3 text-amber-600 font-semibold text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Undated Tasks ({undatedTasks.length})</span>
            </div>
            
            <p className="text-xs text-muted-foreground mb-3">
              The following tasks are active but have no start or due dates. Select calendar to assign dates, or click Quick Schedule to set from today.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {undatedTasks.map(task => (
                <div key={task._id} className="p-3 border rounded-lg bg-card hover:shadow-sm transition-all flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground font-mono">{task.taskKey}</span>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-bold", priorityColor(task.priority))}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate mt-1">{task.title}</p>
                  </div>

                  <div className="flex gap-1.5">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-[10px] px-2 gap-1"
                      onClick={() => handleQuickSchedule(task)}
                    >
                      <Clock className="h-3.5 w-3.5" /> Quick Schedule
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 p-2"
                      onClick={() => setSelectedTask(task)}
                    >
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Modal Overlay */}
      {selectedTask && (
        <TaskModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
          onUpdated={() => {
            refetchTasks();
          }} 
        />
      )}

      {newTaskOpen && (
        <TaskModal
          isNew
          projectId={projectId}
          onClose={() => setNewTaskOpen(false)}
          onUpdated={() => {
            refetchTasks();
            setNewTaskOpen(false);
          }}
        />
      )}
    </div>
  );
}
