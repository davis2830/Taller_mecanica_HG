import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../styles/login.css';

function Login() {
    const { loginUser } = useContext(AuthContext);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const success = await loginUser(username, password);
        if (!success) {
            setError('Credenciales incorrectas o cuenta inactiva.');
        }
        setIsLoading(false);
    };

    return (
        <div className="login-wrapper">
            {/* Canvas de fondo animado */}
            <div className="login-canvas-background">
                <div className="login-blob login-blob-1"></div>
                <div className="login-blob login-blob-2"></div>
                <div className="login-blob login-blob-3"></div>
                <div className="login-particles"></div>
            </div>

            {/* Contenedor principal */}
            <div className="login-main-container">
                {/* Lado izquierdo - Formulario */}
                <div className="login-form-section">
                    <div className="login-form-content">
                        {/* Header con logo */}
                        <div className="login-form-header">
                            <div className="login-logo-wrapper">
                                <div className="login-logo-circle">
                                    <div className="login-logo-inner">
                                        <span className="login-logo-text">🔧</span>
                                    </div>
                                </div>
                            </div>
                            <h1 className="login-form-title">AutoServi Pro</h1>
                            <p className="login-form-subtitle">Sistema de Gestión Integral</p>
                        </div>

                        {/* Formulario */}
                        <form className="login-form" onSubmit={handleSubmit}>
                            {/* Alerta de error */}
                            {error && (
                                <div className="login-alert login-alert-error">
                                    <svg className="alert-icon" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                                    </svg>
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Campo Usuario */}
                            <div className="login-form-group">
                                <label htmlFor="username" className="login-form-label">
                                    Usuario o Correo
                                </label>
                                <div 
                                    className={`login-input-field ${focusedField === 'username' ? 'focused' : ''}`}
                                    onFocus={() => setFocusedField('username')}
                                    onBlur={() => setFocusedField(null)}
                                >
                                    <svg className="input-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    <input
                                        id="username"
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="login-input"
                                        placeholder="usuario@taller.com"
                                        disabled={isLoading}
                                    />
                                    <div className="input-underline"></div>
                                </div>
                            </div>

                            {/* Campo Contraseña */}
                            <div className="login-form-group">
                                <label htmlFor="password" className="login-form-label">
                                    Contraseña
                                </label>
                                <div 
                                    className={`login-input-field ${focusedField === 'password' ? 'focused' : ''}`}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                >
                                    <svg className="input-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                    <input
                                        id="password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="login-input"
                                        placeholder="••••••••••"
                                        disabled={isLoading}
                                    />
                                    <div className="input-underline"></div>
                                </div>
                            </div>

                            {/* Opciones */}
                            <div className="login-form-options">
                                <label className="login-checkbox">
                                    <input type="checkbox" />
                                    <span>Recuerda mis credenciales</span>
                                </label>
                                <a href="#" className="login-forgot-link">¿Olvidaste tu contraseña?</a>
                            </div>

                            {/* Botón Submit */}
                            <button
                                type="submit"
                                className="login-submit-btn"
                                disabled={isLoading}
                            >
                                <span className="btn-text">
                                    {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                                </span>
                                <span className="btn-loader"></span>
                                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                    <polyline points="12 5 19 12 12 19"></polyline>
                                </svg>
                            </button>
                        </form>

                        {/* Footer del formulario */}
                        <div className="login-form-footer">
                            <p className="login-footer-text">
                                © 2026 AutoServi Pro | Sistema de Taller Mecánico
                            </p>
                        </div>
                    </div>
                </div>

                {/* Lado derecho - Promoción */}
                <div className="login-promo-section">
                    <div className="promo-content">
                        <div className="promo-badge">🏆 Premium</div>
                        <h2 className="promo-title">Solución Completa</h2>
                        <p className="promo-description">
                            Gestión integral de tu taller mecánico con herramientas profesionales
                        </p>
                        <div className="promo-features">
                            <div className="promo-feature">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                </svg>
                                <span>Gestión de Citas</span>
                            </div>
                            <div className="promo-feature">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                </svg>
                                <span>Tablero Kanban</span>
                            </div>
                            <div className="promo-feature">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                </svg>
                                <span>Calendario Integrado</span>
                            </div>
                            <div className="promo-feature">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                </svg>
                                <span>Reportes Detallados</span>
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

export default Login;
