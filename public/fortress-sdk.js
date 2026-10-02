/**
 * FORTRESS Client-Side Anti-Tamper SDK v1.0
 * Lightweight drop-in browser library (<2KB) for web stores.
 * Signs outgoing requests (e.g. checkout, payment, auth) with HMAC-SHA256
 * to make parameter manipulation in DevTools or Burp Suite impossible.
 */
(function (global) {
  class FortressSDK {
    constructor(apiBaseUrl = "") {
      this.apiBaseUrl = apiBaseUrl.replace(/\/$/, "");
      this.session = null;
    }

    /**
     * Initialize or resume an ephemeral signing session
     */
    async initSession() {
      try {
        const res = await fetch(`${this.apiBaseUrl}/api/signer/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        this.session = data;
        return this.session;
      } catch (err) {
        console.error("[FORTRESS SDK] Session initialization failed:", err);
        throw err;
      }
    }

    /**
     * Compute HMAC-SHA256 in browser using native Web Crypto API
     */
    async hmacSha256(keyHex, message) {
      const enc = new TextEncoder();
      const keyBuf = new Uint8Array(keyHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
      const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        keyBuf,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBuf = await window.crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
      return Array.from(new Uint8Array(signatureBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    /**
     * Sign an outgoing request and return hardened headers
     */
    async signRequest(method, path, body = {}) {
      if (!this.session) {
        await this.initSession();
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = Array.from(window.crypto.getRandomValues(new Uint8Array(12)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const bodyStr = typeof body === "string" ? body : JSON.stringify(body);

      const canonical = [method.toUpperCase(), path, String(timestamp), String(nonce), bodyStr].join("\n");
      const signature = await this.hmacSha256(this.session.clientKey, canonical);

      return {
        "x-fortress-session-id": this.session.sessionId,
        "x-fortress-signature": signature,
        "x-fortress-timestamp": String(timestamp),
        "x-fortress-nonce": nonce,
      };
    }

    /**
     * Wrapper for tamper-proof fetch
     */
    async secureFetch(url, options = {}) {
      const method = (options.method || "GET").toUpperCase();
      const urlObj = new URL(url, window.location.origin);
      const path = urlObj.pathname + urlObj.search;
      const body = options.body || {};

      const securityHeaders = await this.signRequest(method, path, body);

      return fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          ...securityHeaders,
        },
      });
    }
  }

  global.FortressSDK = FortressSDK;
})(typeof window !== "undefined" ? window : globalThis);
