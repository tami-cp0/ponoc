import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  description: "How ponoc handles your data, and the terms of using it.",
};

// Last substantive revision. Update when the policy content changes.
const UPDATED = "September 2026";
const EMAIL = "worktamilore@gmail.com";

export default function LegalPage() {
  return (
    <main className="legal">
      <div className="legal-shell">
        <header className="legal-head">
          <Link href="/" className="legal-back">
            ← ponoc
          </Link>
          <h1 className="legal-title font-bebas">PRIVACY &amp; TERMS</h1>
          <p className="legal-updated">Last updated {UPDATED}</p>
          <nav className="legal-toc">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
          </nav>
        </header>

        <section id="privacy" className="legal-section">
          <h2 className="legal-h2 font-array-wide">Privacy Policy</h2>
          <p className="legal-lead">
            ponoc listens to what you say, checks the claims in it, and tells you whether each one
            is true or false. This policy explains, in plain terms, what data that involves and what
            happens to it. It applies to everyone, wherever you use ponoc.
          </p>

          <h3 className="legal-h3">What we collect</h3>
          <p>
            <strong>Audio.</strong> When you start a session, ponoc asks your browser for microphone
            access and streams your audio to our server for transcription. It is processed live and
            never recorded or stored.
          </p>
          <p>
            <strong>Transcripts, claims, and verdicts.</strong> Your speech is turned into text so
            ponoc can find and check claims. Transcripts, claims, and verdicts exist only in memory
            while your session runs, and are gone when it ends.
          </p>
          <p>
            <strong>Account.</strong> You need an account to start a session. We store your email
            address and, if you sign in with Google, the name and profile picture link Google
            provides. While you are signed in we keep a sign-in record with the IP address and
            browser it was created from.
          </p>
          <p>
            <strong>Usage records.</strong> For each session we record how much of the service you
            used: the length of audio, the amount of AI processing, the number of web searches, how
            many claims were ruled true or false, and what that cost. These are amounts only, never
            your audio, transcripts, or claims.
          </p>
          <p>
            <strong>Credits and purchases.</strong> We record the credits added to your account,
            including your free credits, and, when you buy credits, the pack, the amount paid, and
            when. Payments are handled by a payment provider; we never see or store your full card
            details.
          </p>
          <p>
            <strong>Technical data.</strong> Our server processes standard connection information,
            such as your IP address and browser type, to run the service and keep it secure. ponoc
            uses one essential cookie to keep you signed in, and no tracking or advertising cookies.
          </p>

          <h3 className="legal-h3">How we use it</h3>
          <p>
            Only to run ponoc: transcribing your speech and checking claims, signing you in,
            measuring usage and charging it against your credits, adding credits you buy, keeping
            records that tax law requires, and keeping the service secure. Microphone access is
            always your choice, and you can stop it at any time by ending the session. We do not sell
            your data or use it for advertising.
          </p>

          <h3 className="legal-h3">Who we share it with</h3>
          <p>A small number of service providers, each receiving only what it needs:</p>
          <ul className="legal-list">
            <li>
              a <strong>speech-to-text provider</strong> receives your streamed audio to transcribe
              it;
            </li>
            <li>
              an <strong>AI provider</strong> receives the text of claims to identify and check
              them;
            </li>
            <li>
              <strong>Google</strong>, if you sign in with it, shares your name, email address, and
              profile picture link with us;
            </li>
            <li>
              an <strong>email provider</strong> receives your email address to send sign-in links;
            </li>
            <li>
              a <strong>database host</strong> stores your account, usage, and credit records; and
            </li>
            <li>
              a <strong>payment provider</strong> processes purchases and tells us whether a payment
              succeeded.
            </li>
          </ul>
          <p>
            These providers are based in the United States, so your data is processed there, wherever
            you use ponoc from.
          </p>

          <h3 className="legal-h3">How long we keep it</h3>
          <p>
            Audio, transcripts, claims, and verdicts are discarded when your session ends. Your
            account, usage, and credit records are kept while your account exists, and sign-in
            records expire after seven days without use. Deleting your account removes them, along
            with any unused credits. Purchase records may be kept afterwards for as long as tax law
            requires.
          </p>

          <h3 className="legal-h3">Security</h3>
          <p>
            Data is sent over encrypted connections, and because ponoc does not store what you say,
            very little is kept at all. No system is perfectly secure, so we cannot guarantee
            absolute security.
          </p>

          <h3 className="legal-h3">Your rights</h3>
          <p>
            You can ask to see, correct, export, or delete the data we hold about you: your account,
            usage, credit, and purchase records. Email{" "}
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a> and we will respond. You will never be treated
            differently for asking.
          </p>

          <h3 className="legal-h3">Children</h3>
          <p>
            ponoc is not for children under 13. Users under 18 need a parent or guardian&apos;s
            permission to buy credits.
          </p>

          <h3 className="legal-h3">Changes</h3>
          <p>
            When this policy changes, the &quot;last updated&quot; date above changes with it.
          </p>
        </section>

        <section id="terms" className="legal-section">
          <h2 className="legal-h2 font-array-wide">Terms of Service</h2>
          <p className="legal-lead">By using ponoc, you agree to these terms.</p>

          <h3 className="legal-h3">The service</h3>
          <p>
            ponoc listens to spoken claims and returns automated true/false verdicts with cited
            reasoning. It helps you check claims quickly; it is not professional, legal, medical,
            financial, or other expert advice.
          </p>

          <h3 className="legal-h3">Who can use ponoc</h3>
          <p>
            Anyone aged 13 or over, anywhere. To buy credits you must be 18 or older, or have the
            permission of a parent or guardian who agrees to these terms.
          </p>

          <h3 className="legal-h3">Your account</h3>
          <p>
            You sign in with Google or an emailed link, so keep those secure: anyone with access to
            them can sign in as you. You can be signed in on one device at a time; signing in
            somewhere new signs you out, and ends any live session, everywhere else.
          </p>

          <h3 className="legal-h3">Credits</h3>
          <ul className="legal-list">
            <li>
              Listening uses credits, based on the audio processed, the AI processing needed, and the
              web searches made to check claims.
            </li>
            <li>Every new account receives free credits once.</li>
            <li>
              A session cannot start without credits and stops when your balance reaches zero.
              Claims already being checked are finished and charged, so your balance may end slightly
              below zero; the difference is taken from credits you add later.
            </li>
            <li>
              Credits you buy never expire. Credits have no cash value and cannot be transferred or
              exchanged for money.
            </li>
          </ul>

          <h3 className="legal-h3">Purchases and refunds</h3>
          <p>
            Prices are shown before you pay and may change for future purchases, never for credits
            you already have. <strong>All purchases are final and non-refundable</strong>, except
            where the law where you live requires a refund. If you think you were charged in error,
            email us and we will look into it.
          </p>

          <h3 className="legal-h3">Accuracy</h3>
          <p>
            Verdicts are automated and can be incomplete, outdated, or wrong, so check anything
            important yourself. ponoc is provided &quot;as is&quot;, without warranties of any kind,
            including accuracy or uninterrupted availability.
          </p>

          <h3 className="legal-h3">Acceptable use</h3>
          <p>You agree not to use ponoc to:</p>
          <ul className="legal-list">
            <li>break the law or infringe anyone&apos;s rights;</li>
            <li>record or transcribe people without the consent the law requires;</li>
            <li>disrupt, overload, reverse-engineer, or abuse the service; or</li>
            <li>present a verdict as an official or definitive ruling.</li>
          </ul>

          <h3 className="legal-h3">Liability</h3>
          <p>
            To the fullest extent the law allows, ponoc and its maker are not liable for indirect or
            consequential damages, or for decisions you make based on a verdict.
          </p>

          <h3 className="legal-h3">Ending your account</h3>
          <p>
            We may suspend or close an account that breaks these terms, and you can ask us to delete
            yours at any time. Unused credits are lost when an account is closed, except where the
            law requires otherwise.
          </p>

          <h3 className="legal-h3">Changes</h3>
          <p>
            We may change ponoc or these terms at any time. Using ponoc after a change means you
            accept the updated terms.
          </p>
        </section>

        <footer className="legal-foot">
          <Link href="/" className="legal-back">
            ← Back to ponoc
          </Link>
        </footer>
      </div>
    </main>
  );
}
