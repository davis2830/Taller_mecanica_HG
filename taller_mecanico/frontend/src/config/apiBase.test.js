/**
 * Smoke tests de `apiUrl()` — helper central para construir URLs del backend.
 * No prueba la lógica de negocio, solo que el helper NO se rompa y sus casos
 * base estén cubiertos (evita regresiones tipo PR #39 en el frontend).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('apiUrl', () => {
  let originalEnv

  beforeEach(() => {
    originalEnv = { ...import.meta.env }
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('devuelve el path intacto cuando VITE_API_BASE_URL no está seteado', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { apiUrl } = await import('./apiBase.js?nocache=1')
    expect(apiUrl('/api/v1/usuarios/me/')).toBe('/api/v1/usuarios/me/')
  })

  it('devuelve una URL absoluta tal cual viene', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
    const { apiUrl } = await import('./apiBase.js?nocache=2')
    expect(apiUrl('https://cdn.example.com/logo.png'))
      .toBe('https://cdn.example.com/logo.png')
  })

  it('prepend VITE_API_BASE_URL al path cuando está seteado', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
    const { apiUrl } = await import('./apiBase.js?nocache=3')
    expect(apiUrl('/media/logo.png')).toBe('http://api.test/media/logo.png')
  })

  it('agrega separador "/" si el path no lo tiene', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
    const { apiUrl } = await import('./apiBase.js?nocache=4')
    expect(apiUrl('media/x.jpg')).toBe('http://api.test/media/x.jpg')
  })

  it('devuelve string vacío o base para path vacío', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { apiUrl } = await import('./apiBase.js?nocache=5')
    expect(apiUrl('')).toBe('')
  })
})
