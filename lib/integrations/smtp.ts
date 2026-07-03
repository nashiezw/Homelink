import { connect as tlsConnect, type TLSSocket } from "node:tls";
import { connect as netConnect, type Socket } from "node:net";
import type { PlatformSettings } from "@/lib/settings/types";

type SmtpResult = { ok: boolean; message: string };

async function readResponse(socket: Socket | TLSSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      cleanup();
      resolve(chunk.toString("utf8"));
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

async function sendCommand(socket: Socket | TLSSocket, line: string) {
  socket.write(`${line}\r\n`);
  const response = await readResponse(socket);
  const code = Number(response.slice(0, 3));
  if (Number.isNaN(code) || code >= 400) {
    throw new Error(response.trim() || `SMTP error after: ${line}`);
  }
  return response;
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
  if (!smtpHost || !smtpUser) {
    return { ok: false, message: "Configure SMTP host and user in Platform Settings → Integrations." };
  }

  const port = smtpPort || 587;

  let socket: Socket | TLSSocket | null = null;

  try {
    socket = await new Promise<Socket>((resolve, reject) => {
      const s = netConnect({ host: smtpHost, port }, () => resolve(s));
      s.setTimeout(12_000, () => reject(new Error("SMTP connection timed out")));
      s.on("error", reject);
    });

    await readResponse(socket);

    if (port === 465) {
      socket.destroy();
      socket = await new Promise<TLSSocket>((resolve, reject) => {
        const s = tlsConnect({ host: smtpHost, port, servername: smtpHost }, () => resolve(s));
        s.setTimeout(12_000, () => reject(new Error("SMTPS connection timed out")));
        s.on("error", reject);
      });
      await readResponse(socket);
    }

    await sendCommand(socket, "EHLO homelink");

    if (port !== 465) {
      await sendCommand(socket, "STARTTLS");
      const plain = socket as Socket;
      socket = await new Promise<TLSSocket>((resolve, reject) => {
        const secure = tlsConnect({ socket: plain, servername: smtpHost }, () => resolve(secure));
        secure.on("error", reject);
      });
      await sendCommand(socket, "EHLO homelink");
    }

    if (smtpPass) {
      const token = Buffer.from(`\0${smtpUser}\0${smtpPass}`).toString("base64");
      await sendCommand(socket, `AUTH PLAIN ${token}`);
    }

    await sendCommand(socket, `MAIL FROM:<${smtpUser}>`);
    await sendCommand(socket, `RCPT TO:<${to}>`);
    await sendCommand(socket, "DATA");
    await sendCommand(
      socket,
      `From: ${smtpUser}\r\nTo: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}\r\n.`,
    );
    await sendCommand(socket, "QUIT");

    return { ok: true, message: `Test email sent to ${to} via ${smtpHost}:${port}.` };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown SMTP error";
    return { ok: false, message: `SMTP test failed: ${detail}` };
  } finally {
    socket?.end();
  }
}
