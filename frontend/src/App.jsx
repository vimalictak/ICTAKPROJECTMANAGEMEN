import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCurrentUser } from './features/auth/authSlice.js'
import AppLayout from './components/layout/AppLayout.jsx'
import { Spinner } from './components/ui/index.jsx'

// Auth pages — lazy loaded like others
const LoginPage = lazy(() => import('./features/auth/AuthPages.jsx').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./features/auth/AuthPages.jsx').then(m => ({ default: m.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('./features/auth/AuthPages.jsx').then(m => ({ default: m.ForgotPasswordPage })))

// Lazy-loaded feature pages
const DashboardPage     = lazy(() => import('./features/dashboard/DashboardPage.jsx'))
const ProjectsPage      = lazy(() => import('./features/projects/ProjectPages.jsx').then(m => ({ default: m.ProjectsPage })))
const ProjectDetailPage = lazy(() => import('./features/projects/ProjectPages.jsx').then(m => ({ default: m.ProjectDetailPage })))
const KanbanBoard       = lazy(() => import('./features/projects/KanbanBoard.jsx'))
const BacklogPage       = lazy(() => import('./features/projects/BacklogPage.jsx'))
const ProjectSettingsPage = lazy(() => import('./features/projects/ProjectSettingsPage.jsx'))
const TasksPage         = lazy(() => import('./features/tasks/TaskModal.jsx').then(m => ({ default: m.TasksPage })))
const SprintsPage       = lazy(() => import('./features/sprints/SprintsPage.jsx').then(m => ({ default: m.SprintsPage })))
const SprintDetailPage  = lazy(() => import('./features/sprints/SprintsPage.jsx').then(m => ({ default: m.SprintDetailPage })))
const StoriesPage       = lazy(() => import('./features/notifications/NotificationsPage.jsx').then(m => ({ default: m.StoriesPage })))
const NotificationsPage = lazy(() => import('./features/notifications/NotificationsPage.jsx').then(m => ({ default: m.NotificationsPage })))
const UsersPage         = lazy(() => import('./features/users/UsersPage.jsx'))
const ReportsPage       = lazy(() => import('./features/reports/ReportsPage.jsx'))
const CalendarPage      = lazy(() => import('./features/calendar/CalendarPage.jsx'))
const ProfilePage       = lazy(() => import('./features/profile/ProfilePage.jsx'))
const SettingsPage      = lazy(() => import('./features/notifications/NotificationsPage.jsx').then(m => ({ default: m.SettingsPage })))
const FeedbackPage      = lazy(() => import('./features/notifications/NotificationsPage.jsx').then(m => ({ default: m.FeedbackPage })))
const ResetPasswordPage = lazy(() => import('./features/auth/AuthPages.jsx').then(m => ({ default: m.ResetPasswordPage })))
const VerifyEmailPage   = lazy(() => import('./features/auth/AuthPages.jsx').then(m => ({ default: m.VerifyEmailPage })))

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useSelector(s => s.auth)
  if (loading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

// Public route wrapper (redirect if already logged in)
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useSelector(s => s.auth)
  if (loading) return <PageLoader />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

function PageLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 32 32" className="h-10 w-10">
            <rect width="32" height="32" rx="6" fill="#4f46e5"/>
            <path d="M8 8h10a6 6 0 010 12H8V8z" fill="white"/>
            <rect x="8" y="22" width="16" height="3" rx="1.5" fill="white" opacity="0.7"/>
          </svg>
          <span className="text-xl font-bold text-foreground">ProjectFlow</span>
        </div>
        <Spinner size="lg" />
      </div>
    </div>
  )
}

function SuspenseWrapper({ children }) {
  return (
    <Suspense fallback={
      <div className="flex h-full w-full items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    }>
      {children}
    </Suspense>
  )
}

export default function App() {
  const dispatch = useDispatch()
  const { loading } = useSelector(s => s.auth)

  useEffect(() => {
    dispatch(fetchCurrentUser())
  }, [dispatch])

  if (loading) return <PageLoader />

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password/:token" element={<PublicRoute><SuspenseWrapper><ResetPasswordPage /></SuspenseWrapper></PublicRoute>} />
      <Route path="/verify-email/:token" element={<SuspenseWrapper><VerifyEmailPage /></SuspenseWrapper>} />

      {/* Protected app routes */}
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<SuspenseWrapper><DashboardPage /></SuspenseWrapper>} />

        {/* Projects */}
        <Route path="projects" element={<SuspenseWrapper><ProjectsPage /></SuspenseWrapper>} />
        <Route path="projects/:projectId" element={<SuspenseWrapper><ProjectDetailPage /></SuspenseWrapper>} />
        <Route path="projects/:projectId/board" element={<SuspenseWrapper><KanbanBoard /></SuspenseWrapper>} />
        <Route path="projects/:projectId/backlog" element={<SuspenseWrapper><BacklogPage /></SuspenseWrapper>} />
        <Route path="projects/:projectId/sprints" element={<SuspenseWrapper><SprintsPage /></SuspenseWrapper>} />
        <Route path="projects/:projectId/sprints/:sprintId" element={<SuspenseWrapper><SprintDetailPage /></SuspenseWrapper>} />
        <Route path="projects/:projectId/stories" element={<SuspenseWrapper><StoriesPage /></SuspenseWrapper>} />
        <Route path="projects/:projectId/settings" element={<SuspenseWrapper><ProjectSettingsPage /></SuspenseWrapper>} />

        {/* Tasks */}
        <Route path="tasks" element={<SuspenseWrapper><TasksPage /></SuspenseWrapper>} />

        {/* Calendar */}
        <Route path="calendar" element={<SuspenseWrapper><CalendarPage /></SuspenseWrapper>} />

        {/* Team */}
        <Route path="users" element={<SuspenseWrapper><UsersPage /></SuspenseWrapper>} />

        {/* Reports */}
        <Route path="reports" element={<SuspenseWrapper><ReportsPage /></SuspenseWrapper>} />

        {/* Notifications */}
        <Route path="notifications" element={<SuspenseWrapper><NotificationsPage /></SuspenseWrapper>} />

        {/* Feedback */}
        <Route path="feedback" element={<SuspenseWrapper><FeedbackPage /></SuspenseWrapper>} />

        {/* Profile & Settings */}
        <Route path="profile" element={<SuspenseWrapper><ProfilePage /></SuspenseWrapper>} />
        <Route path="settings" element={<SuspenseWrapper><SettingsPage /></SuspenseWrapper>} />

        {/* 404 within app */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Root redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-20">
      <div className="text-6xl font-bold text-muted-foreground">404</div>
      <h2 className="text-2xl font-semibold text-foreground">Page not found</h2>
      <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
      <a href="/dashboard" className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
        Go to Dashboard
      </a>
    </div>
  )
}
