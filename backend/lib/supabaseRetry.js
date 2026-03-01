/**
 * withRetry – wraps a Supabase query function with automatic retry logic.
 *
 * Usage:
 *   const { data, error } = await withRetry(() =>
 *     supabase.from('posts').select('*')
 *   );
 *
 * On transient SSL / network errors (e.g. Supabase 525 incidents) it will
 * retry up to MAX_RETRIES times with exponential back-off before giving up.
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 800; // first retry after 800 ms, then 1600 ms, 3200 ms …

// Error messages / codes that indicate a transient network problem
const TRANSIENT_PATTERNS = [
    'ssl', 'handshake', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT',
    'ENOTFOUND', 'socket hang up', 'network', 'fetch failed', '525', '522',
];

function isTransient(err) {
    if (!err) return false;
    const msg = (err.message || err.toString() || '').toLowerCase();
    return TRANSIENT_PATTERNS.some(p => msg.includes(p.toLowerCase()));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * @param {() => Promise<{data: any, error: any}>} queryFn  – zero-arg function that returns a Supabase query
 * @param {number} retries – max retry attempts (default MAX_RETRIES)
 * @returns {Promise<{data: any, error: any}>}
 */
async function withRetry(queryFn, retries = MAX_RETRIES) {
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const result = await queryFn();

            // Supabase wraps errors in result.error (not thrown)
            if (result?.error && isTransient(result.error)) {
                lastError = result.error;
                if (attempt < retries) {
                    const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                    console.warn(
                        `[supabase] Transient error on attempt ${attempt + 1}/${retries + 1}. ` +
                        `Retrying in ${delay}ms… (${result.error.message})`
                    );
                    await sleep(delay);
                    continue;
                }
                return result; // exhausted — return the error to the caller
            }

            return result; // success or non-transient error

        } catch (thrown) {
            lastError = thrown;
            if (isTransient(thrown) && attempt < retries) {
                const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                console.warn(
                    `[supabase] Network exception on attempt ${attempt + 1}/${retries + 1}. ` +
                    `Retrying in ${delay}ms… (${thrown.message})`
                );
                await sleep(delay);
            } else {
                throw thrown; // non-transient or exhausted
            }
        }
    }

    // Return a structured error so callers can handle gracefully
    return { data: null, error: lastError };
}

module.exports = { withRetry };
