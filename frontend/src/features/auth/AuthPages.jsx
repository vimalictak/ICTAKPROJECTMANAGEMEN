import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Label, FormField, Card, CardContent, Spinner } from '../../components/ui/index';
import { loginUser, selectAuth, clearError } from './authSlice';
import { authApi } from '../../api';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector(selectAuth);
  const [showPw, setShowPw] = React.useState(false);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data) => dispatch(loginUser(data));

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/auth/google`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold">ProjectFlow</span>
        </div>

        <Card className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
          </div>

          {/* Google SSO */}
          <Button variant="outline" className="w-full mb-4" onClick={handleGoogleLogin} type="button">
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs text-muted-foreground"><span className="bg-card px-2">or</span></div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Email" error={errors.email?.message} required>
              <Input type="email" placeholder="you@company.com" {...register('email')} />
            </FormField>
            <FormField label="Password" error={errors.password?.message} required>
              <div className="relative">
                <Input type={showPw ? 'text' : 'password'} placeholder="••••••••" {...register('password')} className="pr-10" />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>
            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
            </div>
            <Button type="submit" className="w-full" loading={loading}>Sign In</Button>
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">Sign up</Link>
        </p>
      </motion.div>
    </div>
  );
};

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });

export const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector(selectAuth);
  const [showPw, setShowPw] = React.useState(false);

  useEffect(() => { if (error) { toast.error(error); dispatch(clearError()); } }, [error]);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data) => {
    const result = await dispatch(loginUser({ name: data.name, email: data.email, password: data.password }));
    if (!result.error) {
      try {
        await authApi.register(data);
        toast.success('Account created! Please verify your email.');
        navigate('/login');
      } catch (e) {
        toast.error(e.response?.data?.message || 'Registration failed');
      }
    }
  };

  const handleRegister = async (data) => {
    try {
      await authApi.register({ name: data.name, email: data.email, password: data.password });
      toast.success('Account created! Please check your email to verify.');
      navigate('/login');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Registration failed');
    }
  };

  const { register: reg, handleSubmit: hs, formState: { errors: errs } } = useForm({ resolver: zodResolver(registerSchema) });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold">ProjectFlow</span>
        </div>

        <Card className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Create account</h1>
            <p className="text-sm text-muted-foreground mt-1">Get started with ProjectFlow</p>
          </div>

          <form onSubmit={hs(handleRegister)} className="space-y-4">
            <FormField label="Full Name" error={errs.name?.message} required>
              <Input placeholder="John Doe" {...reg('name')} />
            </FormField>
            <FormField label="Email" error={errs.email?.message} required>
              <Input type="email" placeholder="you@company.com" {...reg('email')} />
            </FormField>
            <FormField label="Password" error={errs.password?.message} required>
              <div className="relative">
                <Input type={showPw ? 'text' : 'password'} placeholder="Min 8 characters" {...reg('password')} className="pr-10" />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>
            <FormField label="Confirm Password" error={errs.confirmPassword?.message} required>
              <Input type="password" placeholder="Repeat password" {...reg('confirmPassword')} />
            </FormField>
            <Button type="submit" className="w-full" loading={loading}>Create Account</Button>
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
};

export const ForgotPasswordPage = () => {
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(z.object({ email: z.string().email() }))
  });

  const onSubmit = async ({ email }) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold">ProjectFlow</span>
        </div>

        <Card className="p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-lg font-semibold mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground">We sent a password reset link to your email address.</p>
              <Link to="/login" className="mt-4 inline-block text-sm text-primary hover:underline">Back to login</Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Forgot password?</h1>
                <p className="text-sm text-muted-foreground mt-1">Enter your email to receive a reset link</p>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <FormField label="Email" error={errors.email?.message} required>
                  <Input type="email" placeholder="you@company.com" {...register('email')} />
                </FormField>
                <Button type="submit" className="w-full" loading={loading}>Send Reset Link</Button>
              </form>
              <Link to="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground mt-4">Back to login</Link>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

// ─── Reset Password Page ──────────────────────────────────────────
const resetSchema = z.object({
  password: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] })

export function ResetPasswordPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(resetSchema) })

  async function onSubmit(data) {
    try {
      await authApi.resetPassword(token, data.password)
      toast.success('Password reset successful! Please log in.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Link may have expired.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 32 32" className="h-8 w-8"><rect width="32" height="32" rx="6" fill="#4f46e5"/><path d="M8 8h10a6 6 0 010 12H8V8z" fill="white"/><rect x="8" y="22" width="16" height="3" rx="1.5" fill="white" opacity="0.7"/></svg>
                <span className="text-xl font-bold text-foreground">ProjectFlow</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground text-center mb-1">Set new password</h2>
            <p className="text-muted-foreground text-center text-sm mb-6">Choose a strong password for your account</p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField label="New Password" error={errors.password?.message}>
                <Input {...register('password')} type="password" placeholder="Min 8 characters" />
              </FormField>
              <FormField label="Confirm Password" error={errors.confirmPassword?.message}>
                <Input {...register('confirmPassword')} type="password" placeholder="Confirm password" />
              </FormField>
              <Button type="submit" className="w-full" loading={isSubmitting}>Reset Password</Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// ─── Verify Email Page ────────────────────────────────────────────
export function VerifyEmailPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // verifying | success | error

  useEffect(() => {
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardContent className="pt-8 pb-8 px-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 32 32" className="h-8 w-8"><rect width="32" height="32" rx="6" fill="#4f46e5"/><path d="M8 8h10a6 6 0 010 12H8V8z" fill="white"/><rect x="8" y="22" width="16" height="3" rx="1.5" fill="white" opacity="0.7"/></svg>
                <span className="text-xl font-bold text-foreground">ProjectFlow</span>
              </div>
            </div>
            {status === 'verifying' && (
              <>
                <Spinner size="lg" className="mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground">Verifying your email...</h2>
              </>
            )}
            {status === 'success' && (
              <>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Email Verified!</h2>
                <p className="text-muted-foreground text-sm mb-6">Your email has been verified successfully.</p>
                <Button onClick={() => navigate('/login')}>Go to Login</Button>
              </>
            )}
            {status === 'error' && (
              <>
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Verification Failed</h2>
                <p className="text-muted-foreground text-sm mb-6">The link may have expired. Please request a new verification email.</p>
                <Button onClick={() => navigate('/login')}>Back to Login</Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
