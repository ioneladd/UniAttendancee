import { Users, Search, UserPlus, Save, X, Edit, CheckCircle, Trash2 } from 'lucide-react';

export function SessionAttendeesTable({
  attendees,
  filteredAttendees,
  attendeeSearch,
  setAttendeeSearch,
  onShowManualAdd,
  editingNoteFor,
  setEditingNoteFor,
  tempNote,
  setTempNote,
  onSaveNote,
  onRemoveStudent,
  editingBonusFor,
  setEditingBonusFor,
  tempBonus,
  setTempBonus,
  onSaveBonus
}) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><Users size={20} /></div>
          <h3 className="text-xl font-bold text-[#1A3A52]">Studenți prezenți</h3>
          <span className="bg-[#1A3A52] text-white font-bold px-3 py-1 rounded-full text-sm ml-2">
            {attendees.length}
          </span>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Caută în prezențe..."
              value={attendeeSearch}
              onChange={(e) => setAttendeeSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:border-[#00D9B5] focus:ring-2 focus:ring-[#00D9B5]/20 outline-none transition-all text-sm bg-white"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <button 
            onClick={onShowManualAdd}
            className="flex items-center gap-2 text-sm font-bold text-[#00D9B5] hover:text-white bg-[#00D9B5]/10 hover:bg-[#00D9B5] px-4 py-2 rounded-xl transition-all whitespace-nowrap"
          >
            <UserPlus size={16} />
            <span className="hidden sm:inline">Adaugă manual</span>
          </button>
        </div>
      </div>

      <div className="p-0 flex-1">
        {filteredAttendees.length > 0 ? (
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider font-bold">
              <tr>
                <th className="px-2 py-3 sm:px-6 sm:py-4">Nume</th>
                <th className="px-2 py-3 sm:px-6 sm:py-4">Ora</th>
                <th className="px-2 py-3 sm:px-6 sm:py-4">Obs.</th>
                
                {/* NOU: Capul de tabel pentru Bonificație */}
                <th className="px-2 py-3 sm:px-6 sm:py-4 text-center">Bonif.</th>
                
                <th className="px-2 py-3 sm:px-6 sm:py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs sm:text-sm">
              {filteredAttendees.map((student, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors animate-fade-in">
                  <td className="px-2 py-3 sm:px-6 sm:py-4 font-bold text-[#1A3A52] min-w-[110px] sm:min-w-0 max-w-[130px] sm:max-w-none break-words whitespace-normal" title={student.name}>
                    {student.name}
                  </td>
                  
                  <td className="px-2 py-3 sm:px-6 sm:py-4 text-gray-500 whitespace-nowrap">
                    {new Date(student.scanned_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                    <span className="hidden sm:inline">:{new Date(student.scanned_at).getSeconds().toString().padStart(2, '0')}</span>
                  </td>
                  
                  <td className="px-2 py-3 sm:px-6 sm:py-4 w-1/3">
                    {editingNoteFor === student.name ? (
                      <div className="flex items-center gap-1 animate-fade-in">
                        <input
                          type="text"
                          value={tempNote}
                          onChange={(e) => setTempNote(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-[#00D9B5] text-xs bg-white"
                          placeholder="Obs..."
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') onSaveNote(student.name); }}
                        />
                        <button onClick={() => onSaveNote(student.name)} className="text-[#00D9B5] p-1">
                          <Save size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group cursor-pointer" 
                        onClick={() => { 
                          setEditingNoteFor(student.name); 
                          setTempNote(student.notes || ''); 
                        }}>
                        <span className={`truncate max-w-[60px] sm:max-w-[150px] ${student.notes ? "text-gray-700 font-medium" : "text-gray-400 italic"}`} title={student.notes}>
                          {student.notes || 'Adaugă...'}
                        </span>
                        <Edit size={12} className="opacity-0 group-hover:opacity-100 text-[#00D9B5] transition-opacity shrink-0" />
                      </div>
                    )}
                  </td>
{/* Celula cu input-ul pentru puncte (Stilul cu Save) */}
<td className="px-2 py-3 sm:px-6 sm:py-4 w-1/4">
  {editingBonusFor === student.name ? (
    <div className="flex items-center justify-center gap-1 animate-fade-in">
      <input
        type="number"
        step="0.5"
        value={tempBonus}
        onChange={(e) => setTempBonus(e.target.value)}
        className="w-14 sm:w-16 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-[#00D9B5] text-xs text-center bg-white"
        autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter') onSaveBonus(student.name); }}
      />
      <button onClick={() => onSaveBonus(student.name)} className="text-[#00D9B5] p-1">
        <Save size={14} />
      </button>
    </div>
  ) : (
    <div className="flex items-center justify-center gap-1 group cursor-pointer" 
      onClick={() => { 
        setEditingBonusFor(student.name); 
        setTempBonus(student.bonus_points || 0); 
      }}>
      <span className="font-bold text-[#1A3A52]">
        {student.bonus_points || 0} <span className="text-[10px] text-gray-400 font-normal">pct</span>
      </span>
      <Edit size={12} className="opacity-0 group-hover:opacity-100 text-[#00D9B5] transition-opacity shrink-0" />
    </div>
  )}
</td>
                  <td className="px-2 py-3 sm:px-6 sm:py-4 text-right">
                    <div className="flex items-center justify-end gap-1 sm:gap-3">
                      <span className="inline-flex items-center justify-center text-[#00D9B5] bg-[#00D9B5]/10 w-6 h-6 sm:w-auto sm:px-3 sm:py-1 rounded-full text-xs font-bold">
                        <CheckCircle size={12} className="sm:mr-1" /> 
                        <span className="hidden sm:inline">Prezent</span>
                      </span>
                      <button 
                        onClick={() => onRemoveStudent(student.name)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg"
                        title="Anulează prezența"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Search className="text-gray-300" size={32} />
            </div>
            <p className="text-[#1A3A52] font-bold text-lg">
              {attendees.length > 0 ? 'Niciun rezultat găsit.' : 'Niciun participant prezent încă.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}