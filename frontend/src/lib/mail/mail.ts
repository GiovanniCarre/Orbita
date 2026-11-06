export type MailStatus = {
  configured: boolean;
  connected: boolean;
  accounts?: string[];
};

export type MailMessage = {
  id: string;
  from: string;
  subject: string;
  date: string;
  unread: boolean;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error("Impossible de joindre Gmail.");
  return (await response.json()) as T;
}

export function loadStatus(): Promise<MailStatus> {
  return request("/api/mail/status");
}

export async function connectGoogle(email: string): Promise<string> {
  const result = await request<{ authorization_url: string }>(
    "/api/mail/google/connect",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    },
  );
  return result.authorization_url;
}

export function loadMessages(account: string): Promise<{
  destination: string;
  messages: MailMessage[];
}> {
  return request(
    `/api/mail/projects/sportcooks/messages?account=${encodeURIComponent(account)}`,
  );
}

export async function disconnectGoogle(account: string): Promise<void> {
  const response = await fetch(
    `/api/mail/google/account?account=${encodeURIComponent(account)}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) throw new Error("Impossible de retirer le compte.");
}

export type MailDetail = {
  id: string;
  from: string;
  reply_to: string;
  subject: string;
  date: string;
  body: string;
};
export function readMessage(account: string, id: string): Promise<MailDetail> {
  return request(
    `/api/mail/projects/sportcooks/messages/${encodeURIComponent(id)}?account=${encodeURIComponent(account)}`,
  );
}

export type OutgoingMail = {
  account: string;
  recipient: string;
  subject: string;
  body: string;
  reply_to_id?: string;
  attempt_id: string;
  confirmed: boolean;
};
export function sendMail(
  mail: OutgoingMail,
): Promise<{ status: string; id: string }> {
  return request("/api/mail/projects/sportcooks/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mail),
  });
}
