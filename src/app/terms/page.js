import LegalPageShell from "@/components/legal/LegalPageShell";
import {
  LegalCallout,
  LegalH3,
  LegalLink,
  LegalList,
  LegalP,
  LegalSection,
} from "@/components/legal/primitives";
import { BookOpen, Gavel, Handshake, Scale, ScrollText, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";

export const metadata = {
  title: "Terms of Service | IB Nexus",
  description:
    "Clear expectations for using IB Nexus. These terms explain your rights and responsibilities on our learning platform for IB students.",
};

const toc = [
  { id: "acceptance-of-terms", label: "Acceptance of Terms" },
  { id: "eligibility", label: "Eligibility" },
  { id: "account-responsibilities", label: "Account Responsibilities" },
  { id: "acceptable-use", label: "Acceptable Use" },
  { id: "educational-purpose", label: "Educational Purpose" },
  { id: "user-content", label: "User Content" },
  { id: "intellectual-property", label: "Intellectual Property" },
  { id: "ai-disclaimer", label: "AI Disclaimer" },
  { id: "availability", label: "Availability" },
  { id: "termination", label: "Termination" },
  { id: "limitation-of-liability", label: "Limitation of Liability" },
  { id: "changes-to-terms", label: "Changes to Terms" },
  { id: "governing-law", label: "Governing Law" },
  { id: "contact-information", label: "Contact Information" },
];

export default function TermsOfServicePage() {
  return (
    <LegalPageShell
      eyebrow="Terms of Service"
      title="Clear expectations for using IB Nexus."
      subtitle="These terms explain your rights and responsibilities, and how our platform operates, so that students, parents, and educators can use IB Nexus with confidence."
      lastUpdated="August 2026"
      readingTime="11 min read"
      toc={toc}
      supportText="Questions about these terms, your account, or how IB Nexus operates? Our support team is here to help."
    >
      <LegalSection id="acceptance-of-terms" category="Acceptance of Terms" title="By using IB Nexus, you agree to these terms">
        <LegalP>
          Welcome to IB Nexus. These Terms of Service (“Terms”) are a legally binding agreement between you and IB Nexus, the operator of the learning platform. They govern your access to and use of the IB Nexus website, applications, and related services (together, the “Platform”).
        </LegalP>
        <LegalP>
          By creating an account, signing in, or using the Platform in any way, you confirm that you accept these Terms and agree to be bound by them. If you do not agree with any part of these Terms, please do not use the Platform.
        </LegalP>
        <LegalP>
          These Terms work together with our <LegalLink href="/privacy">Privacy Policy</LegalLink>, which explains how we handle your personal information. Both documents apply whenever you use the Platform.
        </LegalP>
        <LegalCallout icon={Handshake} title="The short version" tone="info">
          <p>
            Use IB Nexus to study, learn, and stay organised. Be respectful of the platform, other users, and the law. Don&apos;t misuse the service or attempt to break it.
          </p>
        </LegalCallout>
      </LegalSection>

      <LegalSection id="eligibility" category="Eligibility" title="Who can use IB Nexus">
        <LegalP>
          IB Nexus is designed for students working toward the International Baccalaureate programmes — including the Middle Years Programme (MYP) and Diploma Programme (DP) — as well as for parents, guardians, and educators supporting those students.
        </LegalP>
        <LegalList
          items={[
            "If you are under 18, you must have permission from a parent or guardian to create an account, and you should use the Platform with their knowledge and guidance.",
            "If you are a parent or guardian, you are responsible for supervising the minor's use of the Platform and for their compliance with these Terms.",
            "You must provide accurate information when creating an account and keep it up to date.",
            "You must not use the Platform if you have been previously banned or suspended from it.",
            "You must be legally able to enter into these Terms in your country of residence.",
          ]}
        />
        <LegalP>
          We may from time to time require verification of eligibility when accounts appear to have been created in violation of these rules.
        </LegalP>
      </LegalSection>

      <LegalSection id="account-responsibilities" category="Account Responsibilities" title="Keeping your account safe">
        <LegalP>
          Your IB Nexus account is personal to you. You are responsible for everything that happens under your account, so protecting it matters.
        </LegalP>
        <LegalH3>Passwords and security</LegalH3>
        <LegalList
          items={[
            "Choose a strong, unique password that you do not reuse across other websites.",
            "Never share your password or sign-in credentials with anyone — including friends, classmates, or people who claim to be from IB Nexus support.",
            "If you use a third-party sign-in (such as Google), keep that account secure as well.",
            "If you believe your account has been compromised, change your password immediately and contact our support team.",
          ]}
        />
        <LegalH3>Accurate information</LegalH3>
        <LegalList
          items={[
            "Provide true, accurate, and complete information when you sign up and when you update your profile.",
            "Do not create an account on behalf of someone else, and do not impersonate another person, school, or organisation.",
            "Keep your contact details up to date so we can reach you about important account matters.",
          ]}
        />
        <LegalP>
          We may suspend or terminate accounts that appear to have been created with false information or that are being used by someone other than the registered owner.
        </LegalP>
      </LegalSection>

      <LegalSection id="acceptable-use" category="Acceptable Use" title="How you may — and may not — use IB Nexus">
        <LegalP>
          IB Nexus is a space for genuine study. Using it should support learning, not undermine it. You agree not to misuse the Platform in any way. Specifically, you may not:
        </LegalP>
        <LegalList
          items={[
            ["Hack or attack the Platform — ", "attempt to gain unauthorised access to IB Nexus systems, other users' accounts, or any network or database connected to the Platform."],
            ["Cheat or facilitate dishonesty — ", "use the Platform to complete assignments dishonestly, generate work to submit as your own, or help others do the same."],
            ["Abuse AI features — ", "use AI tools to bypass learning, generate inappropriate content, or probe or manipulate the AI systems beyond their intended use."],
            ["Upload malicious software — ", "transmit viruses, malware, worms, or any code designed to harm the Platform, other users, or their devices."],
            ["Share illegal content — ", "post or share content that violates the law, including content that is fraudulent, defamatory, or infringes intellectual property rights."],
            ["Impersonate others — ", "pretend to be another person, a teacher, a school, or an IB Nexus representative."],
            ["Spam or harass — ", "send unsolicited messages, threaten or harass other users, or interfere with anyone's use of the Platform."],
            ["Attempt unauthorised access — ", "probe, scan, or test the security of the Platform without written permission from us."],
            ["Scrape or resell content — ", "systematically extract Platform content, data, or user information to reuse or resell it elsewhere."],
            ["Circumvent controls — ", "attempt to bypass rate limits, access restrictions, or any technical measures we use to protect the Platform."],
          ]}
        />
        <LegalCallout icon={ShieldAlert} title="What happens if these rules are broken?" tone="warning">
          <p>
            We take acceptable-use violations seriously. Depending on the severity, we may remove content, warn the account holder, suspend access, or permanently terminate an account. Where activity is clearly unlawful, we may also report it to the relevant authorities.
          </p>
        </LegalCallout>
      </LegalSection>

      <LegalSection id="educational-purpose" category="Educational Purpose" title="What IB Nexus is — and is not">
        <LegalP>
          IB Nexus is a study companion. It helps you organise material, plan revision, and build understanding through tools like notes, flashcards, planning, and AI-supported learning.
        </LegalP>
        <LegalP>
          IB Nexus is not a substitute for schooling, teachers, or your own effort. We do not guarantee grades, assessment outcomes, or university admissions. Academic results depend on many factors outside the Platform — your teaching, your study habits, and the standards applied by your school and the IB organisation.
        </LegalP>
        <LegalCallout icon={BookOpen} title="A complement, not a replacement" tone="info">
          <p>
            Use IB Nexus to support the learning that happens in your classroom — not to replace it. Teachers remain your primary source of subject guidance, feedback, and academic direction. Always follow your school&apos;s academic integrity policies.
          </p>
        </LegalCallout>
        <LegalP>
          While we aim for the Platform to be accurate and helpful, we cannot guarantee that every resource or AI response is correct or complete. You are responsible for the academic decisions you make.
        </LegalP>
      </LegalSection>

      <LegalSection id="user-content" category="User Content" title="Your content stays yours">
        <LegalP>
          The notes, flashcards, study plans, uploads, and other material you create or add to IB Nexus are called “User Content.” You own your User Content.
        </LegalP>
        <LegalList
          items={[
            ["You keep full ownership — ", "your uploaded notes and study material remain yours. IB Nexus claims no ownership over them."],
            ["We receive a limited license — ", "by using the Platform, you grant IB Nexus a non-exclusive, worldwide, royalty-free license to host, store, process, and display your User Content solely to provide the Platform to you. That's it. This license ends when you delete the content or your account, subject to standard backup cycles."],
            ["You are responsible for your content — ", "you confirm that you have the right to upload the content you add, that it does not violate any law or third-party rights, and that it is appropriate for a study platform."],
          ]}
        />
        <LegalP>
          We do not use your study data to advertise to you, and we do not sell your content or personal information. Your material is used to run the service you asked for, nothing more.
        </LegalP>
      </LegalSection>

      <LegalSection id="intellectual-property" category="Intellectual Property" title="What IB Nexus owns">
        <LegalP>
          IB Nexus — including its brand, name, logo, design, software, user interface, written content, and any marks or materials we create — is our intellectual property, or the property of our licensors. These Terms do not give you any ownership in the Platform itself.
        </LegalP>
        <LegalList
          items={[
            ["Brand — ", "the “IB Nexus” name, logo, and the overall look and feel of the platform are protected marks and design assets."],
            ["Software — ", "the code, architecture, and systems that make IB Nexus work."],
            ["Content — ", "any guidance, articles, templates, and educational material we publish on the Platform."],
            ["Third-party marks — ", "“International Baccalaureate,” “IB,” and related terms are trademarks of their respective owners. IB Nexus is an independent platform and is not affiliated with, endorsed by, or connected to the International Baccalaureate Organisation unless expressly stated."],
          ]}
        />
        <LegalP>
          You may not copy, reproduce, modify, distribute, or create derivative works of the Platform or its content, except as explicitly permitted by these Terms or by us in writing.
        </LegalP>
      </LegalSection>

      <LegalSection id="ai-disclaimer" category="AI Disclaimer" title="AI: a helpful study tool, with limits">
        <LegalP>
          IB Nexus includes AI-powered features that generate explanations, practice questions, and revision support. We are proud of this technology, and we are also honest about its limits.
        </LegalP>
        <LegalCallout icon={TriangleAlert} title="AI can make mistakes" tone="warning">
          <p>
            AI-generated content may occasionally be inaccurate, outdated, or incomplete. AI does not have access to your school&apos;s specific syllabus, your teacher&apos;s expectations, or the marking criteria applied to your work. Always verify important academic information with trusted sources: your textbooks, class notes, and teachers.
          </p>
        </LegalCallout>
        <LegalList
          items={[
            "Do not submit AI-generated answers as your own work. That is academic misconduct at most schools and is expressly prohibited by these Terms.",
            "AI suggestions are starting points for your own thinking — not verdicts about what is correct.",
            "We may continuously improve our AI systems, which means responses to the same question may change over time.",
            "To the maximum extent permitted by law, we are not responsible for decisions you make based on AI-generated content.",
          ]}
        />
      </LegalSection>

      <LegalSection id="availability" category="Availability" title="The service may evolve">
        <LegalP>
          We are building IB Nexus to be reliable and dependable, and we work hard to keep it that way. At the same time, platforms change: features are added, improved, and occasionally retired.
        </LegalP>
        <LegalList
          items={[
            ["Maintenance — ", "we may schedule maintenance windows, usually during low-usage periods, during which some services may be temporarily unavailable."],
            ["Updates — ", "we may modify, add, or remove features as the product evolves. We will aim to provide reasonable notice for significant changes."],
            ["Temporary downtime — ", "like any online service, IB Nexus may experience interruptions from time to time due to factors that are or are not within our control."],
            ["No guarantee of uninterrupted service — ", "while we aim for high availability, we do not guarantee that the Platform will be available at all times without interruption."],
          ]}
        />
        <LegalP>
          Changes to the Platform are part of providing a growing service. Continued use of IB Nexus after changes take effect means you accept the updated service as it is offered.
        </LegalP>
      </LegalSection>

      <LegalSection id="termination" category="Termination" title="When accounts may be suspended or closed">
        <LegalP>
          You can stop using IB Nexus at any time, and you can delete your account by contacting us through the <LegalLink href="/contact">contact page</LegalLink> or following the options available in your settings.
        </LegalP>
        <LegalP>
          We may suspend or terminate an account, or restrict access to the Platform, when we believe it is necessary to protect the service, other users, or the law. This includes, without limitation:
        </LegalP>
        <LegalList
          items={[
            ["Violation of these Terms — ", "including repeated or serious breaches of the acceptable use rules."],
            ["Illegal activity — ", "where the account is used for activity that appears unlawful."],
            ["Abuse — ", "where the account harms other users, the Platform, or our systems, including attempted attacks or scraping."],
            ["Risk to security — ", "where we detect suspicious activity that suggests the account has been compromised or is being used fraudulently."],
          ]}
        />
        <LegalCallout icon={Gavel} title="What happens when an account is terminated?" tone="warning">
          <p>
            When an account is terminated, access to that account ends. Depending on the reason, User Content may be removed from the Platform. Where we suspend an account in error, we will work with you to resolve the issue as quickly as possible.
          </p>
        </LegalCallout>
      </LegalSection>

      <LegalSection id="limitation-of-liability" category="Limitation of Liability" title="Our responsibility to you">
        <LegalP>
          We provide the Platform “as is” and “as available,” without warranties of any kind, whether express or implied, to the maximum extent permitted by applicable law. This means we do not warrant that the Platform will be error-free, uninterrupted, or fully free of inaccuracies.
        </LegalP>
        <LegalP>
          To the maximum extent permitted by law, IB Nexus, its operators, employees, and partners will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of profits, data, goodwill, or other intangible losses, arising out of or related to your use of, or inability to use, the Platform.
        </LegalP>
        <LegalCallout icon={Scale} title="What this does not limit" tone="info">
          <p>
            Nothing in these Terms limits or excludes liability that cannot be limited or excluded under applicable law, such as liability for fraud, gross negligence, or death or personal injury caused by negligence. The limitations in this section apply only to the fullest extent permitted by law.
          </p>
        </LegalCallout>
        <LegalP>
          Because the Platform is offered at no charge today and is designed to support — not replace — formal education, our liability is limited to the greatest extent the law allows. Your primary protections are your own good judgment, your school, and your teachers.
        </LegalP>
      </LegalSection>

      <LegalSection id="changes-to-terms" category="Changes to Terms" title="When these terms are updated">
        <LegalP>
          We may update these Terms from time to time to reflect changes in the Platform, the law, or how we operate. When we do, we will:
        </LegalP>
        <LegalList
          items={[
            "Update the “Last updated” date at the top of this page.",
            "Notify account holders by email or through an in-app notice for changes that materially affect your rights or obligations.",
            "Make the updated Terms available on this page before they take effect, where practical.",
          ]}
        />
        <LegalP>
          If a change is significant, we will give you reasonable notice and, where appropriate, ask for your consent. If you do not agree to the updated Terms, you may stop using the Platform and delete your account. Continuing to use IB Nexus after updated Terms take effect means you accept them.
        </LegalP>
      </LegalSection>

      <LegalSection id="governing-law" category="Governing Law" title="Which law applies">
        <LegalP>
          These Terms are currently in the process of being finalised for the jurisdictions in which IB Nexus operates. Until the governing law and jurisdiction are formally established, this section will be updated.
        </LegalP>
        <LegalCallout icon={ScrollText} title="Coming soon" tone="info">
          <p>
            This section is intentionally a placeholder while we finalise our legal structure. We will update it before any legal dispute provisions take effect. In the meantime, if a dispute arises, we ask that you contact us first so we can resolve it amicably through our <LegalLink href="/contact">support team</LegalLink>.
          </p>
        </LegalCallout>
      </LegalSection>

      <LegalSection id="contact-information" category="Contact Information" title="Reaching IB Nexus">
        <LegalP>
          We welcome your questions about these Terms, the Platform, or anything else. Our team reads every message.
        </LegalP>
        <LegalList
          items={[
            ["General enquiries and support — ", <LegalLink key="contact" href="/contact">Contact the IB Nexus support team</LegalLink>],
            ["Legal matters — ", <LegalLink key="legal" href="mailto:legal@ibnexus.com">legal@ibnexus.com</LegalLink>],
            ["Privacy requests — ", <LegalLink key="privacy" href="mailto:privacy@ibnexus.com">privacy@ibnexus.com</LegalLink>],
          ]}
        />
        <LegalP>
          For the fastest response, please use the <LegalLink href="/contact">contact form</LegalLink> and choose the category that best matches your enquiry. We aim to respond within two business days.
        </LegalP>
        <LegalCallout icon={ShieldCheck} title="Thanks for reading" tone="success">
          <p>
            These terms exist to keep IB Nexus a safe, honest, and useful place to study. If you ever have questions about them, ask us. We&apos;re happy to explain.
          </p>
        </LegalCallout>
      </LegalSection>
    </LegalPageShell>
  );
}
