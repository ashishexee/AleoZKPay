import { useEffect, useState } from 'react';

function Success() {
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (sessionId) {
      fetch(`https://testing-website-backend.vercel.app/api/verify-session?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.isPremium || data.success) {
            localStorage.setItem('isPremium', 'true');
            setVerifying(false);
          } else {
            setError('Payment verification failed. Status: ' + (data.status || 'PENDING'));
            setVerifying(false);
          }
        })
        .catch(() => {
          setError('Error contacting verification server.');
          setVerifying(false);
        });
    } else {
      if (localStorage.getItem('isPremium') === 'true') {
        setVerifying(false);
      } else {
        setError('No session ID found. Please complete checkout.');
        setVerifying(false);
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
      {/* Decorative background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <div className="glass-panel w-full max-w-[480px] rounded-[40px] overflow-hidden animate-float">
        <div className="p-12 text-center">
          {verifying ? (
            <div className="space-y-8 py-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 border-2 border-white/5 rounded-full" />
                <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-4 border border-white/10 rounded-full animate-pulse" />
              </div>
              <div className="space-y-3">
                <h1 className="font-display text-4xl text-white tracking-tight uppercase">Verifying Proofs</h1>
                <p className="font-mono text-[10px] text-white/30 uppercase tracking-[0.2em]">Checking on-chain settlement</p>
              </div>
              <div className="pt-4">
                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/40 -translate-x-full animate-shimmer" />
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-8">
              <div className="w-20 h-20 bg-white/[0.03] border border-white/10 rounded-full flex items-center justify-center mx-auto group">
                <svg className="text-white/40 group-hover:text-white/60 transition-colors" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </div>
              <div className="space-y-3">
                <h1 className="font-display text-4xl text-white tracking-tight uppercase">Payment Failed</h1>
                <p className="font-mono text-xs text-white/30 max-w-[240px] mx-auto leading-relaxed">{error}</p>
              </div>
              <button 
                onClick={() => window.location.href = '/'} 
                className="btn-primary w-full mt-4"
              >
                Return to Store
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              <div className="space-y-6">
                <div className="w-20 h-20 bg-white border border-white rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                  <svg className="text-black" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17L4 12" />
                  </svg>
                </div>
                <div className="space-y-3">
                  <h1 className="font-display text-5xl text-white tracking-tight uppercase leading-none">Access Granted</h1>
                  <p className="font-mono text-[10px] text-white/30 uppercase tracking-[0.2em]">Membership Status: Active</p>
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 text-left space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[9px] text-white/20 uppercase tracking-widest">Network</span>
                  <span className="font-mono text-[11px] text-white/60">Aleo Mainnet</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[9px] text-white/20 uppercase tracking-widest">Protocol</span>
                  <span className="font-mono text-[11px] text-white/60">NullPay SDK v1.0</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                  <span className="font-mono text-[9px] text-white/20 uppercase tracking-widest">Verification</span>
                  <span className="font-mono text-[11px] text-green-400 font-medium">SUCCESSFUL</span>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <button 
                  onClick={() => window.location.href = '/'} 
                  className="btn-primary w-full"
                >
                  Enter Dashboard
                </button>
                <p className="font-mono text-[9px] text-white/10 uppercase tracking-[0.3em]">Immutably verified on-chain</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Success;
