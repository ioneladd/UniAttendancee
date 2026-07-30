import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, ShieldCheck, Power } from 'lucide-react';
import { apiCall } from '../../api.js'; 

export function QRCodeDisplay({ session, onClose, onSessionClosed }) {
  const [qrToken, setQrToken] = useState('');
  const ROTATION_TIME = 3; 
  const [timeLeft, setTimeLeft] = useState(ROTATION_TIME);

  useEffect(() => {
    if (session) {
      setQrToken(session.session_token || 'se-incarca...');
      setTimeLeft(ROTATION_TIME);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const rotateToken = async () => {
      try {
        const sessionId = session.session_id || session.id;
        
        const response = await apiCall(`/sessions/${sessionId}/rotate`, {
          method: 'POST'
        });
        
        if (response.ok) {
          const data = await response.json();
          setQrToken(data.new_token); 
        } 
      } catch (error) {
        console.error("Eroare la rotire QR:", error);
      }
    };

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          rotateToken(); 
          return ROTATION_TIME; 
        }
        return prev - 1; 
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  const handleCloseSession = async () => {
    if (!window.confirm('Ești sigur că vrei să închizi această sesiune? Studenții nu vor mai putea scana codul.')) return;
    
    try {
      const sessionId = session.session_id || session.id;
      
      const response = await apiCall(`/sessions/${sessionId}/close`, {
        method: 'POST'
      });

      if (response.ok) {
        onSessionClosed(sessionId); // Anunțăm părintele să schimbe statusul în tabel
        onClose(); // Ascundem modalul
      } else {
        alert('A apărut o eroare la închiderea sesiunii.');
      }
    } catch (error) {
      console.error(error);
      alert('Eroare de rețea la închiderea sesiunii.');
    }
  };

  if (!session) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center relative animate-fade-in-up">
        
        {/* Butonul X doar ascunde fereastra */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors bg-gray-100 p-2 rounded-full"
        >
          <X size={20} />
        </button>

        <h3 className="text-2xl font-bold text-[#1A3A52] mb-1">Prezență Activă</h3>
        <p className="text-gray-500 mb-6 text-sm font-medium">{session.course_name}</p>

        <div className="bg-white p-4 rounded-2xl inline-block mb-4 border-2 border-gray-100 shadow-inner">
          <QRCodeSVG value={qrToken} size={220} level={"H"} includeMargin={true} />
        </div>

        <div className="bg-[#00D9B5]/10 border border-[#00D9B5]/20 rounded-xl p-3 flex flex-col items-center gap-1 mb-6">
          <div className="flex items-center gap-2 text-[#00D9B5] font-bold text-sm uppercase tracking-wide">
            <ShieldCheck size={18} />
            Se schimbă automat 3 secunde
          </div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-[#00D9B5] h-full"
              style={{ width: `${(timeLeft / ROTATION_TIME) * 100}%`, transition: timeLeft === ROTATION_TIME ? 'none' : 'width 1s linear' }}
            ></div>
          </div>
        </div>

        {/* Butonul care ÎNCHIDE sesiunea definitiv */}
        <button 
          onClick={handleCloseSession}
          className="w-full bg-red-50 hover:bg-red-500 text-red-500 hover:text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Power size={18} />
          Închide sesiunea
        </button>
      </div>
    </div>
  );
}