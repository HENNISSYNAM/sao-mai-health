import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, Lock, CheckCircle2, ArrowRight, Shield,
  Zap, FileText, Users, TrendingUp, Brain, Heart
} from 'lucide-react';

interface PaywallGateProps {
  isPremium: boolean;
  onUpgrade: () => void;
  feature?: 'twins' | 'missions' | 'reports' | 'family' | 'whatif';
  children: React.ReactNode;
}

interface PlanFeature {
  name: string;
  free: boolean | string;
  premium: boolean | string;
}

export const PaywallGate: React.FC<PaywallGateProps> = ({
  isPremium,
  onUpgrade,
  feature,
  children
}) => {
  if (isPremium) {
    return <>{children}</>;
  }

  const getFeatureTitle = () => {
    switch (feature) {
      case 'twins': return 'Multi-State Digital Twins';
      case 'missions': return 'Advanced Health Missions';
      case 'reports': return 'Downloadable Medical Reports';
      case 'family': return 'Family Health Network';
      case 'whatif': return 'Predictive What-If Scenarios';
      default: return 'Premium Feature';
    }
  };

  const getFeatureDescription = () => {
    switch (feature) {
      case 'twins': return 'Compare your body across Baseline, Stress, Metabolic, and Recovery states to understand how different conditions affect your health.';
      case 'missions': return 'Access advanced health missions with AI-guided protocols, longer programs, and deeper physiological insights.';
      case 'reports': return 'Generate comprehensive PDF health reports with ICD-11 coding for medical professionals and insurance purposes.';
      case 'family': return 'Monitor and protect your entire family\'s health with shared dashboards and genetic risk correlation.';
      case 'whatif': return 'See how lifestyle choices and medication timing affect your predicted health outcomes before they happen.';
      default: return 'Unlock advanced features for comprehensive health intelligence.';
    }
  };

  return (
    <div className="relative">
      {/* Blurred content preview */}
      <div className="blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background via-background/80 to-transparent">
        <Card className="w-full max-w-lg mx-4 border-2 border-amber-500/30 bg-card/95 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4 border border-amber-500/30">
              <Crown className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle className="text-xl">{getFeatureTitle()}</CardTitle>
            <CardDescription className="text-sm">
              {getFeatureDescription()}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button 
              onClick={onUpgrade}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/20"
            >
              <Crown className="h-5 w-5 mr-2" />
              Upgrade to Premium
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Cancel anytime • 14-day money-back guarantee
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Full Pricing Page Component
export const PricingSection: React.FC<{ onSelectPlan: (plan: string) => void }> = ({ onSelectPlan }) => {
  const features: PlanFeature[] = [
    { name: 'View raw health data', free: true, premium: true },
    { name: 'Single Baseline Digital Twin', free: true, premium: true },
    { name: 'Basic Health Missions', free: '2 missions', premium: 'Unlimited' },
    { name: 'Multi-State Digital Twins', free: false, premium: true },
    { name: 'Predictive Risk Alerts', free: false, premium: true },
    { name: 'What-If Scenario Analysis', free: false, premium: true },
    { name: 'AI Health Explanations', free: false, premium: true },
    { name: 'Downloadable PDF Reports', free: false, premium: true },
    { name: 'Family Health Network', free: false, premium: 'Up to 5 members' },
    { name: 'Priority Support', free: false, premium: true }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Choose Your Health Intelligence Level</h2>
        <p className="text-muted-foreground">
          Users pay for <span className="text-primary font-medium">foresight and clarity</span>, not data access.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Free Plan */}
        <Card className="border-2 border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Free</CardTitle>
              <Badge variant="secondary">Current</Badge>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <CardDescription className="mt-2">
              Basic health data viewing and single digital twin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {features.slice(0, 3).map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  <span>{feature.name}</span>
                  {typeof feature.free === 'string' && (
                    <Badge variant="outline" className="ml-auto text-xs">{feature.free}</Badge>
                  )}
                </li>
              ))}
              {features.slice(3).map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4 flex-shrink-0" />
                  <span className="line-through">{feature.name}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full mt-6" disabled>
              Current Plan
            </Button>
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className="border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/5 via-card to-orange-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-bl-lg">
            RECOMMENDED
          </div>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <CardTitle>Premium</CardTitle>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-bold">$19</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <CardDescription className="mt-2">
              Full predictive health intelligence with AI insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  <span>{feature.name}</span>
                  {typeof feature.premium === 'string' && (
                    <Badge className="ml-auto text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                      {feature.premium}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
            <Button 
              className="w-full mt-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              onClick={() => onSelectPlan('premium')}
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Trust Badges */}
      <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-success" />
          <span>HIPAA Compliant</span>
        </div>
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-success" />
          <span>256-bit Encryption</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span>14-Day Guarantee</span>
        </div>
      </div>
    </div>
  );
};
