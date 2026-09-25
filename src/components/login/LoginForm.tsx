"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/client/auth-client";
import { GoogleIcon } from "../icons";
import { Button } from "../Button";

type Phase = "idle" | "sending" | "sent";

const AFTER_LOGIN = "/app";

function describeCallbackError(code: string): string {
  if (/token/i.test(code)) return "That link has expired or was already used. Request a new one.";
  return "Sign-in didn't complete. Please try again.";
}

export function LoginForm({ callbackError }: { callbackError?: string }) {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState(callbackError ? describeCallbackError(callbackError) : "");

  const continueWithGoogle = async () => {
    setError("");
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: AFTER_LOGIN,
      errorCallbackURL: "/login",
    });
    if (error) setError(error.message ?? "Couldn't reach Google. Please try again.");
  };

  const sendLink = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setPhase("sending");
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: AFTER_LOGIN,
      errorCallbackURL: "/login",
    });
    if (error) {
      setPhase("idle");
      setError(error.message ?? "Couldn't send the link. Please try again.");
    } else {
      setPhase("sent");
    }
  };

  return (
    <div className="login-form">
      <Button width="100%" onClick={continueWithGoogle}>
        <GoogleIcon />
        Continue with Google
      </Button>

      <span className="login-or">or</span>

      <form className="login-email" onSubmit={sendLink}>
        <label className="settings-row login-field">
          <input
            className="login-input"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            aria-label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <Button type="submit" width="100%" disabled={phase === "sending"}>
          {phase === "sending" ? "Sending…" : "Email me a link"}
        </Button>
      </form>

      <p className="login-note" role="status">
        {error || (phase === "sent" ? `Check ${email} for your sign-in link.` : "")}
      </p>
    </div>
  );
}
