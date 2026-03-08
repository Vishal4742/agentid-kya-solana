import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Zap, ArrowRight, X, ChevronRight } from "lucide-react";

const STORAGE_KEY = "agentid_onboarded";

const STEPS = [
  {
    tag: "01 · Protocol",
    title: "What is AgentID?",
    icon: Zap,
    body: "AgentID is a decentralised identity and reputation layer for AI agents on Solana. Every agent gets an on-chain credential — a verifiable proof of who they are, what they can do, and how trustworthy they are.",
    sub: "Know Your Agent · KYA Protocol · v0.1 devnet",
  },
  {
    tag: "02 · Mechanics",
    title: "How it works.",
    icon: null,
    bullets: [
      {
        step: "Register",
        desc: "Mint an on-chain credential NFT for your agent — name, framework, capabilities, spending limits.",
      },
      {
        step: "Build Reputation",
        desc: "Every successful transaction, audit, and interaction increments your agent's reputation score (0–1000).",
      },
      {
        step: "Transact",
        desc: "Other agents and programs verify your credential via CPI before executing high-value actions.",
      },
    ],
  },
  {
    tag: "03 · Get Started",
    title: "Ready to register?",
    icon: null,
    body: "Register your first agent in under two minutes. You'll need a Phantom or Solflare wallet connected to Solana devnet.",
    cta: "Register an Agent",
    ctaHref: "/register",
  },
];

/* Slide variants — content slides L→R between steps */
const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

export default function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      // slight delay so page renders first
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const goTo = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const handleCta = () => {
    dismiss();
    navigate("/register");
  };

  const current = STEPS[step];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
            className="fixed z-[101] inset-0 flex items-center justify-center px-6 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-lg border border-border bg-background shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green flex items-center justify-center">
                    <Zap className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <span className="font-mono text-xs font-semibold tracking-tight">AgentID</span>
                </div>
                <button
                  onClick={dismiss}
                  className="text-muted-foreground/40 hover:text-foreground transition-colors p-1"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step content — animated */}
              <div className="overflow-hidden px-6 py-8 min-h-[280px] flex flex-col">
                <AnimatePresence mode="wait" custom={dir}>
                  <motion.div
                    key={step}
                    custom={dir}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
                    className="flex flex-col flex-1"
                  >
                    <span className="label-meta text-muted-foreground/40 mb-3">{current.tag}</span>

                    <h2 className="font-serif italic text-3xl sm:text-4xl leading-tight tracking-[-0.02em] mb-5">
                      {current.title}
                    </h2>

                    {/* Step 1 — explainer */}
                    {"body" in current && !current.cta && (
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        {current.body}
                      </p>
                    )}
                    {"sub" in current && current.sub && (
                      <p className="font-mono text-[10px] text-muted-foreground/30 uppercase tracking-widest">
                        {current.sub}
                      </p>
                    )}

                    {/* Step 2 — bullets */}
                    {"bullets" in current && current.bullets && (
                      <ol className="space-y-0 flex-1">
                        {current.bullets.map((b, i) => (
                          <li
                            key={b.step}
                            className="flex gap-4 py-3 border-b border-border last:border-0"
                          >
                            <span className="font-mono text-[10px] text-muted-foreground/30 pt-0.5 shrink-0 w-4">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-green mb-0.5">{b.step}</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}

                    {/* Step 3 — CTA */}
                    {"cta" in current && current.cta && (
                      <>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                          {current.body}
                        </p>
                        <button onClick={handleCta} className="btn-primary glow-green-sm self-start">
                          {current.cta}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer: step dots + nav */}
              <div className="flex items-center justify-between border-t border-border px-6 py-4">
                {/* Step indicators */}
                <div className="flex items-center gap-2">
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      className={`transition-all duration-300 ${
                        i === step
                          ? "w-6 h-1 bg-green"
                          : "w-2 h-1 bg-border hover:bg-muted-foreground/40"
                      }`}
                      aria-label={`Go to step ${i + 1}`}
                    />
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-3">
                  {step > 0 && (
                    <button
                      onClick={() => goTo(step - 1)}
                      className="label-meta hover:text-foreground transition-colors"
                    >
                      Back
                    </button>
                  )}
                  {step < STEPS.length - 1 ? (
                    <button
                      onClick={() => goTo(step + 1)}
                      className="btn-primary flex items-center gap-1.5 py-2 px-4"
                    >
                      Next <ChevronRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <button onClick={dismiss} className="label-meta hover:text-foreground transition-colors">
                      Skip
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
