import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/login.css';

// ⚠️ InputField definido FUERA del componente para evitar recreación en cada render
//    Si está adentro, React desmonta/monta el input en cada tecleo → pierde el foco.
function InputField({ name, label, type, placeholder, value, onChange, focusedField, setFocusedField, disabled }) {
    return (
        <div className="login-form-group" style={{ marginBottom: '1rem' }}>
            <label className="login-form-label">{label}</label>
            <div className={`login-input-field ${focusedField === name ? 'focused' : ''}`}>
                <input
                    name={name}
                    type={type || 'text'}
                    required
                    value={value}
                    onChange={onChange}
                    className="login-input"
                    style={{ paddingLeft: '1rem' }}
                    onFocus={() => setFocusedField(name)}
                    onBlur={() => setFocusedField(null)}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete={type === 'password' ? 'new-password' : 'off'}
                />
                <div className="input-underline"></div>
            </div>
        </div>
    );
}

function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirm: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.password !== formData.password_confirm) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await axios.post('http://localhost:8000/api/v1/usuarios/registro/', formData);
            if (res.data.success) {
                setSuccess(res.data.message || '¡Cuenta creada! Revisa tu correo para activarla.');
                setTimeout(() => navigate('/login'), 5000);
            }
        } catch (err) {
            if (err.response?.data?.details) {
                const firstErr = Object.values(err.response.data.details)[0];
                setError(firstErr);
            } else {
                setError(err.response?.data?.error || 'Error al registrarse. Verifica tus datos.');
            }
        }
        setIsLoading(false);
    };

    const fieldProps = {
        onChange: handleChange,
        focusedField,
        setFocusedField,
        disabled: isLoading || !!success
    };

    return (
        <div className="login-wrapper">
            {/* Fondo animado */}
            <div className="login-canvas-background">
                <div className="login-blob login-blob-1"></div>
                <div className="login-blob login-blob-2"></div>
                <div className="login-blob login-blob-3"></div>
                <div className="login-particles"></div>
            </div>

            <div className="login-main-container">
                {/* Formulario */}
                <div className="login-form-section">
                    <div className="login-form-content" style={{ maxWidth: '460px' }}>
                        <div className="login-form-header" style={{ marginBottom: '1.5rem' }}>
                            <div className="login-logo-wrapper">
                                <div className="login-logo-circle">
                                    <div className="login-logo-inner">
                                        <span className="login-logo-text">🔧</span>
                                    </div>
                                </div>
                            </div>
                            <h1 className="login-form-title">Crear Cuenta</h1>
                            <p className="login-form-subtitle">Únete a AutoServi Pro</p>
                        </div>

                        {/* Alertas */}
                        {error && (
                            <div className="login-alert login-alert-error" style={{ marginBottom: '1.25rem' }}>
                                <svg className="alert-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}
                        {success && (
                            <div style={{
                                background: 'rgba(16,185,129,0.15)',
                                color: '#34d399',
                                border: '1px solid rgba(16,185,129,0.3)',
                                padding: '14px 16px',
                                borderRadius: '14px',
                                marginBottom: '1.25rem',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <span>✅</span>
                                <span>{success} Redirigiendo al inicio de sesión…</span>
                            </div>
                        )}

                        <form className="login-form" onSubmit={handleSubmit}>
                            {/* Nombre y Apellido en fila */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <InputField name="first_name" label="Nombre"   placeholder="Juan"  value={formData.first_name} {...fieldProps} />
                                <InputField name="last_name"  label="Apellido" placeholder="Pérez" value={formData.last_name}  {...fieldProps} />
                            </div>

                            <InputField name="email" label="Correo Electrónico" type="email" placeholder="juan@ejemplo.com" value={formData.email} {...fieldProps} />

                            {/* Contraseñas en fila */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <InputField name="password"         label="Contraseña" type="password" placeholder="••••••••" value={formData.password}         {...fieldProps} />
                                <InputField name="password_confirm" label="Confirmar"  type="password" placeholder="••••••••" value={formData.password_confirm} {...fieldProps} />
                            </div>

                            <button
                                type="submit"
                                className="login-submit-btn"
                                disabled={isLoading || !!success}
                                style={{ marginTop: '0.5rem' }}
                            >
                                <span className="btn-text">
                                    {isLoading ? 'Creando cuenta…' : success ? '¡Cuenta Creada!' : 'Registrarse'}
                                </span>
                                {!success && (
                                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                        <polyline points="12 5 19 12 12 19"></polyline>
                                    </svg>
                                )}
                            </button>

                            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>¿Ya tienes cuenta? </span>
                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="login-forgot-link"
                                    style={{ fontSize: '0.875rem' }}
                                >
                                    Inicia Sesión aquí
                                </button>
                            </div>
                        </form>

                        <div className="login-form-footer" style={{ marginTop: '1.5rem' }}>
                            <p className="login-footer-text">© 2026 AutoServi Pro | Sistema de Taller Mecánico</p>
                        </div>
                    </div>
                </div>

                {/* Panel derecho promo */}
                <div className="login-promo-section">
                    <div className="promo-content">
                        <div className="promo-badge">🚗 Portal Cliente</div>
                        <h2 className="promo-title">Tu Taller, Tu Portal</h2>
                        <p className="promo-description">
                            Crea tu cuenta para dar seguimiento en tiempo real al estado de tu vehículo, gestionar citas y ver tu historial de servicios.
                        </p>
                        <div className="promo-features">
                            <div className="promo-feature">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                <span>Estado de tu Vehículo en Vivo</span>
                            </div>
                            <div className="promo-feature">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                <span>Historial de Servicios</span>
                            </div>
                            <div className="promo-feature">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                <span>Notificaciones por Correo</span>
                            </div>
                        </div>
                        <div className="promo-illustration">
                            <div className="illustration-circle circle-1"></div>
                            <div className="illustration-circle circle-2"></div>
                            <div className="illustration-circle circle-3"></div>
                            <span className="illustration-icon">⚙️</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;
