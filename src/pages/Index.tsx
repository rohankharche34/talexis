import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Brain, 
  Shield, 
  Zap, 
  TrendingUp, 
  Users,
  ArrowRight,
  CheckCircle,
  Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description: "Advanced gesture recognition and behavioral analysis during interviews"
  },
  {
    icon: Camera,
    title: "Real-time Monitoring",
    description: "Live webcam feed with instant feedback on posture and attention"
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "End-to-end encryption with no data storage on our servers"
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Get detailed reports and improvement suggestions immediately"
  }
];

const stats = [
  { value: "10K+", label: "Interviews Conducted" },
  { value: "95%", label: "Success Rate" },
  { value: "4.9", label: "User Rating" },
  { value: "50+", label: "Companies Trust Us" }
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 bg-gradient-card backdrop-blur-3xl"></div>
        <div className="relative container mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center text-primary-foreground max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center space-x-2 bg-primary-foreground/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6"
            >
              <Star className="h-4 w-4 text-warning" />
              <span className="text-sm">Trusted by 50+ Companies Worldwide</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Master Your{" "}
              <span className="bg-gradient-to-r from-primary-glow to-accent bg-clip-text text-transparent">
                Interview
              </span>{" "}
              Skills with Talexis
            </h1>
            
            <p className="text-xl md:text-2xl mb-4 opacity-90 leading-relaxed">
              AI-Powered Interview Practice Platform
            </p>

            <p className="text-lg md:text-xl mb-8 opacity-80 leading-relaxed">
              Practice with real-time gesture analysis, intelligent question generation, and comprehensive performance insights.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4"
            >
              <Button 
                size="lg"
                onClick={() => navigate("/signup")}
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-glow px-8 py-4 text-lg"
              >
                Start Free Trial
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button 
                variant="secondary" 
                size="lg"
                onClick={() => navigate("/login")}
                className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 px-8 py-4 text-lg"
              >
                Sign In
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
              >
                <h3 className="text-4xl font-bold text-primary mb-2">{stat.value}</h3>
                <p className="text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-4xl font-bold mb-4">Why Choose Our Platform?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the most advanced AI interview platform with cutting-edge technology
              and personalized feedback.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
              >
                <Card className="h-full hover:shadow-primary transition-all duration-300 hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-secondary">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-primary-foreground"
          >
            <h2 className="text-4xl font-bold mb-6">
              Ready to Ace Your Next Interview?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of professionals who have improved their interview skills
              with our AI-powered platform.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Button 
                size="lg"
                onClick={() => navigate("/signup")}
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 px-8 py-4 text-lg"
              >
                Get Started Now
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <div className="flex items-center space-x-2 text-sm opacity-75">
                <CheckCircle className="h-4 w-4" />
                <span>No credit card required</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>&copy; 2026 Talexis. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
