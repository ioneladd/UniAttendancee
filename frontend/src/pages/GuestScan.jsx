import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { User, CheckCircle, AlertCircle, ArrowLeft, QrCode } from 'lucide-react';
import API_BASE_URL from '../api.js';
import { QRScannerModal } from '../components/Student/QRScannerModal';

export default function GuestScan() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const initialToken = searchParams.get('token') || '';
  
  const [attendanceId, setAttendanceId] = useState(null); // NOU: Aici salvăm ID-ul rezervării
  const [guestName, setGuestName] = useState('');
  const [status, setStatus] = useState('idle'); 
  const [errorMessage, setErrorMessage] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  // Funcția care "Rezervă" locul în baza de date imediat ce avem codul QR
  const reserveSpot = async (tokenStr) => {
    setStatus('loading');
    setErrorMessage('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/guest-reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: tokenStr })
      });

      const data = await response.json();

      if (response.ok) {
        setAttendanceId(data.attendance_id); // Salvăm ID-ul pentru Pasul 2
        setStatus('idle'); // Gata, așteptăm numele
      } else {
        setStatus('error');
        setErrorMessage(data.detail || 'Cod expirat. Te rugăm să rescanezi.');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMessage('Eroare de rețea. Verifică conexiunea.');
    }
  };

  // Dacă utilizatorul a intrat direct pe link cu camera nativă, rezervăm direct
  useEffect(() => {
    if (initialToken && !attendanceId && status === 'idle') {
      reserveSpot(initialToken);
    }
  }, [initialToken]);

  // Dacă a scanat cu scanner-ul integrat din aplicație
  const handleScanSuccess = (result) => {
    if (!result) return;
    let scannedText = result[0]?.rawValue || result; 
    
    if (scannedText.includes('token=')) {
      scannedText = scannedText.split('token=')[1];
    }
    
    setShowScanner(false);
    reserveSpot(scannedText); // Facem rezervarea instant
  };

  // Ce se întâmplă când apasă butonul "Confirmă Prezența"
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const words = guestName
  .trim()
  .split(/\s+/) // elimină spațiile multiple
  .filter(word => word.length >= 3);

if (words.length < 2) {
  setStatus('error');
  setErrorMessage(
    'Te rugăm să introduci numele complet (Nume și prenume, fiecare având cel puțin 3 caractere).'
  );
  return;
}

    setStatus('loading');

    try {
      // Acum facem PUT pe noul endpoint, folosind ID-ul rezervării
      const response = await fetch(`${API_BASE_URL}/sessions/guest-confirm/${attendanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_name: guestName.trim() })
      });

      if (response.ok) {
        setStatus('success');
      } else {
        const data = await response.json();
        setStatus('error');
        setErrorMessage(data.detail || 'A apărut o problemă la salvarea numelui.');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMessage('Eroare de rețea la salvarea numelui.');
    }
  };

  // ---------------- RENDERIZARE INTERFAȚĂ ----------------

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 bg-[#00D9B5]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-[#00D9B5]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A3A52] mb-2">Prezență confirmată!</h2>
          <p className="text-gray-500 mb-8">
            Mulțumim, <span className="font-bold text-[#1A3A52]">{guestName}</span>. Prezența ta a fost înregistrată.
          </p>
          <button onClick={() => navigate('/')} className="text-sm font-bold text-[#00D9B5] hover:underline">
            Înapoi la pagina principală
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#00D9B5]"></div>

        <button onClick={() => navigate('/')} className="flex items-center text-sm text-gray-400 hover:text-[#1A3A52] transition-colors mb-6 mt-2">
          <ArrowLeft size={16} className="mr-1" /> Ai deja cont? Intră aici
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#1A3A52] mb-2">Prezență eveniment</h2>
          <p className="text-gray-500 text-sm">Urmează pașii pentru a-ți înregistra prezența.</p>
        </div>

        {status === 'error' && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-3 text-sm animate-fade-in">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* PASUL 1 */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <label className="block text-sm font-bold text-[#1A3A52] mb-3">Pasul 1: Codul sesiunii</label>
            
            {attendanceId ? (
              <div className="flex items-center justify-between bg-[#00D9B5]/10 text-[#00D9B5] p-3 rounded-xl border border-[#00D9B5]/20">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle size={18} /> Loc rezervat
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                disabled={status === 'loading'}
                className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#00D9B5] text-gray-500 transition-colors flex items-center justify-center gap-2 font-bold"
              >
                {status === 'loading' ? 'Se verifică...' : <><QrCode size={18} /> Scanează codul QR</>}
              </button>
            )}
          </div>

          {/* PASUL 2 */}
          <div className={`transition-opacity duration-300 ${attendanceId ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <label className="block text-sm font-bold text-[#1A3A52] mb-3">Pasul 2: Datele tale</label>
            <div className="relative">
              <input
                type="text"
                disabled={status === 'loading' || !attendanceId}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="ex: Popescu Ion"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#00D9B5] focus:ring-2 outline-none transition-all"
              />
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            
            <button
              type="submit"
              disabled={status === 'loading' || !attendanceId || !guestName}
              className="w-full py-3.5 mt-6 rounded-xl font-bold text-white transition-all bg-[#00D9B5] hover:bg-[#00bfa0] disabled:bg-gray-300 shadow-lg shadow-[#00D9B5]/20"
            >
              {status === 'loading' ? 'Se salvează...' : 'Confirmă prezența'}
            </button>
          </div>
        </form>
      </div>

      <QRScannerModal 
        isOpen={showScanner} 
        onClose={() => setShowScanner(false)} 
        onScan={handleScanSuccess} 
      />
    </div>
  );
}