import LegalPageShell from "@/components/legal/LegalPageShell";
import {
  LegalCallout,
  LegalH3,
  LegalLink,
  LegalList,
  LegalP,
  LegalSection,
} from "@/components/legal/primitives";
import { Cookie, Download, ShieldCheck, Trash2, TriangleAlert, Users } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | IB Nexus",
  description:
    "Learn how IB Nexus collects, protects, and uses your information to provide a secure learning experience for IB students, parents, and educators.",
};

const toc = [
  { id: "introduction", label: "Introduction" },
  { id: "information-we-collect", label: "Information We Collect" },
  { id: "how-we-use-information", label: "How We Use Information" },
  { id: "ai-features", label: "AI Features" },
  { id: "cookies", label: "Cookies" },
  { id: "third-party-services", label: "Third-Party Services" },
  { id: "data-security", label: "Data Security" },
  { id: "data-retention", label: "Data Retention" },
  { id: "childrens-privacy", label: "Children's Privacy" },
  { id: "international-users", label: "International Users" },
  { id: "your-rights", label: "Your Rights" },
  { id: "policy-updates", label: "Policy Updates" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      eyebrow="Privacy Policy"
      title="Your privacy matters."
      subtitle="Learn how IB Nexus collects, protects, and uses your information to provide a secure learning experience for IB students, parents, and educators."
      lastUpdated="August 2026"
      readingTime="12 min read"
      toc={toc}
      supportText="Questions about this policy, your data, or how to exercise your privacy rights? Our support team is here to help."
    >
      <LegalSection id="introduction" category="Introduction" title="A clear commitment to your privacy">
        <LegalP>
          IB Nexus is built to help IB students organise their study material, plan revision, and learn more effectively. Because our platform is designed for students, protecting personal information is not a compliance afterthought — it is part of how we build the product. We collect only the information we need, we are transparent about what we collect and why, and we work to keep that information secure.
        </LegalP>
        <LegalP>
          This Privacy Policy explains what information we collect when you use IB Nexus, how we use it, who we share it with (and the limits on that sharing), how long we keep it, and the rights you have over your own information.
        </LegalP>
        <LegalP>
          This policy applies to the IB Nexus platform, including our website at{" "}
          <span className="font-semibold text-white">ibnexus.com</span> and any related services, applications, and features that link to this policy. It does not apply to websites or services operated by third parties that we do not control.
        </LegalP>
        <LegalCallout icon={ShieldCheck} title="Our approach in one sentence" tone="info">
          <p>
            We collect information to run the service you ask us to run — and we treat that information with the care and restraint a student, parent, or educator would expect.
          </p>
        </LegalCallout>
      </LegalSection>

      <LegalSection id="information-we-collect" category="Information We Collect" title="Only what we need to serve you">
        <LegalP>
          We collect two broad categories of information: information you provide directly, and information we collect automatically when you use the platform. We describe both below, along with why each type is collected.
        </LegalP>

        <LegalH3>Information you provide</LegalH3>
        <LegalP>
          When you create an account, set up your profile, or use study features, you give us information that makes the platform work for you:
        </LegalP>
        <LegalList
          items={[
            ["Account information — ", "your name, email address, and a secure password (stored only as an encrypted, hashed value). If you sign in with a third-party provider such as Google, we receive the basic profile information that provider shares with us, including your name and email address."],
            ["Profile information — ", "details you add to your profile, such as your school, year group, programme (MYP or DP), and an optional profile photo."],
            ["Educational preferences — ", "the subjects you study, your goals, and preferences you set during onboarding so we can tailor your workspace, revision plan, and recommendations."],
            ["Study data — ", "content you create and store in the platform, including notes, flashcards, study plans, past papers, resources, and records of your revision activity. This is your work, and we treat it as such."],
          ]}
        />
        <LegalP>
          Some of this information is required to provide core features (for example, an email address is needed to create an account). Other information — such as a profile photo or your specific subject list — is optional, and you can choose what to share.
        </LegalP>

        <LegalH3>Information we collect automatically</LegalH3>
        <LegalP>
          When you use the platform, we automatically collect limited technical information to keep the service reliable, secure, and useful:
        </LegalP>
        <LegalList
          items={[
            ["Device information — ", "the type of device you use (such as a laptop, tablet, or phone), operating system, and browser type and version."],
            ["Usage analytics — ", "aggregated information about how you interact with the platform, such as which pages and features you visit, how long sessions last, and general navigation patterns. We use this to understand what works and to improve the product."],
            ["Log data — ", "your IP address, the date and time of your requests, and technical error reports. We use log data for security, troubleshooting, and to prevent abuse."],
          ]}
        />
        <LegalP>
          We also use cookies and similar technologies, described in more detail in the <LegalLink href="#cookies">Cookies</LegalLink> section below.
        </LegalP>
      </LegalSection>

      <LegalSection id="how-we-use-information" category="How We Use Information" title="Why we use your information">
        <LegalP>
          We use the information we collect for clear, practical purposes — generally, to provide and improve the service you&apos;ve asked us to provide. We do not sell your personal information, and we do not use your study data to advertise to you.
        </LegalP>
        <LegalList
          items={[
            ["To provide the service — ", "create your account, save your study progress, keep your workspace organised, and make the features you use work as expected."],
            ["To improve the learning experience — ", "personalise subject content, recommend helpful study material, and tailor the platform to your programme and goals."],
            ["To power AI features — ", "let the AI Tutor respond to your questions and generate explanations, quiz prompts, and revision ideas. See the AI Features section below for more detail."],
            ["To respond to support requests — ", "answer your questions, resolve technical issues, and act on feedback you share with us."],
            ["To maintain security — ", "protect accounts against unauthorised access, detect fraudulent activity, and keep the platform safe for all users."],
            ["To conduct research and analytics — ", "understand how students use the platform and improve performance, design, and educational effectiveness. Where possible, we use aggregated or anonymised data for this work."],
            ["To comply with the law — ", "meet legal obligations, respond to lawful requests from authorities, and enforce our Terms of Service."],
          ]}
        />
        <LegalP>
          Where we rely on a legitimate interest — for example, improving the platform or protecting it from misuse — we balance that interest against your rights and privacy. Where we rely on consent, you can withdraw it at any time without affecting the other services we provide.
        </LegalP>
      </LegalSection>

      <LegalSection id="ai-features" category="AI Features" title="How AI fits into your study">
        <LegalP>
          IB Nexus includes AI-powered learning support, such as our AI Tutor. When you ask a question or request help, AI tools help generate clear explanations, practice questions, and revision prompts based on the material you&apos;re studying.
        </LegalP>
        <LegalP>
          When you use these features, the questions you ask and the context you provide may be processed by AI technology providers to generate a response. We take reasonable steps to ensure any AI provider we work with protects the information it receives and does not use it for purposes unrelated to providing the service.
        </LegalP>
        <LegalP>
          AI responses are generated to support understanding, not to complete assignments on your behalf. You remain responsible for the work you submit, and you should always follow the academic integrity rules of your school and the International Baccalaureate organisation.
        </LegalP>
        <LegalCallout icon={TriangleAlert} title="Please verify important information" tone="warning">
          <p>
            AI can occasionally make mistakes. AI-generated explanations, summaries, or suggestions may contain inaccuracies or be based on incomplete information. Before relying on AI output for graded or submitted work, verify it against your textbooks, class notes, and teacher guidance.
          </p>
        </LegalCallout>
        <LegalP>
          AI should complement — not replace — your own thinking, your teachers, and your school&apos;s guidance. Use it as a study companion: to explain a concept in a different way, to generate practice questions, or to help you structure revision.
        </LegalP>
      </LegalSection>

      <LegalSection id="cookies" category="Cookies" title="Cookies and similar technologies">
        <LegalP>
          Cookies are small text files that websites store on your device. We use a small number of cookies to keep the platform secure and to remember your preferences. We do not use cookies for advertising, and we do not allow third-party advertising cookies on IB Nexus.
        </LegalP>
        <LegalH3>Essential cookies</LegalH3>
        <LegalP>
          These cookies are required for the platform to function. They keep you signed in, protect your session against unauthorised access, and remember security choices you make. Because they are essential, they cannot be disabled in IB Nexus, though you can usually block or delete them through your browser settings — doing so may stop certain features from working.
        </LegalP>
        <LegalH3>Preference cookies</LegalH3>
        <LegalP>
          These cookies remember choices such as your preferred theme, reading settings, and interface preferences, so your workspace looks and behaves the way you left it.
        </LegalP>
        <LegalH3>Performance and analytics cookies (future)</LegalH3>
        <LegalP>
          As the platform grows, we may introduce cookies that help us understand how IB Nexus is used, measure performance, and improve reliability. Any analytics we deploy will be designed to work with aggregated, de-identified data wherever possible, and this policy will be updated before such cookies are introduced.
        </LegalP>
        <LegalCallout icon={Cookie} title="Your control" tone="info">
          <p>
            You can manage or delete cookies through your browser settings at any time. Most browsers let you view stored cookies, block new ones, and clear existing ones. Because essential cookies keep you signed in securely, clearing them may require you to sign in again.
          </p>
        </LegalCallout>
      </LegalSection>

      <LegalSection id="third-party-services" category="Third-Party Services" title="When we work with trusted partners">
        <LegalP>
          IB Nexus relies on a small number of third-party services to operate reliably. We choose providers carefully, review them for privacy and security, and limit what they receive to what is necessary to provide the service.
        </LegalP>
        <LegalList
          items={[
            ["Authentication providers — ", "we support sign-in with third-party identity providers such as Google. When you choose this option, that provider shares basic profile information (typically your name and email) with us so we can create and verify your account."],
            ["Cloud infrastructure and data hosting — ", "we use secure cloud infrastructure to run the platform and store data. This includes database services that hold account information and study data."],
            ["Email services — ", "we may use email providers to send transactional messages such as account verification, password reset, and important service notices."],
            ["AI model providers — ", "AI-powered features are supported by machine learning providers that process the questions you submit in order to generate responses."],
            ["Analytics services (future) — ", "we may work with analytics providers to understand product usage, always favouring aggregated and anonymised data."],
            ["Payment providers (future) — ", "if IB Nexus introduces paid plans, payment processing will be handled by established payment providers. We will not store your full card details on our servers."],
          ]}
        />
        <LegalP>
          We require every provider we work with to protect your information with appropriate security measures and to use it only to provide services to us. Where we discover a provider fails to meet that standard, we take steps to correct the issue or stop working with that provider.
        </LegalP>
        <LegalP>
          We do not share your study data with third parties for their own purposes, and we never sell personal information. The only exceptions are where you have given consent, where the law requires it, or where a service provider needs the information to operate a feature you are using.
        </LegalP>
      </LegalSection>

      <LegalSection id="data-security" category="Data Security" title="How we protect your information">
        <LegalP>
          Protecting student data is a core responsibility, and we design security into the platform rather than adding it on later. Our security practices include:
        </LegalP>
        <LegalList
          items={[
            ["Encryption — ", "data is encrypted in transit using industry-standard transport security (TLS) and is encrypted at rest in secure cloud storage."],
            ["Secure authentication — ", "passwords are stored only as secure hashes, never in plain text. We support secure sign-in methods including password and third-party authentication, and we protect sessions against unauthorised access."],
            ["Access control — ", "access to production systems is restricted to authorised personnel only, on a least-privilege basis, and protected by strong authentication."],
            ["Regular improvements — ", "we continually review our security practices, update dependencies, monitor for suspicious activity, and respond promptly to potential vulnerabilities."],
          ]}
        />
        <LegalP>
          No method of transmission or storage is completely secure. While we work hard to protect your information, we cannot guarantee absolute security. If you believe your account has been compromised, please contact us immediately so we can help secure it.
        </LegalP>
      </LegalSection>

      <LegalSection id="data-retention" category="Data Retention" title="How long we keep your data">
        <LegalP>
          We keep your information only as long as it is needed to provide the service, meet your expectations, and satisfy legal obligations. In practice:
        </LegalP>
        <LegalList
          items={[
            ["Active accounts — ", "we keep your account and study data for as long as your account is active, so your workspace, notes, and progress remain available."],
            ["Deletion requests — ", "when you ask us to delete your account (or exercise your deletion rights), we remove your personal information and study data from the platform within a reasonable period, typically within 30 days."],
            ["Backups — ", "deleted data may persist briefly in backup systems before being purged in line with our backup retention schedule."],
            ["Legal obligations — ", "we may retain certain records where required by law, to resolve disputes, or to enforce agreements, for as long as those obligations reasonably require."],
          ]}
        />
        <LegalCallout icon={Trash2} title="Deleting your account" tone="info">
          <p>
            If you want to delete your account and the data associated with it, contact our support team through the <LegalLink href="/contact">contact page</LegalLink>. We will walk you through the process and confirm once deletion is complete. Deleting your account permanently removes saved notes, flashcards, plans, and personal details — this cannot be undone.
          </p>
        </LegalCallout>
        <LegalP>
          Your study data belongs to you. When you leave IB Nexus — whether you complete your programme or choose to stop using the platform — you can take your data with you or have it removed.
        </LegalP>
      </LegalSection>

      <LegalSection id="childrens-privacy" category="Children's Privacy" title="Thoughtful care for younger students">
        <LegalP>
          IB Nexus is designed primarily for students, including students in the Middle Years Programme (typically ages 11–16) and the Diploma Programme (typically ages 16–19). Because many of our users are minors, we take particular care with the information we collect from and about them.
        </LegalP>
        <LegalP>
          We collect the minimum information needed to provide the platform, and we do not market to children or use student data for advertising. Where a student is below the age at which they can legally consent to data processing in their region, we encourage parents and guardians to be involved in setting up and using the account, and we rely on parental consent where required by law.
        </LegalP>
        <LegalP>
          Parents and guardians have the right to review their child&apos;s information, request corrections, or ask us to delete the data we hold about their child. We will honour such requests promptly and in line with this policy.
        </LegalP>
        <LegalCallout icon={Users} title="To parents and guardians" tone="warning">
          <p>
            If you believe your child is using IB Nexus and you would like to review their information, manage the account, or request deletion, please contact us. We will verify your relationship to the account before responding, and we will never share a student&apos;s data with someone we cannot reasonably confirm is authorised.
          </p>
        </LegalCallout>
        <LegalP>
          If we learn that we have collected personal information from a child without appropriate consent, we will take steps to delete that information as quickly as possible.
        </LegalP>
      </LegalSection>

      <LegalSection id="international-users" category="International Users" title="A note for users outside your region">
        <LegalP>
          IB Nexus serves IB students around the world. To deliver the platform, your information may be transferred to, stored in, and processed in countries other than the one where you live — including locations where our cloud infrastructure providers operate.
        </LegalP>
        <LegalP>
          Some of those countries may have data protection laws that differ from those in your home country. Where we transfer personal information across borders, we take reasonable steps to protect it, including using recognised transfer safeguards and contractual protections with our providers.
        </LegalP>
        <LegalP>
          By using IB Nexus, you understand that your information may be processed in other countries. Where the law requires a specific legal basis for such transfers, we rely on your consent, the performance of our contract with you, or other lawful grounds.
        </LegalP>
      </LegalSection>

      <LegalSection id="your-rights" category="Your Rights" title="Your rights over your information">
        <LegalP>
          You have clear rights over the personal information we hold about you. Depending on where you live, and subject to certain legal limits, you can:
        </LegalP>
        <LegalList
          items={[
            ["Access — ", "request a copy of the personal information we hold about you."],
            ["Correction — ", "ask us to update or correct information that is inaccurate or incomplete."],
            ["Deletion — ", "request that we delete your personal information, subject to legal and operational requirements."],
            ["Export — ", "request a portable copy of your data in a structured, machine-readable format (such as your notes and account information)."],
            ["Restrict or object (where applicable) — ", "ask us to limit how we process your information in certain circumstances, or object to processing based on legitimate interests."],
            ["Withdraw consent — ", "withdraw any consent you have given at any time."],
          ]}
        />
        <LegalCallout icon={Download} title="Exporting your data" tone="info">
          <p>
            You can export the content you create — notes, flashcards, and study material — at any time. If self-serve export is not yet available for a particular feature, contact our support team and we will provide your data in a common format, such as PDF or markdown.
          </p>
        </LegalCallout>
        <LegalP>
          To exercise any of these rights, contact us using the details below. In most cases we will respond within 30 days. We may need to verify your identity before acting on your request, and a small number of legal exceptions may prevent us from honouring a specific request.
        </LegalP>
        <LegalP>
          If you are not satisfied with how we handle your request, you also have the right to complain to your local data protection authority.
        </LegalP>
      </LegalSection>

      <LegalSection id="policy-updates" category="Policy Updates" title="When this policy changes">
        <LegalP>
          We may update this Privacy Policy from time to time as the platform evolves, as features are added, or as legal requirements change. When we make changes, we will:
        </LegalP>
        <LegalList
          items={[
            "Update the “Last updated” date at the top of this page.",
            "Notify account holders by email or through an in-app notice when a change is significant.",
            "Explain, where practical, what changed and why it changed.",
          ]}
        />
        <LegalP>
          Material changes — such as a new use of your data or a new category of information we collect — will never be applied retroactively to data collected under a previous policy without explaining the change first. If you continue to use IB Nexus after changes take effect, the updated policy will apply to your use of the platform.
        </LegalP>
      </LegalSection>

      <LegalSection id="contact" category="Contact" title="Talk to us about your data">
        <LegalP>
          If you have questions about this Privacy Policy, about the data we hold about you, or about how to exercise your rights, our team is here to help.
        </LegalP>
        <LegalList
          items={[
            ["By email — ", <LegalLink key="email" href="mailto:privacy@ibnexus.com">privacy@ibnexus.com</LegalLink>],
            ["Through the contact form — ", <LegalLink key="contact" href="/contact">Contact the IB Nexus support team</LegalLink>],
            ["For privacy-specific requests — ", "please mark your message as a privacy request so it reaches the right team quickly."],
          ]}
        />
        <LegalP>
          We aim to respond to privacy enquiries within 30 days of receiving them, and usually much sooner. When you contact us, we may ask for information that confirms you are the account holder before we act on your request — this protects accounts from unauthorised access.
        </LegalP>
      </LegalSection>
    </LegalPageShell>
  );
}
