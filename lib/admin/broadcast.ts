import type { UserRole } from "@/lib/store/types";
import { getStore } from "@/lib/store/app-store";

type Store = ReturnType<typeof getStore>;

export type BroadcastAudience = "all" | "seekers" | "landlords" | "agents" | "admins";

export function broadcastPlatformNotification(
  store: Store,
  input: {
    channel: string;
    subject: string;
    body: string;
    audience?: BroadcastAudience;
    userIds?: string[];
    templateKey?: string;
    templateVars?: Record<string, string>;
  },
) {
  const audience = input.audience ?? "all";
  const users = store.listUsers({ status: "ACTIVE" });

  const recipients = input.userIds?.length
    ? users.filter((user) => input.userIds!.includes(user.id))
    : users.filter((user) => {
        if (audience === "all") return true;
        if (audience === "admins") return user.roles.includes("ADMIN");
        if (audience === "landlords") return user.roles.includes("LANDLORD");
        if (audience === "agents") return user.roles.includes("AGENT") || user.roles.includes("AGENCY_ADMIN");
        if (audience === "seekers") return user.roles.includes("SEEKER");
        return true;
      });

  for (const user of recipients) {
    store.createNotification(user.id, {
      channel: input.channel,
      subject: input.subject,
      body: input.body,
      templateKey: input.templateKey,
      templateVars: { name: user.name, ...input.templateVars },
    });
  }

  return { sent: recipients.length, audience };
}

export function audienceFromRoles(roles?: UserRole[]): BroadcastAudience {
  if (!roles?.length) return "all";
  if (roles.includes("ADMIN")) return "admins";
  if (roles.includes("LANDLORD")) return "landlords";
  if (roles.includes("AGENT") || roles.includes("AGENCY_ADMIN")) return "agents";
  return "seekers";
}
