"use server"
import { action } from "~/utils/actions"
import { registerInputSchema } from "./auth.validation"
import { usersService } from "../users/users.service"
import { DEFAULT_USER_IMAGE } from "~/config/constants"

export const registerAction = action(
    {
        input: registerInputSchema,
    },
    async (data) => {
        try {
            const user = await usersService.createUser({
                email: data.email,
                username: data.username,
                password: data.password,
                image: DEFAULT_USER_IMAGE,
            })
            return { user }
        } catch (error) {
            return {
                error: {
                    message: (error as Error).message,
                    code: 400,
                },
            }
        }
    },
)
