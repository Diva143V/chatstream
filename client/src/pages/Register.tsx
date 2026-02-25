import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { extractAxiosError } from '@/lib/utils';
import { toast } from 'sonner';

type Errors = { email?: string; username?: string; password?: string; confirmPassword?: string };

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading, isAuthenticated } = useAuthStore();

  const [form, setForm] = useState({ email: '', username: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (isAuthenticated) navigate('/app', { replace: true });
  }, [isAuthenticated, navigate]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = (): boolean => {
    const errs: Errors = {};
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.username.trim()) errs.username = 'Username is required';
    else if (form.username.length < 3) errs.username = 'At least 3 characters';
    else if (!/^[a-zA-Z0-9_.-]+$/.test(form.username)) errs.username = 'Letters, numbers, _ . - only';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'At least 8 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await register(form.email, form.username, form.password);
      navigate('/app', { replace: true });
    } catch (err) {
      toast.error(extractAxiosError(err));
    }
  };

  const Field = ({
    label, icon: Icon, name, type = 'text', placeholder, error, extra,
  }: {
    label: string;
    icon: typeof Mail;
    name: keyof typeof form;
    type?: string;
    placeholder: string;
    error?: string;
    extra?: React.ReactNode;
  }) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-white/70">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
        <input
          type={type}
          value={form[name]}
          onChange={set(name)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/25 focus:outline-none focus:border-brand focus:bg-brand/5 transition-all"
        />
        {extra}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-brand-light mb-4 shadow-lg shadow-brand/30">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-white/40 mt-1">Join ChatStream today</p>
        </div>

        <div className="bg-surface-raised/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email" icon={Mail} name="email" type="email" placeholder="you@example.com" error={errors.email} />
            <Field label="Username" icon={User} name="username" placeholder="cooluser123" error={errors.username} />
            <Field
              label="Password"
              icon={Lock}
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              error={errors.password}
              extra={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              }
            />
            <Field
              label="Confirm Password"
              icon={Lock}
              name="confirmPassword"
              type="password"
              placeholder="Repeat your password"
              error={errors.confirmPassword}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-brand hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-brand/20 mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-light hover:text-brand font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
