import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card, CardContent, Button, Input, Badge, Select, Modal, FormField,
  Skeleton, EmptyState, Avatar, DropdownMenu, Table, Pagination
} from '../../components/ui/index';
import { useQuery, useMutation, usePaginatedQuery } from '../../hooks/useQuery';
import { authApi, usersApi } from '../../api';
import { selectUser } from '../auth/authSlice';
import { roleColor, formatDate, cn } from '../../lib/utils';

export const UsersPage = () => {
  const navigate = useNavigate();
  const authUser = useSelector(selectUser);
  const [selectedUser, setSelectedUser] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'developer' });
  const { data, loading, refetch, page, setPage, search, setSearch } = usePaginatedQuery(
    (params) => usersApi.getAll(params)
  );
  const users = data || [];

  const { mutate: updateUser } = useMutation(
    ({ id, data }) => usersApi.updateUser(id, data),
    { onSuccess: () => { toast.success('User updated'); refetch(); }, onError: (e) => toast.error(e) }
  );

  const { mutate: createUser, loading: creatingUser } = useMutation(
    (data) => authApi.register(data),
    {
      onSuccess: () => {
        toast.success('User created');
        setCreateOpen(false);
        setNewUser({ name: '', email: '', password: '', role: 'developer' });
        refetch();
      },
      onError: (e) => toast.error(e),
    }
  );

  const handleCreateUser = async (event) => {
    event.preventDefault();
    createUser({
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      roles: [newUser.role],
      organizationId: authUser?.organization?._id || authUser?.organization,
    });
  };

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
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Table columns={columns} data={users} loading={loading} emptyMessage="No users found" />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Team Member" size="lg">
        <form className="space-y-4" onSubmit={handleCreateUser}>
          <FormField label="Full Name" required>
            <Input
              placeholder="Jane Doe"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            />
          </FormField>
          <FormField label="Email" required>
            <Input
              type="email"
              placeholder="jane@example.com"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
          </FormField>
          <FormField label="Password" required>
            <Input
              type="password"
              placeholder="********"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            />
          </FormField>
          <FormField label="Role" required>
            <Select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="developer">Developer</option>
              <option value="qa">QA</option>
              <option value="client">Client</option>
              <option value="viewer">Viewer</option>
            </Select>
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creatingUser}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UsersPage;
