import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { USER_TOKEN } from '~/config/constants'
import { authService } from '~/modules/auth/auth.service'

export const AuthRequiredPage = async ({
    children,
}: {
    children: React.ReactNode
}) => {
    const token = cookies().get(USER_TOKEN)?.value

    if (!token) redirect('/login')

    const isTokenValid = await authService.getPayloadFromToken(token)

    if (!isTokenValid) redirect('/login')

    return <>{children}</>
}