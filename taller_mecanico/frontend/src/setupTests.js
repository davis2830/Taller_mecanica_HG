// Setup global para todos los tests de Vitest.
// Importa los matchers extendidos de @testing-library/jest-dom
// (ej. `toBeInTheDocument`, `toHaveTextContent`) para React Testing Library.
import '@testing-library/jest-dom'

// Vitest: cleanup automático del DOM entre tests — normalmente React Testing
// Library lo hace solo si se detecta el entorno vitest con globals=true, pero
// lo forzamos explícitamente para evitar sorpresas.
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
