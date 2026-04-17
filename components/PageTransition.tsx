"use client";

import { motion } from "framer-motion";

const variants = {
  hidden: { opacity: 0, x: 0, y: 15, scale: 0.99 },
  enter: { opacity: 1, x: 0, y: 0, scale: 1 },
  exit: { opacity: 0, x: 0, y: -10, scale: 0.99 },
};

export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="enter"
      exit="exit"
      transition={{ 
        type: "spring", 
        stiffness: 260, 
        damping: 20,
        opacity: { duration: 0.2 }
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
