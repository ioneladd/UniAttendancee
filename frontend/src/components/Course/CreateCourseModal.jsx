import { X, Sparkles } from 'lucide-react';

export function CreateCourseModal({ isOpen, onClose, formData, setFormData, onSubmit }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-[#1A3A52]">Adaugă activitate nouă</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tip <span className="text-red-500">*</span>
            </label>
            <select 
              required
              value={formData.course_type} 
              onChange={(e) => setFormData({...formData, course_type: e.target.value})} 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00D9B5] focus:ring-2 focus:ring-[#00D9B5]/20 outline-none bg-white"
            >
              <option value="recurring">Curs recurent</option>
              <option value="event">Eveniment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titlu <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              required 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
              onInvalid={(e) => e.target.setCustomValidity('Te rugăm să introduci numele cursului.')}
              onInput={(e) => e.target.setCustomValidity('')}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00D9B5] focus:ring-2 focus:ring-[#00D9B5]/20 outline-none transition-all" 
              placeholder="ex: Programare Web" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prescurtare <span className="text-gray-400 font-normal text-xs">(opțional)</span>
            </label>
            <input 
              type="text" 
              value={formData.code} 
              onChange={(e) => setFormData({...formData, code: e.target.value})} 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00D9B5] focus:ring-2 focus:ring-[#00D9B5]/20 outline-none" 
              placeholder="ex: PW, BD" 
            />
          </div>

          {formData.course_type === 'recurring' && (
            <>
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="flex-shrink-0 mt-1">
                    <input 
                      type="checkbox" 
                      checked={formData.allow_non_enrolled ?? false}
                      onChange={(e) => setFormData({...formData, allow_non_enrolled: e.target.checked})}
                      className="w-5 h-5 text-[#00D9B5] border-gray-300 rounded focus:ring-[#00D9B5]"
                    />
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-[#1A3A52]">
                      Permite prezența neînrolaților
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      Dacă e debifat, doar studenții înscriși oficial vor putea scana codul QR cu succes.
                    </span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  An de studiu <span className="text-red-500">*</span>
                </label>
                <select 
                  required 
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: e.target.value})}
                  onInvalid={(e) => e.target.setCustomValidity('Te rugăm să selectezi anul din listă.')}
                  onInput={(e) => e.target.setCustomValidity('')}
                  className="mt-1 block w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[#00D9B5] bg-white"
                >
                  <option value="">Selectează anul</option>
                  <option value="1">Anul 1</option>
                  <option value="2">Anul 2</option>
                  <option value="3">Anul 3</option>
                  <option value="4">Anul 4</option>
                  <option value="5">Alt an</option>
                </select>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Semestru <span className="text-red-500">*</span>
                </label>
                <select 
                  required
                  value={formData.semester} 
                  onChange={(e) => setFormData({...formData, semester: e.target.value})} 
                  onInvalid={(e) => e.target.setCustomValidity('Te rugăm să selectezi semestrul.')}
                  onInput={(e) => e.target.setCustomValidity('')}
                  className="mt-1 block w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[#00D9B5] bg-white"
                >
                  <option value="">Alege semestrul...</option>
                  <option value="1">Semestrul 1</option>
                  <option value="2">Semestrul 2</option>
                </select>
              </div>
            </>
          )}

          <button type="submit" className="w-full bg-[#1A3A52] text-white font-bold py-4 rounded-xl hover:bg-[#00D9B5] transition-colors mt-4 flex justify-center items-center gap-2">
            Creează
          </button>
        </form>
      </div>
    </div>
  );
}