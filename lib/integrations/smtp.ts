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
    `This is a test email from HomeLink platform settings.\n\nSent at ${new Date().toISOString()}`,
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
    await sendCommand(
      socket,
      `From: ${from}\r\nTo: ${to}\r\nSubject: ${encodeHeader(subject)}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}\r\n.`,
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
