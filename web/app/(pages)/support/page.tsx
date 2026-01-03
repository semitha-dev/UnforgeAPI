'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SupportPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    setSuccess('');

    // Create mailto link
    const mailtoLink = `mailto:support@unforge.ai?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
    )}`;

    // Open email client
    window.location.href = mailtoLink;

    // Show success message
    setSuccess('Opening your email client... If it doesn\'t open automatically, please email us at support@unforge.ai');
    
    // Reset form
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
    
    setSending(false);
  };

  const supportEmail = 'support@unforge.ai';

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 flex items-center mb-3 sm:mb-4 text-sm sm:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Support</h1>
          <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-gray-600">Get help with UnforgeAPI</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Contact Information Card */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Contact Us</h2>
          <div className="flex items-center space-x-2.5 sm:space-x-3 p-3 sm:p-4 bg-indigo-50 rounded-lg">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-600">Email us at</p>
              <a 
                href={`mailto:${supportEmail}`}
                className="text-sm sm:text-lg font-semibold text-indigo-600 hover:text-indigo-700 break-all"
              >
                {supportEmail}
              </a>
            </div>
          </div>
        </div>

        {/* Contact Form Card */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Send us a message</h2>
          <form onSubmit={handleSubmit}>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="What do you need help with?"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={5}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Tell us more about your issue or question..."
                />
              </div>
            </div>

            <div className="mt-4 sm:mt-6">
              <button
                type="submit"
                disabled={sending}
                className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 text-white text-sm sm:text-base rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>

        {/* FAQ Card */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1.5 sm:mb-2">How do I create a new project?</h3>
              <p className="text-xs sm:text-sm text-gray-600">Navigate to your dashboard and click on the "New Project" button. Fill in the required information and click "Create Project".</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1.5 sm:mb-2">How do I generate a quiz?</h3>
              <p className="text-xs sm:text-sm text-gray-600">Open a project, go to the Q&A section, and click "Generate Quiz". You can choose to generate 5, 10, 15, or 20 questions based on your study material.</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1.5 sm:mb-2">Can I edit my profile information?</h3>
              <p className="text-xs sm:text-sm text-gray-600">Yes! Go to your Profile page and click "Edit Profile" to update your name and education level.</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1.5 sm:mb-2">How do I delete a project?</h3>
              <p className="text-xs sm:text-sm text-gray-600">Open the project you want to delete, click on the settings or options menu, and select "Delete Project". Note that this action cannot be undone.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
