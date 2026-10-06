"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function DashboardTemplate({ children }) {
  const pathname = usePathname();
  
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        opacity: { duration: 0.2 } 
      }}
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
}
