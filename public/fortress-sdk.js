/**
 * FORTRESS Client-Side Anti-Tamper SDK v1.1
 * Lightweight drop-in browser library (<2KB) for web stores.
 * Signs outgoing requests (e.g. checkout, payment, auth) with HMAC-SHA256
 * to raise the cost of parameter manipulation via DevTools or interception proxies.
 * NOTE: Client-side signing provides tamper-evidence, not tamper-proof security.
 * The signing key is visible in the browser; server-side validation is the true defense.
 */
(function (global) {
  class FortressSDK {
    constructor(apiBaseUrl = "", options = {}) {
      this.apiBaseUrl = apiBaseUrl.replace(/\/$/, "");
      this.vaultKey = typeof options === "string" ? options : (options.vaultKey || options.apiKey || "");
      this.session = null;
    }

    /**
     * Initialize or resume an ephemeral signing session
     */
    async initSession() {
      try {
        const headers = { "Content-Type": "application/json" };
        if (this.vaultKey) {
          headers["x-vault-key"] = this.vaultKey;
        }
        const res = await fetch(`${this.apiBaseUrl}/api/signer/session`, {
          method: "POST",
          headers,
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

      const headers = {
        "x-fortress-session-id": this.session.sessionId,
        "x-fortress-signature": signature,
        "x-fortress-timestamp": String(timestamp),
        "x-fortress-nonce": nonce,
      };
      if (this.vaultKey) {
        headers["x-vault-key"] = this.vaultKey;
      }

      return headers;
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

      // Auto-set Content-Type for JSON bodies to prevent server-side parsing mismatch
      const mergedHeaders = { ...(options.headers || {}), ...securityHeaders };
      if (body && !mergedHeaders["Content-Type"] && !mergedHeaders["content-type"]) {
        mergedHeaders["Content-Type"] = "application/json";
      }

      return fetch(url, {
        ...options,
        headers: mergedHeaders,
      });
    }

    /**
     * Deploy invisible spider and AI crawler traps into the DOM
     * Any automated headless browser, scraper, or AI agent following these links
     * gets immediately trapped in the Honey-Maze.
     */
    static deploySpiderTraps(apiBaseUrl = "") {
      if (typeof document === "undefined") return;
      const baseUrl = apiBaseUrl.replace(/\/$/, "");
      const container = document.createElement("div");
      container.setAttribute("aria-hidden", "true");
      container.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:0;height:0;opacity:0;pointer-events:none;overflow:hidden;";

      // Larger pool of trap paths — a random subset is selected each page load
      // to make fingerprinting and permanent blocklisting impractical.
      const allTraps = [
        { path: "/internal/v2/cluster/manifest", label: "Cluster Configuration Manifest" },
        { path: "/backups/production/dump.sql", label: "Internal Database Backup Archive" },
        { path: "/internal/ai/copilot/query", label: "DevOps Internal Copilot Gateway" },
        { path: "/admin/api/v3/secrets", label: "Secret Management Console" },
        { path: "/.well-known/jwks.json", label: "Public Key Store" },
        { path: "/internal/graphql/introspection", label: "GraphQL Introspection Endpoint" },
        { path: "/debug/heap-dump", label: "Diagnostic Heap Snapshot" },
        { path: "/internal/v1/tokens/rotate", label: "Token Rotation Service" },
      ];

      // Pick 3 random traps from the pool and append a per-page-load hash suffix
      const shuffled = allTraps.sort(() => Math.random() - 0.5).slice(0, 3);
      const pageSalt = Array.from(window.crypto.getRandomValues(new Uint8Array(4)))
        .map(b => b.toString(16).padStart(2, "0")).join("");

      shuffled.forEach(trap => {
        const a = document.createElement("a");
        a.href = `${baseUrl}${trap.path}?_t=${pageSalt}`;
        a.textContent = trap.label;
        a.rel = "nofollow";
        a.tabIndex = -1;
        container.appendChild(a);
      });

      if (document.body) {
        document.body.appendChild(container);
      } else {
        document.addEventListener("DOMContentLoaded", () => {
          if (document.body) document.body.appendChild(container);
        });
      }
    }
  }

  // Auto-deploy spider traps on load in browser environments
  if (typeof window !== "undefined") {
    FortressSDK.deploySpiderTraps(window.location.origin);
  }

  global.FortressSDK = FortressSDK;
})(typeof window !== "undefined" ? window : globalThis);
