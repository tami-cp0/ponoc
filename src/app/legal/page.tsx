import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy & Terms | ponoc",
  description: "How ponoc handles your data, and the terms of using it.",
};

// Last substantive revision. Update when the policy content changes.
const UPDATED = "September 2026";

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

        {/* ── PRIVACY ─────────────────────────────────────────────────────── */}
        <section id="privacy" className="legal-section">
          <h2 className="legal-h2 font-array-wide">Privacy Policy</h2>
          <p className="legal-lead">
            ponoc is a realtime claim validator. It listens to what you say, verifies it, and tells
            you whether each claim is true or false. This policy explains, in plain terms, what data
            that involves and what happens to it. It is written to meet the transparency
            expectations of the UK and EU GDPR, the California Consumer Privacy Act (CCPA/CPRA), and
            Canada&apos;s PIPEDA.
          </p>

          <h3 className="legal-h3">Who we are</h3>
          <p>
            ponoc is operated by its maker, who acts as the data controller for the purposes of the
            UK and EU GDPR. For any privacy question, or to reach the person responsible for your
            data, contact <a href="mailto:worktamilore@gmail.com">worktamilore@gmail.com</a>.
          </p>

          <h3 className="legal-h3">Information we collect</h3>
          <p>
            <strong>Audio.</strong> When you start a session, ponoc asks your browser for microphone
            access and streams your audio to our server for transcription. This audio is processed
            live and in transit only. We do not record it, save it, or store it after a session ends.
          </p>
          <p>
            <strong>Transcripts and claims.</strong> Your speech is converted to text so ponoc can
            pick out checkable claims and verify them. Transcripts and the claims drawn from them
            exist for the duration of your session so the app can work, and are held in memory rather
            than written to a database. When you stop the session or close the tab, they are gone.
          </p>
          <p>
            <strong>Verdicts.</strong> The true/false verdicts and their cited reasoning are shown to
            you during the session and are not retained afterwards.
          </p>
          <p>
            <strong>Basic technical data.</strong> Like most web services, our server may process
            standard connection information (such as your IP address and browser type) as needed to
            deliver the service and keep it secure. ponoc does not use tracking or advertising
            cookies.
          </p>
          <p>
            <strong>Accounts.</strong> ponoc does not currently require an account. If we add login
            in the future, this policy will be updated to describe the account information we collect
            (such as your email address) before that feature ships.
          </p>

          <h3 className="legal-h3">How we use your data, and our legal basis</h3>
          <p>
            We use your audio and transcripts for one purpose: to run the service you asked for. That
            means transcribing your speech, identifying claims, and returning verdicts in real time.
            We do not sell your data, and we do not use it to build advertising profiles. Basic
            technical data is used to operate, secure, and troubleshoot the service.
          </p>
          <p>Where the GDPR applies, our legal bases are:</p>
          <ul className="legal-list">
            <li>
              <strong>Consent</strong> for accessing your microphone and processing your speech. You
              give this consent when you allow microphone access and start a session, and you can
              withdraw it at any time by stopping the session or denying the permission.
            </li>
            <li>
              <strong>Legitimate interests</strong> for basic technical data, so we can keep the
              service running, available, and secure.
            </li>
          </ul>
          <p>
            Under PIPEDA, we collect and use your information only for the purpose described above,
            and only with your consent, given when you begin a session.
          </p>

          <h3 className="legal-h3">Third parties we share with</h3>
          <p>
            To do its job, ponoc relies on a small number of service providers, and shares with each
            only the data it needs:
          </p>
          <ul className="legal-list">
            <li>
              A <strong>speech-to-text provider</strong> receives your streamed audio to convert it
              to text.
            </li>
            <li>
              An <strong>AI language-model provider</strong> receives the text of claims so it can
              identify and verify them.
            </li>
          </ul>
          <p>
            These providers process the data on our behalf under their own terms and privacy
            commitments. We share only what is necessary for verification. We do not sell or rent
            your personal information to anyone.
          </p>

          <h3 className="legal-h3">International transfers</h3>
          <p>
            ponoc is available worldwide. Our service providers are located in the United States, so
            wherever you use ponoc from, your data is transferred to and processed in the US for the
            duration of your session. Where your local law requires safeguards for such transfers, we
            rely on protections such as standard contractual clauses. By using ponoc, you understand
            your data will be processed in the US.
          </p>

          <h3 className="legal-h3">Data retention</h3>
          <p>
            Audio, transcripts, claims, and verdicts are not stored beyond your session. They are
            processed in real time and discarded when the session ends. Because we do not keep this
            data, there is nothing for us to retain long-term or to delete on request.
          </p>

          <h3 className="legal-h3">Security</h3>
          <p>
            Data is transmitted over encrypted connections. Because ponoc processes your speech in
            the moment rather than storing it, the surface for any data at rest is deliberately
            small. No method of transmission over the internet is ever completely secure, and we
            cannot guarantee absolute security.
          </p>

          <h3 className="legal-h3">Your rights</h3>
          <p>
            Depending on where you live, you have rights over your personal data. Under the UK and EU
            GDPR and under PIPEDA, these include the right to access, correct, delete, or port your
            data, to object to or restrict certain processing, and to withdraw consent. Under the
            CCPA/CPRA, California residents have the right to know what personal information is
            collected, to delete it, to correct it, and to opt out of its sale or sharing.
          </p>
          <p>
            <strong>We do not sell or share your personal information</strong> as those terms are
            defined under the CCPA/CPRA, so there is nothing to opt out of. Because ponoc does not
            store your session data, most access and deletion requests are satisfied simply by ending
            your session. To exercise any right, or ask how we handle your data, contact us at{" "}
            <a href="mailto:worktamilore@gmail.com">worktamilore@gmail.com</a>. We will not
            discriminate against you for exercising your rights.
          </p>

          <h3 className="legal-h3">Complaints</h3>
          <p>
            If you are in the UK or EU and believe we have mishandled your data, you have the right to
            complain to a supervisory authority (in the UK, the Information Commissioner&apos;s Office
            at ico.org.uk). If you are in Canada, you may contact the Office of the Privacy
            Commissioner of Canada at priv.gc.ca. We ask that you reach out to us first so we can try
            to resolve the issue.
          </p>

          <h3 className="legal-h3">Children</h3>
          <p>
            ponoc is not directed to children under 13, and we do not knowingly collect data from
            them.
          </p>

          <h3 className="legal-h3">Changes to this policy</h3>
          <p>
            We may update this policy as ponoc evolves, for example when we add accounts. When we do,
            we will change the &quot;last updated&quot; date above, and material changes will be
            reflected here.
          </p>
        </section>

        {/* ── TERMS ───────────────────────────────────────────────────────── */}
        <section id="terms" className="legal-section">
          <h2 className="legal-h2 font-array-wide">Terms of Service</h2>
          <p className="legal-lead">
            By using ponoc, you agree to these terms. Please read them.
          </p>

          <h3 className="legal-h3">The service</h3>
          <p>
            ponoc listens to spoken claims and returns automated true/false verdicts with cited
            reasoning. It is a tool to help you check claims quickly, not a substitute for
            professional, legal, medical, financial, or other expert advice.
          </p>

          <h3 className="legal-h3">Accuracy and no warranty</h3>
          <p>
            Verdicts are generated by automated systems and web search, and can be incomplete,
            outdated, or wrong. You should verify anything important yourself before relying on it.
            ponoc is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of
            any kind, express or implied, including accuracy, fitness for a particular purpose, or
            uninterrupted availability.
          </p>

          <h3 className="legal-h3">Acceptable use</h3>
          <p>You agree not to use ponoc to:</p>
          <ul className="legal-list">
            <li>break the law or infringe anyone&apos;s rights;</li>
            <li>record or transcribe people without any consent that the law requires;</li>
            <li>disrupt, overload, reverse-engineer, or abuse the service or its providers; or</li>
            <li>misrepresent a verdict as a definitive or official determination of fact.</li>
          </ul>
          <p>
            You are responsible for the audio you feed into ponoc and for having any permission
            needed to process the speech of others.
          </p>

          <h3 className="legal-h3">Limitation of liability</h3>
          <p>
            To the fullest extent permitted by law, ponoc and its maker are not liable for any
            indirect, incidental, or consequential damages, or for any decision you make based on a
            verdict. Your use of the service is at your own risk.
          </p>

          <h3 className="legal-h3">Changes and availability</h3>
          <p>
            We may change, suspend, or discontinue any part of ponoc at any time, and we may update
            these terms. Continued use after a change means you accept the updated terms.
          </p>

          <h3 className="legal-h3">Contact</h3>
          <p>
            Questions about your data or these terms? Reach us at{" "}
            <a href="mailto:worktamilore@gmail.com">worktamilore@gmail.com</a>.
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
