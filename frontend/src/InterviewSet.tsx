// src/components/InterviewSet.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type GeneratedQuestion = {
  id?: string;
  text: string;
  type?: string;
};

export default function InterviewSetup() {
  const [role, setRole] = useState("");
  const [topics, setTopics] = useState("arrays"); // Changed from fixed to selectable
  const [language, setLanguage] = useState("python");
  const [loading, setLoading] = useState(false);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!mounted) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
            if (mounted) setCameraReady(true);
          };
        } else {
          setCameraError("Video element not available.");
        }
      } catch (err) {
        console.error("Camera error:", err);
        if (mounted) setCameraError("Unable to access camera. Please allow permission.");
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
      }
    };
  }, []);

  const goToInterviewWith = (questions: GeneratedQuestion[]) => {
    navigate("/interview", {
      state: {
        role,
        language,
        topic: topics, // ✅ Pass selected topic
        questions: questions.slice(0, 2),
        perQuestionSeconds: 60,
        mode: "coding-only",
        sequential: true,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cameraReady) {
      alert("Please enable your camera first.");
      return;
    }

    if (!role) {
      alert("Please select the role you're applying for.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          topics, // Sends selected topic to backend
          language,
          count: 2,
        }),
      });

      let questions: GeneratedQuestion[] = [];

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          const codingQs = data.questions.filter(
            (q: any) =>
              q &&
              typeof q === "object" &&
              ((q.type && typeof q.type === "string" && q.type.toLowerCase().includes("code")) ||
                (q.category && typeof q.category === "string" && q.category.toLowerCase().includes("code")) ||
                (typeof q.text === "string" &&
                  (q.text.toLowerCase().includes("implement") || q.text.toLowerCase().includes("write"))))
          );

          if (codingQs.length >= 2) {
            questions = codingQs.slice(0, 2).map((q: any) => ({ text: q.text }));
          } else {
            questions = data.questions.slice(0, 2).map((q: any) =>
              typeof q === "string" ? { text: q } : { text: q.text || JSON.stringify(q) }
            );
          }
        } else if (data.generated_text && typeof data.generated_text === "string") {
          const lines = data.generated_text
            .split(/\r?\n/)
            .map((l: string) => l.trim())
            .filter(Boolean);
          questions = lines.slice(0, 2).map((t: string) => ({ text: t }));
        }
      } else {
        console.warn("Generate endpoint returned non-ok:", res.status);
      }

      if (questions.length < 2) {
        questions = [
          {
            id: "fallback-1",
            text:
              language === "python"
                ? "Write a function that reverses a string without using built-in reverse methods. Provide time and space complexity."
                : "Write a function to reverse a string. Provide time and space complexity.",
            type: "coding",
          },
          {
            id: "fallback-2",
            text:
              language === "python"
                ? "Given an array of integers, return indices of the two numbers such that they add up to a specific target. Implement with O(n) time."
                : "Given an array of integers, return indices of two numbers that add up to a target. Aim for O(n) time.",
            type: "coding",
          },
        ];
      }

      setLoading(false);
      goToInterviewWith(questions);
    } catch (err) {
      console.error("Generate error:", err);
      const fallback = [
        { id: "fallback-1", text: "Implement kth_largest(nums, k) — return k-th largest element." },
        { id: "fallback-2", text: "Design LRU Cache with fixed capacity; support get and put in O(1)." },
      ];
      setLoading(false);
      goToInterviewWith(fallback);
    }
  };

  const handleDebugOpen = () => {
    const q = [
      { id: "q1", text: "Implement kth largest element in an array (kth_largest(nums, k))." },
      { id: "q2", text: "Design an LRU Cache with O(1) get/put." },
    ];
    goToInterviewWith(q);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-8">
      <div className="grid md:grid-cols-5 grid-cols-1 gap-6 w-full max-w-6xl">
        {/* Camera Preview Card */}
        <div className="md:col-span-2 bg-card border rounded-lg shadow-sm flex flex-col p-6">
          <h3 className="text-lg font-semibold mb-4 text-card-foreground">Camera Preview</h3>

          <div className="relative flex-1 flex items-center justify-center">
            <video
              ref={videoRef}
              className="rounded-md w-full max-w-sm aspect-video object-cover border bg-muted"
              autoPlay
              muted
            />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-md text-xs font-medium bg-black/80 text-white border border-white/10">
              {cameraError ? (
                <span className="text-destructive">⚠ {cameraError}</span>
              ) : cameraReady ? (
                <span className="text-green-400">✓ Camera ready</span>
              ) : (
                "Initializing camera..."
              )}
            </div>
          </div>
        </div>

        {/* Setup Form Card */}
        <div className="md:col-span-3 bg-card border rounded-lg shadow-sm p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold tracking-tight mb-2">PrepNinjas AI Interview Setup</h2>
            <p className="text-sm text-muted-foreground">
              This interview will ask <strong className="text-foreground">coding questions only</strong>. You will see{" "}
              <strong className="text-foreground">2 questions</strong>, shown one-by-one. Each question has a{" "}
              <strong className="text-foreground">1 minute</strong> timer.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Role Applying For
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a role</option>
                <option value="software engineer">Software Engineer</option>
                <option value="data analyst">Data Analyst</option>
                <option value="data engineer">Data Engineer</option>
                <option value="product analyst">Product Analyst</option>
                <option value="ml engineer">ML Engineer</option>
              </select>
            </div>

            {/* DSA Topics Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">DSA Topic</label>
              <select
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="arrays">Arrays</option>
                <option value="linked-lists">Linked Lists</option>
                <option value="stacks">Stacks</option>
                <option value="queues">Queues</option>
                <option value="trees">Trees</option>
                <option value="graphs">Graphs</option>
                <option value="dynamic-programming">Dynamic Programming</option>
                <option value="sorting">Sorting</option>
                <option value="searching">Searching</option>
                <option value="hash-tables">Hash Tables</option>
                <option value="heaps">Heaps</option>
                <option value="recursion">Recursion</option>
                <option value="backtracking">Backtracking</option>
                <option value="greedy">Greedy Algorithms</option>
                <option value="strings">Strings</option>
                <option value="bit-manipulation">Bit Manipulation</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Select a specific DSA topic for focused practice.
              </p>
            </div>

            {/* Language Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium leading-none">Preferred Language</label>
              <div className="flex gap-6">
                {["python", "java", "cpp"].map((lang) => (
                  <label key={lang} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={lang}
                      checked={language === lang}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="h-4 w-4 border-primary text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    />
                    <span className="text-sm font-medium capitalize">{lang}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                "Start Interview (2 coding Qs — 1 min each)"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
