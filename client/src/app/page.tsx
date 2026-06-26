"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  BookOpen,
  CheckCircle,
  Brain,
  LineChart,
  LayoutDashboard,
  FileText,
  ChevronDown,
  Menu,
  X,
  ArrowRight,
  User,
  Star,
  Code
} from "lucide-react";



// Accordion Component
const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left focus:outline-none"
      >
        <h4 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{question}</h4>
        <ChevronDown className={`w-5 h-5 text-zinc-500 dark:text-zinc-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        className="overflow-hidden"
      >
        <p className="pt-4 text-zinc-600 dark:text-zinc-300">{answer}</p>
      </motion.div>
    </div>
  );
};

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const features = [
    { 
      mockup: (
        <div className="w-full h-40 relative rounded-xl overflow-hidden border border-zinc-800">
          <Image src="/ai_generation.png" alt="AI Exam Generation" fill className="object-cover object-top" />
        </div>
      ),
      title: "Effortless Content Creation", 
      desc: "Instantly generate questions for any subject using our advanced AI generation feature.",
      gradient: "from-blue-600/50 to-blue-900/10",
      borderGlow: "from-blue-500/50 via-blue-500/10 to-transparent"
    },
    { 
      mockup: (
        <div className="w-full h-40 relative rounded-xl overflow-hidden border border-zinc-800">
          <Image src="/student_dashboard.png" alt="Smart Auto Evaluation" fill className="object-cover object-top" />
        </div>
      ),
      title: "Smart AI Evaluations", 
      desc: "Save hours of grading. Our AI automatically evaluates and scores descriptive student answers.",
      gradient: "from-purple-600/50 to-purple-900/10",
      borderGlow: "from-purple-500/50 via-purple-500/10 to-transparent"
    },
    { 
      mockup: (
        <div className="w-full h-40 relative rounded-xl overflow-hidden border border-zinc-800">
          <Image src="/leaderboard.png" alt="Competitive Leaderboard" fill className="object-cover object-top" />
        </div>
      ),
      title: "Competitive Leaderboard", 
      desc: "Motivate students with real-time rankings, performance metrics, and gamified scoring.",
      gradient: "from-pink-600/50 to-pink-900/10",
      borderGlow: "from-pink-500/50 via-pink-500/10 to-transparent"
    },
    { 
      mockup: (
        <div className="w-full h-40 relative rounded-xl overflow-hidden border border-zinc-800">
          <Image src="/student_feedback.png" alt="Personalized Student Feedback" fill className="object-cover object-top" />
        </div>
      ),
      title: "Personalized Student Feedback", 
      desc: "Students receive instant, personalized feedback and can rate their exam experience.",
      gradient: "from-emerald-600/50 to-emerald-900/10",
      borderGlow: "from-emerald-500/50 via-emerald-500/10 to-transparent"
    },
    { 
      mockup: (
        <div className="w-full h-40 relative rounded-xl overflow-hidden border border-zinc-800">
          <Image src="/question_formats.png" alt="Diverse Question Formats" fill className="object-cover object-top" />
        </div>
      ),
      title: "Diverse Question Formats", 
      desc: "Support for MCQs, short answers, essays, and coding questions.",
      gradient: "from-orange-600/50 to-orange-900/10",
      borderGlow: "from-orange-500/50 via-orange-500/10 to-transparent"
    },
    { 
      mockup: (
        <div className="w-full h-40 relative rounded-xl overflow-hidden border border-zinc-800">
          <Image src="/teacher_dashboard.png" alt="Actionable Teacher Dashboard" fill className="object-cover object-top" />
        </div>
      ),
      title: "Actionable Teacher Dashboard", 
      desc: "Actionable insights into student performance, identifying areas of improvement.",
      gradient: "from-red-600/50 to-red-900/10",
      borderGlow: "from-red-500/50 via-red-500/10 to-transparent"
    },
  ];

  const faqs = [
    { q: "What topics can I create exams on?", a: "Abhyas AI is versatile. You can create exams for programming languages, computer science fundamentals, or any specialized IT training topics." },
    { q: "How does AI evaluation work?", a: "Our AI compares student answers against standard rubrics and expected concepts, grading intelligently for meaning rather than exact word matching." },
    { q: "Can teachers customize questions?", a: "Absolutely! AI generates the base questions, but teachers have full control to edit, remove, or add their own questions manually." },
    { q: "How is scoring done for text answers?", a: "The AI evaluates the semantic accuracy, key points covered, and awards partial marks if a student gets part of the concept correct." },
    { q: "Is it free to try?", a: "Yes, we offer a free tier for institutes to test out the platform before committing to a larger plan." }
  ];

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-blue-500/20">
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }
        .path-draw {
          stroke-dasharray: 500;
          stroke-dashoffset: 500;
          animation: draw 2s ease forwards;
          animation-delay: 0.5s;
        }
      `}} />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-zinc-900 rounded-md text-white font-bold text-xl shadow-sm">
                A
              </div>
              <span className="font-heading font-bold text-2xl tracking-tight text-zinc-900 dark:text-zinc-50">Abhyas</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a href="#features" className="text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-3 py-2 text-sm font-medium">Features</a>
                <a href="#how-it-works" className="text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-3 py-2 text-sm font-medium">How it works</a>
                <a href="#faq" className="text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-3 py-2 text-sm font-medium">FAQ</a>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <ThemeToggle />
              <Link href="/auth/login" className="text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-sm transition-colors">
                Login
              </Link>
              <Link href="/auth/login" className="bg-blue-600 text-white hover:bg-blue-700 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-md hover:shadow-lg">
                Get Started
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <ThemeToggle />
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white p-2">
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shadow-lg">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-zinc-600 hover:text-blue-600 block px-3 py-2 text-base font-medium">Features</a>
              <a href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="text-zinc-600 hover:text-blue-600 block px-3 py-2 text-base font-medium">How it works</a>
              <a href="#faq" onClick={() => setIsMenuOpen(false)} className="text-zinc-600 hover:text-blue-600 block px-3 py-2 text-base font-medium">FAQ</a>
              <Link href="/auth/login" className="text-zinc-600 hover:text-blue-600 block px-3 py-2 text-base font-medium">Login</Link>
              <Link href="/auth/login" className="text-blue-600 block px-3 py-2 text-base font-medium">Get Started Free</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-4 relative overflow-hidden bg-white dark:bg-zinc-950">
        {/* Simple Background */}

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          <motion.div
            initial="hidden" animate="visible" variants={fadeInUp}
            className="flex-1 text-center lg:text-left"
          >

            <h1 className="text-5xl md:text-7xl font-bold font-heading leading-[1.1] tracking-tight mb-6 text-zinc-900 dark:text-zinc-50">
              Practice Smarter, <br className="hidden md:block" />
              <span className="text-blue-600">Grow Faster</span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-300 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              AI-powered exam preparation for any subject. Automatically generate questions, evaluate descriptive answers, and give instant feedback to help your students excel.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link href="/auth/login" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold transition-colors flex items-center justify-center gap-2">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#how-it-works" className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-full font-semibold transition-all flex items-center justify-center shadow-sm hover:shadow-md">
                See How it Works
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="flex-1 w-full max-w-xl lg:max-w-none relative"
          >
            <div className="rounded-2xl border border-zinc-100 bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] relative overflow-hidden group">
              <img
                src="/abhyas_logo.png"
                alt="Student using Abhyas platform"
                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700 ease-in-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
            </div>
          </motion.div>
        </div>
      </section>



      {/* Features Section */}
      <section id="features" className="py-24 px-4 relative bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4 text-zinc-900 dark:text-zinc-50">Everything you need to teach better</h2>
            <p className="text-zinc-600 dark:text-zinc-300 text-lg max-w-2xl mx-auto">Our AI platform handles the heavy lifting of content creation and evaluation so teachers can focus on guiding students.</p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((f, i) => (
              <motion.div key={i} variants={fadeInUp} className="relative group">
                {/* Border Glow */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${f.borderGlow} opacity-30 group-hover:opacity-100 transition-opacity blur-md`}></div>
                
                {/* Inner Card */}
                <div className={`relative h-full bg-zinc-950 rounded-3xl p-8 flex flex-col justify-between overflow-hidden border border-zinc-800/50`}>
                  
                  {/* Subtle Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-10 group-hover:opacity-30 transition-opacity`}></div>
                  
                  {/* Content */}
                  <div className="relative z-10 flex flex-col h-full">
                    <h3 className="text-xl font-bold mb-4 text-zinc-100 tracking-wide">{f.title}</h3>
                    
                    <div className="flex-1 flex items-center justify-center py-6 px-4">
                      <div className="w-full transform group-hover:scale-[1.03] group-hover:-translate-y-1 transition-all duration-500 ease-out">
                        {f.mockup}
                      </div>
                    </div>
                    
                    <p className="text-zinc-400 leading-relaxed text-sm md:text-base">{f.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="py-24 px-4 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4 text-zinc-900 dark:text-zinc-50">How Abhyas Works</h2>
            <p className="text-zinc-600 dark:text-zinc-300 text-lg max-w-2xl mx-auto">A seamless workflow from exam creation to detailed student feedback.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"
          >
            <img 
              src="/workflow.png" 
              alt="Abhyas Workflow" 
              className="w-full h-auto object-cover"
            />
          </motion.div>
        </div>
      </section>





      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4 text-zinc-900 dark:text-zinc-50">Frequently Asked Questions</h2>
            <p className="text-zinc-600 dark:text-zinc-300">Everything you need to know about the product and billing.</p>
          </div>

          <div className="space-y-2 bg-white dark:bg-zinc-950 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            {faqs.map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 pt-16 pb-8 px-4 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-zinc-400 rounded-md text-white font-bold text-xl shadow-sm">
                  A
                </div>
                <span className="font-heading font-bold text-2xl tracking-tight text-zinc-500">Abhyas</span>
              </div>
              <p className="text-zinc-500 max-w-sm">
                The AI-powered mock exam platform designed to help computer training institutes scale their evaluation process.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-zinc-900 dark:text-zinc-50">Product</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="text-zinc-500 hover:text-blue-600 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="text-zinc-500 hover:text-blue-600 transition-colors">How it Works</a></li>
                <li><Link href="/auth/login" className="text-zinc-500 hover:text-blue-600 transition-colors">Login</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-zinc-900 dark:text-zinc-50">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-zinc-500 hover:text-blue-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-blue-600 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-blue-600 transition-colors">Contact Us</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 text-center md:text-left flex flex-col md:flex-row justify-between items-center text-zinc-400 dark:text-zinc-500 text-sm">
            <p>&copy; 2026 Abhyas. All rights reserved.</p>
            <div className="mt-4 md:mt-0 font-medium">
              Designed for Education.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
