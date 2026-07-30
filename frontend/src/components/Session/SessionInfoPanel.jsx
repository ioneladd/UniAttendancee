import { Clock, ShieldCheck, Power, Trash2, RotateCcw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export function SessionInfoPanel({ 
  session, 
  dateStr, 
  timeStr, 
  qrToken, 
  timeLeft, 
  rotationTime, 
  onCloseSession,
  onReopenSession, // <-- Proprietate nouă
  onDeleteSession  // <-- Proprietate nouă
}) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-[#1A3A52] mb-1">{session.course_name}</h2>
      <div className="flex items-center gap-2 text-gray-500 mb-6">
        <Clock size={16} />
        <span>{dateStr} • Ora {timeStr}</span>
      </div>

      {session.is_active ? (
        <div className="flex flex-col items-center animate-fade-in">
          <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-inner inline-block mb-4">
            <QRCodeSVG value={qrToken} size={200} level={"H"} includeMargin={true} />
          </div>
          
          <div className="w-full bg-[#00D9B5]/10 border border-[#00D9B5]/20 rounded-xl p-3 flex flex-col items-center gap-1 mb-6">
            <div className="flex items-center gap-2 text-[#00D9B5] font-bold text-xs uppercase tracking-wide">
              <ShieldCheck size={16} /> Se schimbă automat la 3 secunde
            </div>
            <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-[#00D9B5] h-full" 
                style={{ 
                  width: `${(timeLeft / rotationTime) * 100}%`, 
                  transition: timeLeft === rotationTime ? 'none' : 'width 1s linear' 
                }}
              ></div>
            </div>
          </div>

          <button 
            onClick={onCloseSession}
            className="w-full bg-red-50 hover:bg-red-500 text-red-500 hover:text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Power size={18} /> Închide sesiunea
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 animate-fade-in mt-4 border-t border-gray-100 pt-6">
          <div className="text-center mb-2">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Acțiuni Sesiune</span>
          </div>
          <button 
            onClick={onReopenSession}
            className="w-full bg-blue-50 hover:bg-blue-500 text-blue-600 hover:text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} /> Redeschide sesiunea
          </button>
          <button 
            onClick={onDeleteSession}
            className="w-full border-2 border-red-100 hover:bg-red-50 text-red-500 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={18} /> Șterge definitiv
          </button>
        </div>
      )}
    </div>
  );
}