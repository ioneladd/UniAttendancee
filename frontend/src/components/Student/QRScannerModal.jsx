import { X, Camera } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

export function QRScannerModal({ isOpen, onClose, onScan, courseName }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in">
      {/* Header pentru mobil - negru, text alb */}
      <div className="flex justify-between items-center p-4 bg-black text-white pt-safe">
        <div>
          <h3 className="font-bold text-lg">Scanează prezența</h3>
          <p className="text-xs text-[#00D9B5] line-clamp-1">{courseName}</p>
        </div>
        <button 
          onClick={onClose} 
          className="p-3 bg-white/10 rounded-full hover:bg-white/20 active:scale-95 transition-all"
        >
          <X size={24} />
        </button>
      </div>

      {/* Zona efectivă de scanare */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        <Scanner
          onScan={(result) => onScan(result)} // Acum librăria știe unde să trimită datele!
          onError={(error) => console.log(error?.message)}
          options={{
            delayBetweenScanAttempts: 1000,
            delayBetweenScanSuccess: 2000,
          }}
          styles={{
            container: { width: '100%', height: '100%' },
            video: { objectFit: 'cover' }
          }}
        />
        
        {/* Overlay vizual pentru ghidaj (Pătratul verde) */}
        <div className="absolute inset-0 pointer-events-none border-[50px] sm:border-[100px] border-black/60">
            <div className="w-full h-full border-2 border-[#00D9B5]/50 rounded-2xl relative">
                {/* Colțuri decorative luminoase */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-[#00D9B5] rounded-tl-xl"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-[#00D9B5] rounded-tr-xl"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-[#00D9B5] rounded-bl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-[#00D9B5] rounded-br-xl"></div>
            </div>
        </div>
      </div>

      {/* Footer cu instrucțiuni */}
      <div className="p-6 pb-safe bg-black text-center">
        <div className="inline-flex items-center gap-2 text-[#00D9B5] bg-[#00D9B5]/10 px-4 py-2 rounded-full mb-3">
          <Camera size={16} className="animate-pulse" />
          <span className="text-sm font-bold">Camera este activă</span>
        </div>
        <p className="text-gray-400 text-sm px-4">
          Încadrează codul QR afișat de profesor pe ecran.
        </p>
      </div>
    </div>
  );
}