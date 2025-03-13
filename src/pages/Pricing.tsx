import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

const features = [
  { 
    name: 'Maximum Daily Posts', 
    free: '25 pastes', 
    supporter: '250 pastes',
    description: 'Number of pastes you can create per day'
  },
  {
    name: 'Ad-Free Experience',
    free: '✗',
    supporter: '✓',
    description: 'Browse and create pastes without any advertisements'
  },
  { 
    name: 'Maximum Paste Size', 
    free: '50KB per paste',
    supporter: '250KB per paste',
    description: 'Maximum size for each individual paste'
  },
  {
    name: 'Paste Expiration',
    free: 'Up to 30 days',
    supporter: 'Never expires option',
    description: 'How long your pastes can remain active'
  },
  {
    name: 'Password Protection',
    free: '✓',
    supporter: '✓',
    description: 'Secure your pastes with password protection'
  },
  {
    name: 'Rich Text Editor',
    free: '✓',
    supporter: '✓',
    description: 'Full-featured rich text editing capabilities'
  },
  {
    name: 'Custom Username Colors',
    free: '✓',
    supporter: '✓',
    description: 'Personalize your username appearance'
  }
];

export default function Pricing() {
  const { user } = useAuth();
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');

  const prices = {
    monthly: {
      amount: 5,
      period: 'month',
      savings: null
    },
    yearly: {
      amount: 50,
      period: 'year',
      savings: '17%'
    }
  };

  return (
    <>
      <Helmet>
        <title>Pricing Plans - PasteBin Rich Text</title>
        <meta name="description" content="Choose the perfect plan for your needs. Unlock premium features with our Supporter plan including unlimited storage, no ads, and more!" />
        <meta property="og:title" content="Pricing Plans - PasteBin Rich Text" />
        <meta property="og:description" content="Choose the perfect plan for your needs. Unlock premium features with our Supporter plan including unlimited storage, no ads, and more!" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/logo.png" />
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Simple, Transparent Pricing</h1>
          <p className="text-primary-200">Choose the plan that fits your needs</p>
        </div>

        {/* Updated Billing Interval Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-full p-1 shadow-lg">
            <div className="relative flex">
              <button
                onClick={() => setInterval('monthly')}
                className={`relative z-10 px-6 py-2 text-sm font-medium rounded-full transition-colors ${
                  interval === 'monthly'
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Monthly
                {interval === 'monthly' && (
                  <motion.div
                    layoutId="interval-background"
                    className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
              <button
                onClick={() => setInterval('yearly')}
                className={`relative z-10 px-6 py-2 text-sm font-medium rounded-full transition-colors ${
                  interval === 'yearly'
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Yearly
                <span className="ml-1 text-xs">
                  (Save 17%)
                </span>
                {interval === 'yearly' && (
                  <motion.div
                    layoutId="interval-background"
                    className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <div className="bg-white rounded-lg shadow-xl overflow-hidden transform hover:scale-105 transition-transform duration-300">
            <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Free</h2>
              <p className="text-gray-600 text-center">Perfect for occasional use</p>
              <div className="mt-6 text-center">
                <span className="text-5xl font-bold text-gray-900">$0</span>
                <span className="text-gray-600 ml-2">/month</span>
              </div>
              <Link
                to={user ? '/' : '/login'}
                className="mt-8 block w-full bg-gray-900 text-white text-center py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors"
              >
                {user ? 'Create Paste' : 'Get Started'}
              </Link>
            </div>
            <div className="p-8 bg-white">
              <h3 className="text-sm font-semibold text-gray-900 tracking-wide uppercase mb-4">
                Features included:
              </h3>
              <ul className="space-y-4">
                {features.map(feature => (
                  <li key={feature.name} className="flex items-start">
                    <div className={`flex-shrink-0 mt-1 ${feature.free === '✓' ? 'text-green-500' : 'text-red-500'}`}>
                      {feature.free === '✓' ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <span className="text-xl">×</span>
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-gray-900 font-medium">{feature.name}</p>
                      <p className="text-sm text-gray-500">{feature.description}</p>
                      <p className="text-sm font-medium text-primary-600">{feature.free}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Supporter Plan */}
          <div className="bg-gradient-to-br from-green-400 to-green-500 rounded-lg shadow-xl overflow-hidden transform hover:scale-105 transition-transform duration-300">
            <div className="p-8 bg-gradient-to-br from-green-400/10 to-green-500/10 backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-bold text-white text-center">Supporter</h2>
                <Crown className="w-6 h-6 text-white" />
              </div>
              <p className="text-white/90 text-center">For power users and professionals</p>
              <div className="mt-6 text-center">
                <span className="text-5xl font-bold text-white">${prices[interval].amount}</span>
                <span className="text-white/90 ml-2">/{prices[interval].period}</span>
                {prices[interval].savings && (
                  <div className="mt-2 inline-block bg-white/20 text-black text-sm px-3 py-1 rounded-full text-center">
                    Save {prices[interval].savings} with yearly billing
                  </div>
                )}
              </div>
              <Link
                to={user ? `/purchase?plan=supporter&interval=${interval}` : '/login'}
                className="mt-8 block w-full bg-white text-green-500 text-center py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {user ? 'Upgrade Now' : 'Sign Up'}
              </Link>
            </div>
            <div className="p-8 bg-white">
              <h3 className="text-sm font-semibold text-gray-900 tracking-wide uppercase mb-4">
                Everything in Free, plus:
              </h3>
              <ul className="space-y-4">
                {features.map(feature => (
                  <li key={feature.name} className="flex items-start">
                    <div className="flex-shrink-0 mt-1 text-green-500">
                      <Check className="w-5 h-5" />
                    </div>
                    <div className="ml-3">
                      <p className="text-gray-900 font-medium">{feature.name}</p>
                      <p className="text-sm text-gray-500">{feature.description}</p>
                      <p className="text-sm font-medium text-green-600">{feature.supporter}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-primary-700/20 text-center">
          <h2 className="text-xl font-bold text-white mb-4 text-center">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">What happens to ads when I upgrade?</h3>
              <p className="text-primary-200">All advertisements are completely removed when you become a Supporter, giving you a clean and distraction-free experience.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">What payment methods do you accept?</h3>
              <p className="text-primary-200">We accept all major credit cards through our secure payment processor, Stripe.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Can I cancel anytime?</h3>
              <p className="text-primary-200">Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Is there a refund policy?</h3>
              <p className="text-primary-200">We offer a 7-day money-back guarantee if you're not satisfied with your Supporter subscription.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}