import Footer from "@/components/footer";
import Hero from "@/components/hero";
import Navbar from "@/components/navbar";
import PricingCard from "@/components/pricing-card";
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  FileText,
  Flashlight,
  MessageSquare,
  Star,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { createClient } from "../../supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: plans, error } = await supabase.functions.invoke('supabase-functions-get-plans');

  const result = plans?.items;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      <Hero />

      {/* AI Study Tools Section - Premium Only */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                <Brain className="w-4 h-4" />
                Premium Features
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-4">Powerful AI Study Tools</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Unlock advanced AI capabilities with Premium subscription to supercharge your learning experience.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                icon: <FileText className="w-6 h-6" />, 
                title: "AI Summarizer", 
                description: "Get concise summaries with proper citations from academic papers and documents",
                features: ["Citation export", "Academic formatting", "Key points extraction"]
              },
              { 
                icon: <Flashlight className="w-6 h-6" />, 
                title: "Flashcard Generator", 
                description: "Automatically create flashcards from your PDFs and study materials",
                features: ["PDF processing", "Smart card creation", "Spaced repetition"]
              },
              { 
                icon: <Target className="w-6 h-6" />, 
                title: "Study Planner", 
                description: "Personalized study schedules using spaced repetition techniques",
                features: ["Adaptive scheduling", "Progress tracking", "Reminder system"]
              }
            ].map((tool, index) => (
              <div key={index} className="p-8 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 relative">
                <div className="absolute top-4 right-4">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">Premium</span>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <div className="text-blue-600">{tool.icon}</div>
                </div>
                <h3 className="text-xl font-semibold mb-3">{tool.title}</h3>
                <p className="text-gray-600 mb-4">{tool.description}</p>
                <ul className="space-y-2">
                  {tool.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-500">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Features Section - Free Access */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <Users className="w-4 h-4" />
                Free for Everyone
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-4">Learn Together, Grow Together</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Join our community of students and researchers sharing knowledge. No subscription required for community features.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Shared Notes by Subject</h3>
                    <p className="text-gray-600">Access high-quality notes organized by academic subjects, contributed by fellow students and verified by the community.</p>
                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">Free Access</span>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Q&A Community</h3>
                    <p className="text-gray-600">Ask questions, get answers, and help others. Our community-driven platform ensures quality through upvoting and moderation.</p>
                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">Free Access</span>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Quality Control</h3>
                    <p className="text-gray-600">Upvote and downvote system ensures the best content rises to the top, maintaining high academic standards.</p>
                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">Free Access</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">JS</div>
                    <div>
                      <div className="font-medium text-sm">Calculus II - Integration Techniques</div>
                      <div className="text-xs text-gray-500">Mathematics • 2 hours ago</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-medium">4.8</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">AM</div>
                    <div>
                      <div className="font-medium text-sm">Organic Chemistry Reactions</div>
                      <div className="text-xs text-gray-500">Chemistry • 5 hours ago</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-medium">4.9</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">RK</div>
                    <div>
                      <div className="font-medium text-sm">Modern Physics - Quantum Mechanics</div>
                      <div className="text-xs text-gray-500">Physics • 1 day ago</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-medium">4.7</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">50K+</div>
              <div className="text-blue-100">Active Students</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">1M+</div>
              <div className="text-blue-100">Study Sessions</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">25K+</div>
              <div className="text-blue-100">Shared Notes</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">98%</div>
              <div className="text-blue-100">Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-white" id="pricing">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Choose Your Learning Plan</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Start with free community access and upgrade to Premium when you need AI-powered study tools.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {result?.map((item: any) => (
              <PricingCard key={item.id} item={item} user={user} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Study Experience?</h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">Join thousands of students and researchers. Start with free community access, upgrade for AI tools when ready.</p>
          <a href="/dashboard" className="inline-flex items-center px-8 py-4 text-blue-600 bg-white rounded-lg hover:bg-gray-100 transition-colors font-medium text-lg">
            Join Community Free
            <ArrowUpRight className="ml-2 w-5 h-5" />
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}