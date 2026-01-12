'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
    const password = formData.get('password')

    if (password === '123!') {
        // Set cookie that expires in 30 days
        const oneMonth = 30 * 24 * 60 * 60 * 1000
        const cookieStore = await cookies()
        cookieStore.set('zenith_auth', 'true', {
            expires: Date.now() + oneMonth,
            httpOnly: true,
            path: '/'
        })
        redirect('/')
    } else {
        return { error: 'Contraseña incorrecta' }
    }
}
