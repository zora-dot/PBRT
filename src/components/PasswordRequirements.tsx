import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordRequirement {
  label: string;
  met: boolean;
  example?: string;
}

interface PasswordRequirementsProps {
  password: string;
}

export default function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const requirements: PasswordRequirement[] = [
    {
      label: '8 characters',
      met: password.length >= 8
    },
    {
      label: '1 number',
      met: /\d/.test(password)
    },
    {
      label: '1 special character',
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      example: 'e.g., !, @, #, $, &'
    },
    {
      label: 'No leading or trailing whitespace',
      met: password.trim() === password
    }
  ];

  const allRequirementsMet = requirements.every(req => req.met);

  return (
    <div className="mt-2 space-y-2">
      <div className={`text-sm ${allRequirementsMet ? 'text-green-600' : 'text-gray-600'}`}>
        Password requirements{allRequirementsMet ? ' met!' : ':'}
      </div>
      <div className="space-y-1">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            {req.met ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-red-500" />
            )}
            <span className={req.met ? 'text-green-600' : 'text-gray-600'}>
              {req.label}
              {req.example && (
                <span className="text-gray-400 ml-1">{req.example}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}