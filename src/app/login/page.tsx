'use client'

import { useFormState } from 'react-dom'
import { login } from './action'

const initialState = {
    error: '',
}

export default function LoginPage() {
    const [state, formAction] = useFormState(login, initialState)

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="z-10 w-full max-w-md p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Acceso Restringido
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm">
                        Bienvenido, Arturo, a tu Segundo Cerebro.
                    </p>
                </div>

                <form action={formAction} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            name="password"
                            placeholder="Contraseña"
                            className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                            required
                        />
                    </div>

                    {state?.error && (
                        <div className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded border border-red-500/20">
                            {state.error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full py-3 rounded-lg bg-white text-slate-900 font-semibold hover:bg-slate-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                        Entrar al Sistema
                    </button>
                </form>
            </div>

            <div className="absolute bottom-8 text-slate-600 text-xs">
                ZENITH OS v2.0 • SECURE CONNECTION
            </div>
        </div>
    )
}
