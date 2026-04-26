import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Radio, Building2, Globe, Zap, FileText, Shield, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";

const tiers = [
  {
    id: "field",
    name: "Field",
    tagline: "Free forever for frontline workers",
    price: null,
    priceLabel: "Free",
    priceSub: "No credit card required",
    icon: Zap,
    highlight: false,
    badge: null,
    cta: "Get started",
    ctaVariant: "outline" as const,
    target: "Individual health workers, NGO pilots, community health stations",
    features: [
      "Mobile case intake (30-second entry)",
      "Offline-first sync when reconnected",
      "CCCD/CMND QR scanner",
      "Basic disease dashboard",
      "Up to 500 cases/month",
      "1 user",
    ],
  },
  {
    id: "radar",
    name: "Radar",
    tagline: "Provincial disease intelligence",
    price: 10_000_000,
    priceLabel: "₫10M",
    priceSub: "per province / month",
    icon: Radio,
    highlight: true,
    badge: "Most popular",
    cta: "Request pilot",
    ctaVariant: "default" as const,
    target: "District CDC, Provincial Sở Y tế, regional health departments",
    features: [
      "Everything in Field",
      "Real-time hotspot detection (AI)",
      "Automated Mẫu A1/A2 reports (Thông tư 54)",
      "Multi-facility management",
      "Alert threshold engine",
      "Unlimited cases & users",
      "Role-based access (admin / doctor / field worker)",
      "Dedicated onboarding support",
    ],
  },
  {
    id: "provincial",
    name: "Provincial",
    tagline: "Full-province deployment",
    price: 50_000_000,
    priceLabel: "₫50M",
    priceSub: "per province / month",
    icon: Building2,
    highlight: false,
    badge: null,
    cta: "Contact sales",
    ctaVariant: "outline" as const,
    target: "Sở Y tế tỉnh, multi-district rollouts, Ministry of Health pilots",
    features: [
      "Everything in Radar",
      "Multi-district isolation (org-level data separation)",
      "Environmental Stroke Risk scoring (AQI + GPS + weather)",
      "Supply chain & vaccine campaign management",
      "Lab data ingestion (CSV/FHIR)",
      "Custom report builder",
      "SLA 99.9% uptime guarantee",
      "Dedicated customer success manager",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "National programs & global deployments",
    price: null,
    priceLabel: "Custom",
    priceSub: "Annual contract",
    icon: Globe,
    highlight: false,
    badge: null,
    cta: "Talk to us",
    ctaVariant: "outline" as const,
    target: "Ministry of Health, WHO/USAID programs, national CDC, multi-country NGOs",
    features: [
      "Everything in Provincial",
      "API access (Stroke Risk, Surveillance, Case Intake)",
      "BHYT / national insurance integration",
      "FHIR/HL7 endpoint",
      "White-label & custom branding",
      "On-premise or private cloud deployment",
      "Dedicated SRE & compliance team",
      "Custom SLA & data residency",
    ],
  },
];

const addOns = [
  { icon: Brain,    label: "Stroke Risk API",       desc: "White-label API for insurers & corporate wellness",    price: "₫5M / month" },
  { icon: FileText, label: "A1/A2 Report Module",   desc: "Auto-generate Bộ Y tế reports for any HIS",           price: "₫2M / facility / month" },
  { icon: Shield,   label: "BHYT Claim Automation", desc: "Automated BHYT claim reconciliation for private hospitals", price: "₫5M / month" },
];

export default function Pricing() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isVi = i18n.language === "vi";
  const [annual, setAnnual] = useState(true);

  const displayPrice = (tier: typeof tiers[0]) => {
    if (!tier.price) return tier.priceLabel;
    const p = annual ? tier.price * 10 : tier.price;
    return `₫${(p / 1_000_000).toFixed(0)}M`;
  };

  const priceSub = (tier: typeof tiers[0]) => {
    if (!tier.price) return tier.priceSub;
    return annual ? "per province / year" : "per province / month";
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-12">
      {/* Header */}
      <div className="text-center space-y-3">
        <Badge variant="outline" className="text-xs px-3">Transparent pricing</Badge>
        <h1 className="text-3xl font-bold">Built for public health institutions</h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm">
          From a single health station to a national surveillance program.
          No hidden fees. Cancel or scale anytime.
        </p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <span className={`text-sm ${!annual ? "text-foreground font-medium" : "text-muted-foreground"}`}>Monthly</span>
          <button
            onClick={() => setAnnual(v => !v)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${annual ? "bg-primary" : "bg-border"}`}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${annual ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
          <span className={`text-sm ${annual ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            Annual <Badge className="ml-1 text-[10px] bg-success/15 text-success border-0 px-1.5">–17%</Badge>
          </span>
        </div>
      </div>

      {/* Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {tiers.map(tier => (
          <Card
            key={tier.id}
            className={`relative flex flex-col transition-all duration-200 ${
              tier.highlight
                ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                : "border-border hover:border-primary/30 hover:shadow-md"
            }`}
          >
            {tier.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground text-[10px] px-2.5 shadow-sm">
                  {tier.badge}
                </Badge>
              </div>
            )}
            <CardHeader className="pb-3 pt-6">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${tier.highlight ? "bg-primary/10" : "bg-muted"}`}>
                  <tier.icon className={`h-4 w-4 ${tier.highlight ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <span className="font-bold text-base">{tier.name}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">{tier.tagline}</p>
              <div className="pt-3">
                <span className="text-2xl font-bold">{displayPrice(tier)}</span>
                <span className="text-xs text-muted-foreground ml-1.5">{priceSub(tier)}</span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 gap-4">
              <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-2 leading-snug">
                {tier.target}
              </p>
              <ul className="space-y-2 flex-1">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check className="h-3.5 w-3.5 text-success flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className="text-foreground/80">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={tier.ctaVariant}
                size="sm"
                className={`w-full mt-2 text-xs ${tier.highlight ? "bg-primary hover:bg-primary/90" : ""}`}
                onClick={() => tier.id === "field" ? navigate("/dashboard?demo=true") : navigate("/auth")}
              >
                {tier.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add-ons */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Add-ons</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {addOns.map(a => (
            <div key={a.label} className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
              <div className="p-1.5 rounded-lg bg-muted flex-shrink-0">
                <a.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{a.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{a.desc}</p>
                <p className="text-xs font-medium text-primary mt-1.5">{a.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="rounded-2xl border border-border bg-muted/30 p-8 text-center space-y-3">
        <h3 className="text-lg font-bold">Evaluating for a national program?</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          We work with WHO, USAID, and Ministry of Health teams on procurement-compliant deployments.
          Get a scoped proposal within 48 hours.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          <Button size="sm" onClick={() => navigate("/auth")}>Request a demo</Button>
          <Button size="sm" variant="outline">Download product brief</Button>
        </div>
      </div>
    </div>
  );
}
