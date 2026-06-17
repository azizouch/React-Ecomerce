import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ShoppingBag, Eye, EyeOff } from 'lucide-react';
import { t } from '../../lib/translations';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, profile, user, loading: authLoading } = useAuth();
  const { language } = useLanguage();

  // Redirect if already authenticated
  useEffect(() => {
    console.log('📍 Login: Checking redirect conditions', {
      authLoading,
      hasUser: !!user,
      hasProfile: !!profile,
      userEmail: user?.email,
      profileRole: profile?.role,
      currentPath: location.pathname,
    });

    // Only redirect if we're still on the login page
    if (!authLoading && user && profile && location.pathname === '/login') {
      console.log('🚀 Login: Redirecting user with role:', profile.role);
      if (profile.role === 'admin') {
        console.log('➡️ Login: Redirecting to /admin');
        navigate('/admin', { replace: true });
      } else if (profile.role === 'vendor') {
        console.log('➡️ Login: Redirecting to /vendor');
        navigate('/vendor', { replace: true });
      } else {
        console.log('➡️ Login: Redirecting to /');
        navigate('/', { replace: true });
      }
    }
  }, [user, profile, authLoading, location.pathname]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log('📝 Login: Form submitted with email:', email);

    try {
      console.log('🔄 Login: Calling signIn...');
      await signIn(email, password);
      console.log('✅ Login: signIn completed successfully');
      // After signIn, the AuthContext will trigger auth state change
      // and the above useEffect will redirect when user/profile update
    } catch (err: any) {
      console.error('❌ Login: signIn failed -', err.message);
      setError(err.message || t(language, 'invalidEmailOrPassword'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t(language, 'welcomeBack')}</h1>
          <p className="text-gray-600 mt-2">{t(language, 'signInToAccount')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t(language, 'emailAddress')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder={t(language, 'placeholderEmail')}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {t(language, 'password')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pr-12 px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
              />

              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? t(language, 'hidePassword') : t(language, 'showPassword')}
                className="absolute inset-y-0 right-2 flex items-center p-1 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t(language, 'signingIn') : t(language, 'signIn')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {t(language, 'dontHaveAccount')}{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              {t(language, 'signUp')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
