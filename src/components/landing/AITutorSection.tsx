import { Bot, FileText, HelpCircle, ListChecks } from "lucide-react";
import SplitText from "@/components/ui/SplitText";

const capabilities = [
  { icon: FileText, text: "Explain complex topics in simple language" },
  { icon: FileText, text: "Read and analyze uploaded documents" },
  { icon: HelpCircle, text: "Answer follow-up doubts instantly" },
  { icon: ListChecks, text: "Generate quizzes from any material" },
];

const AITutorSection = () => (
  <section className="py-24 bg-background">
    <div className="container max-w-7xl mx-auto px-4">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Left text */}
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">AI Tutor</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-2">
            <SplitText 
              text="Your personal AI tutor that learns with you." 
              tag="span"
              className=""
              delay={50} 
              duration={1.25} 
              ease="power3.out" 
              splitType="chars" 
              from={{ opacity: 0, y: 40 }} 
              to={{ opacity: 1, y: 0 }} 
              threshold={0.1} 
              rootMargin="-100px" 
              textAlign="left" 
            />
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Upload your study material — notes, textbooks, or PDFs — and let AI create a personalized learning experience. Ask anything, get clear explanations, and generate practice questions on the fly.
          </p>
          <div className="space-y-4 pt-2">
            {capabilities.map((c, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <c.icon className="h-4 w-4 text-navy" />
                </div>
                <span className="text-sm text-foreground font-medium">{c.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right visual */}
        <div className="bg-muted/50 border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Bot className="h-5 w-5 text-accent" />
            <span className="font-semibold text-sm text-foreground">AI Tutor Chat</span>
            <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Biology.pdf loaded</span>
          </div>
          <div className="space-y-3">
            <div className="bg-card rounded-xl px-4 py-3 text-sm text-foreground max-w-[80%] border border-border shadow-sm">
              What is mitochondria and why is it called the powerhouse of the cell?
            </div>
            <div className="bg-navy rounded-xl px-4 py-3 text-sm text-highlight max-w-[90%] ml-auto">
              The mitochondria is an organelle found in eukaryotic cells. It's called the "powerhouse" because it produces ATP through cellular respiration — the primary energy currency of the cell. Based on your uploaded notes, here's a diagram reference from page 12...
            </div>
            <div className="bg-card rounded-xl px-4 py-3 text-sm text-foreground max-w-[70%] border border-border shadow-sm">
              Can you quiz me on this topic?
            </div>
            <div className="bg-navy rounded-xl px-4 py-3 text-sm text-highlight max-w-[85%] ml-auto">
              Sure! Here's a 5-question quiz on cellular respiration. Ready? 🧬
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <div className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground">Ask a question...</div>
            <div className="bg-accent text-accent-foreground rounded-lg px-3 py-2 text-xs font-medium cursor-pointer hover:bg-accent/90 transition-colors">Send</div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default AITutorSection;
