import { X, Play } from 'lucide-react';

export function CreateSessionModal({ isOpen, course, onClose, onCreate }) {
  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
        
        {/* Header-ul Modalului */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-[#1A3A52]">Confirmare sesiune</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 p-2 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Conținutul */}
        <div className="p-6">
          <div className="bg-blue-50/50 p-4 rounded-2xl mb-6">
            <p className="text-gray-600">
              Ești pe cale să generezi codul QR de prezență pentru <span className="font-bold text-[#1A3A52]">{course.name}</span>.
            </p>
            <p className="text-[#1A3A52] font-semibold mt-2">
              Pornești sesiunea acum?
            </p>
          </div>

          {/* Butoanele */}
          <div className="flex justify-end gap-3">
            <button 
              onClick={onClose} 
              className="px-5 py-2.5 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Anulează
            </button>
            <button 
              onClick={() => {
                onCreate(course, new Date());
                onClose(); // Închidem modalul după ce trimitem datele
              }} 
              className="px-5 py-2.5 rounded-xl font-semibold bg-[#00D9B5] text-white hover:bg-[#00c4a4] shadow-lg shadow-[#00D9B5]/20 flex items-center gap-2 transition-transform active:scale-95"
            >
              <Play size={18} className="fill-current" />
              Pornește acum
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}