"use client";

import Link from "next/link";
import { User, Shield, HelpCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsClient() {
  const sections = [
    {
      href: "/settings/profile",
      title: "Identity & Academics",
      description: "Manage your display name, school, IB programme, and study preferences.",
      icon: <User size={36} strokeWidth={1.5} />,
      gradient: "from-[var(--accent)] to-[var(--info)]",
      delay: 0.1,
    },
    {
      href: "/settings/security",
      title: "Login & Security",
      description: "Manage your password, login methods, and secure your account.",
      icon: <Shield size={36} strokeWidth={1.5} />,
      gradient: "from-[var(--info)] to-[var(--ai)]",
      delay: 0.2,
    },
    {
      href: "/settings/help",
      title: "Help & Support",
      description: "Access the Help Center, contact our support team, and report issues.",
      icon: <HelpCircle size={36} strokeWidth={1.5} />,
      gradient: "from-[var(--warning)] to-[var(--error)]",
      delay: 0.3,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6, staggerChildren: 0.15 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[var(--background)] px-4 py-10 sm:py-16 relative overflow-hidden flex flex-col justify-center">
      {/* Ambient Glows */}
      <div className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] bg-[var(--accent)]/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[30vw] h-[30vw] bg-[var(--info)]/10 blur-[140px] rounded-full pointer-events-none" />

      <motion.div 
        className="max-w-5xl mx-auto w-full relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="mb-14 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--foreground)] tracking-tight mb-4">
            Settings
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto leading-relaxed">
            Manage your account preferences, security, and tailor the IB Nexus experience to your exact needs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sections.map((section) => (
            <motion.div
              key={section.href}
              variants={itemVariants}
            >
              <Link
                href={section.href}
                className="group relative flex flex-col h-full p-[1px] rounded-[2rem] bg-gradient-to-b from-[var(--border-strong)] to-[var(--border)] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)] block"
              >
                {/* Background Hover Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                
                <div className="relative flex flex-col h-full bg-[var(--card)] rounded-[calc(2rem-1px)] p-8 sm:p-10 z-10">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${section.gradient} flex items-center justify-center text-white shadow-lg shadow-black/10 mb-8 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                    {section.icon}
                  </div>
                  <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 group-hover:text-[var(--accent)] transition-colors duration-300">
                    {section.title}
                  </h2>
                  <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed mb-8 flex-grow">
                    {section.description}
                  </p>
                  
                  <div className="flex items-center text-sm font-bold text-[var(--accent)] mt-auto opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    Manage <ArrowRight size={16} className="ml-2" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </main>
  );
}
