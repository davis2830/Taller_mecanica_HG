import React from 'react';
import { Wrench } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer style={{ borderTop: '1px solid rgba(30,41,59,0.6)', paddingTop: '4rem', paddingBottom: '2rem', position: 'relative' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem' }}>
        <div className="landing-footer-grid" style={{ marginBottom: '3rem' }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '2.25rem', height: '2.25rem',
                background: 'linear-gradient(to bottom right, #f59e0b, #ea580c)',
                borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Wrench style={{ width: '1.25rem', height: '1.25rem', color: '#fff' }} />
              </div>
              <span className="landing-gradient-text" style={{ fontSize: '1.25rem', fontWeight: 700 }}>GC Torque</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>
              ERP integral para talleres mecanicos. Gestion de citas, inventario, ordenes de trabajo y facturacion electronica FEL.
            </p>
          </div>

          {/* Producto */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>Producto</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem', color: '#64748b' }}>
              <li><a href="#servicios" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#fbbf24'} onMouseLeave={e => e.target.style.color='#64748b'}>Funcionalidades</a></li>
              <li><a href="#precios" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#fbbf24'} onMouseLeave={e => e.target.style.color='#64748b'}>Planes y Precios</a></li>
              <li><a href="#como-funciona" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#fbbf24'} onMouseLeave={e => e.target.style.color='#64748b'}>Como Funciona</a></li>
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>Empresa</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem', color: '#64748b' }}>
              <li><a href="#porque" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#fbbf24'} onMouseLeave={e => e.target.style.color='#64748b'}>Por que nosotros</a></li>
              <li><a href="#contacto" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#fbbf24'} onMouseLeave={e => e.target.style.color='#64748b'}>Solicitar Demo</a></li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>Contacto</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem', color: '#64748b' }}>
              <li>info@gctorque.com</li>
              <li>+502 1234-5678</li>
              <li>Guatemala, GT</li>
            </ul>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(30,41,59,0.5)', paddingTop: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: '#475569' }}>
            &copy; {new Date().getFullYear()} GC Torque — Powered by TechOps. Todos los derechos reservados.
          </p>
        </div>
      </div>

      <style>{`
        .landing-footer-grid { display: grid; grid-template-columns: 1fr; gap: 2.5rem; }
        @media (min-width: 768px) { .landing-footer-grid { grid-template-columns: 2fr 1fr 1fr 1fr; } }
      `}</style>
    </footer>
  );
}
