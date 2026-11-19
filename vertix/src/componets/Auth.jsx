
import { useState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { supabase } from '../supabaseClient'

function Auth() {
  const [mode, setMode] = useState('login')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [aceptaDatos, setAceptaDatos] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaKey, setCaptchaKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY

  const cambiarModo = (nuevoModo) => {
    setMode(nuevoModo)
    setMensaje('')
    setError('')
    setPassword('')
    setConfirmPassword('')
    setCaptchaToken('')
    setCaptchaKey((actual) => actual + 1)
  }

  const reiniciarCaptcha = () => {
    setCaptchaToken('')
    setCaptchaKey((actual) => actual + 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMensaje('')
    setError('')

    if (!correo.trim()) {
      setError('Ingresa tu correo electrónico.')
      return
    }

    if (mode !== 'recovery' && !password) {
      setError('Ingresa tu contraseña.')
      return
    }

    if (mode === 'register') {
      if (!nombre.trim()) {
        setError('Ingresa tu nombre.')
        return
      }

      if (password.length < 8) {
        setError('La contraseña debe tener mínimo 8 caracteres.')
        return
      }

      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.')
        return
      }

      if (!aceptaTerminos || !aceptaDatos) {
        setError('Debes aceptar los términos y la política de tratamiento de datos.')
        return
      }
    }

    if (siteKey && !captchaToken) {
      setError('Completa la verificación CAPTCHA.')
      return
    }

    setLoading(true)

    try {
      let result

      if (mode === 'login') {
        result = await supabase.auth.signInWithPassword({
          email: correo.trim(),
          password,
          options: siteKey ? { captchaToken } : undefined
        })
      }

      if (mode === 'register') {
        result = await supabase.auth.signUp({
          email: correo.trim(),
          password,
          options: {
            ...(siteKey ? { captchaToken } : {}),
            data: {
              nombre: nombre.trim(),
              acepta_terminos: aceptaTerminos,
              acepta_tratamiento_datos: aceptaDatos
            }
          }
        })
      }

      if (mode === 'recovery') {
        result = await supabase.auth.resetPasswordForEmail(
          correo.trim(),
          siteKey ? { captchaToken } : {}
        )
      }

      if (result?.error) {
        throw result.error
      }

      if (mode === 'register') {
        if (result.data?.session) {
          setMensaje('¡Tu cuenta fue creada correctamente!')
        } else {
          setMensaje('Cuenta creada. Revisa tu correo para confirmar el registro antes de iniciar sesión.')
        }
      }

      if (mode === 'recovery') {
        setMensaje('Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.')
      }

      if (mode === 'login') {
        setMensaje('Inicio de sesión exitoso.')
      }

      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message || 'Ocurrió un error. Inténtalo nuevamente.')
    } finally {
      setLoading(false)
      reiniciarCaptcha()
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <h1>VÉRTI<span>X</span></h1>
          <p>GESTIONA. ANALIZA. CRECE.</p>
        </div>

        <div className="auth-heading">
          <span className="auth-tag">PLATAFORMA DE GESTIÓN EMPRESARIAL</span>

          <h2>
            {mode === 'login' && 'Bienvenido de nuevo'}
            {mode === 'register' && 'Crea tu cuenta'}
            {mode === 'recovery' && 'Recupera tu acceso'}
          </h2>

          <p>
            {mode === 'login' && 'Ingresa a tu espacio de trabajo.'}
            {mode === 'register' && 'Comienza a gestionar tus negocios con VÉRTIX.'}
            {mode === 'recovery' && 'Te enviaremos instrucciones a tu correo electrónico.'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <label htmlFor="auth-name">Nombre completo</label>
              <input
                id="auth-name"
                type="text"
                placeholder="Tu nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoComplete="name"
              />
            </>
          )}

          <label htmlFor="auth-email">Correo electrónico</label>
          <input
            id="auth-email"
            type="email"
            placeholder="correo@ejemplo.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            autoComplete="email"
          />

          {mode !== 'recovery' && (
            <>
              <label htmlFor="auth-password">Contraseña</label>
              <input
                id="auth-password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </>
          )}

          {mode === 'register' && (
            <>
              <label htmlFor="auth-confirm-password">Confirmar contraseña</label>
              <input
                id="auth-confirm-password"
                type="password"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />

              <div className="auth-consents">
                <label className="auth-check">
                  <input
                    type="checkbox"
                    checked={aceptaTerminos}
                    onChange={(e) => setAceptaTerminos(e.target.checked)}
                  />
                  <span>He leído y acepto los términos y condiciones de VÉRTIX.</span>
                </label>

                <label className="auth-check">
                  <input
                    type="checkbox"
                    checked={aceptaDatos}
                    onChange={(e) => setAceptaDatos(e.target.checked)}
                  />
                  <span>Autorizo el tratamiento de mis datos personales según la política de privacidad.</span>
                </label>
              </div>
            </>
          )}

          {mode === 'login' && (
            <button
              type="button"
              className="auth-text-button"
              onClick={() => cambiarModo('recovery')}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          {siteKey && (
            <div className="auth-captcha">
              <Turnstile
                key={captchaKey}
                siteKey={siteKey}
                onSuccess={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken('')}
                onError={(error) => {
                  console.error('[Turnstile] error:', error)
                  setCaptchaToken('')
                  setError(
                    `No fue posible cargar el CAPTCHA (código ${error}). Inténtalo de nuevo.`
                  )
                }}
              />
            </div>
          )}

          {!siteKey && (
            <p className="auth-captcha-notice">
              CAPTCHA pendiente de configuración.
            </p>
          )}

          {error && <div className="auth-message auth-error">{error}</div>}
          {mensaje && <div className="auth-message auth-success">{mensaje}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? 'Procesando...'
              : mode === 'login'
                ? 'Iniciar sesión'
                : mode === 'register'
                  ? 'Crear cuenta'
                  : 'Enviar instrucciones'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' && (
            <p>
              ¿Todavía no tienes cuenta?{' '}
              <button onClick={() => cambiarModo('register')}>Regístrate</button>
            </p>
          )}

          {mode === 'register' && (
            <p>
              ¿Ya tienes una cuenta?{' '}
              <button onClick={() => cambiarModo('login')}>Inicia sesión</button>
            </p>
          )}

          {mode === 'recovery' && (
            <p>
              ¿Recordaste tu contraseña?{' '}
              <button onClick={() => cambiarModo('login')}>Volver al inicio</button>
            </p>
          )}
        </div>

        <footer className="auth-footer">
          VÉRTIX © 2026 — Gestiona, analiza y haz crecer tu negocio.
        </footer>
      </section>
    </main>
  )
}

export default Auth
