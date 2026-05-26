import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card, CardContent, Button, Input, Badge, Select, Modal, FormField,
  Skeleton, EmptyState, Avatar, DropdownMenu, Table, Pagination
} from '../../components/ui/index';
import { useQuery, useMutation, usePaginatedQuery } from '../../hooks/useQuery';
import { usersApi } from '../../api';
import { roleColor, formatDate, cn } from '../../lib/utils';

export const UsersPage = () => {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState(null);
  const { data, loading, refetch, page, setPage, search, setSearch } = usePaginatedQuery(
    (params) => usersApi.getAll(params)
  );
  const users = data || [];

  const { mutate: updateUser } = useMutation(
    ({ id, data }) => usersApi.updateUser(id, data),
    { onSuccess: () => { toast.success('User updated'); refetch(); }, onError: (e) => toast.error(e) }
  );

  const columns = [
    {
      key: 'name', label: 'User',
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <Avatar src={row.avatar} name={row.name} />
          <div>
            <p className="font-medium text-sm">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'roles', label: 'Role',
      render: (v) => (
        <div className="flex flex-wrap gap-1">
          {v?.map(r => <span key={r} className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', roleColor(r))}>{r}</span>)}
        </div>
      )
    },
    { key: 'department', label: 'Department', render: (v) => v || '—' },
    {
      key: 'isActive', label: 'Status',
      render: (v) => <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', v ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{v ? 'Active' : 'Inactive'}</span>
    },
    { key: 'lastLogin', label: 'Last Login', render: (v) => v ? formatDate(v) : 'Never' },
    {
      key: '_id', label: '', className: 'w-10',
      render: (v, row) => (
        <DropdownMenu
          trigger={<button className="p-1 rounded hover:bg-accent"><MoreHorizontal className="h-4 w-4" /></button>}
          items={[
            { label: 'View Profile', icon: UserCheck, onClick: () => navigate(`/users/${v}`) },
            {
              label: row.isActive ? 'Deactivate' : 'Activate',
              icon: row.isActive ? UserX : UserCheck,
              onClick: () => updateUser({ id: v, data: { isActive: !row.isActive } }),
            },
          ]}
        />
      )
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Team Members</h1>
          <p className="text-sm text-muted-foreground mt-1">{users.length} members</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Table columns={columns} data={users} loading={loading} emptyMessage="No users found" />
    </div>
  );
};
