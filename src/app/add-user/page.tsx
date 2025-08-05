'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  FaUserPlus, 
  FaArrowLeft,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaRandom
} from 'react-icons/fa';
import { getCurrentUser, getAccessiblePages, PAGE_ACCESS_TEMPLATES } from '@/lib/auth';
import { createUser, getAgents } from '@/lib/aws-api';
import Link from 'next/link';
import { AuthenticatedLayout } from '../components/AuthenticatedLayout';

interface AddUserForm {
  user_email: string;
  display_name: string;
  password: string;
  role: 'owner' | 'admin' | 'subadmin' | 'user';
  agent_ids: string[];
  allowed_pages: string[];
}

const PAGE_TEMPLATES = [
  { value: 'basic', label: 'Basic (Dashboard, Call History, Create Calls, Analytics)' },
  { value: 'template1', label: 'Template 1 (Dashboard, Analytics, Outbound, User Mgmt)' },
  { value: 'scribe', label: 'Scribe (+ AI Transcription)' },
  { value: 'claims', label: 'Claims (+ Insurance Processing)' },
  { value: 'usermanage', label: 'User Management Only' }
];

export default function AddUserPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [formData, setFormData] = useState<AddUserForm>({
    user_email: '',
    display_name: '',
    password: '',
    role: 'user',
    agent_ids: [],
    allowed_pages: [],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
    loadAgents();
  }, [router]);

  const loadAgents = async () => {
    try {
      const agentsData = await getAgents();
      setAgents(Array.isArray(agentsData) ? agentsData : []);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const handleInputChange = (field: keyof AddUserForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getAvailableRoles = () => {
    const roles = ['user'];
    if (currentUser.role === 'owner') {
      roles.push('subadmin', 'admin', 'owner');
    } else if (currentUser.role === 'admin') {
      roles.push('subadmin', 'admin');
    } else if (currentUser.role === 'subadmin') {
      roles.push('subadmin');
    }
    return roles;
  };

  const getInheritedPermissions = () => {
    if (!currentUser) return [];
    
    // Get current user's accessible pages
    const currentUserPages = getAccessiblePages(currentUser);
    
    // Filter based on role hierarchy - new user can have same or fewer permissions
    const availablePages = currentUserPages.filter(page => {
      // If creating a user with higher role, they can have more permissions
      if (formData.role === 'owner' && currentUser.role === 'owner') return true;
      if (formData.role === 'admin' && ['owner', 'admin'].includes(currentUser.role)) return true;
      if (formData.role === 'subadmin' && ['owner', 'admin', 'subadmin'].includes(currentUser.role)) return true;
      if (formData.role === 'user') return true;
      return false;
    });

    return availablePages;
  };

  const getInheritedAgents = () => {
    if (!currentUser || !currentUser.agentIds) return [];
    
    // New user gets same or subset of current user's agents
    return currentUser.agentIds;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Basic validation
    if (!formData.user_email || !formData.display_name || !formData.password) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    // Validate role permissions
    const availableRoles = getAvailableRoles();
    if (!availableRoles.includes(formData.role)) {
      setError('You do not have permission to create users with this role');
      setIsLoading(false);
      return;
    }

    try {
      // Use inherited permissions if none selected
      const finalAgentIds = formData.agent_ids.length > 0 ? formData.agent_ids : getInheritedAgents();
      const finalAllowedPages = formData.allowed_pages.length > 0 ? formData.allowed_pages : ['basic']; // Default to basic access

      // Create user using AWS API
      const result = await createUser({
        user_email: formData.user_email,
        display_name: formData.display_name,
        role: formData.role,
        agent_ids: finalAgentIds,
        allowed_pages: finalAllowedPages,
        password: formData.password,
      });

      if (result.success || result.user_email) {
        setSuccess('User added successfully!');
        setFormData({
          user_email: '',
          display_name: '',
          password: '',
          role: 'user',
          agent_ids: [],
          allowed_pages: [],
        });
      } else {
        setError(result.error || 'Failed to add user');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add user');
    } finally {
      setIsLoading(false);
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
                <Link href="/user-management">
                  <Button variant="outline" size="sm" className="">
                    <FaArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <FaUserPlus className="h-6 w-6 text-[#1F4280]" />
                <h1 className="text-2xl font-bold text-[#1F4280]">Add New User</h1>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
              {success}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="user_email">Email *</Label>
                  <Input
                    id="user_email"
                    type="email"
                    value={formData.user_email}
                    onChange={(e) => handleInputChange('user_email', e.target.value)}
                    placeholder="Enter email"
                    required
                  />
                </div>
                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => handleInputChange('display_name', e.target.value)}
                    placeholder="Enter display name"
                    required
                  />
                </div>
                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select value={formData.role} onValueChange={(value: 'owner' | 'admin' | 'subadmin' | 'user') => handleInputChange('role', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="subadmin">Sub Admin</SelectItem>
                      {(currentUser.role === 'owner' || currentUser.role === 'admin') && (
                        <SelectItem value="admin">Admin</SelectItem>
                      )}
                      {currentUser.role === 'owner' && (
                        <SelectItem value="owner">Owner</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    {currentUser.role === 'owner'
                      ? 'Owners can create Owner, Admin, Sub Admin, and User accounts'
                      : currentUser.role === 'admin'
                      ? 'Admins can create Admin, Sub Admin, and User accounts'
                      : 'You can only create Sub Admin and User accounts'
                    }
                  </p>
                </div>
                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Enter password"
                      required
                      className="pr-20"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        className="h-8 w-8 p-0"
                      >
                        {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={generateRandomPassword}
                        className="h-8 w-8 p-0"
                        title="Generate random password"
                      >
                        <FaRandom className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    Password must be at least 8 characters long
                  </p>
                </div>

                {/* Page Access Templates */}
                <div className="space-y-2">
                  <Label>Page Access Templates</Label>
                  <div className="space-y-2 mt-2">
                    {PAGE_TEMPLATES.map((template) => (
                      <div key={template.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={template.value}
                          checked={formData.allowed_pages.includes(template.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                allowed_pages: [...formData.allowed_pages, template.value]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                allowed_pages: formData.allowed_pages.filter(p => p !== template.value)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={template.value} className="text-sm">
                          {template.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">
                    {formData.allowed_pages.length === 0 
                      ? 'If no templates are selected, user will get basic access by default'
                      : `Selected: ${formData.allowed_pages.join(', ')}`
                    }
                  </p>
                </div>

                {/* Agent Access */}
                <div className="space-y-2">
                  <Label>Agent Access</Label>
                  <div className="space-y-2 mt-2 max-h-32 overflow-y-auto border rounded p-2">
                    {agents.length > 0 ? (
                      agents.map((agent) => (
                        <div key={agent.agent_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={agent.agent_id}
                            checked={formData.agent_ids.includes(agent.agent_id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  agent_ids: [...formData.agent_ids, agent.agent_id]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  agent_ids: formData.agent_ids.filter(id => id !== agent.agent_id)
                                });
                              }
                            }}
                          />
                          <Label htmlFor={agent.agent_id} className="text-sm">
                            {agent.agent_name || agent.agent_id} ({agent.type})
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No agents available</p>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {formData.agent_ids.length === 0 
                      ? 'If no agents are selected, user will inherit your agent access'
                      : `Selected: ${formData.agent_ids.length} agent(s)`
                    }
                  </p>
                </div>

                {/* Current User's Permissions Info */}
                <div className="space-y-2">
                  <Label>Permission Inheritance</Label>
                  <div className="p-3 bg-blue-50 rounded border text-blue-700 text-sm">
                    <p><strong>Your Role:</strong> {currentUser.role}</p>
                    <p><strong>Your Pages:</strong> {currentUser.allowedPages?.join(', ') || 'None'}</p>
                    <p><strong>Your Agents:</strong> {currentUser.agentIds?.length || 0} agent(s)</p>
                    <p className="mt-2 text-xs">
                      New users will inherit your permissions or less, based on their role.
                    </p>
                  </div>
                </div>
                {/* Submit Button */}
                <div className="flex justify-end space-x-4">
                  <Link href="/user-management">
                    <Button variant="outline" size="default" type="button" className="">
                      Cancel
                    </Button>
                  </Link>
                  <Button variant="default" type="submit" size="default" disabled={isLoading} className="">
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <FaUserPlus className="h-4 w-4 mr-2" />
                        Create User
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthenticatedLayout>
  );
}
