import { X, CheckCircle } from 'lucide-react';

export function JoinCourseModal({ isOpen, onClose, enrollmentCode, setEnrollmentCode, onSubmit }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xl font-bold text-[#1A3A52]">Înscrie-te la un curs</h3>
          <button onClick={onClose} className="text-gray-400 active:text-red-500 bg-white p-2 rounded-full shadow-sm transition-colors active:scale-95">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Cod de înscriere
            </label>
            <input
              type="text"
              required
              autoFocus
              value={enrollmentCode}
              onChange={(e) => setEnrollmentCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00D9B5]/20 focus:border-[#00D9B5] font-mono text-2xl text-center tracking-widest outline-none transition-all uppercase text-[#1A3A52] font-bold"
              placeholder="EX: A3B9"
            />
            <p className="text-xs text-gray-400 mt-2 text-center font-medium">
              Introdu codul primit de la profesorul tău.
            </p>
          </div>

          <button
            type="submit"
            disabled={!enrollmentCode.trim()}
            className="w-full bg-[#1A3A52] text-white py-4 rounded-xl active:bg-[#00D9B5] transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:bg-[#1A3A52] active:scale-95"
          >
            <CheckCircle size={20} /> Confirmă înscrierea
          </button>
        </form>
      </div>
    </div>
  );
}