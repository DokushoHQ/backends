import { z } from "zod"
import { Language } from "./db"

/**
 * Zod schema for the Language enum from Prisma.
 * Uses z.nativeEnum() to derive from the Prisma-generated Language const.
 */
export const languageSchema = z.nativeEnum(Language)

/**
 * Zod schema for an array of languages.
 */
export const languageArraySchema = z.array(languageSchema)
