import { useState, useEffect, useRef } from 'react';

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --black: #000000;
    --white: #ffffff;
    --off-white: #f5f4f0;
    --gray-100: #e8e6e1;
    --gray-400: #94928d;
    --gray-600: #4a4845;
    --gray-800: #1c1a18;
    --gray-900: #0d0c0b;
    --accent: #ffffff;
    --grain-opacity: 0.035;
  }

  html { scroll-behavior: smooth; }

  body {
    background: var(--black);
    color: var(--white);
    font-family: 'DM Mono', monospace;
    overflow-x: hidden;
    cursor: none;
  }

  /* Custom cursor */
  .cursor {
    position: fixed;
    width: 10px;
    height: 10px;
    background: white;
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%);
    transition: transform 0.1s ease, width 0.3s ease, height 0.3s ease, background 0.3s ease;
    mix-blend-mode: difference;
  }
  .cursor-ring {
    position: fixed;
    width: 36px;
    height: 36px;
    border: 1px solid rgba(255,255,255,0.4);
    border-radius: 50%;
    pointer-events: none;
    z-index: 9998;
    transform: translate(-50%, -50%);
    transition: transform 0.18s ease, width 0.3s ease, height 0.3s ease, opacity 0.3s ease;
  }
  .cursor.hovering { width: 20px; height: 20px; }
  .cursor-ring.hovering { width: 60px; height: 60px; opacity: 0.3; }

  /* Grain overlay */
  body::before {
    content: '';
    position: fixed;
    inset: -200%;
    width: 400%;
    height: 400%;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    opacity: var(--grain-opacity);
    pointer-events: none;
    z-index: 1000;
    animation: grain 0.5s steps(3) infinite;
  }
  @keyframes grain {
    0% { transform: translate(0, 0); }
    20% { transform: translate(-3%, -5%); }
    40% { transform: translate(-6%, 2%); }
    60% { transform: translate(3%, -1%); }
    80% { transform: translate(-2%, 6%); }
    100% { transform: translate(4%, -3%); }
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: #000; }
  ::-webkit-scrollbar-thumb { background: #333; }

  /* Animations */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  @keyframes pulse-ring {
    0% { transform: scale(1); opacity: 0.4; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  @keyframes rotate-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes number-tick {
    from { transform: translateY(10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .fade-up { animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .fade-up-1 { animation-delay: 0.1s; }
  .fade-up-2 { animation-delay: 0.2s; }
  .fade-up-3 { animation-delay: 0.3s; }
  .fade-up-4 { animation-delay: 0.4s; }
  .fade-up-5 { animation-delay: 0.5s; }

  /* Card hover */
  .plan-card {
    position: relative;
    overflow: hidden;
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease;
  }
  .plan-card::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .plan-card:hover { transform: translateY(-6px); border-color: rgba(255,255,255,0.2) !important; }
  .plan-card:hover::after { opacity: 1; }

  /* Button */
  .btn-primary {
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .btn-primary::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s ease;
  }
  .btn-primary:hover::before { transform: translateX(100%); }
  .btn-primary:hover { transform: scale(1.02); }
  .btn-primary:active { transform: scale(0.98); }

  /* Input focus */
  .premium-input:focus {
    border-color: rgba(255,255,255,0.4) !important;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 0 0 20px rgba(255,255,255,0.05) !important;
    outline: none !important;
  }

  /* Section divider */
  .section-num {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 120px;
    line-height: 1;
    color: rgba(255,255,255,0.04);
    position: absolute;
    top: -20px;
    right: 30px;
    letter-spacing: -4px;
    pointer-events: none;
    user-select: none;
  }


`;

function App() {
  const [loading, setLoading] = useState(false);
  const [dollars, setDollars] = useState(1);
  const [varCurrency, setVarCurrency] = useState('USDCX');
  const [donationCurrency, setDonationCurrency] = useState('ANY');
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('session_id');
  const type = searchParams.get('type');
  const tokens = searchParams.get('tokens');
  const [verifyStatus, setVerifyStatus] = useState<any>(null);

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
        }, 60);
      }
    };
    const over = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('button, a, input, select')) {
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

  useEffect(() => {
    if (sessionId) {
      fetch(`http://localhost:4000/api/verify-session?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => setVerifyStatus(data));
    }
  }, [sessionId]);

  const handleCheckout = async (endpoint: string, payload: any) => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:4000/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert('Failed: ' + data.error);
      }
    } catch {
      alert('Error contacting backend.');
    } finally {
      setLoading(false);
    }
  };

  // ── SUCCESS PAGE ────────────────────────────────────────────────────────────
  if (sessionId) {
    return (
      <>
        <style>{globalStyles}</style>
        <div ref={cursorRef} className="cursor" />
        <div ref={ringRef} className="cursor-ring" />
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.06) 0%, #000 60%)',
          padding: '40px 20px'
        }}>
          {/* Decorative lines */}
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
            <div style={{ position: 'absolute', left: '50%', top: 0, width: '1px', height: '100%', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.06), transparent)' }} />
          </div>

          <div className="fade-up" style={{ position: 'relative', zIndex: 1, maxWidth: '520px', width: '100%' }}>
            {/* Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', justifyContent: 'center' }}>
              <div className="status-dot" />
              <span style={{ fontFamily: 'DM Mono', fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Transaction confirmed</span>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '24px',
              padding: '48px',
              backdropFilter: 'blur(20px)',
            }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 24px',
                  background: 'rgba(255,255,255,0.05)',
                  fontSize: '28px'
                }}>✓</div>
                <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '52px', letterSpacing: '2px', color: '#fff', lineHeight: 1, marginBottom: '12px' }}>
                  Payment Complete
                </h2>
                <p style={{ fontFamily: 'DM Mono', fontSize: '10px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', wordBreak: 'break-all' }}>
                  {sessionId}
                </p>
              </div>

              {verifyStatus ? (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '12px', marginBottom: '16px'
                  }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</span>
                    <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: '500', letterSpacing: '0.05em' }}>
                      {verifyStatus.status || (verifyStatus.success ? 'SETTLED' : 'PENDING')}
                    </span>
                  </div>

                  {type === 'variable' && (
                    <div style={{
                      padding: '24px', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px', textAlign: 'center', marginBottom: '16px',
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))'
                    }}>
                      <div style={{ fontFamily: 'Bebas Neue', fontSize: '64px', color: '#fff', lineHeight: 1 }}>{tokens}</div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '8px' }}>Tokens Received</div>
                    </div>
                  )}
                  {type === 'donation' && (
                    <div style={{ padding: '24px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', textAlign: 'center', marginBottom: '16px' }}>
                      <div style={{ fontSize: '40px', marginBottom: '8px' }}>♥</div>
                      <div style={{ fontFamily: 'Bebas Neue', fontSize: '28px', letterSpacing: '2px' }}>Thank you</div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Your generosity is noted on-chain.</div>
                    </div>
                  )}
                  {type === 'subscription' && (
                    <div style={{ padding: '24px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', textAlign: 'center', marginBottom: '16px' }}>
                      <div style={{ fontSize: '40px', marginBottom: '8px' }}>◈</div>
                      <div style={{ fontFamily: 'Bebas Neue', fontSize: '28px', letterSpacing: '2px' }}>Premium Active</div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Your subscription is live.</div>
                    </div>
                  )}

                  <button className="btn-primary" onClick={() => window.location.href = '/'} style={{
                    width: '100%', padding: '16px',
                    background: '#fff', color: '#000',
                    border: 'none', borderRadius: '12px', cursor: 'pointer',
                    fontFamily: 'DM Mono', fontSize: '12px', fontWeight: '500',
                    letterSpacing: '0.12em', textTransform: 'uppercase'
                  }}>
                    Return to Store
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                  <div style={{
                    width: '32px', height: '32px', border: '1px solid rgba(255,255,255,0.2)',
                    borderTop: '1px solid white', borderRadius: '50%',
                    animation: 'rotate-slow 1s linear infinite', margin: '0 auto 16px'
                  }} />
                  <p style={{ fontFamily: 'DM Mono', fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>
                    Verifying on-chain...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── MAIN STORE ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{globalStyles}</style>
      <div ref={cursorRef} className="cursor" />
      <div ref={ringRef} className="cursor-ring" />

      <div style={{ position: 'relative', zIndex: 1 }}>

          <main style={{ padding: '60px 48px', maxWidth: '1200px', margin: '0 auto' }}>

          {/* ─── SECTION 1: SUBSCRIPTIONS ─────────────────────────────────────── */}
          <section style={{ marginBottom: '140px', position: 'relative' }}>
            <div className="section-num">01</div>

            <div className="fade-up" style={{ marginBottom: '60px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px', marginBottom: '12px' }}>
                <span style={{ fontFamily: 'DM Mono', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>01 /</span>
                <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '56px', letterSpacing: '2px', color: 'white', lineHeight: 1 }}>
                  Subscriptions
                </h2>
              </div>
              <p style={{ fontFamily: 'DM Mono', fontSize: '12px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em', maxWidth: '420px', lineHeight: 1.8 }}>
                Multi-pay static invoices. Monthly auto-renewing plans across all currencies.
              </p>
            </div>

            {/* Single row — one card per currency */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {[
                { id: 'CREDITS', label: 'Credits', price: 10, accent: 'rgba(255,255,255,0.9)' },
                { id: 'USDCX',   label: 'USDCx',   price: 10, accent: 'rgba(200,200,200,0.9)', featured: true },
                { id: 'USAD',    label: 'USAD',     price: 10, accent: 'rgba(160,160,160,0.9)' },
              ].map((cur, i) => (
                <div
                  key={cur.id}
                  className="plan-card fade-up"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    background: cur.featured ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${cur.featured ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '24px',
                    padding: '40px 36px',
                    position: 'relative',
                    display: 'flex', flexDirection: 'column', gap: '32px'
                  }}
                >
                  {cur.featured && (
                    <div style={{
                      position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)',
                      background: 'white', color: 'black',
                      fontFamily: 'DM Mono', fontSize: '9px', letterSpacing: '0.15em',
                      textTransform: 'uppercase', padding: '4px 16px',
                      borderRadius: '0 0 8px 8px'
                    }}>Popular</div>
                  )}

                  {/* Currency badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cur.accent, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'DM Mono', fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      {cur.label}
                    </span>
                  </div>

                  {/* Price */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', lineHeight: 1 }}>
                      <span style={{ fontFamily: 'Bebas Neue', fontSize: '80px', color: 'white', lineHeight: 1 }}>10</span>
                      <span style={{ fontFamily: 'DM Mono', fontSize: '13px', color: 'rgba(255,255,255,0.35)', paddingBottom: '6px' }}>{cur.id}<br />/mo</span>
                    </div>
                    <div style={{ fontFamily: 'DM Mono', fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '8px' }}>
                      Monthly · Auto-renewing
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

                  {/* Subscribe button */}
                  <button
                    className="btn-primary"
                    disabled={loading}
                    onClick={() => handleCheckout('checkout/subscription', { plan: 1, currency: cur.id, price: 10 })}
                    style={{
                      width: '100%', padding: '16px',
                      background: cur.featured ? 'white' : 'rgba(255,255,255,0.07)',
                      color: cur.featured ? 'black' : 'rgba(255,255,255,0.65)',
                      border: cur.featured ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '14px', cursor: loading ? 'not-allowed' : 'pointer',
                      fontFamily: 'DM Mono', fontSize: '11px', fontWeight: '500',
                      letterSpacing: '0.15em', textTransform: 'uppercase',
                      opacity: loading ? 0.5 : 1
                    }}
                  >
                    Subscribe →
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* ─── SECTION 2: BUY TOKENS ────────────────────────────────────────── */}
          <section style={{ marginBottom: '140px', position: 'relative' }}>
            <div className="section-num">02</div>

            <div className="fade-up" style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px', marginBottom: '12px' }}>
                <span style={{ fontFamily: 'DM Mono', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>02 /</span>
                <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '56px', letterSpacing: '2px', color: 'white', lineHeight: 1 }}>
                  Buy Tokens
                </h2>
              </div>
              <p style={{ fontFamily: 'DM Mono', fontSize: '12px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em', maxWidth: '420px', lineHeight: 1.8 }}>
                Standard dynamic invoices. 1 dollar = 100 tokens. Created on-demand.
              </p>
            </div>

            <div className="fade-up" style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '28px',
              overflow: 'hidden',
              position: 'relative',
            }}>

              {/* Top half — inputs */}
              <div style={{ padding: '48px 48px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', alignItems: 'end' }}>

                {/* Amount input */}
                <div>
                  <label style={{ display: 'block', fontFamily: 'DM Mono', fontSize: '10px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '14px' }}>
                    Amount (USD)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: '22px', top: '50%', transform: 'translateY(-50%)',
                      fontFamily: 'DM Mono', fontSize: '18px', color: 'rgba(255,255,255,0.2)',
                      pointerEvents: 'none'
                    }}>$</span>
                    <input
                      type="number" min="1"
                      value={dollars}
                      onChange={e => setDollars(Math.max(1, Number(e.target.value)))}
                      className="premium-input"
                      style={{
                        width: '100%', padding: '18px 18px 18px 44px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        borderRadius: '14px', color: 'white',
                        fontFamily: 'Bebas Neue', fontSize: '32px', letterSpacing: '1px',
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                      }}
                    />
                  </div>
                </div>

                {/* Pay with — toggle buttons */}
                <div>
                  <label style={{ display: 'block', fontFamily: 'DM Mono', fontSize: '10px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '14px' }}>
                    Pay With
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['USDCX', 'USAD'].map(c => {
                      const active = varCurrency === c;
                      return (
                        <button
                          key={c}
                          onClick={() => setVarCurrency(c)}
                          style={{
                            flex: 1, padding: '18px 12px',
                            background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: '14px', cursor: 'pointer',
                            fontFamily: 'DM Mono', fontSize: '13px',
                            color: active ? 'white' : 'rgba(255,255,255,0.4)',
                            letterSpacing: '0.06em',
                            transition: 'all 0.18s ease',
                            fontWeight: active ? '500' : '400',
                          }}
                        >{c}</button>
                      );
                    })}
                  </div>
                </div>

                {/* You get */}
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '14px',
                  padding: '18px 24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontFamily: 'DM Mono', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>You Get</div>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: '40px', color: 'white', lineHeight: 1, letterSpacing: '1px' }}>
                      {(dollars * 100).toLocaleString()}
                    </div>
                    <div style={{ fontFamily: 'DM Mono', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', marginTop: '5px' }}>TOKENS</div>
                  </div>
                  {/* Mini arrow */}
                  <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.1)' }}>◈</div>
                </div>
              </div>

              {/* Bottom bar — metadata + checkout button */}
              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                padding: '24px 48px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.015)'
              }}>
                <div style={{ display: 'flex', gap: '48px' }}>
                  {[
                    { label: 'Rate', val: '1 USD → 100 TKN' },
                    { label: 'Invoice', val: 'Dynamic' },
                    { label: 'Settlement', val: '< 1s' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'DM Mono', fontSize: '10px', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.label}</span>
                      <span style={{ fontFamily: 'DM Mono', fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>{item.val}</span>
                    </div>
                  ))}
                </div>

                <button
                  className="btn-primary"
                  disabled={loading}
                  onClick={() => handleCheckout('checkout/variable', { currency: varCurrency, tokens: dollars * 100, price: dollars })}
                  style={{
                    padding: '14px 36px',
                    background: 'white', color: 'black',
                    border: 'none', borderRadius: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'DM Mono', fontSize: '11px', fontWeight: '500',
                    letterSpacing: '0.15em', textTransform: 'uppercase',
                    whiteSpace: 'nowrap', opacity: loading ? 0.5 : 1,
                    flexShrink: 0
                  }}
                >
                  Checkout →
                </button>
              </div>
            </div>
          </section>

          {/* ─── SECTION 3: DONATIONS ─────────────────────────────────────────── */}
          <section style={{ marginBottom: '80px', position: 'relative' }}>
            <div className="section-num">03</div>

            <div className="fade-up" style={{ marginBottom: '60px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px', marginBottom: '12px' }}>
                <span style={{ fontFamily: 'DM Mono', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>03 /</span>
                <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '56px', letterSpacing: '2px', color: 'white', lineHeight: 1 }}>
                  Support Us
                </h2>
              </div>
              <p style={{ fontFamily: 'DM Mono', fontSize: '12px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em', maxWidth: '420px', lineHeight: 1.8 }}>
                Donation Profile invoices. Pre-generated hash and salt via SDK.
              </p>
            </div>

            <div className="fade-up" style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'stretch'
            }}>
              {/* Left: currency buttons + checkout */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '28px', padding: '48px',
                display: 'flex', flexDirection: 'column', gap: '32px'
              }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'DM Mono', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '20px' }}>
                    Accepted Currency
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { id: 'ANY',     label: 'Any',     sub: 'Payer chooses' },
                      { id: 'CREDITS', label: 'Credits', sub: 'CREDITS only' },
                      { id: 'USDCX',  label: 'USDCx',   sub: 'USDCX only' },
                      { id: 'USAD',   label: 'USAD',    sub: 'USAD only' },
                    ].map(opt => {
                      const active = donationCurrency === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setDonationCurrency(opt.id)}
                          style={{
                            padding: '16px 18px',
                            background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.07)'}`,
                            borderRadius: '14px', cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ fontFamily: 'DM Mono', fontSize: '13px', color: active ? 'white' : 'rgba(255,255,255,0.45)', fontWeight: '500', letterSpacing: '0.05em', marginBottom: '3px' }}>
                            {opt.label}
                          </div>
                          <div style={{ fontFamily: 'DM Mono', fontSize: '9px', color: active ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {opt.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  className="btn-primary"
                  disabled={loading}
                  onClick={() => handleCheckout('checkout/donation', { currency: donationCurrency })}
                  style={{
                    width: '100%', padding: '18px',
                    background: 'white', color: 'black',
                    border: 'none', borderRadius: '14px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'DM Mono', fontSize: '11px', fontWeight: '500',
                    letterSpacing: '0.15em', textTransform: 'uppercase',
                    opacity: loading ? 0.5 : 1, marginTop: 'auto'
                  }}
                >
                  Create Session →
                </button>
              </div>

              {/* Right: info card */}
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '28px', padding: '48px',
                display: 'flex', flexDirection: 'column', gap: '24px'
              }}>
                <div style={{
                  fontFamily: 'Instrument Serif',
                  fontStyle: 'italic',
                  fontSize: '28px',
                  color: 'rgba(255,255,255,0.7)',
                  lineHeight: 1.4
                }}>
                  "Every contribution is recorded immutably on the Aleo chain."
                </div>

                <div style={{ flex: 1, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '24px' }}>
                  {[
                    { label: 'Privacy model', val: 'ZK Proof' },
                    { label: 'Invoice model', val: 'Donation Profile' },
                    { label: 'Amount', val: 'Payer-defined' },
                    { label: 'Chain', val: 'Aleo / Provable' },
                  ].map((row, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.04)'
                    }}>
                      <span style={{ fontFamily: 'DM Mono', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{row.label}</span>
                      <span style={{ fontFamily: 'DM Mono', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>


      </div>
    </>
  );
}

export default App;