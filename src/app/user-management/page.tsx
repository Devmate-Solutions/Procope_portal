'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FaUserPlus, 
  FaTrash, 
  FaEdit,
  FaUsers,
  FaShieldAlt
} from 'react-icons/fa';
import { getCurrentUser } from '@/lib/auth';
import AuthenticatedLayout from '../components/AuthenticatedLayout';
import Link from 'next/link';
import { Dialog } from '@headlessui/react';

interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'owner' | 'admin' | 'subadmin';
  agentIds?: string[];
  workspaceName?: string;
  createdAt?: string;
  lastLogin?: string;
  isActive?: boolean;
}

export default function UserManagementPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ email: '', displayName: '', role: 'subadmin' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user has admin or owner role
    if (user.role !== 'admin' && user.role !== 'owner') {
      router.push('/dashboard');
      return;
    }

    setCurrentUser(user);
    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Get auth token
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');
      const response = await fetch('https://func-retell425.azurewebsites.net/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setError(data.error || 'Failed to load users');
        setUsers([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userRole: string) => {
    if (!currentUser) return;

    // Prevent deletion based on role restrictions
    if (currentUser.role === 'admin' && userRole === 'owner') {
      alert('Admins cannot delete owners');
      return;
    }

    if (currentUser.id === userId) {
      alert('You cannot delete yourself');
      return;
    }

    if (confirm('Are you sure you want to delete this user?')) {
      try {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem('auth_token');
        if (!token) throw new Error('Not authenticated');
        const response = await fetch(`https://func-retell425.azurewebsites.net/api/users/${userId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        const data = await response.json();
        if (data.success) {
          setUsers(users.filter(user => user.id !== userId));
        } else {
          setError(data.error || 'Failed to delete user');
        }
      } catch (err: any) {
        console.error('Failed to delete user:', err);
        setError('Failed to delete user');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const canDeleteUser = (user: User) => {
    if (!currentUser) return false;

    // Owner can delete anyone except themselves
    if (currentUser.role === 'owner') {
      return user.id !== currentUser.id;
    }

    // Admin can delete admins and subadmins (except owners and themselves)
    if (currentUser.role === 'admin') {
      return user.role !== 'owner' && user.id !== currentUser.id;
    }

    return false;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'subadmin':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const openEditModal = (user: User) => {
    setEditUser(user);
    setEditForm({ email: user.email, displayName: user.displayName, role: user.role });
    setEditError(null);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditUser(null);
    setEditError(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');
      const response = await fetch(`https://func-retell425.azurewebsites.net/api/users/${editUser.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: editForm.email,
            displayName: editForm.displayName,
            role: editForm.role,
            agentIds: currentUser.agentIds || [],
            workspaceId: currentUser.workspaceId,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setUsers(users.map(u =>
          u.id === editUser.id
            ? {
                ...u,
                email: editForm.email,
                displayName: editForm.displayName,
                role: editForm.role as 'owner' | 'admin' | 'subadmin',
              }
            : u
        ));
        closeEditModal();
        fetchUsers();
      } else {
        setEditError(data.error || 'Failed to update user');
      }
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user');
    } finally {
      setEditLoading(false);
    }
  };

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <FaUsers className="h-6 w-6 text-[#1F4280]" />
                <h1 className="text-2xl font-bold text-[#1F4280]">User Management</h1>
              </div>
              <Link href="/add-user">
                <Button variant="default" size="default" className="flex items-center space-x-2">
                  <FaUserPlus className="h-4 w-4" />
                  <span>Add User</span>
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {/* User List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FaShieldAlt className="h-5 w-5" />
                <span>Workspace Users</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                  <p className="mt-2 text-gray-600">Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <FaUsers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-600 mb-6">Get started by adding your first user.</p>
                  <Link href="/add-user">
                    <Button variant="default" size="default" className="">
                      <FaUserPlus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Login
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={user.isActive ? 'default' : 'secondary'}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <Button variant="outline" size="sm" className="" onClick={() => openEditModal(user)}>
                              <FaEdit className="h-3 w-3" />
                            </Button>
                            {canDeleteUser(user) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id, user.role)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <FaTrash className="h-3 w-3" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Edit User Modal */}
      <Dialog open={isEditOpen} onClose={closeEditModal} className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="fixed inset-0 bg-black opacity-30" aria-hidden="true" />
          <div className="relative bg-white rounded-lg shadow-lg p-8 w-full max-w-md z-10">
            <Dialog.Title className="text-lg font-bold mb-4">Edit User</Dialog.Title>
            {editError && <div className="mb-2 text-red-600">{editError}</div>}
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input name="email" type="email" value={editForm.email} onChange={handleEditChange} className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Display Name</label>
                <input name="displayName" value={editForm.displayName} onChange={handleEditChange} className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select name="role" value={editForm.role} onChange={handleEditChange} className="w-full border rounded px-3 py-2">
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="subadmin">Sub Admin</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button type="button" onClick={closeEditModal} className="px-4 py-2 rounded bg-gray-200">Cancel</button>
                <button type="submit" disabled={editLoading} className="px-4 py-2 rounded bg-blue-600 text-white">{editLoading ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      </Dialog>
    </AuthenticatedLayout>
  );
}
