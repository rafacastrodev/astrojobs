import { Link } from '@tanstack/react-router'

import {
  CONTROLLER_NAME,
  LAST_UPDATED,
  PRIVACY_CONTACT_EMAIL,
} from '../contact'
import { LegalLayout, LegalList, LegalSection } from './LegalLayout'

const SUBJECT = encodeURIComponent('Account deletion request')

const MailTo = ({ withSubject = false }: { withSubject?: boolean }) => (
  <a
    href={`mailto:${PRIVACY_CONTACT_EMAIL}${withSubject ? `?subject=${SUBJECT}` : ''}`}
    className="text-foreground underline underline-offset-2"
  >
    {PRIVACY_CONTACT_EMAIL}
  </a>
)

export const DataDeletion = () => {
  return (
    <LegalLayout
      title="Delete your data"
      updatedAt={LAST_UPDATED}
      intro={
        <p>
          You can delete the data {CONTROLLER_NAME} holds about you at any time,
          and you do not have to give a reason. This page explains how to do it,
          what gets removed, and how long it takes.
        </p>
      }
    >
      <LegalSection title="Delete individual resumes">
        <p>
          Sign in and open your{' '}
          <Link
            to="/dashboard"
            className="text-foreground underline underline-offset-2"
          >
            dashboard
          </Link>
          . Each resume has a <strong className="text-card-foreground">Remove</strong>{' '}
          action. Removing a resume deletes the uploaded file, the text and
          keywords extracted from it, and the numerical representation used for
          job matching. Your account itself stays active.
        </p>
      </LegalSection>

      <LegalSection title="Delete your entire account">
        <p>
          Send a message to <MailTo withSubject /> from the email address
          registered on the account, asking for deletion. We may need to confirm
          it is really you before acting — that check exists to stop someone
          else from deleting your account.
        </p>
        <p>
          If you signed in with a social provider, send the request from the
          same address you used there.
        </p>
      </LegalSection>

      <LegalSection title="What gets deleted">
        <LegalList
          items={[
            'Your account record: name, email address and password hash.',
            'The link between your account and any social sign-in provider.',
            'Every resume file you uploaded.',
            'All text, keywords and numerical representations derived from those resumes.',
            'Your active sessions, which are ended immediately.',
          ]}
        />
      </LegalSection>

      <LegalSection title="What may be kept, and why">
        <p>
          Two things can outlive a deletion request, both narrowly limited:
        </p>
        <LegalList
          items={[
            <>
              <strong className="text-card-foreground">Backups.</strong>{' '}
              Encrypted backups are kept on a rolling schedule and overwritten
              in the normal cycle. Data already removed from the live systems is
              not restored or reused; it simply ages out of the backups.
            </>,
            <>
              <strong className="text-card-foreground">
                Legally required records.
              </strong>{' '}
              Where a law obliges us to retain specific records, we keep only
              those records, only for as long as required, and we do not use
              them for anything else.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="How long it takes">
        <p>
          Resumes you remove from the dashboard are deleted immediately. Account
          deletion requests are handled without undue delay and, in any case,
          within the period required by the LGPD and the GDPR — up to 30 days,
          though it is normally much faster. We will confirm by email once it is
          done.
        </p>
      </LegalSection>

      <LegalSection title="Deleting is permanent">
        <p>
          Deletion cannot be undone. Once your account is gone, your resumes and
          match history cannot be recovered, and signing up again with the same
          email address creates a new, empty account. If you only want to stop
          receiving matches, write to us instead of deleting — we can usually
          solve it another way.
        </p>
      </LegalSection>

      <LegalSection title="Other privacy rights">
        <p>
          Deletion is one of several rights you have. Access, correction and
          portability are covered in our{' '}
          <Link
            to="/privacy"
            className="text-foreground underline underline-offset-2"
          >
            Privacy Policy
          </Link>
          . For any of them, write to <MailTo />.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
