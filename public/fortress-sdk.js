/**
 * FORTRESS Client-Side Anti-Tamper SDK v1.0
 * Lightweight drop-in browser library (<2KB) for web stores.
 * Signs outgoing requests (e.g. checkout, payment, auth) with HMAC-SHA256
 * to make parameter manipulation in DevTools or Burp Suite impossible.
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

      return fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          ...securityHeaders,
        },
      });
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

      const trapLinks = [
        { path: "/internal/v2/cluster/manifest", label: "Cluster Configuration Manifest" },
        { path: "/backups/production/dump.sql", label: "Internal Database Backup Archive" },
        { path: "/internal/ai/copilot/query", label: "DevOps Internal Copilot Gateway" },
      ];

      trapLinks.forEach(trap => {
        const a = document.createElement("a");
        a.href = `${baseUrl}${trap.path}`;
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
