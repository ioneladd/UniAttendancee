import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup } from 'firebase/auth';
import API_BASE_URL from '../api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

function Login() {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, loading, loginWithGoogle, loginWithOtp } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [loading, user, navigate]);

  // --- LOGAREA CU GOOGLE (FIREBASE RESTAURAT) ---
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // 1. Firebase face autentificarea
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken(true);
      
      // 2. Trimitem jetonul la Python (El e portarul acum)
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        const data = await response.json();
        
        localStorage.removeItem('token');
        loginWithGoogle(data.user);
        navigate('/dashboard');
      } else {
        const data = await response.json();
        setError(data.detail || 'Autentificarea a eșuat pe server.');
      }
    } catch (error) {
      console.error('Eroare Google Login:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- LOGAREA CU EMAIL/OTP ---
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!email) return setError("Te rog introdu o adresă de email.");
    
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      if (response.ok) {
        setIsOtpSent(true);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Eroare la trimiterea codului.");
      }
    } catch (error) {
      setError("Eroare de conexiune la server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otpCode) return setError("Te rog introdu codul primit pe email.");

    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp_code: otpCode.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        
        loginWithOtp(data.access_token, email.trim(), data.user);
        navigate('/dashboard');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Cod invalid sau expirat.");
      }
    } catch (error) {
      setError("Eroare de conexiune la server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A3A52] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#00D9B5] opacity-10 rounded-full blur-xl"></div>
        
        <div className="text-center mb-8">
          <div className="bg-[#1A3A52] w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Bot size={32} className="text-[#00D9B5]" />
          </div>
          <h1 className="text-3xl font-bold text-[#1A3A52] mb-2">UniAttendance</h1>
          <p className="text-gray-500">Monitorizare prezență simplă și rapidă</p>
        </div>

        <div className="space-y-6">
          {/* BUTONUL GOOGLE FIREBASE RESTAURAT */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white border-2 border-gray-100 text-[#1A3A52] font-semibold py-4 px-4 rounded-xl hover:border-[#00D9B5] hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-3 group disabled:opacity-50"
          >
            {isLoading ? (
              'Se conectează...'
            ) : (
              <>
                <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Conectează-te cu Google
              </>
            )}
          </button>
          
          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">SAU</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {!isOtpSent ? (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email-ul tău instituțional</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00D9B5]/20 focus:border-[#00D9B5] transition-all"
                  placeholder="nume@student.usv.ro"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-[#1A3A52] bg-[#00D9B5] hover:bg-[#00c2a3] focus:outline-none transition-colors disabled:opacity-50"
              >
                {isLoading ? "Se trimite..." : "Trimite codul de conectare"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <p className="text-sm text-green-600 font-medium text-center bg-green-50 py-2 rounded-lg">
                Cod trimis la <strong>{email}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 text-center">Introdu codul din 6 cifre</label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="mt-2 block w-full px-3 py-3 border border-gray-200 rounded-xl text-center tracking-[0.5em] text-2xl font-bold text-[#1A3A52] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00D9B5]/20 focus:border-[#00D9B5] transition-all"
                  placeholder="------"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#1A3A52] hover:bg-[#112738] focus:outline-none transition-colors disabled:opacity-50"
              >
                {isLoading ? "Se verifică..." : "Verifică și conectează-te"}
              </button>
              <button 
                type="button" 
                onClick={() => { setIsOtpSent(false); setOtpCode(''); }}
                className="w-full text-sm font-medium text-gray-500 hover:text-gray-700 mt-2 py-2 transition-colors"
              >
                Am greșit adresa de email
              </button>
            </form>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100 font-medium">
              {error}
            </div>
          )}

          <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <p className="text-sm text-gray-500">
              Participi la un eveniment fără cont?<br/>
              <button 
                onClick={() => navigate('/guest-scan' + window.location.search)} 
                className="text-[#00D9B5] font-bold hover:underline mt-2 inline-block"
              >
                Scanează codul QR ca vizitator
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;