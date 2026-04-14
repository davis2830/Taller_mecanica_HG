import React from 'react';
import '../styles/app-footer.css';

export default function AppFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="app-footer">
            <div className="footer-container">
                <div className="footer-content">
                    <div className="footer-section">
                        <h4>AutoServi Pro</h4>
                        <p>Sistema integral de gestión para talleres mecánicos</p>
                    </div>

                    <div className="footer-section">
                        <h4>Enlaces Rápidos</h4>
                        <ul>
                            <li><a href="/">Dashboard</a></li>
                            <li><a href="/citas">Citas</a></li>
                            <li><a href="/kanban">Órdenes</a></li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4>Soporte</h4>
                        <ul>
                            <li><a href="#ayuda">Ayuda</a></li>
                            <li><a href="#contacto">Contacto</a></li>
                            <li><a href="#docs">Documentación</a></li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>&copy; {currentYear} AutoServi Pro. Todos los derechos reservados.</p>
                    <div className="footer-links">
                        <a href="#privacidad">Privacidad</a>
                        <a href="#terminos">Términos</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
