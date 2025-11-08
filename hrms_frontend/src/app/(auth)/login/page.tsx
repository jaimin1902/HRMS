'use client';

import { useState } from 'react';
import { redirect, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/axios';
import { auth } from '@/lib/auth';
import { ROLE_ROUTES } from '@/lib/constants';

type LoginFormData = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', data);
      const { user, token } = response.data.data;

      if (response.data.success) {
        // Store auth data
        auth.setAuth(token, user);
        alert(response.data.message || 'Login successful');
        // Redirect based on role
        // const redirectPath = searchParams.get('redirect') || auth.getDashboardRoute();
        router.push(auth.getDashboardRoute());
      } else {
        setError(response.data.message || 'Login failed. Please try again.');
      }
      // Store auth data
      // auth.setAuth(token, user);
      // alert(response.data.message || 'Login successful');
      // Redirect based on role
      // const redirectPath = searchParams.get('redirect') || auth.getDashboardRoute();
      router.push(auth.getDashboardRoute());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">WorkZen HRMS</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className="text-center text-sm">
              <a href="/forgot-password" className="text-primary hover:underline">
                Forgot password?
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

