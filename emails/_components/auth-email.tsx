import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Link,
    Preview,
    Section,
    Text,
} from "react-email"
import type { CSSProperties } from "react"
import { createTranslator } from "../../src/lib/i18n/translate"
import type { Locale } from "../../src/lib/i18n/config"

export type AuthEmailProps = { url: string; locale?: Locale }

type AuthEmailLayoutProps = AuthEmailProps & {
    preview: string
    heading: string
    message: string
    action: string
    expiry: string
    security: string
}

// Based on React Email's Barebone theme: neutral surfaces, generous spacing,
// and one clear action. Inline styles also work when a mail client strips CSS.
export function AuthEmailLayout({
    url,
    preview,
    heading,
    message,
    action,
    expiry,
    security,
    locale = "en",
}: AuthEmailLayoutProps) {
    const t = createTranslator(locale)
    return (
        <Html lang={locale}>
            <Head>
                <style>{`@media (max-width: 600px) {
                    .email-shell { padding: 0 !important; }
                    .email-content { padding: 40px 20px !important; }
                }`}</style>
            </Head>
            <Preview>{t(preview)}</Preview>
            <Body style={styles.body}>
                <Container className="email-shell" style={styles.shell}>
                    <Section style={styles.frame}>
                        <Text style={styles.brand}>CentScope</Text>
                        <Section
                            className="email-content"
                            style={styles.content}
                        >
                            <Heading as="h1" style={styles.heading}>
                                {t(heading)}
                            </Heading>
                            <Text style={styles.message}>{t(message)}</Text>
                            <Button href={url} style={styles.button}>
                                {t(action)}
                            </Button>
                            <Text style={styles.expiry}>{t(expiry)}</Text>
                            <Text style={styles.security}>{t(security)}</Text>
                        </Section>
                        <Section style={styles.fallback}>
                            <Text style={styles.caption}>
                                {t(
                                    "Button not working? Copy and paste this link into your browser:"
                                )}
                            </Text>
                            <Link href={url} style={styles.link}>
                                {url}
                            </Link>
                        </Section>
                        <Text style={styles.footer}>
                            {t("CentScope · Make sense of every cent.")}
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}

const styles = {
    body: {
        margin: 0,
        backgroundColor: "#f3f4f6",
        color: "#14171e",
        fontFamily: "Arial, Helvetica, sans-serif",
    },
    shell: {
        width: "100%",
        maxWidth: "640px",
        margin: "0 auto",
        padding: "32px 12px",
    },
    frame: { backgroundColor: "#ffffff", padding: "24px" },
    brand: {
        margin: "0 0 24px",
        fontSize: "16px",
        fontWeight: 700,
        letterSpacing: "-0.4px",
    },
    content: {
        backgroundColor: "#f3f4f6",
        borderRadius: "8px",
        padding: "56px 32px",
        textAlign: "center",
    },
    heading: {
        margin: "0 0 20px",
        fontSize: "28px",
        lineHeight: "36px",
        fontWeight: 600,
        letterSpacing: "-0.5px",
    },
    message: {
        margin: "0 0 28px",
        fontSize: "16px",
        lineHeight: "25px",
        color: "#43454b",
    },
    button: {
        backgroundColor: "#14171e",
        color: "#ffffff",
        borderRadius: "8px",
        padding: "16px 28px",
        fontSize: "16px",
        lineHeight: "24px",
        fontWeight: 600,
        textDecoration: "none",
        textAlign: "center",
    },
    expiry: {
        margin: "24px 0 0",
        fontSize: "13px",
        lineHeight: "20px",
        color: "#43454b",
    },
    security: {
        margin: "16px 0 0",
        fontSize: "13px",
        lineHeight: "20px",
        color: "#60646c",
    },
    fallback: { padding: "24px 0", borderBottom: "1px solid #e4e4e7" },
    caption: {
        margin: "0 0 8px",
        fontSize: "12px",
        lineHeight: "19px",
        color: "#60646c",
    },
    link: {
        fontSize: "12px",
        lineHeight: "20px",
        color: "#43454b",
        textDecoration: "underline",
        wordBreak: "break-all",
    },
    footer: {
        margin: "24px 0 0",
        fontSize: "12px",
        lineHeight: "20px",
        textAlign: "center",
        color: "#60646c",
    },
} satisfies Record<string, CSSProperties>
