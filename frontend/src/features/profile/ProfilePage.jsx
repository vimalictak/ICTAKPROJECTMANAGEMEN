import { useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Camera, User, Mail, Phone, Building, MapPin, Globe, Lock, Shield, Activity } from 'lucide-react'
import { Card, CardHeader, CardContent, Button, Input, Label, Avatar, Badge, FormField, Spinner, Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/index.jsx'
import { usersApi, authApi } from '../../api/index.js'
import { fetchCurrentUser } from '../auth/authSlice.js'
import toast from 'react-hot-toast'
import { formatDate } from '../../lib/utils.js'

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  phone: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  timezone: z.string().optional(),
  bio: z.string().max(300).optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match", path: ['confirmPassword'],
})

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Kolkata',
  'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
]

export default function ProfilePage() {
  const dispatch = useDispatch()
  const { user } = useSelector(s => s.auth)
  const [activeTab, setActiveTab] = useState('profile')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      department: user?.department || '',
      designation: user?.designation || '',
      timezone: user?.timezone || 'UTC',
      bio: user?.bio || '',
    },
  })

  const passwordForm = useForm({ resolver: zodResolver(passwordSchema) })

  async function onProfileSubmit(data) {
    try {
      await usersApi.update(user._id, data)
      dispatch(fetchCurrentUser())
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    }
  }

  async function onPasswordSubmit(data) {
    try {
      await authApi.changePassword(data)
      passwordForm.reset()
      toast.success('Password changed successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed')
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file')
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be under 2MB')
    const formData = new FormData()
    formData.append('avatar', file)
    setUploading(true)
    try {
      await usersApi.uploadAvatar(user._id, formData)
      dispatch(fetchCurrentUser())
      toast.success('Avatar updated')
    } catch {
      toast.error('Avatar upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your personal information and account settings</p>
      </div>

      {/* Profile header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <Avatar
                src={user?.avatar}
                name={`${user?.firstName} ${user?.lastName}`}
                size="xl"
                className="h-24 w-24 text-2xl"
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {uploading ? <Spinner size="sm" className="text-white" /> : <Camera className="h-6 w-6 text-white" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-semibold text-foreground">{user?.firstName} {user?.lastName}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                {user?.roles?.map(role => (
                  <Badge key={role} variant="secondary" className="capitalize">{role}</Badge>
                ))}
              </div>
            </div>
            <div className="text-center sm:text-right text-sm text-muted-foreground">
              <p>Member since</p>
              <p className="font-medium text-foreground">{formatDate(user?.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-2" />Profile</TabsTrigger>
          <TabsTrigger value="security"><Lock className="h-4 w-4 mr-2" />Security</TabsTrigger>
          <TabsTrigger value="activity"><Activity className="h-4 w-4 mr-2" />Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader title="Personal Information" subtitle="Update your personal details" />
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="First Name" error={profileForm.formState.errors.firstName?.message}>
                    <Input {...profileForm.register('firstName')} icon={<User className="h-4 w-4" />} placeholder="First name" />
                  </FormField>
                  <FormField label="Last Name" error={profileForm.formState.errors.lastName?.message}>
                    <Input {...profileForm.register('lastName')} placeholder="Last name" />
                  </FormField>
                  <FormField label="Phone" error={profileForm.formState.errors.phone?.message}>
                    <Input {...profileForm.register('phone')} icon={<Phone className="h-4 w-4" />} placeholder="+1 (555) 000-0000" />
                  </FormField>
                  <FormField label="Timezone">
                    <select {...profileForm.register('timezone')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Department">
                    <Input {...profileForm.register('department')} icon={<Building className="h-4 w-4" />} placeholder="Engineering" />
                  </FormField>
                  <FormField label="Designation">
                    <Input {...profileForm.register('designation')} placeholder="Senior Developer" />
                  </FormField>
                </div>
                <FormField label="Bio">
                  <textarea
                    {...profileForm.register('bio')}
                    rows={3}
                    placeholder="Tell your team a bit about yourself..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </FormField>
                <div className="flex justify-end">
                  <Button type="submit" loading={profileForm.formState.isSubmitting}>Save Changes</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-6">
          <Card>
            <CardHeader title="Change Password" subtitle="Use a strong, unique password" />
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
                <FormField label="Current Password" error={passwordForm.formState.errors.currentPassword?.message}>
                  <Input {...passwordForm.register('currentPassword')} type="password" icon={<Lock className="h-4 w-4" />} placeholder="Current password" />
                </FormField>
                <FormField label="New Password" error={passwordForm.formState.errors.newPassword?.message}>
                  <Input {...passwordForm.register('newPassword')} type="password" placeholder="New password (min 8 chars)" />
                </FormField>
                <FormField label="Confirm New Password" error={passwordForm.formState.errors.confirmPassword?.message}>
                  <Input {...passwordForm.register('confirmPassword')} type="password" placeholder="Confirm new password" />
                </FormField>
                <Button type="submit" loading={passwordForm.formState.isSubmitting}>Update Password</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Active Sessions" subtitle="Manage where you're logged in" />
            <CardContent>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium text-foreground text-sm">Current Session</p>
                  <p className="text-xs text-muted-foreground">Last active: just now · This device</p>
                </div>
                <Badge variant="success" className="ml-auto">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader title="Recent Activity" subtitle="Your recent actions in ProjectFlow" />
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Activity log will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
