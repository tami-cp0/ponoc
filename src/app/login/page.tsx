import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ColumnLines } from "@/components/ColumnLines";
import { LoginForm } from "@/components/login/LoginForm";
import { getUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  if (await getUser(await headers())) redirect("/app");
  const { error } = await searchParams;

  return (
    <main className="notfound login">
      <ColumnLines />
      <span className="notfound-wordmark font-array">ponoc</span>
      <p className="notfound-message">Sign in to start listening.</p>
      <LoginForm callbackError={error} />
    </main>
  );
}
