import React from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CtaFooter() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-5xl mx-auto px-6 pt-12 pb-24 text-center"
    >
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-10 md:p-16 shadow-2xl shadow-emerald-500/20">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
          From "I watched the solution" to "I know how to solve it myself."
        </h2>
        <p className="text-emerald-100 text-lg mb-8 max-w-xl mx-auto">
          That's the LeapOnSAT difference. Ready to start?
        </p>
        <Button
          onClick={() => base44.auth.redirectToLogin()}
          size="lg"
          className="bg-white text-emerald-700 hover:bg-emerald-50 rounded-full px-8 py-6 text-lg font-bold shadow-xl"
        >
          Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </motion.section>
  );
}
