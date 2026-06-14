import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Circle } from 'lucide-react';

const STEPS = [
  {
    title: "Plan (Manager)",
    desc: "Go to Schedule and create a shift for 'John Doe'.",
    role: "MANAGER"
  },
  {
    title: "Work (Employee)",
    desc: "Switch user to 'John Doe'. Go to Time Clock and Clock In.",
    role: "EMPLOYEE"
  },
  {
    title: "Finish (Employee)",
    desc: "Wait a few seconds, then Clock Out to create a timesheet.",
    role: "EMPLOYEE"
  },
  {
    title: "Pay (Manager)",
    desc: "Switch back to 'Sarah'. Go to Payroll and approve the entry.",
    role: "MANAGER"
  }
];

export const WorkflowGuide = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="mt-6 border-t border-slate-800 pt-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 hover:text-slate-300"
      >
        <span>Test Workflow</span>
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {isOpen && (
        <div className="space-y-3">
          {STEPS.map((step, idx) => (
            <div 
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`p-2 rounded-lg cursor-pointer transition-colors ${
                currentStep === idx ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-start gap-2">
                {idx < currentStep ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                ) : (
                  <Circle className={`w-4 h-4 mt-0.5 ${currentStep === idx ? 'text-sky-400' : 'text-slate-600'}`} />
                )}
                <div>
                  <p className={`text-xs font-medium ${currentStep === idx ? 'text-white' : 'text-slate-400'}`}>
                    {step.title}
                  </p>
                  {currentStep === idx && (
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      {step.desc}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          <button 
            onClick={() => setCurrentStep((prev) => (prev + 1) % STEPS.length)}
            className="w-full text-xs py-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 mt-2"
          >
            Next Step
          </button>
        </div>
      )}
    </div>
  );
};