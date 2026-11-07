import { locale } from "next/root-params"
import { notFound } from "next/navigation"
import { isLocale } from "./config"
import { createTranslator } from "./translate"

export async function getLocale() {
    const value = await locale()
    if (!isLocale(value)) notFound()
    return value
}

export async function getTranslations() {
    return createTranslator(await getLocale())
}
