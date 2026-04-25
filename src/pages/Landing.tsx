import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Heart, Shield, Brain, Dna, ArrowRight,
  Zap, Globe, Users, Star, CheckCircle2, Play, Menu, X, Trophy,
  Award, ExternalLink, Sparkles, Activity, Sun, Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import iconAI from "@/assets/icon-ai.png";
import iconTwin from "@/assets/icon-twin.png";
import iconSensor from "@/assets/icon-sensor.png";
import iconVault from "@/assets/icon-vault.png";
import iconEpid from "@/assets/icon-epid.png";
import digitalTwinHero from "@/assets/digital-twin-hero.jpg";
import aiBrainHealth from "@/assets/ai-brain-health.jpg";
import surveillanceMapBg from "@/assets/surveillance-map-bg.jpg";
import sensorWearable from "@/assets/sensor-wearable.jpg";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BookDemoModal } from "@/components/leads/BookDemoModal";
import { RequestAccessModal } from "@/components/leads/RequestAccessModal";
import heroBg from "@/assets/hero-dashboard-bg.jpg";
import saomaiLogo from "@/assets/saomai-logo.png";
import processWorkflow from "@/assets/process-workflow.jpg";

/* Partner logos */
import logoWho from "@/assets/partners/logo-who.png";
import logoGoogle from "@/assets/partners/logo-google-health.png";
import logoSamsung from "@/assets/partners/logo-samsung-health.png";
import logoMoh from "@/assets/partners/logo-moh-vietnam.png";
import logoVinmec from "@/assets/partners/logo-vinmec.png";
import logoFpt from "@/assets/partners/logo-fpt.png";
import logoNvidia from "@/assets/partners/logo-nvidia.png";
import logoMicrosoft from "@/assets/partners/logo-microsoft.png";

/* ─── Intersection Observer Hook ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─── Animated Counter ─── */
function AnimatedCounter({ value, suffix = "" }: { value: string; suffix?: string }) {
  const { ref, inView } = useInView(0.3);
  const [display, setDisplay] = useState("0");
  
  useEffect(() => {
    if (!inView) return;
    const numMatch = value.match(/[\d.]+/);
    if (!numMatch) { setDisplay(value); return; }
    const target = parseFloat(numMatch[0]);
    const prefix = value.slice(0, value.indexOf(numMatch[0]));
    const postfix = value.slice(value.indexOf(numMatch[0]) + numMatch[0].length);
    const isFloat = numMatch[0].includes('.');
    const duration = 1200;
    const start = performance.now();
    
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // ease-out quart
      const current = target * eased;
      setDisplay(`${prefix}${isFloat ? current.toFixed(1) : Math.round(current)}${postfix}`);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, value]);
  
  return <span ref={ref}>{display}{suffix}</span>;
}

/* ─── Theme Hook ─── */
function useLandingTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("landing-theme");
    if (stored) return stored === "dark";
    return false; // default light
  });
  useEffect(() => {
    localStorage.setItem("landing-theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle: () => setDark(d => !d) };
}

/* ─── 3D Orbiting Logo ─── */
const Logo3D = ({ className = "" }: { className?: string }) => (
  <div className={`relative ${className}`}>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-32 h-32 rounded-full border border-primary/20 animate-logo-pulse-ring" />
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-32 h-32 rounded-full border border-primary/10 animate-logo-pulse-ring" style={{ animationDelay: "0.6s" }} />
    </div>
    <img src={saomaiLogo} alt="Sao Mai Health" className="w-20 h-20 relative z-10 animate-logo-heartbeat" />
  </div>
);

/* ─── Floating Orb (Image-based) ─── */
const FloatingOrb = ({ src, delay, label }: {
  src: string; delay: string; label: string;
}) => (
  <div className="absolute animate-float" style={{ animationDelay: delay, animationDuration: "4s" }}>
    <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-primary/20 dark:ring-white/10">
      <img src={src} alt={label} className="w-full h-full object-cover" />
    </div>
    <span className="block text-[10px] text-center mt-1.5 font-medium tracking-wide text-foreground/50">{label}</span>
  </div>
);

/* ─── Hero 3D Scene ─── */
const Hero3DScene = ({ t }: { t: (k: string) => string }) => (
  <div className="relative w-[360px] h-[360px] lg:w-[480px] lg:h-[480px] flex-shrink-0">
    <div className="absolute inset-0 animate-rotate-slow">
      <div className="absolute inset-4 rounded-full border border-dashed border-primary/15" />
    </div>
    <div className="absolute inset-0" style={{ animation: "rotate-slow 20s linear infinite reverse" }}>
      <div className="absolute inset-16 rounded-full border border-primary/10" />
    </div>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-br from-primary/30 to-[hsl(172,66%,50%)]/20 animate-morph-blob blur-3xl" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <Logo3D />
    </div>
    <div className="absolute top-[8%] left-[55%]"><FloatingOrb src={iconAI} delay="0s" label={t("landing.orbAI")} /></div>
    <div className="absolute top-[35%] right-[2%]"><FloatingOrb src={iconSensor} delay="0.5s" label={t("landing.orbSensor")} /></div>
    <div className="absolute bottom-[12%] right-[15%]"><FloatingOrb src={iconVault} delay="1s" label={t("landing.orbVault")} /></div>
    <div className="absolute bottom-[8%] left-[18%]"><FloatingOrb src={iconEpid} delay="1.5s" label={t("landing.orbEpid")} /></div>
    <div className="absolute top-[30%] left-[0%]"><FloatingOrb src={iconTwin} delay="2s" label={t("landing.orbTwin")} /></div>
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 480 480">
      <defs>
        <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(199,89%,48%)" stopOpacity="0" />
          <stop offset="50%" stopColor="hsl(199,89%,48%)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="hsl(199,89%,48%)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[[240,240,290,55],[240,240,450,195],[240,240,380,400],[240,240,115,410],[240,240,25,175]].map(([x1,y1,x2,y2],i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#lg)" strokeWidth="1" />
      ))}
    </svg>
  </div>
);

/* ─── Section Reveal ─── */
const Reveal = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const { ref, inView } = useInView(0.1);
  return (
    <div ref={ref} className={`${className} transition-all duration-1000 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

const pressLinks = [
  { label: "Diễn đàn Doanh nghiệp", url: "https://diendandoanhnghiep.vn/khoi-nghiep-quoc-gia-2025-du-an-hcm-health-hub-lot-top-20-du-an-xuat-sac-10167013.html" },
  { label: "Festival Khởi nghiệp", url: "https://diendandoanhnghiep.vn/festival-khoi-nghiep-2025-nen-tang-y-te-thong-minh-hcm-health-hub-10167799.html" },
  { label: "Vòng Chung kết", url: "https://diendandoanhnghiep.vn/10-du-an-tranh-tai-tai-vong-chung-ket-chuong-trinh-phat-trien-du-an-khoi-nghiep-quoc-gia-nam-2025-10167784.html" },
  { label: "Vinh danh", url: "https://diendandoanhnghiep.vn/vinh-danh-cac-du-an-xuat-sac-dat-giai-khoi-nghiep-quoc-gia-2025-10167821.html" },
  { label: "Báo Đầu tư", url: "https://baodautu.vn/vinh-danh-10-du-an-khoi-nghiep-xuat-sac-nhat-2025-d464915.html" },
];

/* ═══════════════════════════════════════════════════
   MAIN LANDING — Light & Dark, Full i18n
   ═══════════════════════════════════════════════════ */
const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [demoOpen, setDemoOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { dark, toggle: toggleTheme } = useLandingTheme();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Dynamic color tokens based on theme
  const c = {
    bg: dark ? "bg-[hsl(210,50%,4%)]" : "bg-white",
    bg2: dark ? "bg-[hsl(210,45%,6%)]" : "bg-[hsl(210,40%,97%)]",
    bg3: dark ? "bg-[hsl(210,50%,3%)]" : "bg-[hsl(210,40%,96%)]",
    text: dark ? "text-white" : "text-[hsl(210,40%,11%)]",
    textMuted: dark ? "text-white/45" : "text-[hsl(210,20%,45%)]",
    textFaint: dark ? "text-white/25" : "text-[hsl(210,20%,65%)]",
    textSub: dark ? "text-white/40" : "text-[hsl(210,20%,50%)]",
    border: dark ? "border-white/[0.06]" : "border-[hsl(210,30%,90%)]",
    cardBg: dark ? "bg-white/[0.02]" : "bg-white",
    cardHover: dark ? "hover:bg-white/[0.04]" : "hover:bg-[hsl(210,40%,98%)]",
    cardBorder: dark ? "border-white/[0.06]" : "border-[hsl(210,30%,92%)]",
    navBg: dark ? "bg-[hsl(210,50%,6%)]/95" : "bg-white/95",
    navBorder: dark ? "border-white/[0.06]" : "border-[hsl(210,30%,92%)]",
    navText: dark ? "text-white/50" : "text-[hsl(210,20%,45%)]",
    navTextHover: dark ? "hover:text-white" : "hover:text-[hsl(210,40%,11%)]",
    heroBg: dark ? "bg-[hsl(210,50%,4%)]" : "bg-[hsl(210,40%,98%)]",
    goldText: dark ? "text-[hsl(45,90%,55%)]" : "text-[hsl(38,92%,40%)]",
    goldBorder: dark ? "border-[hsl(45,90%,55%)]/15" : "border-[hsl(38,92%,50%)]/20",
    goldBg: dark ? "from-[hsl(45,90%,55%)]/[0.05]" : "from-[hsl(38,92%,50%)]/[0.05]",
    shadow: dark ? "shadow-black/20" : "shadow-black/5",
    btnGhost: dark ? "text-white/60 hover:text-white hover:bg-white/[0.06]" : "text-[hsl(210,20%,45%)] hover:text-[hsl(210,40%,11%)] hover:bg-[hsl(210,40%,96%)]",
    btnOutline: dark ? "bg-white/[0.06] hover:bg-white/[0.1] text-white" : "bg-[hsl(210,40%,96%)] hover:bg-[hsl(210,40%,93%)] text-[hsl(210,40%,11%)]",
  };

  const features = [
    { icon: Dna, title: t("landing.feat1Title"), sub: t("landing.feat1Sub"), desc: t("landing.feat1Desc"), gradient: "from-primary to-[hsl(172,66%,50%)]", iconBg: "bg-primary/10", image: digitalTwinHero },
    { icon: Brain, title: t("landing.feat2Title"), sub: t("landing.feat2Sub"), desc: t("landing.feat2Desc"), gradient: "from-[hsl(262,83%,58%)] to-primary", iconBg: "bg-[hsl(262,83%,58%)]/10", image: aiBrainHealth },
    { icon: Globe, title: t("landing.feat3Title"), sub: t("landing.feat3Sub"), desc: t("landing.feat3Desc"), gradient: "from-[hsl(142,76%,36%)] to-[hsl(172,66%,50%)]", iconBg: "bg-[hsl(142,76%,36%)]/10", image: surveillanceMapBg },
    { icon: Shield, title: t("landing.feat4Title"), sub: t("landing.feat4Sub"), desc: t("landing.feat4Desc"), gradient: "from-[hsl(38,92%,50%)] to-[hsl(25,95%,53%)]", iconBg: "bg-[hsl(38,92%,50%)]/10", image: sensorWearable },
  ];

  const stats = [
    { value: "99.7%", label: t("landing.statAccuracy") },
    { value: "72h", label: t("landing.statWarning") },
    { value: "24/7", label: t("landing.statMonitor") },
    { value: "50K+", label: t("landing.statUsers") },
  ];

  const testimonials = [
    { name: t("landing.t1Name"), role: t("landing.t1Role"), quote: t("landing.t1Quote"), avatar: "NH" },
    { name: t("landing.t2Name"), role: t("landing.t2Role"), quote: t("landing.t2Quote"), avatar: "MA" },
    { name: t("landing.t3Name"), role: t("landing.t3Role"), quote: t("landing.t3Quote"), avatar: "HP" },
  ];

  const plans = [
    { name: t("landing.planPersonal"), price: "499K", period: t("landing.perMonth"), desc: t("landing.planPersonalDesc"), features: [t("landing.feat_twinBasic"), t("landing.feat_strokeAlert"), t("landing.feat_weeklyReport"), t("landing.feat_emailSupport")], popular: false },
    { name: t("landing.planPremium"), price: "1.99M", period: t("landing.perMonth"), desc: t("landing.planPremiumDesc"), features: [t("landing.feat_twinAdvanced"), t("landing.feat_ai72h"), t("landing.feat_expert247"), t("landing.feat_diseaseIntel"), t("landing.feat_biovault"), t("landing.feat_prioritySupport")], popular: true },
    { name: t("landing.planEnterprise"), price: t("landing.contact"), period: "", desc: t("landing.planEnterpriseDesc"), features: [t("landing.feat_fullAPI"), t("landing.feat_multiUser"), t("landing.feat_sla"), t("landing.feat_customAI"), t("landing.feat_training"), t("landing.feat_dedicatedSupport")], popular: false },
  ];

  return (
    <div className={`min-h-screen overflow-x-hidden ${c.bg} ${c.text} transition-colors duration-500`}>
      
      {/* ═══ NAVBAR ═══ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? `${c.navBg} backdrop-blur-2xl border-b ${c.navBorder} ${c.shadow} shadow-2xl` : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={saomaiLogo} alt="Logo" className="h-8 w-8 animate-logo-heartbeat" />
              <span className={`text-lg font-bold font-display tracking-tight ${c.text}`}>
                Sao Mai <span className="text-primary">Health</span>
              </span>
            </div>
            <div className={`hidden md:flex items-center gap-8 text-[13px] font-medium ${c.navText}`}>
              {[["#features", t("landing.navFeatures")], ["#process", t("landing.process")], ["#awards", t("landing.navAwards")], ["#testimonials", t("landing.navReviews")], ["#pricing", t("landing.navPricing")]].map(([href, label]) => (
                <a key={href} href={href} className={`${c.navTextHover} transition-colors duration-300 relative group`}>
                  {label}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button variant="ghost" size="icon" onClick={toggleTheme} className={`${c.btnGhost} h-8 w-8`}>
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className={`hidden sm:inline-flex ${c.btnGhost} text-[13px]`}>
                {t("landing.login")}
              </Button>
              <Button size="sm" onClick={() => navigate("/dashboard?demo=true")} className="hidden sm:inline-flex bg-primary hover:bg-primary/90 rounded-full px-5 text-[13px] text-white gap-1.5">
                <Play className="h-3 w-3 fill-white" />
                {t("landing.startFree")}
              </Button>
              <Button variant="ghost" size="icon" className={`md:hidden ${c.btnGhost}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className={`md:hidden ${c.navBg} backdrop-blur-2xl border-b ${c.navBorder} px-6 pb-5 animate-fade-up`}>
            <div className="flex flex-col gap-3 pt-2">
              {[["#features", t("landing.navFeatures")], ["#awards", t("landing.navAwards")], ["#testimonials", t("landing.navReviews")], ["#pricing", t("landing.navPricing")]].map(([href, label]) => (
                <a key={href} href={href} className={`py-2.5 text-sm ${c.navText} ${c.navTextHover}`} onClick={() => setMobileMenuOpen(false)}>{label}</a>
              ))}
              <div className="flex gap-2 pt-3">
                <Button variant="outline" size="sm" className="flex-1 rounded-full" onClick={() => navigate("/auth")}>{t("landing.login")}</Button>
                <Button size="sm" className="flex-1 rounded-full text-white" onClick={() => navigate("/dashboard")}>{t("landing.start")}</Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ═══ HERO ═══ */}
      <section className={`relative min-h-screen flex items-center overflow-hidden ${dark ? "" : ""}`}>
        {dark && (
          <div className="absolute inset-0">
            <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-b from-[hsl(210,50%,4%)] via-[hsl(210,50%,4%)]/60 to-[hsl(210,50%,4%)]" />
          </div>
        )}
        {!dark && (
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(199,89%,97%)] via-white to-[hsl(172,66%,97%)]" />
        )}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle, hsl(199,89%,48%) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full pt-28 pb-20">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-0">
            <div className="flex-1 text-center lg:text-left max-w-2xl">
              <div className="animate-reveal-up">
                <Badge className={`mb-6 ${dark ? "bg-white/[0.06] text-primary/90 border-primary/20" : "bg-primary/5 text-primary border-primary/15"} px-4 py-1.5 text-xs font-medium backdrop-blur-xl rounded-full`}>
                  <Trophy className="h-3 w-3 mr-1.5" />
                  {t("landing.badge")}
                </Badge>
              </div>
              <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold font-display leading-[1.05] tracking-tight mb-6 animate-reveal-up" style={{ animationDelay: "0.1s" }}>
                {t("landing.heroTitle1")}{" "}
                <span className="bg-gradient-to-r from-primary via-[hsl(172,66%,50%)] to-[hsl(142,76%,36%)] bg-clip-text text-transparent animate-gradient-shift">
                  {t("landing.heroTitle2")}
                </span>
              </h1>
              <p className={`text-lg ${c.textMuted} mb-10 leading-relaxed max-w-xl animate-reveal-up`} style={{ animationDelay: "0.2s" }}>
                {t("landing.heroDesc")}
              </p>
              <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4 animate-reveal-up" style={{ animationDelay: "0.3s" }}>
                <Button size="lg" className="text-sm px-8 py-6 rounded-full bg-primary hover:bg-primary/90 shadow-[0_0_50px_hsl(199,89%,48%,0.25)] hover:shadow-[0_0_70px_hsl(199,89%,48%,0.35)] transition-all duration-500 text-white" onClick={() => setDemoOpen(true)}>
                  {t("landing.bookDemo")} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button variant="ghost" size="lg" className={`text-sm px-8 py-6 rounded-full ${c.btnGhost}`} onClick={() => navigate("/dashboard")}>
                  <Play className="h-4 w-4 mr-2" /> {t("landing.viewDashboard")}
                </Button>
              </div>
            </div>
            <div className="flex-1 flex justify-center lg:justify-end animate-scale-reveal" style={{ animationDelay: "0.4s" }}>
              <Hero3DScene t={t} />
            </div>
          </div>
          <div className="mt-16 lg:mt-24 animate-reveal-up" style={{ animationDelay: "0.5s" }}>
            <div className={`grid grid-cols-2 md:grid-cols-4 max-w-3xl mx-auto lg:mx-0 rounded-2xl ${dark ? "" : `border ${c.border} bg-white/60 backdrop-blur-sm`}`}>
              {stats.map((s, i) => (
                <div key={i} className={`text-center lg:text-left py-6 px-6 ${i > 0 ? `border-l ${c.border}` : ""}`}>
                  <p className="text-3xl font-extrabold font-display text-primary">
                    <AnimatedCounter value={s.value} />
                  </p>
                  <p className={`text-xs ${c.textFaint} mt-1 tracking-wide`}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className={`py-28 ${c.bg} relative`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal className="text-center mb-20">
            <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">{t("landing.features")}</p>
            <h2 className="text-3xl sm:text-5xl font-bold font-display mb-5">
              {t("landing.featuresTitle")} <span className="text-primary">{t("landing.featuresTitleHighlight")}</span>
            </h2>
            <p className={`${c.textSub} max-w-2xl mx-auto text-lg leading-relaxed`}>{t("landing.featuresDesc")}</p>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className={`group relative rounded-3xl border ${c.cardBorder} ${c.cardBg} overflow-hidden ${c.cardHover} hover:border-primary/20 transition-all duration-500 cursor-default ${dark ? "" : "shadow-sm hover:shadow-lg"}`}>
                  {/* Feature Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img src={f.image} alt={f.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                    <div className={`absolute inset-0 bg-gradient-to-t ${dark ? "from-[hsl(210,50%,4%)] via-[hsl(210,50%,4%)]/60 to-transparent" : "from-white via-white/60 to-transparent"}`} />
                    <div className={`absolute bottom-4 left-6 inline-flex items-center justify-center w-12 h-12 rounded-2xl ${f.iconBg} backdrop-blur-xl border ${c.cardBorder}`}>
                      <f.icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="p-8 lg:p-10 pt-5">
                    <div className={`absolute top-0 left-8 right-8 h-px bg-gradient-to-r ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    <h3 className="text-xl font-bold font-display mb-1">{f.title}</h3>
                    <p className="text-xs text-primary/70 font-medium mb-4 tracking-wide uppercase">{f.sub}</p>
                    <p className={`${c.textSub} leading-relaxed`}>{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="process" className={`py-28 ${c.bg2} relative overflow-hidden`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/[0.03] rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">{t("landing.process")}</p>
            <h2 className="text-3xl sm:text-5xl font-bold font-display mb-5">
              {t("landing.processTitle")} <span className="text-primary">{t("landing.processTitleHighlight")}</span>
            </h2>
          </Reveal>

          {/* AI-generated workflow visualization */}
          <Reveal className="mb-16">
            <div className={`relative rounded-3xl overflow-hidden border ${c.cardBorder} ${dark ? "" : "shadow-xl"}`}>
              <img src={processWorkflow} alt="Sao Mai Health Workflow" className="w-full h-auto object-cover" loading="lazy" />
              <div className={`absolute inset-0 bg-gradient-to-t ${dark ? "from-[hsl(210,50%,4%)]/90 via-transparent to-[hsl(210,50%,4%)]/40" : "from-white/80 via-transparent to-white/30"}`} />
              {/* Floating step indicators over image */}
              <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-10">
                <div className="grid grid-cols-3 gap-4 lg:gap-8">
                  {[
                    { step: "01", icon: Users, title: t("landing.step1Title"), desc: t("landing.step1Desc") },
                    { step: "02", icon: Dna, title: t("landing.step2Title"), desc: t("landing.step2Desc") },
                    { step: "03", icon: Shield, title: t("landing.step3Title"), desc: t("landing.step3Desc") },
                  ].map((s, i) => (
                    <div key={i} className={`relative rounded-2xl ${dark ? "bg-[hsl(210,50%,6%)]/80" : "bg-white/80"} backdrop-blur-xl p-5 lg:p-6 border ${c.cardBorder} transition-all duration-500 hover:scale-[1.02] ${dark ? "" : "shadow-md"}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-8 h-8 rounded-full bg-primary text-[11px] font-bold flex items-center justify-center text-white shadow-lg shadow-primary/30 flex-shrink-0">{s.step}</span>
                        <s.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-sm lg:text-base font-bold font-display mb-1">{s.title}</h3>
                      <p className={`${c.textSub} text-xs lg:text-sm leading-relaxed hidden sm:block`}>{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ AWARDS ═══ */}
      <section id="awards" className={`py-28 ${c.bg} relative overflow-hidden`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[hsl(45,90%,55%)]/[0.04] rounded-full blur-[150px] pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <p className={`${c.goldText} text-sm font-semibold tracking-widest uppercase mb-3`}>{t("landing.awards")}</p>
            <h2 className="text-3xl sm:text-5xl font-bold font-display mb-5">
              {t("landing.awardsTitle")} <span className={c.goldText}>{t("landing.awardsTitleHighlight")}</span>
            </h2>
            <p className={`${c.textSub} max-w-2xl mx-auto text-lg`}>{t("landing.awardsDesc")}</p>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-14">
            <Reveal>
              <div className={`relative rounded-3xl border ${c.goldBorder} bg-gradient-to-br ${c.goldBg} to-transparent p-8 lg:p-10 hover:border-[hsl(38,92%,50%)]/30 transition-all duration-500 ${dark ? "" : "shadow-sm"}`}>
                <div className="absolute top-6 right-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[hsl(45,90%,55%)] to-[hsl(30,90%,50%)] flex items-center justify-center shadow-[0_0_30px_hsl(45,90%,55%,0.2)]">
                    <Trophy className="h-6 w-6 text-[hsl(210,50%,6%)]" />
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${c.goldText} opacity-60`}>{t("landing.awardNational")}</span>
                <h3 className="text-2xl font-bold font-display mt-3 mb-2">{t("landing.award1Title")}</h3>
                <p className={`text-sm ${c.goldText} opacity-80 font-medium mb-4`}>{t("landing.award1Sub")}</p>
                <p className={`${c.textSub} text-sm leading-relaxed mb-6`}>{t("landing.award1Desc")}</p>
                <div className="flex flex-wrap gap-2">
                  {pressLinks.slice(0, 3).map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 text-[10px] ${c.textFaint} hover:text-primary transition-colors border ${c.border} rounded-full px-3 py-1`}>
                      {link.label} <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className={`relative rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.05] to-transparent p-8 lg:p-10 hover:border-primary/30 transition-all duration-500 ${dark ? "" : "shadow-sm"}`}>
                <div className="absolute top-6 right-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-[hsl(172,66%,50%)] flex items-center justify-center shadow-[0_0_30px_hsl(199,89%,48%,0.2)]">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">{t("landing.awardGlobal")}</span>
                <h3 className="text-2xl font-bold font-display mt-3 mb-2">{t("landing.award2Title")}</h3>
                <p className="text-sm text-primary/80 font-medium mb-4">{t("landing.award2Sub")}</p>
                <p className={`${c.textSub} text-sm leading-relaxed mb-6`}>{t("landing.award2Desc")}</p>
                <div className="flex flex-wrap gap-2">
                  {pressLinks.slice(3).map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 text-[10px] ${c.textFaint} hover:text-primary transition-colors border ${c.border} rounded-full px-3 py-1`}>
                      {link.label} <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          {/* Mission */}
          <Reveal className="max-w-4xl mx-auto">
            <div className={`rounded-3xl border ${c.cardBorder} ${c.cardBg} p-10 lg:p-14 text-center ${dark ? "" : "shadow-sm"}`}>
              <div className="flex justify-center mb-6"><Logo3D /></div>
              <h3 className="text-2xl font-bold font-display mb-4">{t("landing.missionTitle")}</h3>
              <p className={`text-lg ${c.textMuted} leading-relaxed max-w-3xl mx-auto`}>{t("landing.missionPlain")}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section id="testimonials" className={`py-28 ${c.bg2}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">{t("landing.reviews")}</p>
            <h2 className="text-3xl sm:text-5xl font-bold font-display mb-5">
              {t("landing.reviewsTitle")} <span className="text-primary">{t("landing.reviewsTitleHighlight")}</span>
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((tm, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className={`rounded-3xl border ${c.cardBorder} ${c.cardBg} p-8 ${c.cardHover} transition-all duration-500 h-full flex flex-col ${dark ? "" : "shadow-sm hover:shadow-lg"}`}>
                  <div className="flex gap-1 mb-5">
                    {[...Array(5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-[hsl(45,90%,55%)] text-[hsl(45,90%,55%)]" />)}
                  </div>
                  <p className={`${c.textMuted} mb-8 leading-relaxed text-[15px] flex-1`}>"{tm.quote}"</p>
                  <div className={`flex items-center gap-3 pt-5 border-t ${c.border}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[hsl(172,66%,50%)] flex items-center justify-center text-xs font-bold text-white">{tm.avatar}</div>
                    <div>
                      <p className="text-sm font-semibold">{tm.name}</p>
                      <p className={`text-[11px] ${c.textFaint}`}>{tm.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PARTNERS MARQUEE ═══ */}
      <section className={`py-24 ${c.bg} overflow-hidden`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal className="text-center mb-14">
            <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">{t("landing.partnersLabel")}</p>
            <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
              {t("landing.partnersTitle")} <span className="text-primary">{t("landing.partnersTitleHighlight")}</span>
            </h2>
            <p className={`${c.textSub} max-w-2xl mx-auto`}>{t("landing.partnersDesc")}</p>
          </Reveal>
        </div>

        {/* Infinite Marquee - Row 1 */}
        <div className="relative">
          <div className={`absolute left-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-r ${dark ? "from-[hsl(210,50%,4%)]" : "from-white"} to-transparent pointer-events-none`} />
          <div className={`absolute right-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-l ${dark ? "from-[hsl(210,50%,4%)]" : "from-white"} to-transparent pointer-events-none`} />
          <div className="flex animate-marquee gap-12 py-6" style={{ width: "max-content" }}>
            {[...Array(2)].map((_, setIdx) => (
              <div key={setIdx} className="flex gap-12 items-center">
                {[
                  { src: logoWho, name: "WHO" },
                  { src: logoGoogle, name: "Google" },
                  { src: logoSamsung, name: "Samsung" },
                  { src: logoMoh, name: "Bộ Y Tế" },
                  { src: logoVinmec, name: "Vinmec" },
                  { src: logoFpt, name: "FPT" },
                  { src: logoNvidia, name: "NVIDIA" },
                  { src: logoMicrosoft, name: "Microsoft Azure" },
                ].map((p, i) => (
                  <div key={`${setIdx}-${i}`} className={`group flex items-center gap-4 px-8 py-5 rounded-2xl border ${c.cardBorder} ${c.cardBg} ${c.cardHover} transition-all duration-500 hover:scale-[1.03] ${dark ? "" : "shadow-sm hover:shadow-md"}`}>
                    <div className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ${dark ? "bg-white/10" : "bg-[hsl(210,40%,97%)]"} flex items-center justify-center p-1.5`}>
                      <img src={p.src} alt={p.name} className={`w-full h-full object-contain ${dark ? "brightness-0 invert opacity-60 group-hover:opacity-100" : "opacity-70 group-hover:opacity-100"} transition-all duration-500`} />
                    </div>
                    <span className={`text-sm font-semibold whitespace-nowrap ${dark ? "text-white/50 group-hover:text-white" : "text-[hsl(210,20%,45%)] group-hover:text-[hsl(210,40%,11%)]"} transition-colors duration-300`}>{p.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className={`py-28 ${c.bg}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">{t("landing.pricing")}</p>
            <h2 className="text-3xl sm:text-5xl font-bold font-display mb-5">
              {t("landing.pricingTitle")} <span className="text-primary">{t("landing.pricingTitleHighlight")}</span>
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto items-start">
            {plans.map((p, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className={`relative rounded-3xl border transition-all duration-500 ${p.popular ? `border-primary/30 ${dark ? "bg-primary/[0.04]" : "bg-primary/[0.02]"} shadow-[0_0_60px_hsl(199,89%,48%,0.08)]` : `${c.cardBorder} ${c.cardBg} ${c.cardHover}`} ${dark ? "" : "shadow-sm"}`}>
                  {p.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-lg shadow-primary/30">{t("landing.popular")}</span>
                    </div>
                  )}
                  <div className="p-8 lg:p-10">
                    <h3 className="text-lg font-bold font-display mb-2">{p.name}</h3>
                    <p className={`text-xs ${c.textFaint} mb-6`}>{p.desc}</p>
                    <div className="mb-8">
                      <span className="text-4xl font-extrabold font-display">{p.price}</span>
                      <span className={`${c.textFaint} text-sm`}>{p.period}</span>
                    </div>
                    <ul className="space-y-3 mb-8">
                      {p.features.map((f, j) => (
                        <li key={j} className={`flex items-center gap-2.5 text-sm ${c.textSub}`}>
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full rounded-full ${p.popular ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 text-white" : `${c.btnOutline} border-0`}`}
                      onClick={() => p.price === t("landing.contact") ? setDemoOpen(true) : setAccessOpen(true)}
                    >
                      {p.price === t("landing.contact") ? t("landing.contactConsult") : t("landing.startNow")}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className={`py-28 relative overflow-hidden ${c.bg2}`}>
        <div className="absolute inset-0"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[200px]" /></div>
        <Reveal className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="flex justify-center mb-8"><Logo3D /></div>
          <h2 className="text-3xl sm:text-5xl font-bold font-display mb-5">{t("landing.ctaTitle")}</h2>
          <p className={`${c.textSub} text-lg mb-10 max-w-xl mx-auto`}>{t("landing.ctaDesc")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-sm px-10 py-6 rounded-full shadow-[0_0_50px_hsl(199,89%,48%,0.25)] bg-primary hover:bg-primary/90 text-white" onClick={() => navigate("/dashboard")}>
              {t("landing.startFree")} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="ghost" size="lg" className={`text-sm px-10 py-6 rounded-full ${c.btnGhost}`} onClick={() => setDemoOpen(true)}>
              {t("landing.bookDemo")}
            </Button>
          </div>
        </Reveal>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className={`border-t ${c.border} py-16 ${c.bg3}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-5">
                <img src={saomaiLogo} alt="Logo" className="h-7 w-7 animate-logo-heartbeat" />
                <span className="font-bold font-display">Sao Mai Health</span>
              </div>
              <p className={`text-xs ${c.textFaint} leading-relaxed`}>{t("landing.footerDesc")}</p>
            </div>
            {[
              { title: t("landing.products"), links: [["#features", t("landing.digitalTwin")], ["#features", t("landing.strokePrediction")], ["#features", t("landing.diseaseIntel")], ["#pricing", t("landing.pricing")]] },
              { title: t("landing.company"), links: [["/about", t("landing.aboutUs")], ["#", t("landing.blog")], ["/careers", t("landing.careers")]] },
              { title: t("landing.legal"), links: [["/legal", t("landing.terms")], ["/legal", t("landing.privacy")], ["/legal", "GDPR"]] },
            ].map(col => (
              <div key={col.title}>
                <h4 className={`font-semibold ${c.textSub} mb-4 text-xs tracking-wide uppercase`}>{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(([href, label]) => (
                    <li key={label}><a href={href} className={`text-xs ${c.textFaint} hover:text-primary transition-colors`}>{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className={`border-t ${c.border} mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4`}>
            <p className={`text-[10px] ${c.textFaint}`}>© 2026 Sao Mai Health. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <Shield className={`h-3 w-3 ${c.textFaint}`} />
              <span className={`text-[10px] ${c.textFaint}`}>HIPAA · GDPR · ISO 27001</span>
            </div>
          </div>
        </div>
      </footer>

      <BookDemoModal open={demoOpen} onOpenChange={setDemoOpen} />
      <RequestAccessModal open={accessOpen} onOpenChange={setAccessOpen} />
    </div>
  );
};

export default Landing;
