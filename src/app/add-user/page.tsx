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
import { getCurrentUser } from '@/lib/auth';
import AuthenticatedLayout from '../components/AuthenticatedLayout';
import Link from 'next/link';

interface AddUserForm {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'subadmin';
  isTemporaryPassword: boolean;
  forcePasswordChange: boolean;
}

export default function AddUserPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formData, setFormData] = useState<AddUserForm>({
    username: '',
    email: '',
    password: '',
    role: 'subadmin',
    isTemporaryPassword: true,
    forcePasswordChange: true
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
  }, [router]);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const handleInputChange = (field: keyof AddUserForm, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Basic validation
    if (!formData.username || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      // TODO: Replace with actual API call when provided
      // const response = await createUser(formData);
      
      // Mock success for now
      console.log('Creating user with data:', formData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(`User ${formData.username} created successfully!`);
      
      // Reset form
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'subadmin',
        isTemporaryPassword: true,
        forcePasswordChange: true
      });
      
    } catch (err: any) {
      console.error('Failed to create user:', err);
      setError(err.message || 'Failed to create user');
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
                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="Enter username"
                    required
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select value={formData.role} onValueChange={(value: 'admin' | 'subadmin') => handleInputChange('role', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subadmin">Sub Admin</SelectItem>
                      {(currentUser.role === 'owner' || currentUser.role === 'admin') && (
                        <SelectItem value="admin">Admin</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    {currentUser.role === 'owner'
                      ? 'Owners can create both Admin and Sub Admin accounts'
                      : currentUser.role === 'admin'
                      ? 'Admins can create both Admin and Sub Admin accounts'
                      : 'You can only create Sub Admin accounts'
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

                {/* Password Options */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isTemporaryPassword"
                      checked={formData.isTemporaryPassword}
                      onCheckedChange={(checked) => handleInputChange('isTemporaryPassword', checked as boolean)}
                    />
                    <Label htmlFor="isTemporaryPassword" className="text-sm">
                      This is a temporary password
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="forcePasswordChange"
                      checked={formData.forcePasswordChange}
                      onCheckedChange={(checked) => handleInputChange('forcePasswordChange', checked as boolean)}
                    />
                    <Label htmlFor="forcePasswordChange" className="text-sm">
                      Force password change on first login
                    </Label>
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
