/**
 * Inicialización de plugins nativos de Capacitor.
 * Se importa desde main.jsx — solo ejecuta lógica cuando corre en app nativa.
 */
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export async function initNativeApp() {
    if (!Capacitor.isNativePlatform()) return;

    // Marcar body para CSS de safe areas
    document.body.classList.add('capacitor-app');

    // Status Bar — importar dinámicamente para no romper web builds
    try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#1e293b' });
    } catch (_) {
        // Plugin no disponible — ok en web
    }

    // Splash Screen — ocultar cuando la app esté lista
    try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
    } catch (_) {
        // Plugin no disponible
    }

    // Back button de Android — navegar atrás o salir
    App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
            window.history.back();
        } else {
            App.exitApp();
        }
    });
}
