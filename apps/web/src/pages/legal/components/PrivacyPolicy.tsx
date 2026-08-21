import { Link } from '@tanstack/react-router'

import {
  CONTROLLER_NAME,
  LAST_UPDATED,
  PRIVACY_CONTACT_EMAIL,
} from '../contact'
import { LegalLayout, LegalList, LegalSection } from './LegalLayout'

const MailTo = () => (
  <a
    href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
    className="text-foreground underline underline-offset-2"
  >
    {PRIVACY_CONTACT_EMAIL}
  </a>
)

export const PrivacyPolicy = () => {
  return (
    <LegalLayout
      title="Privacy Policy"
      updatedAt={LAST_UPDATED}
      intro={
        <p>
          This policy explains what personal data {CONTROLLER_NAME} collects,
          why we collect it, who we share it with, and the rights you have over
          it. It covers the AstroJobs website and the accounts, resumes and job
          matching features offered through it.
        </p>
      }
    >
      <LegalSection title="1. Who is responsible for your data">
        <p>
          {CONTROLLER_NAME} acts as the controller of the personal data
          described here — meaning we decide why and how it is processed. For
          any question about this policy, or to exercise the rights described in
          section 8, write to <MailTo />.
        </p>
      </LegalSection>

      <LegalSection title="2. What we collect">
        <p>We collect only what the service needs to work:</p>
        <LegalList
          items={[
            <>
              <strong className="text-card-foreground">Account data</strong> —
              your name and email address. If you sign up with a password, we
              store a cryptographic hash of it, never the password itself. If
              you sign in with a social provider, we receive your name, email
              address, whether that provider has verified the address, and a
              provider-issued identifier.
            </>,
            <>
              <strong className="text-card-foreground">Resume data</strong> —
              the files you upload, the text extracted from them, and the
              keywords and numerical representations we derive from that text in
              order to match you with job openings. Resumes usually contain
              information about your employment history and education, and may
              contain anything else you chose to put in them.
            </>,
            <>
              <strong className="text-card-foreground">Technical data</strong> —
              a session cookie that keeps you signed in, plus server logs
              containing IP addresses and request metadata, kept for security
              and troubleshooting.
            </>,
          ]}
        />
        <p>
          We do not ask for, and we ask that you do not upload, sensitive
          personal data such as health, biometric, religious or political
          information. We do not knowingly collect data from children.
        </p>
      </LegalSection>

      <LegalSection title="3. Why we process it, and on what legal basis">
        <p>
          Under the LGPD (Lei nº 13.709/2018) and, where it applies, the GDPR,
          each purpose below has a legal basis:
        </p>
        <LegalList
          items={[
            <>
              <strong className="text-card-foreground">
                Providing the service
              </strong>{' '}
              — creating your account, authenticating you, storing your resumes
              and matching them against job openings. Basis: performance of a
              contract with you.
            </>,
            <>
              <strong className="text-card-foreground">
                Security and abuse prevention
              </strong>{' '}
              — detecting unauthorised access and keeping records of it. Basis:
              our legitimate interest in operating a secure service.
            </>,
            <>
              <strong className="text-card-foreground">
                Legal obligations
              </strong>{' '}
              — retaining records where the law requires it. Basis: compliance
              with a legal obligation.
            </>,
          ]}
        />
        <p>
          We do not sell your personal data, and we do not use it for
          advertising or automated decisions that produce legal effects for you.
        </p>
      </LegalSection>

      <LegalSection title="4. Who we share it with">
        <p>
          We share personal data only with service providers that process it on
          our behalf, under contract and on our instructions:
        </p>
        <LegalList
          items={[
            <>
              <strong className="text-card-foreground">Amazon Web Services</strong>{' '}
              — hosting, database, uploaded-file storage, and the managed
              sign-in service used for social login.
            </>,
            <>
              <strong className="text-card-foreground">Pinecone</strong> —
              storage of the numerical representations derived from your resume,
              used for matching.
            </>,
            <>
              <strong className="text-card-foreground">
                Identity providers
              </strong>{' '}
              — if you choose social sign-in, that provider tells us your name,
              email address and whether the address is verified. Their own
              privacy policy governs what they do on their side.
            </>,
          ]}
        />
        <p>
          We may also disclose data when legally compelled to, or to establish
          or defend legal claims.
        </p>
      </LegalSection>

      <LegalSection title="5. International transfers">
        <p>
          Our providers may store and process data outside your country,
          including in the United States. Where data leaves Brazil or the
          European Economic Area, we rely on the transfer safeguards those
          providers offer, such as standard contractual clauses.
        </p>
      </LegalSection>

      <LegalSection title="6. How long we keep it">
        <p>
          Account data is kept while your account exists. Resumes and everything
          derived from them are kept until you delete them or delete your
          account. After deletion we remove the data from our active systems
          without undue delay; residual copies may persist in encrypted backups
          for a limited period before being overwritten. We keep only what the
          law obliges us to keep beyond that.
        </p>
      </LegalSection>

      <LegalSection title="7. Security">
        <p>
          Passwords are stored only as salted hashes. Sessions use an
          HTTP-only cookie that scripts on the page cannot read. Access to
          production systems is restricted. No system is perfectly secure, so we
          also ask you to use a strong, unique password and to tell us at{' '}
          <MailTo /> if you suspect your account has been accessed by someone
          else.
        </p>
      </LegalSection>

      <LegalSection title="8. Your rights">
        <p>
          The LGPD (art. 18) and the GDPR give you the right to confirm whether
          we process your data; to access it; to correct incomplete or outdated
          data; to anonymise, block or delete unnecessary or excessive data; to
          port it to another provider; to withdraw consent; to object to
          processing based on legitimate interests; and to be told with whom we
          have shared it.
        </p>
        <p>
          You can exercise most of these directly: your resumes can be removed
          from your dashboard at any time, and full account deletion is
          described on the{' '}
          <Link
            to="/data-deletion"
            className="text-foreground underline underline-offset-2"
          >
            data deletion page
          </Link>
          . For anything else, write to <MailTo /> and we will respond within
          the period the applicable law allows. You also have the right to
          complain to a supervisory authority — in Brazil, the ANPD.
        </p>
      </LegalSection>

      <LegalSection title="9. Cookies">
        <p>
          We use a single strictly necessary cookie, which stores your sign-in
          session. Without it you cannot stay logged in. We do not use
          advertising or third-party tracking cookies, so there is no tracking
          consent to manage.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to this policy">
        <p>
          If we change how we handle personal data, we will update this page and
          the date above. Significant changes will be announced in the
          application before they take effect.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
