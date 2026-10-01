import { config } from "../config.js";

export const notifyBreach = async (audit, target) => {
  const { fortress_status, threat_level, findings, score, verdict } = audit;

  // Log to server console
  if (fortress_status === "BREACHED" && (threat_level === "CRITICAL" || threat_level === "HIGH")) {
    console.warn(
      `🚨 [FORTRESS BREACH DETECTED] File: ${target.filename} | Level: ${threat_level} | Score: ${score}/100 | Findings: ${findings.length}`
    );
  }

  // Telegram Alerting (Optional)
  if (
    config.telegram.botToken &&
    config.telegram.chatId &&
    fortress_status === "BREACHED" &&
    (threat_level === "CRITICAL" || threat_level === "HIGH")
  ) {
    try {
      const text = `🚨 *FORTRESS SECURITY BREACH*\n\n` +
        `*Target:* \`${target.filename}\`\n` +
        `*Threat Level:* *${threat_level}*\n` +
        `*Security Score:* ${score}/100\n` +
        `*Verdict:* ${verdict}\n\n` +
        `*Issues Found:* ${findings.length}\n` +
        findings.slice(0, 3).map((f) => `• [${f.severity}] ${f.type}: ${f.issue}`).join("\n");

      await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.telegram.chatId,
          text,
          parse_mode: "Markdown",
        }),
      });
    } catch (err) {
      console.error("Failed to dispatch Telegram alert:", err.message);
    }
  }

  // Slack Webhook Alerting (Optional)
  if (
    config.slackWebhookUrl &&
    fortress_status === "BREACHED" &&
    (threat_level === "CRITICAL" || threat_level === "HIGH")
  ) {
    try {
      await fetch(config.slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 *FORTRESS SECURITY BREACH* in \`${target.filename}\` [${threat_level}] - Score: ${score}/100: ${verdict}`,
        }),
      });
    } catch (err) {
      console.error("Failed to dispatch Slack alert:", err.message);
    }
  }
};
