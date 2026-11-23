/**
 * Name of the Studio session cookie (ADR-0012). Over HTTPS (production) it carries the
 * `__Host-` prefix: the browser then accepts it only as `Secure`, for path `/` and without a
 * domain, so no subdomain or plain-HTTP page can set or overwrite it.
 */
export const SECURE_COOKIES = process.env.NODE_ENV === 'production';

export const SESSION_COOKIE = SECURE_COOKIES ? '__Host-rici-studio-session' : 'rici-studio-session';
