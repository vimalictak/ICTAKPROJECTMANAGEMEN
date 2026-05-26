import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date, format = 'MMM dd, yyyy') {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function formatRelativeTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function truncate(str, length = 50) {
  if (!str) return '';
  return str.length > length ? str.slice(0, length) + '...' : str;
}

export function priorityColor(priority) {
  const map = {
    critical: 'text-red-600 bg-red-50 border-red-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    low: 'text-green-600 bg-green-50 border-green-200',
  };
  return map[priority] || 'text-gray-600 bg-gray-50 border-gray-200';
}

export function statusColor(status) {
  const map = {
    'todo': 'text-gray-600 bg-gray-100',
    'pending': 'text-yellow-700 bg-yellow-100',
    'in-progress': 'text-blue-700 bg-blue-100',
    'in-review': 'text-purple-700 bg-purple-100',
    'completed': 'text-green-700 bg-green-100',
    'cancelled': 'text-red-700 bg-red-100',
    'active': 'text-blue-700 bg-blue-100',
    'inactive': 'text-gray-600 bg-gray-100',
    'planning': 'text-indigo-700 bg-indigo-100',
    'on-hold': 'text-orange-700 bg-orange-100',
  };
  return map[status] || 'text-gray-600 bg-gray-100';
}

export function roleColor(role) {
  const map = {
    'super-admin': 'text-red-700 bg-red-100',
    admin: 'text-purple-700 bg-purple-100',
    manager: 'text-blue-700 bg-blue-100',
    developer: 'text-indigo-700 bg-indigo-100',
    qa: 'text-teal-700 bg-teal-100',
    client: 'text-orange-700 bg-orange-100',
  };
  return map[role] || 'text-gray-700 bg-gray-100';
}

export function buildQueryString(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'pending', label: 'Pending' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'in-review', label: 'In Review' },
  { value: 'completed', label: 'Completed' },
];

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'developer', label: 'Developer' },
  { value: 'qa', label: 'QA' },
  { value: 'client', label: 'Client' },
];
