import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider } from "@/components/ui/sidebar";
import { 
  Eye, Sparkles, Zap, ArrowRight, Monitor, Palette, 
  Crown, Activity, ChevronRight, CheckCircle
} from "lucide-react";
import { DashboardHeaderExecutive } from "@/components/DashboardHeaderExecutive";
import { DashboardHeaderDynamic } from "@/components/DashboardHeaderDynamic";
import LeadsExecutive from "@/pages/LeadsExecutive";
import LeadsDynamic from "@/pages/LeadsDynamic";

const ConceptDemo = () => {
  const [selectedConcept, setSelectedConcept] = useState("overview");

  const ConceptCard = ({ 
    title, 
    subtitle, 
    description, 
    features, 
    color, 
    icon: Icon, 
    isSelected, 
    onClick,
    conceptKey
  }: {
    title: string;
    subtitle: string;
    description: string;
    features: string[];
    color: string;
    icon: any;
    isSelected: boolean;
    onClick: () => void;
    conceptKey: string;
  }) => (
    <Card className={`
      relative overflow-hidden border-2 transition-all duration-500 hover:scale-[1.02] cursor-pointer
      ${isSelected 
        ? `${color} shadow-2xl ring-4 ring-opacity-20` 
        : 'border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl'
      }
    `} onClick={onClick}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-transparent"></div>
      <div className="relative p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl shadow-xl ${color.includes('blue') ? 'bg-blue-500' : color.includes('purple') ? 'bg-purple-500' : 'bg-gradient-to-br from-blue-500 to-purple-500'}`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{title}</h3>
              <p className="text-lg text-gray-600 font-semibold">{subtitle}</p>
            </div>
          </div>
          {isSelected && (
            <CheckCircle className="w-8 h-8 text-green-500 animate-pulse" />
          )}
        </div>
        
        <p className="text-gray-700 mb-6 leading-relaxed text-lg">{description}</p>
        
        <div className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
              <span className="text-gray-700 font-medium">{feature}</span>
            </div>
          ))}
        </div>
        
        <Button 
          className={`w-full py-3 font-bold text-lg transition-all duration-300 ${
            isSelected 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' 
              : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
          } text-white border-0 rounded-xl shadow-lg hover:shadow-xl hover:scale-105`}
        >
          {isSelected ? (
            <>
              <Eye className="w-5 h-5 mr-2" />
              Currently Viewing
            </>
          ) : (
            <>
              <Monitor className="w-5 h-5 mr-2" />
              Preview This Concept
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </Card>
  );

  const renderContent = () => {
    switch (selectedConcept) {
      case "executive":
        return (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl border-2 border-blue-200">
              <div className="flex items-center gap-4 mb-4">
                <Crown className="w-8 h-8 text-blue-600" />
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Executive Modern Preview</h2>
                  <p className="text-lg text-gray-600">Sophisticated glass morphism design</p>
                </div>
              </div>
            </div>
            <DashboardHeaderExecutive />
            <LeadsExecutive />
          </div>
        );
      case "dynamic":
        return (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl border-2 border-purple-200">
              <div className="flex items-center gap-4 mb-4">
                <Zap className="w-8 h-8 text-purple-600" />
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Dynamic Dashboard Preview</h2>
                  <p className="text-lg text-gray-600">Vibrant data-driven interface</p>
                </div>
              </div>
            </div>
            <DashboardHeaderDynamic />
            <div className="overflow-hidden rounded-2xl">
              <LeadsDynamic />
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-12">
            {/* Header */}
            <div className="text-center space-y-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Palette className="w-10 h-10 text-blue-600" />
                <h1 className="text-5xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Visual Concept Showcase
                </h1>
              </div>
              <p className="text-xl text-gray-600 leading-relaxed">
                Two distinct design approaches for your Leads Management page. Each concept offers a unique 
                visual identity while maintaining professional functionality and user experience.
              </p>
              <div className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-700">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                Choose the design that best represents your brand vision
                <Sparkles className="w-5 h-5 text-yellow-500" />
              </div>
            </div>

            {/* Concept Selection */}
            <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              <ConceptCard
                title="Executive Modern"
                subtitle="Sophisticated Elegance"
                description="A refined approach featuring glass morphism effects, subtle gradients, and premium typography. Perfect for high-end real estate clients who expect luxury in every interaction."
                features={[
                  "Glass morphism design language",
                  "Sophisticated color palette", 
                  "Premium shadows and blur effects",
                  "Elegant micro-interactions",
                  "Executive-level visual hierarchy"
                ]}
                color="border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50"
                icon={Crown}
                isSelected={selectedConcept === "executive"}
                onClick={() => setSelectedConcept("executive")}
                conceptKey="executive"
              />

              <ConceptCard
                title="Dynamic Dashboard"
                subtitle="Data-Driven Energy"
                description="A vibrant, high-energy interface with bold colors and dynamic animations. Ideal for teams that want to showcase data insights and engagement metrics prominently."
                features={[
                  "Vibrant gradient system",
                  "Dynamic animations and effects",
                  "Bold visual hierarchy",
                  "Interactive data visualization", 
                  "High-contrast modern styling"
                ]}
                color="border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50"
                icon={Activity}
                isSelected={selectedConcept === "dynamic"}
                onClick={() => setSelectedConcept("dynamic")}
                conceptKey="dynamic"
              />
            </div>

            {/* Features Comparison */}
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">Feature Comparison</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 border-2 border-blue-200 bg-blue-50">
                  <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <Crown className="w-6 h-6" />
                    Executive Modern Features
                  </h3>
                  <ul className="space-y-2 text-blue-800">
                    <li>• Glass morphism UI elements</li>
                    <li>• Subtle animation timing</li>
                    <li>• Premium spacing and typography</li>
                    <li>• Sophisticated color relationships</li>
                    <li>• Executive dashboard metrics</li>
                  </ul>
                </Card>

                <Card className="p-6 border-2 border-purple-200 bg-purple-50">
                  <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
                    <Activity className="w-6 h-6" />
                    Dynamic Dashboard Features
                  </h3>
                  <ul className="space-y-2 text-purple-800">
                    <li>• Bold gradient combinations</li>
                    <li>• Energetic animations</li>
                    <li>• High-contrast visual elements</li>
                    <li>• Interactive data indicators</li>
                    <li>• Real-time engagement metrics</li>
                  </ul>
                </Card>
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center space-y-6 max-w-2xl mx-auto">
              <div className="p-8 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border-2 border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Choose?</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Select either concept above to see a full preview of how your Leads Management page 
                  would look and feel with that design approach.
                </p>
                <div className="flex gap-4 justify-center">
                  <Badge className="bg-blue-100 text-blue-800 px-4 py-2 text-sm font-semibold">
                    Full Interactive Preview
                  </Badge>
                  <Badge className="bg-purple-100 text-purple-800 px-4 py-2 text-sm font-semibold">
                    Real Components
                  </Badge>
                  <Badge className="bg-green-100 text-green-800 px-4 py-2 text-sm font-semibold">
                    Production Ready
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {selectedConcept !== "overview" && (
          <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
            <div className="container mx-auto px-6 py-4">
              <Button
                variant="outline"
                onClick={() => setSelectedConcept("overview")}
                className="flex items-center gap-2 hover:bg-gray-50"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Back to Concept Overview
              </Button>
            </div>
          </div>
        )}
        
        <div className={selectedConcept === "overview" ? "container mx-auto px-6 py-12" : ""}>
          {renderContent()}
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ConceptDemo;