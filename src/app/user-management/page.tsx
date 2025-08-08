"use client"

import { useEffect, useState } from 'react'
import { AuthenticatedLayout } from '@/app/components/AuthenticatedLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Users, UserPlus, Edit, Trash2, Key, Eye, EyeOff } from 'lucide-react'
import { getUsers, createUser, updateUser, deleteUser, resetUserPassword, getAgents } from '@/lib/aws-api'
import { getCurrentUser, getAccessiblePages, PAGE_ACCESS_TEMPLATES } from '@/lib/auth'

interface User {
  id?: string
  email: string
  displayName: string
  role: string
  agentIds: string[]
  allowedPages?: string[]
  accountEnabled: boolean
  workspaceId: string
  hasTemporaryPassword?: boolean
  createdAt?: string
  updatedAt?: string | null
}

const ROLES = [
  { value: 'user', label: 'User' },
  { value: 'subadmin', label: 'Sub Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' }
]

const PAGE_TEMPLATES = [
  { value: 'basic', label: 'Basic (Dashboard, Call History)' },
  { value: 'template1', label: 'Nomad (Dashboard, Analytics, Outbound, User Mgmt)' },
  { value: 'template2', label: 'Usman (Dashboard, Analytics, Outbound, User Mgmt)' },
  { value: 'scribe', label: 'Scribe (+ AI Transcription)' },
  { value: 'claims', label: 'Claims (+ Insurance Processing)' },
  { value: 'usermanage', label: 'User Management Only' }
]

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    user_email: '',
    display_name: '',
    role: 'user',
    agent_ids: [] as string[],
    allowed_pages: [] as string[],
    password: '',
    account_enabled: true
  })

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  const currentUser = getCurrentUser()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [usersData, agentsData] = await Promise.allSettled([
        getUsers(),
        getAgents()
      ])

      if (usersData.status === 'fulfilled') {
        setUsers(Array.isArray(usersData.value) ? usersData.value : usersData.value.users || [])
      }

      if (agentsData.status === 'fulfilled') {
        setAgents(Array.isArray(agentsData.value) ? agentsData.value : [])
      }

    } catch (error) {
      console.error('Failed to load data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      if (!formData.user_email || !formData.display_name) {
        setError('Email and display name are required')
        return
      }

      await createUser({
        email: formData.user_email,
        displayName: formData.display_name,
        role: formData.role,
        agentIds: formData.agent_ids,
        allowedPages: formData.allowed_pages,
        password: formData.password || undefined
      })

      setIsCreateDialogOpen(false)
      resetForm()
      loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create user')
    }
  }

  const handleUpdateUser = async () => {
    try {
      if (!selectedUser) return

      await updateUser(selectedUser.email, {
        display_name: formData.display_name,
        role: formData.role,
        agent_ids: formData.agent_ids,
        allowed_pages: formData.allowed_pages,
        account_enabled: formData.account_enabled
      })

      setIsEditDialogOpen(false)
      setSelectedUser(null)
      resetForm()
      loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update user')
    }
  }

  const handleDeleteUser = async (email: string) => {
    try {
      if (!confirm('Are you sure you want to delete this user?')) return

      await deleteUser(email)
      loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete user')
    }
  }

  const handleResetPassword = async () => {
    try {
      if (!selectedUser) return
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (passwordData.newPassword.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }

      await resetUserPassword(selectedUser.email, passwordData.newPassword, true)
      
      setIsPasswordDialogOpen(false)
      setSelectedUser(null)
      setPasswordData({ newPassword: '', confirmPassword: '' })
      loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to reset password')
    }
  }

  const resetForm = () => {
    setFormData({
      user_email: '',
      display_name: '',
      role: 'user',
      agent_ids: [],
      allowed_pages: [],
      password: '',
      account_enabled: true
    })
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      user_email: user.email,
      display_name: user.displayName,
      role: user.role,
      agent_ids: user.agentIds || [],
      allowed_pages: user.allowedPages || [],
      password: '',
      account_enabled: user.accountEnabled
    })
    setIsEditDialogOpen(true)
  }

  const openPasswordDialog = (user: User) => {
    setSelectedUser(user)
    setPasswordData({ newPassword: '', confirmPassword: '' })
    setIsPasswordDialogOpen(true)
  }

  const canManageUser = (user: User): boolean => {
    if (!currentUser) return false
    if (currentUser.role === 'owner') return true
    if (currentUser.role === 'admin' && user.role !== 'owner') return true
    return false
  }

  // Get available individual pages based on current user's permissions
  const getAvailablePages = () => {
    if (!currentUser || !currentUser.allowedPages) return []
    
    const availablePages = new Set<string>()
    
    // For each allowed page/template, expand to individual pages
    currentUser.allowedPages.forEach(allowedPage => {
      // Add the page itself
      availablePages.add(allowedPage)
      
      // If it's a template, add all pages from that template
      const template = PAGE_ACCESS_TEMPLATES[allowedPage as keyof typeof PAGE_ACCESS_TEMPLATES]
      if (template) {
        template.forEach(page => availablePages.add(page))
      }
    })
    
    // Remove duplicates: if both 'usermanage' and 'user-management' exist, keep only 'user-management'
    if (availablePages.has('usermanage') && availablePages.has('user-management')) {
      availablePages.delete('usermanage')
    }
    
    // Convert to array and create page objects with labels
    return Array.from(availablePages).map(page => ({
      value: page,
      label: getPageLabel(page)
    }))
  }

  // Get human-readable label for a page
  const getPageLabel = (page: string): string => {
    const pageLabels: { [key: string]: string } = {
      'dashboard': 'Dashboard',
      'call-history': 'Call History',
      'analytics': 'Analytics',
      'create-calls': 'Create Calls',
      'user-management': 'User Management',
      'scribe': 'Scribe',
      'scribe-history': 'Scribe History',
      'claims-archive': 'Claims Archive',
      'basic': 'Basic Access',
      'template1': 'All Access',
      'template2': 'All Access',
      'usermanage': 'User Management Only'
    }
    return pageLabels[page] || page.charAt(0).toUpperCase() + page.slice(1)
  }

  // Get available roles based on current user's role
  const getAvailableRoles = () => {
    if (!currentUser) return ROLES
    
    if (currentUser.role === 'owner') {
      return ROLES // Owner can assign any role
    } else if (currentUser.role === 'admin') {
      return ROLES.filter(role => role.value !== 'owner') // Admin cannot create owners
    } else if (currentUser.role === 'subadmin') {
      return ROLES.filter(role => !['owner', 'admin'].includes(role.value)) // Subadmin can only create users and subadmins
    } else {
      return ROLES.filter(role => role.value === 'user') // Users can only create users
    }
  }

  if (isLoading) {
    return (
      <AuthenticatedLayout requiredPage="user-management">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout requiredPage="user-management">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Manage users and their permissions
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true) }}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.user_email}
                      onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="password">Password (Optional)</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Leave empty for auto-generated"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Page Access</Label>
                  <div className="space-y-2 mt-2">
                    {getAvailablePages().length > 0 ? (
                      getAvailablePages().map((page) => (
                        <div key={page.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={page.value}
                            checked={formData.allowed_pages.includes(page.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  allowed_pages: [...formData.allowed_pages, page.value]
                                })
                              } else {
                                setFormData({
                                  ...formData,
                                  allowed_pages: formData.allowed_pages.filter(p => p !== page.value)
                                })
                              }
                            }}
                          />
                          <Label htmlFor={page.value} className="text-sm">
                            {page.label}
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        No pages available based on your permissions.
                      </p>
                    )}
                  </div>
                  {currentUser && (
                    <p className="text-xs text-gray-500 mt-2">
                      You can only assign pages that you have access to: {currentUser.allowedPages?.join(', ') || 'None'}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Agent Access</Label>
                  <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                    {agents.map((agent) => (
                      <div key={agent.agent_id} className="flex items-center space-x-2">
                        <Checkbox
                          id={agent.agent_id}
                          checked={formData.agent_ids.includes(agent.agent_id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                agent_ids: [...formData.agent_ids, agent.agent_id]
                              })
                            } else {
                              setFormData({
                                ...formData,
                                agent_ids: formData.agent_ids.filter(id => id !== agent.agent_id)
                              })
                            }
                          }}
                        />
                        <Label htmlFor={agent.agent_id} className="text-sm">
                          {agent.agent_name || agent.agent_id}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser}>
                    Create User
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.length > 0 ? (
                users.map((user) => (
                  <div key={user.email} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.displayName}</span>
                        <Badge variant={user.accountEnabled ? 'default' : 'secondary'}>
                          {user.accountEnabled ? 'Active' : 'Disabled'}
                        </Badge>
                        {user.hasTemporaryPassword && (
                          <Badge variant="outline">Temp Password</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{user.role}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Pages: {user.allowedPages?.join(', ') || 'None'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Agents: {user.agentIds?.length || 0} assigned
                      </div>
                    </div>
                    
                    {canManageUser(user) && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPasswordDialog(user)}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.email)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No users found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editEmail">Email</Label>
                  <Input
                    id="editEmail"
                    value={formData.user_email}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="editDisplayName">Display Name</Label>
                  <Input
                    id="editDisplayName"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editRole">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="editEnabled"
                    checked={formData.account_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, account_enabled: !!checked })}
                  />
                  <Label htmlFor="editEnabled">Account Enabled</Label>
                </div>
              </div>

              <div>
                <Label>Page Access</Label>
                <div className="space-y-2 mt-2">
                  {getAvailablePages().length > 0 ? (
                    getAvailablePages().map((page) => (
                      <div key={page.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${page.value}`}
                          checked={formData.allowed_pages.includes(page.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                allowed_pages: [...formData.allowed_pages, page.value]
                              })
                            } else {
                              setFormData({
                                ...formData,
                                allowed_pages: formData.allowed_pages.filter(p => p !== page.value)
                              })
                            }
                          }}
                        />
                        <Label htmlFor={`edit-${page.value}`} className="text-sm">
                          {page.label}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      No pages available based on your permissions.
                    </p>
                  )}
                </div>
                {currentUser && (
                  <p className="text-xs text-gray-500 mt-2">
                    You can only assign pages that you have access to: {currentUser.allowedPages?.join(', ') || 'None'}
                  </p>
                )}
              </div>

              <div>
                <Label>Agent Access</Label>
                <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                  {agents.map((agent) => (
                    <div key={agent.agent_id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${agent.agent_id}`}
                        checked={formData.agent_ids.includes(agent.agent_id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              agent_ids: [...formData.agent_ids, agent.agent_id]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              agent_ids: formData.agent_ids.filter(id => id !== agent.agent_id)
                            })
                          }
                        }}
                      />
                      <Label htmlFor={`edit-${agent.agent_id}`} className="text-sm">
                        {agent.agent_name || agent.agent_id}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateUser}>
                  Update User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Password Reset Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleResetPassword}>
                  Reset Password
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  )
}
