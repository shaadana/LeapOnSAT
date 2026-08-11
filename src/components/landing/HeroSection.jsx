import React from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <section className="max-w-5xl mx-auto px-6 pt-20 pb-12 text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-4">Personalized SAT Prep</p>
        <h1 className="text-5xl md:text-7xl font-display font-bold text-stone-900 mb-6 leading-tight">
          Learn to <span className="text-emerald-600">Leap</span> on the SAT
        </h1>
        <p className="text-xl text-stone-700 font-medium mb-4 leading-relaxed max-w-3xl mx-auto">
          Personalized SAT prep that helps students understand, practice, and improve with confidence.
        </p>
        <p className="text-base text-stone-500 mb-10 leading-relaxed max-w-2xl mx-auto">
          LeapOnSAT combines adaptive practice, 1:1 tutoring, Desmos strategy, deep review, and learner-profile insights so students don't just get answers — they learn how to think through the test.
        </p>
        <Button
          onClick={() => base44.auth.redirectToLogin()}
          size="lg"
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-8 py-6 text-lg font-bold shadow-xl"
        >
          Get Started <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </motion.div>
    </section>
  );
}
