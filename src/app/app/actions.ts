"use server";

import { headers } from "next/headers";
import { getUser } from "@/server/auth";
import { markWelcomeSeen } from "@/server/usage/credits";

export async function dismissWelcome(): Promise<void> {
  const user = await getUser(await headers());
  if (user) await markWelcomeSeen(user.id);
}
