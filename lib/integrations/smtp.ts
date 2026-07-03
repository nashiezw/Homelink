import { connect as netConnect, type Socket } from "node:net";
import { connect as tlsConnect, type TLSSocket } from "node:tls";
import type { PlatformSettings } from "@/lib/settings/types";

type SmtpResult = { ok: boolean; message: string };
type SmtpStage =
  | "connect"
  | "greeting"
  | "ehlo"
  | "starttls"
  | "auth"
  | "mail-from"
  | "rcpt-to"
  | "data"
  | "message"
  | "quit";

class SmtpStageError extends Error {
  constructor(
    readonly stage: SmtpStage,
    message: string,
  ) {
    super(message);
    this.name = "SmtpStageError";
  }
}

function mask(value: string) {
  if (!value) return "<empty>";
  if (value.length <= 6) return "<set>";
  return `${value.slice(0, 3)}...${value.slice(-3)}`;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function encodeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://homelinkzim.co.zw").replace(/\/+$/, "");
}

function getLogoUrl() {
  return `${getAppUrl()}/brand/homelink-full-lockup.png`;
}

function textToHtml(body: string) {
  const blocks = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (!blocks.length) return "<p style=\"margin:0;color:#334155;line-height:1.65;\">You have a new HomeLink update.</p>";
  return blocks
    .map((block) => {
      const lines = escapeHtml(block).split(/\n/);
      return `<p style="margin:0 0 16px;color:#334155;line-height:1.65;">${lines.join("<br>")}</p>`;
    })
    .join("");
}

function buildHtmlEmail(input: { subject: string; body: string; preheader: string }) {
  const appUrl = getAppUrl();
  const logoUrl = getLogoUrl();
  const subject = escapeHtml(input.subject);
  const preheader = escapeHtml(input.preheader);
  const content = textToHtml(input.body);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f8fb;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f6f8fb;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;border-collapse:collapse;">
            <tr>
              <td style="padding:0 0 18px;">
                <a href="${appUrl}" style="display:inline-block;text-decoration:none;">
                  <img src="${logoUrl}" width="168" alt="HomeLink Zimbabwe" style="display:block;width:168px;max-width:60%;height:auto;border:0;">
                </a>
              </td>
            </tr>
            <tr>
              <td style="overflow:hidden;border:1px solid #e2e8f0;border-radius:14px;background:#ffffff;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="background:#064e3b;padding:6px 28px;"></td>
                  </tr>
                  <tr>
                    <td style="padding:30px 28px 12px;">
                      <h1 style="margin:0;color:#0f172a;font-size:22px;line-height:1.3;font-weight:750;letter-spacing:0;">${subject}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 28px 12px;font-size:15px;">
                      ${content}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 28px 30px;">
                      <a href="${appUrl}" style="display:inline-block;border-radius:8px;background:#047857;padding:11px 16px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">Open HomeLink</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 4px 0;color:#64748b;font-size:12px;line-height:1.6;">
                <p style="margin:0 0 6px;">HomeLink Zimbabwe</p>
                <p style="margin:0;">This email was sent by HomeLink. If you were not expecting it, you can safely ignore it.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function normalizeBodyForSmtp(value: string) {
  return value.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function resolveSender(integrations: PlatformSettings["integrations"]) {
  const envFrom =
    process.env.SMTP_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    process.env.FROM_EMAIL?.trim() ||
    "";
  const configuredFrom = integrations.smtpFrom?.trim() || "";
  return configuredFrom || envFrom || (isEmail(integrations.smtpUser) ? integrations.smtpUser.trim() : "");
}

async function readResponse(socket: Socket | TLSSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    let response = "";
    const onData = (chunk: Buffer) => {
      response += chunk.toString("utf8");
      const lines = response.split(/\r?\n/).filter(Boolean);
      const last = lines.at(-1);
      if (!last || !/^\d{3} /.test(last)) return;
      cleanup();
      resolve(response);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };
    socket.on("data", onData);
    socket.on("error", onError);
  });
}

async function sendCommand(socket: Socket | TLSSocket, line: string, stage: SmtpStage) {
  socket.write(`${line}\r\n`);
  const response = await readResponse(socket);
  const code = Number(response.slice(0, 3));
  if (Number.isNaN(code) || code >= 400) {
    throw new SmtpStageError(stage, response.trim() || `SMTP error after ${stage}`);
  }
  return response;
}

function logSmtpResult(
  status: "success" | "failure",
  data: {
    host: string;
    port: number;
    user: string;
    from: string;
    to: string;
    stage?: SmtpStage;
    error?: string;
  },
) {
  const payload = {
    status,
    host: data.host,
    port: data.port,
    user: mask(data.user),
    from: data.from,
    to: data.to,
    stage: data.stage,
    error: data.error,
  };
  if (status === "success") {
    console.info("SMTP test email sent.", payload);
  } else {
    console.error("SMTP test email failed.", payload);
  }
}

export async function sendSmtpTestEmail(
  integrations: PlatformSettings["integrations"],
  to: string,
): Promise<SmtpResult> {
  return sendSmtpPlainEmail(
    integrations,
    to,
    "HomeLink SMTP test",
    `Your HomeLink email integration is configured and ready.\n\nThis test confirms that the platform can connect to the configured SMTP provider and submit a branded email.\n\nSent at ${new Date().toISOString()}`,
  );
}

export async function sendSmtpPlainEmail(
  integrations: PlatformSettings["integrations"],
  to: string,
  subject: string,
  body: string,
): Promise<SmtpResult> {
  const { smtpHost, smtpPort, smtpUser, smtpPass } = integrations;
  const from = resolveSender(integrations);
  if (!smtpHost || !smtpUser || !smtpPass) {
    return { ok: false, message: "Configure SMTP host, user, and password/API key in Platform Settings > Integrations." };
  }
  if (!isEmail(from)) {
    return {
      ok: false,
      message: "Configure smtpFrom with a verified sender email address, for example support@homelinkzim.co.zw.",
    };
  }

  const port = smtpPort || 587;
  let socket: Socket | TLSSocket | null = null;

  try {
    if (port === 465) {
      socket = await new Promise<TLSSocket>((resolve, reject) => {
        const s = tlsConnect({ host: smtpHost, port, servername: smtpHost }, () => resolve(s));
        s.setTimeout(12_000, () => reject(new SmtpStageError("connect", "SMTPS connection timed out")));
        s.on("error", reject);
      });
    } else {
      socket = await new Promise<Socket>((resolve, reject) => {
        const s = netConnect({ host: smtpHost, port }, () => resolve(s));
        s.setTimeout(12_000, () => reject(new SmtpStageError("connect", "SMTP connection timed out")));
        s.on("error", reject);
      });
    }

    await readResponse(socket).catch((error) => {
      throw new SmtpStageError("greeting", error instanceof Error ? error.message : "SMTP greeting failed");
    });
    await sendCommand(socket, "EHLO homelinkzim.co.zw", "ehlo");

    if (port !== 465) {
      await sendCommand(socket, "STARTTLS", "starttls");
      const plain = socket as Socket;
      socket = await new Promise<TLSSocket>((resolve, reject) => {
        const secure = tlsConnect({ socket: plain, servername: smtpHost }, () => resolve(secure));
        secure.on("error", reject);
      });
      await sendCommand(socket, "EHLO homelinkzim.co.zw", "ehlo");
    }

    const token = Buffer.from(`\0${smtpUser}\0${smtpPass}`).toString("base64");
    await sendCommand(socket, `AUTH PLAIN ${token}`, "auth");
    await sendCommand(socket, `MAIL FROM:<${from}>`, "mail-from");
    await sendCommand(socket, `RCPT TO:<${to}>`, "rcpt-to");
    await sendCommand(socket, "DATA", "data");
    const boundary = `homelink-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const html = buildHtmlEmail({
      subject,
      body,
      preheader: body.split(/\r?\n/).find((line) => line.trim())?.trim() || subject,
    });
    const message = [
      `From: HomeLink Zimbabwe <${from}>`,
      `To: ${to}`,
      `Subject: ${encodeHeader(subject)}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      body,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      html,
      "",
      `--${boundary}--`,
      "",
    ].join("\r\n");
    await sendCommand(
      socket,
      `${normalizeBodyForSmtp(message)}\r\n.`,
      "message",
    );
    await sendCommand(socket, "QUIT", "quit");

    logSmtpResult("success", { host: smtpHost, port, user: smtpUser, from, to });
    return { ok: true, message: `Test email sent to ${to} via ${smtpHost}:${port}.` };
  } catch (error) {
    const stage = error instanceof SmtpStageError ? error.stage : undefined;
    const detail = error instanceof Error ? error.message : "Unknown SMTP error";
    logSmtpResult("failure", { host: smtpHost, port, user: smtpUser, from, to, stage, error: detail });
    const senderHint =
      stage === "mail-from"
        ? " Resend rejected the sender; set smtpFrom/SMTP_FROM to a sender on a verified Resend domain."
        : "";
    return { ok: false, message: `SMTP test failed${stage ? ` at ${stage}` : ""}: ${detail}.${senderHint}` };
  } finally {
    socket?.end();
  }
}
