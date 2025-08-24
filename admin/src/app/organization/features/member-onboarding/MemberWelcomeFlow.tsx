"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import {
  CheckCircle,
  Building2,
  Users,
  Shield,
  ArrowRight,
  X,
  BookOpen,
  Target,
  Award,
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  action?: () => void;
}

interface WelcomeFlowProps {
  userProfile: any;
  organization: any;
  onComplete: () => void;
  onSkip: () => void;
}

export const MemberWelcomeFlow: React.FC<WelcomeFlowProps> = ({
  userProfile,
  organization,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeOnboardingSteps();
  }, [userProfile, organization]);

  const initializeOnboardingSteps = async () => {
    if (!userProfile || !organization) return;

    const baseSteps: OnboardingStep[] = [
      {
        id: "welcome",
        title: `Welcome to ${organization.name}!`,
        description: `You've successfully joined ${organization.name} as a ${userProfile.role}. Let's get you started with a quick tour.`,
        icon: <Building2 className="w-8 h-8 text-blue-600" />,
        completed: false,
      },
      {
        id: "role-overview",
        title: "Your Role & Permissions",
        description: getRoleDescription(userProfile.role),
        icon: <Shield className="w-8 h-8 text-green-600" />,
        completed: false,
      },
      {
        id: "team-overview",
        title: "Meet Your Team",
        description:
          "Learn about your organization structure and team members.",
        icon: <Users className="w-8 h-8 text-purple-600" />,
        completed: false,
      },
    ];

    // Add role-specific steps
    if (userProfile.role === "admin") {
      baseSteps.push({
        id: "admin-tools",
        title: "Admin Tools",
        description:
          "Explore powerful administration features including member management, organization settings, and analytics.",
        icon: <Target className="w-8 h-8 text-red-600" />,
        completed: false,
      });
    } else if (userProfile.role === "manager") {
      baseSteps.push({
        id: "branch-management",
        title: "Branch Management",
        description:
          "Learn how to manage your assigned branch, departments, and team members.",
        icon: <Target className="w-8 h-8 text-blue-600" />,
        completed: false,
      });
    } else if (userProfile.role === "employee") {
      baseSteps.push({
        id: "dashboard-overview",
        title: "Dashboard Overview",
        description:
          "Get familiar with your dashboard and queue management tools.",
        icon: <Target className="w-8 h-8 text-green-600" />,
        completed: false,
      });
    }

    baseSteps.push({
      id: "getting-started",
      title: "Resources & Support",
      description:
        "Find helpful resources, documentation, and support channels.",
      icon: <BookOpen className="w-8 h-8 text-indigo-600" />,
      completed: false,
    });

    baseSteps.push({
      id: "complete",
      title: "You're All Set!",
      description:
        "Congratulations! You're ready to start using the Smart Queue System.",
      icon: <Award className="w-8 h-8 text-yellow-600" />,
      completed: false,
    });

    setSteps(baseSteps);
    setLoading(false);
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case "admin":
        return "As an administrator, you have full access to all features including organization management, member invitations, analytics, and system configuration.";
      case "manager":
        return "As a manager, you can manage your assigned branch, oversee departments, handle queue operations, and view analytics for your area.";
      case "employee":
        return "As an employee, you can access the dashboard to manage queues for your assigned department and serve customers efficiently.";
      default:
        return "Learn about your role and what you can do in the system.";
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      // Mark current step as completed
      const updatedSteps = steps.map((step, index) =>
        index === currentStep ? { ...step, completed: true } : step
      );
      setSteps(updatedSteps);
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      // Mark onboarding as completed in the user profile
      const { error } = await supabase
        .from("members")
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("auth_user_id", userProfile.auth_user_id);

      if (error) {
        logger.error("Error updating onboarding status:", error);
      }

      logger.info("Onboarding completed successfully");
      onComplete();
    } catch (error) {
      logger.error("Error completing onboarding:", error);
      onComplete(); // Still complete even if we can't update the database
    }
  };

  const handleSkip = async () => {
    try {
      // Mark onboarding as skipped
      const { error } = await supabase
        .from("members")
        .update({
          onboarding_completed: true,
          onboarding_skipped: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("auth_user_id", userProfile.auth_user_id);

      if (error) {
        logger.error("Error updating onboarding skip status:", error);
      }

      logger.info("Onboarding skipped");
      onSkip();
    } catch (error) {
      logger.error("Error skipping onboarding:", error);
      onSkip(); // Still skip even if we can't update the database
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="analytics-card p-8 max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-center text-gray-600">
            Preparing your welcome tour...
          </p>
        </div>
      </div>
    );
  }

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="analytics-card max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Welcome Tour
            </h2>
            <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Skip welcome tour"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-center space-x-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-3 h-3 rounded-full ${
                    index < currentStep
                      ? "bg-green-600"
                      : index === currentStep
                      ? "bg-blue-600"
                      : "bg-gray-300"
                  }`}
                />
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 ${
                      index < currentStep ? "bg-green-600" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStepData && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-gray-50 rounded-full">
                  {currentStepData.icon}
                </div>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {currentStepData.title}
              </h3>

              <p className="text-gray-600 mb-8 leading-relaxed max-w-lg mx-auto">
                {currentStepData.description}
              </p>

              {/* Role-specific content */}
              {currentStepData.id === "role-overview" && (
                <div className="bg-blue-50 rounded-lg p-6 mb-6 text-left">
                  <h4 className="font-semibold text-blue-900 mb-3">
                    What you can do:
                  </h4>
                  <ul className="space-y-2 text-sm text-blue-800">
                    {userProfile.role === "admin" && (
                      <>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          Manage organization settings and branding
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          Invite and manage team members
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          View analytics and reports
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          Configure branches and departments
                        </li>
                      </>
                    )}
                    {userProfile.role === "manager" && (
                      <>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          Manage your assigned branch
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          Oversee departments and services
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          Handle queue operations
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          View branch analytics
                        </li>
                      </>
                    )}
                    {userProfile.role === "employee" && (
                      <>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          Manage queues for your department
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          Serve customers efficiently
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          View queue status and statistics
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          Access customer service tools
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              )}

              {/* Getting started resources */}
              {currentStepData.id === "getting-started" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 text-left">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Quick Start Guide
                    </h4>
                    <p className="text-sm text-gray-600">
                      Step-by-step tutorials to help you get started with your
                      daily tasks.
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-left">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Support Center
                    </h4>
                    <p className="text-sm text-gray-600">
                      Find answers to common questions and get help when you
                      need it.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`w-3 h-3 rounded-full ${
                  index <= currentStep
                    ? "bg-blue-600"
                    : index === currentStep
                    ? "bg-blue-300"
                    : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          <div className="flex space-x-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Previous
              </button>
            )}

            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              Skip Tour
            </button>

            <button
              onClick={handleNext}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              {currentStep === steps.length - 1 ? "Get Started" : "Next"}
              {currentStep < steps.length - 1 && (
                <ArrowRight className="ml-2 w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
