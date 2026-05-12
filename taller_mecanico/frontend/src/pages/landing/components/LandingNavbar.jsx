import React, { useState, useEffect } from 'react';
import { Menu, X, Wrench } from 'lucide-react';

export default function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const links = [
    { href: '#servicios', label: 'Servicios' },
    { href: '#como-funciona', label: 'Cómo Funciona' },
    { href: '#precios', label: 'Precios' },
    { href: '#porque', label: '¿Por Qué?' },
    { href: '#contacto', label: 'Contacto' },
  ];

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-500 ${scrolled ? 'landing-glass shadow-2xl shadow-black/20' : 'bg-transparent'}`}
    >
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '5rem' }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{
              width: '2.5rem', height: '2.5rem',
              background: 'linear-gradient(to bottom right, #f59e0b, #ea580c)',
              borderRadius: '0.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(245, 158, 11, 0.2)',
            }}>
              <Wrench style={{ width: '1.25rem', height: '1.25rem', color: '#fff' }} />
            </div>
            <span className="landing-gradient-text" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              GC Torque
            </span>
          </a>

          {/* Desktop links */}
          <div style={{ display: 'none' }} className="landing-nav-desktop">
            {links.map(l => (
              <a
                key={l.href}
                href={l.href}
                style={{
                  fontSize: '0.875rem', color: '#94a3b8', textDecoration: 'none',
                  fontWeight: 500, letterSpacing: '0.025em', transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.target.style.color = '#fbbf24'}
                onMouseLeave={e => e.target.style.color = '#94a3b8'}
              >
                {l.label}
              </a>
            ))}
            <a href="#contacto" className="landing-btn-primary" style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem' }}>
              Solicitar Demo
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            className="landing-nav-mobile-btn"
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'none' }}
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
          >
            {open ? <X style={{ width: '1.5rem', height: '1.5rem' }} /> : <Menu style={{ width: '1.5rem', height: '1.5rem' }} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="landing-glass landing-nav-mobile-menu landing-animate-slideUp" style={{ borderTop: '1px solid rgba(30,41,59,0.5)' }}>
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {links.map(l => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                style={{ padding: '0.5rem 0', color: '#cbd5e1', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#fbbf24'}
                onMouseLeave={e => e.target.style.color = '#cbd5e1'}
              >
                {l.label}
              </a>
            ))}
            <a
              href="#contacto"
              onClick={() => setOpen(false)}
              className="landing-btn-primary"
              style={{ justifyContent: 'center', marginTop: '0.75rem' }}
            >
              Solicitar Demo
            </a>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .landing-nav-desktop { display: flex !important; align-items: center; gap: 2rem; }
          .landing-nav-mobile-btn { display: none !important; }
        }
        @media (max-width: 767px) {
          .landing-nav-mobile-btn { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
