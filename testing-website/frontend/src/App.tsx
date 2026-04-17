import { useState, useEffect, useRef } from 'react';

const TESTING_BACKEND_URL = import.meta.env.VITE_API_URL || 'https://testing-website-backend.vercel.app/api';

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #000000;
    --fg: #ffffff;
    --muted: #6b6b6b;
    --accent: #ffffff;
    --card-bg: rgba(255, 255, 255, 0.03);
    --card-border: rgba(255, 255, 255, 0.08);
    --glass-bg: rgba(0, 0, 0, 0.6);
    /* Reduced opacity significantly */
    --grain-opacity: 0.012; 
  }

  html { scroll-behavior: smooth; }

  body {
    background: var(--bg);
    color: var(--fg);
    font-family: 'DM Mono', monospace;
    overflow-x: hidden;
    cursor: auto;
  }

  /* Custom Cursor */
  @media (hover: hover) and (pointer: fine) {
    body { cursor: none; }
    .cursor, .cursor-ring { display: block; }
  }
  
  @media (hover: none) {
    .cursor, .cursor-ring { display: none !important; }
  }

  .cursor {
    position: fixed;
    width: 8px; height: 8px;
    background: white;
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%);
    transition: transform 0.15s ease, width 0.3s ease, height 0.3s ease, background 0.3s ease, opacity 0.3s ease;
    mix-blend-mode: difference;
    opacity: 1;
  }
  .cursor-ring {
    position: fixed;
    width: 40px; height: 40px;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    pointer-events: none;
    z-index: 9998;
    transform: translate(-50%, -50%);
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), width 0.3s ease, height 0.3s ease, opacity 0.3s ease;
  }
  .cursor.hovering { 
    width: 24px; height: 24px; 
    background: white;
  }
  .cursor-ring.hovering { 
    width: 70px; height: 70px; 
    opacity: 0.2; 
    border-color: white;
  }

  /* Grain overlay - Subtler animation and opacity */
  body::before {
    content: '';
    position: fixed;
    inset: -200%;
    width: 400%; height: 400%;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    opacity: var(--grain-opacity);
    pointer-events: none;
    z-index: 1000;
    animation: grain 10s steps(10) infinite;
  }
  @keyframes grain {
    0%, 100% { transform: translate(0, 0); }
    10% { transform: translate(-5%, -10%); }
    20% { transform: translate(-15%, 5%); }
    30% { transform: translate(7%, -25%); }
    40% { transform: translate(-5%, 25%); }
    50% { transform: translate(-15%, 10%); }
    60% { transform: translate(15%, 0%); }
    70% { transform: translate(0%, 15%); }
    80% { transform: translate(3%, 35%); }
    90% { transform: translate(-10%, 10%); }
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

  /* Animations */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  
  .fade-up { animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .scale-in { animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
  
  .delay-1 { animation-delay: 0.1s; }
  .delay-2 { animation-delay: 0.2s; }
  .delay-3 { animation-delay: 0.3s; }
  .delay-4 { animation-delay: 0.4s; }

  /* Card Hover */
  .plan-card {
    position: relative;
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease, box-shadow 0.4s ease;
  }
  .plan-card:hover { 
    transform: translateY(-8px); 
    border-color: rgba(255,255,255,0.15) !important; 
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
  }

  /* Buttons */
  .btn-primary {
    position: relative;
    overflow: hidden;
    background: var(--fg);
    color: var(--bg);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 0 0 rgba(255,255,255,0);
  }
  .btn-primary:hover:not(:disabled) {
    box-shadow: 0 0 30px rgba(255,255,255,0.15);
    transform: scale(1.02);
  }
  .btn-primary:active:not(:disabled) { transform: scale(0.98); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  .btn-secondary {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    transition: all 0.2s ease;
  }
  .btn-secondary:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }
  .btn-secondary.active { 
    background: rgba(255,255,255,0.12); 
    border-color: rgba(255,255,255,0.3); 
    color: white;
  }

  /* Inputs */
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] { -moz-appearance: textfield; }
  
  .input-premium {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.1);
    transition: all 0.2s ease;
  }
  .input-premium:focus {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.3);
    outline: none;
    box-shadow: 0 0 20px rgba(255,255,255,0.05);
  }

  /* Toast */
  .toast-container {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .toast {
    padding: 14px 20px;
    background: #111;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: white;
    font-size: 12px;
    animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }
  .toast.error { border-left: 3px solid #ff5555; }
  .toast.success { border-left: 3px solid #50fa7b; }

  /* Responsive */
  @media (max-width: 768px) {
    .section-num { display: none; }
    .main-grid { grid-template-columns: 1fr !important; }
    .token-grid { grid-template-columns: 1fr !important; }
    .donation-grid { grid-template-columns: 1fr !important; }
    h2 { font-size: 42px !important; }
    .plan-card { padding: 32px 28px !important; }
  }
`;

// ─── COMPONENTS ───────────────────────────────────────────────────────

const Toast = ({ message, type }: { message: string; type: 'error' | 'success' }) => (
  <div className={`toast ${type}`}>
    {type === 'error' ? '⚠' : '✓'} {message}
  </div>
);

const Spinner = () => (
  <div style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.1)', borderTop: '2px solid currentColor', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: '8px' }} />
);

interface PendingCheckout {
  sessionId: string;
  invoiceName: string;
  amount: string | number | null;
  currency: string | null;
  type: string;
  tokens: string | number | null;
  timestamp: number;
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing');
  const [dollars, setDollars] = useState(10);
  const [varCurrency, setVarCurrency] = useState('USDCX');
  const [donationCurrency, setDonationCurrency] = useState('ANY');
  const [totalCredits, setTotalCredits] = useState(0);
  const [toasts, setToasts] = useState<{id: number, msg: string, type: 'error'|'success'}[]>([]);
  
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('session_id');
  const type = searchParams.get('type');
  const tokens = searchParams.get('tokens');
  const [verifyStatus, setVerifyStatus] = useState<any>(null);
  const [recoveredCheckout, setRecoveredCheckout] = useState<PendingCheckout | null>(null);

  const subscriptionInvoiceRoutes: Record<string, string> = {
    CREDITS: 'basic-credits',
    USDCX: 'basic-usdcx',
    USAD: 'basic-usad',
  };

  const donationInvoiceRoutes: Record<string, string> = {
    ANY: 'support-any',
    CREDITS: 'support-credits',
    USDCX: 'support-usdcx',
    USAD: 'support-usad',
  };

  const activeSessionId = sessionId || recoveredCheckout?.sessionId || null;
  const activeType = type || recoveredCheckout?.type || null;
  const activeTokens = tokens || (recoveredCheckout?.tokens != null ? String(recoveredCheckout.tokens) : null);

  useEffect(() => {
    const storedCredits = Number(window.localStorage.getItem('demo_total_credits') || '0');
    setTotalCredits(Number.isFinite(storedCredits) ? storedCredits : 0);
  }, []);

  useEffect(() => {
    if (sessionId) {
      window.localStorage.removeItem('nullpay_pending_checkout');
      return;
    }

    const pendingRaw = window.localStorage.getItem('nullpay_pending_checkout');
    if (!pendingRaw) return;

    let pendingCheckout: PendingCheckout;

    try {
      pendingCheckout = JSON.parse(pendingRaw) as PendingCheckout;
    } catch {
      window.localStorage.removeItem('nullpay_pending_checkout');
      return;
    }

    if (!pendingCheckout.sessionId) {
      return;
    }

    if (Date.now() - pendingCheckout.timestamp > 30 * 60 * 1000) {
      window.localStorage.removeItem('nullpay_pending_checkout');
      return;
    }

    fetch(`${TESTING_BACKEND_URL}/verify-session?session_id=${pendingCheckout.sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (!data?.success) return;

        setRecoveredCheckout(pendingCheckout);
        setVerifyStatus(data);
        window.localStorage.removeItem('nullpay_pending_checkout');
      })
      .catch(() => {
        // Leave the pending session intact so the next reload can retry recovery.
      });
  }, [sessionId]);

  // Toast Helper
  const addToast = (msg: string, type: 'error' | 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // Cursor tracking
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = e.clientX + 'px';
        cursorRef.current.style.top = e.clientY + 'px';
      }
      if (ringRef.current) {
        setTimeout(() => {
          if (ringRef.current) {
            ringRef.current.style.left = e.clientX + 'px';
            ringRef.current.style.top = e.clientY + 'px';
          }
        }, 50);
      }
    };
    
    const over = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      const isInteractive = el.closest('button, a, input, select, [role="button"]');
      if (isInteractive) {
        cursorRef.current?.classList.add('hovering');
        ringRef.current?.classList.add('hovering');
      } else {
        cursorRef.current?.classList.remove('hovering');
        ringRef.current?.classList.remove('hovering');
      }
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseover', over);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseover', over); };
  }, []);

  // Verification
  useEffect(() => {
    if (activeSessionId) {
      fetch(`${TESTING_BACKEND_URL}/verify-session?session_id=${activeSessionId}`)
        .then(res => res.json())
        .then(data => setVerifyStatus(data))
        .catch(() => addToast('Verification failed', 'error'));
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId || activeType !== 'variable' || !verifyStatus?.success) return;

    const processedSessions = JSON.parse(window.localStorage.getItem('demo_processed_sessions') || '[]') as string[];
    if (processedSessions.includes(activeSessionId)) return;

    const purchasedTokens = Number(activeTokens || '0');
    if (!Number.isFinite(purchasedTokens) || purchasedTokens <= 0) return;

    setTotalCredits(prev => {
      const next = prev + purchasedTokens;
      window.localStorage.setItem('demo_total_credits', String(next));
      return next;
    });

    window.localStorage.setItem('demo_processed_sessions', JSON.stringify([...processedSessions, activeSessionId]));
  }, [activeSessionId, activeTokens, activeType, verifyStatus]);

  const handleCheckout = async (endpoint: string, payload: any = {}, options?: { loadingMessage?: string }) => {
    try {
      setLoading(true);
      setLoadingMessage(options?.loadingMessage || 'Creating your secure checkout session...');
      const res = await fetch(`${TESTING_BACKEND_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
if (data.checkoutUrl) {
        const pendingType = endpoint === 'checkout/variable'
          ? 'variable'
          : Object.values(donationInvoiceRoutes).includes(endpoint)
            ? 'donation'
            : Object.values(subscriptionInvoiceRoutes).includes(endpoint)
              ? 'subscription'
              : 'invoice';

        // Store pending checkout info in localStorage before redirect
        // This survives tab closure - success page can recover this info
        window.localStorage.setItem('nullpay_pending_checkout', JSON.stringify({
          sessionId: data.sessionId,
          invoiceName: endpoint.includes('variable') ? 'variable-checkout' : endpoint.replace('/api/', ''),
          amount: payload.price || payload.amount || null,
          currency: payload.currency || null,
          type: pendingType,
          tokens: payload.tokens || null,
          timestamp: Date.now()
        }));
        setLoadingMessage('Invoice created. Redirecting to NullPay checkout...');
        window.location.href = data.checkoutUrl;
      } else {
        addToast(data.error || 'Failed to initiate checkout', 'error');
      }
    } catch (err) {
      addToast('Network error. Is the backend running?','error');
    } finally {
      setLoading(false);
      setLoadingMessage('Processing');
    }
  };

  // ── RENDER SUCCESS PAGE ──────────────────────────────────────────
  if (activeSessionId) {
    return (
      <>
        <style>{globalStyles}</style>
        <div ref={cursorRef} className="cursor" />
        <div ref={ringRef} className="cursor-ring" />
        
        <div style={styles.successPage}>
          <div style={styles.successCard} className="scale-in">
            <div style={styles.checkmarkContainer}>
              <span style={styles.checkmark}>✓</span>
            </div>
            <h1 style={styles.successTitle}>Payment Confirmed</h1>
            <p style={styles.successSub}>Transaction recorded on-chain</p>

            <div style={styles.statusCard}>
              <span style={styles.statusLabel}>Session</span>
              <span style={styles.statusValueMono}>{activeSessionId.substring(0, 18)}...</span>
            </div>

            {verifyStatus ? (
              <div style={styles.verifyContent}>
                {activeType === 'variable' && (
                  <div style={styles.tokenReward}>
                    <span style={styles.bigNumber}>{activeTokens}</span>
                    <span style={styles.textLabel}>TOKENS ACQUIRED</span>
                  </div>
                )}
                {activeType === 'subscription' && (
                   <div style={styles.tokenReward}>
                   <span style={styles.bigIcon}>◈</span>
                   <span style={styles.textLabel}>PREMIUM ACTIVE</span>
                  </div>
                )}
                 {activeType === 'donation' && (
                    <div style={styles.tokenReward}>
                    <span style={styles.bigIcon}>♥</span>
                    <span style={styles.textLabel}>THANK YOU</span>
                 </div>
                )}
                <button className="btn-primary" onClick={() => window.location.href = '/'} style={styles.primaryBtn}>
                  Return Home
                </button>
              </div>
            ) : (
              <div style={styles.loadingContainer}>
                <div style={styles.spinnerLarge} />
                <p style={styles.verifyingText}>Verifying...</p>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── RENDER MAIN STORE ─────────────────────────────────────────────
  return (
    <>
      <style>{globalStyles}</style>
      <div ref={cursorRef} className="cursor" />
      <div ref={ringRef} className="cursor-ring" />

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(t => <Toast key={t.id} message={t.msg} type={t.type} />)}
      </div>

      {/* Ambient Background */}
      <div style={styles.ambientBg} />

      <main style={styles.main}>
        
        {/* ─── SECTION 1: SUBSCRIPTIONS ───────────────────────────────── */}
        <section style={styles.section}>
          <div className="section-num">01</div>
          <div className="fade-up" style={styles.sectionHeader}>
            <span style={styles.sectionLabel}>01 — Recurring</span>
            <h2 style={styles.sectionTitle}>Subscriptions</h2>
            <p style={styles.sectionDesc}>Auto-renewing monthly plans. Multi-pay static invoices.</p>
          </div>

          <div style={styles.grid3Col} className="main-grid">
            {[
              { id: 'CREDITS', price: 1 },
              { id: 'USDCX', price: 1, featured: true },
              { id: 'USAD', price: 1 },
            ].map((plan, i) => (
              <div key={plan.id} className={`plan-card fade-up delay-${i+1}`} style={{
                ...styles.card,
                background: plan.featured ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.01)',
                borderColor: plan.featured ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
              }}>
                {plan.featured && <div style={styles.badge}>Popular</div>}
                
                <div style={styles.cardTop}>
                  <span style={styles.currencyTag}>{plan.id}</span>
                  <div>
                    <span style={styles.priceLarge}>{plan.price}</span>
                    <span style={styles.priceUnit}>/mo</span>
                  </div>
                </div>

                <div style={styles.divider} />

                  <button
                  className="btn-primary"
                  disabled={loading}
                  onClick={() => handleCheckout(subscriptionInvoiceRoutes[plan.id], {}, { loadingMessage: `Creating your ${plan.id} subscription session...` })}
                  style={styles.primaryBtn}
                >
                  {loading ? <><Spinner /> {loadingMessage}</> : 'Subscribe'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ─── SECTION 2: BUY TOKENS ───────────────────────────────── */}
        <section style={styles.section}>
          <div className="section-num">02</div>
          <div className="fade-up" style={styles.sectionHeader}>
            <span style={styles.sectionLabel}>02 — Dynamic</span>
            <h2 style={styles.sectionTitle}>Buy Tokens</h2>
            <p style={styles.sectionDesc}>Standard dynamic invoices. 1 USD = 100 Tokens.</p>
            <div style={styles.creditsPill}>
              <span style={styles.creditsPillLabel}>Total Credits</span>
              <span style={styles.creditsPillValue}>{totalCredits.toLocaleString()}</span>
            </div>
          </div>

          <div className="fade-up delay-2" style={styles.tokenContainer}>
            {/* Controls Area */}
            <div style={styles.tokenControls}>
              
              {/* Amount Input Section */}
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Amount (USD)</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.dollarSign}>$</span>
                  <input 
                    type="number" 
                    value={dollars} 
                    onChange={e => setDollars(Math.max(1, Number(e.target.value)))}
                    className="input-premium"
                    style={styles.input}
                  />
                </div>
                <div style={styles.quickSelect}>
                  {[5, 10, 25, 50].map(val => (
                    <button 
                      key={val} 
                      onClick={() => setDollars(val)}
                      className={`btn-secondary ${dollars === val ? 'active' : ''}`}
                      style={styles.quickBtn}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Currency Toggle */}
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Pay With</label>
                <div style={styles.toggleGroup}>
                  {['USDCX', 'USAD'].map(c => (
                    <button
                      key={c}
                      onClick={() => setVarCurrency(c)}
                      className={`btn-secondary ${varCurrency === c ? 'active' : ''}`}
                      style={styles.toggleBtn}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* You Get Section */}
              <div style={styles.youGetContainer}>
                <div style={styles.youGetLabel}>You Get</div>
                <div style={styles.youGetValue}>
                  {(dollars * 100).toLocaleString()}
                  <span style={styles.tokenLabel}>TKN</span>
                </div>
              </div>
            </div>

            {/* Checkout Bar */}
            <div style={styles.checkoutBar}>
              <div style={styles.metaInfo}>
                <div style={styles.metaItem}>
                  <span style={styles.metaDot} /> Dynamic Invoice
                </div>
                <div style={styles.metaItem}>
                  <span style={styles.metaDot} /> Settlement &lt; 1s
                </div>
                <div style={styles.metaItem}>
                  <span style={styles.metaDot} /> Balance {totalCredits.toLocaleString()} TKN
                </div>
              </div>
              
              <button
                className="btn-primary"
                disabled={loading}
                onClick={() => handleCheckout(
                  'checkout/variable',
                  { currency: varCurrency, tokens: dollars * 100, price: dollars },
                  { loadingMessage: `Creating invoice for $${dollars} in ${varCurrency}...` }
                )}
                style={{...styles.primaryBtn, width: 'auto', padding: '16px 40px'}}
              >
                {loading ? <><Spinner /> {loadingMessage}</> : `Pay $${dollars}`}
              </button>
            </div>
          </div>
        </section>

        {/* ─── SECTION 3: DONATIONS ───────────────────────────────── */}
        <section style={{...styles.section, marginBottom: '100px'}}>
          <div className="section-num">03</div>
          <div className="fade-up" style={styles.sectionHeader}>
            <span style={styles.sectionLabel}>03 — Support</span>
            <h2 style={styles.sectionTitle}>Donate</h2>
            <p style={styles.sectionDesc}>Donation Profile invoices. Resolved from salt via SDK.</p>
          </div>

          <div style={styles.donationGrid} className="donation-grid">
            <div className="fade-up delay-1" style={{...styles.card, display: 'flex', flexDirection: 'column', gap: '24px'}}>
              <label style={styles.inputLabel}>Accepted Currency</label>
              
              {/* Updated to include all 4 options in a 2x2 grid */}
              <div style={styles.donationOptionsGrid}>
                {[
                  { id: 'ANY', label: 'Any', sub: 'Payer chooses' },
                  { id: 'CREDITS', label: 'Credits', sub: 'CREDITS only' },
                  { id: 'USDCX', label: 'USDCx', sub: 'USDCX only' },
                  { id: 'USAD', label: 'USAD', sub: 'USAD only' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setDonationCurrency(opt.id)}
                    className={`btn-secondary ${donationCurrency === opt.id ? 'active' : ''}`}
                    style={styles.donationBtn}
                  >
                    <span style={styles.donBtnLabel}>{opt.label}</span>
                    <span style={styles.donBtnSub}>{opt.sub}</span>
                  </button>
                ))}
              </div>

              <button
                className="btn-primary"
                disabled={loading}
                onClick={() => handleCheckout(donationInvoiceRoutes[donationCurrency], {}, { loadingMessage: `Creating your ${donationCurrency} donation session...` })}
                style={{...styles.primaryBtn, marginTop: 'auto'}}
              >
                {loading ? <><Spinner /> {loadingMessage}</> : 'Create Session'}
              </button>
            </div>

            <div className="fade-up delay-2" style={{...styles.card, background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
              <p style={styles.quote}>
                "Every contribution is recorded immutably on the Aleo chain."
              </p>
              <div style={styles.divider} />
              <div style={styles.techSpecs}>
                <div style={styles.specRow}>
                  <span style={styles.specKey}>Privacy</span>
                  <span style={styles.specVal}>ZK Proof</span>
                </div>
                <div style={styles.specRow}>
                  <span style={styles.specKey}>Model</span>
                  <span style={styles.specVal}>Donation Profile</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

// ─── STYLES OBJECT ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  // Layout
  main: {
    position: 'relative',
    zIndex: 1,
    padding: '80px 48px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  section: {
    marginBottom: '140px',
    position: 'relative',
  },
  sectionHeader: {
    marginBottom: '48px',
    maxWidth: '500px',
  },
  sectionLabel: {
    display: 'block',
    fontFamily: 'DM Mono',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    marginBottom: '12px',
  },
  sectionTitle: {
    fontFamily: 'Bebas Neue',
    fontSize: '64px',
    letterSpacing: '1px',
    color: 'white',
    lineHeight: 0.9,
    marginBottom: '12px',
  },
  sectionDesc: {
    fontFamily: 'DM Mono',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.6,
  },
  creditsPill: {
    marginTop: '18px',
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
  },
  creditsPillLabel: {
    fontFamily: 'DM Mono',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.38)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  creditsPillValue: {
    fontFamily: 'Bebas Neue',
    fontSize: '28px',
    color: 'white',
    lineHeight: 1,
    letterSpacing: '0.03em',
  },
  
  // Background
  ambientBg: {
    position: 'fixed',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle at 30% 30%, rgba(40, 40, 45, 0.8) 0%, rgba(0, 0, 0, 1) 70%)',
    pointerEvents: 'none',
    zIndex: -1,
  },

  // Grids
  grid3Col: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '24px',
  },
  donationGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },

  // Card System
  card: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '24px',
    padding: '40px',
  },
  badge: {
    position: 'absolute',
    top: '-1px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'white',
    color: 'black',
    fontFamily: 'DM Mono',
    fontSize: '9px',
    letterSpacing: '0.1em',
    padding: '5px 14px',
    borderRadius: '0 0 6px 6px',
    textTransform: 'uppercase',
  },
  cardTop: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  divider: {
    height: '1px',
    background: 'rgba(255,255,255,0.05)',
    margin: '24px 0',
  },
  currencyTag: {
    fontFamily: 'DM Mono',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  priceLarge: {
    fontFamily: 'Bebas Neue',
    fontSize: '72px',
    color: 'white',
    lineHeight: 1,
  },
  priceUnit: {
    fontFamily: 'DM Mono',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    marginLeft: '4px',
  },

  // Buttons
  primaryBtn: {
    width: '100%',
    padding: '16px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontFamily: 'DM Mono',
    fontSize: '12px',
    fontWeight: '500',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Token Section
  tokenContainer: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '24px',
    overflow: 'hidden',
  },
  tokenControls: {
    padding: '40px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '32px',
    alignItems: 'end',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  inputLabel: {
    fontFamily: 'DM Mono',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  inputWrapper: {
    position: 'relative',
  },
  dollarSign: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(255,255,255,0.2)',
    fontSize: '20px',
  },
  input: {
    width: '100%',
    padding: '16px 16px 16px 40px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    color: 'white',
    fontFamily: 'Bebas Neue',
    fontSize: '36px',
    lineHeight: 1,
  },
  quickSelect: {
    display: 'flex',
    gap: '8px',
  },
  quickBtn: {
    flex: 1,
    padding: '10px',
    fontFamily: 'DM Mono',
    fontSize: '11px',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.6)',
  },
  toggleGroup: {
    display: 'flex',
    gap: '8px',
  },
  toggleBtn: {
    flex: 1,
    padding: '16px',
    fontFamily: 'DM Mono',
    fontSize: '13px',
    borderRadius: '12px',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.6)',
  },
  youGetContainer: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '16px 24px',
  },
  youGetLabel: {
    fontFamily: 'DM Mono',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: '8px',
    textTransform: 'uppercase',
  },
  youGetValue: {
    fontFamily: 'Bebas Neue',
    fontSize: '40px',
    color: 'white',
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  tokenLabel: {
    fontSize: '12px',
    fontFamily: 'DM Mono',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.1em',
  },
  checkoutBar: {
    borderTop: '1px solid rgba(255,255,255,0.04)',
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.01)',
  },
  metaInfo: {
    display: 'flex',
    gap: '24px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: 'DM Mono',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
  },
  metaDot: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
  },

  // Donation
  donationOptionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr', // 2x2 Grid
    gap: '12px',
  },
  donationBtn: {
    padding: '16px',
    textAlign: 'left',
    borderRadius: '12px',
  },
  donBtnLabel: {
    display: 'block',
    fontFamily: 'DM Mono',
    fontSize: '13px',
    color: 'white',
    marginBottom: '4px',
  },
  donBtnSub: {
    display: 'block',
    fontFamily: 'DM Mono',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
  },
  quote: {
    fontFamily: 'Instrument Serif',
    fontStyle: 'italic',
    fontSize: '24px',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 1.4,
    marginBottom: '24px',
  },
  techSpecs: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  specRow: {
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    paddingBottom: '8px',
  },
  specKey: {
    fontFamily: 'DM Mono',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
  },
  specVal: {
    fontFamily: 'DM Mono',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.7)',
  },

  // Success Page
  successPage: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  successCard: {
    background: 'rgba(10,10,10,0.8)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '32px',
    padding: '56px',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center',
  },
  checkmarkContainer: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  checkmark: {
    fontSize: '28px',
    color: '#50fa7b',
  },
  successTitle: {
    fontFamily: 'Bebas Neue',
    fontSize: '48px',
    letterSpacing: '1px',
    marginBottom: '8px',
    color: 'white',
  },
  successSub: {
    fontFamily: 'DM Mono',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '32px',
  },
  statusCard: {
    background: 'rgba(255,255,255,0.03)',
    padding: '12px 16px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  statusLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
  },
  statusValueMono: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'DM Mono',
  },
  tokenReward: {
    marginBottom: '32px',
  },
  bigNumber: {
    display: 'block',
    fontFamily: 'Bebas Neue',
    fontSize: '64px',
    color: 'white',
    lineHeight: 1,
  },
  bigIcon: {
    display: 'block',
    fontSize: '48px',
    marginBottom: '8px',
  },
  textLabel: {
    fontFamily: 'DM Mono',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    marginTop: '8px',
    display: 'block',
  },
  loadingContainer: {
    padding: '20px',
  },
  spinnerLarge: {
    width: '24px',
    height: '24px',
    border: '2px solid rgba(255,255,255,0.1)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px',
  },
  verifyingText: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
  },
};
