import { useState, useRef } from "react";
import { Button } from "./components/ui/button";
import { motion } from "framer-motion";
import { Upload, CheckCircle2, AlertCircle, TrendingUp, Loader } from "lucide-react";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";




interface ATSScore {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}




export default function ATSChecker() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [atsScore, setATSScore] = useState<ATSScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);




  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      // Validate file type
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!validTypes.includes(uploadedFile.type)) {
        setError('Please upload a PDF or DOC/DOCX file');
        return;
      }




      // Validate file size (5MB max)
      if (uploadedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }




      setFile(uploadedFile);
      setFileName(uploadedFile.name);
      setError(null);
    }
  };




  const analyzeResume = async () => {
    if (!file) {
      setError('Please upload a resume first');
      return;
    }




    setLoading(true);
    setError(null);




    try {
      const formData = new FormData();
      formData.append('file', file);




      // Update this URL based on your backend setup
      const API_BASE = "http://localhost:8080";
      const response = await fetch(`${API_BASE}/api/analyze-resume`, {
        method: 'POST',
        body: formData,
      });




      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to analyze resume');
      }




      const data = await response.json();




      // Validate response
      if (
        typeof data.score !== 'number' ||
        !Array.isArray(data.strengths) ||
        !Array.isArray(data.weaknesses) ||
        !Array.isArray(data.suggestions)
      ) {
        throw new Error('Invalid response format from server');
      }




      // Ensure score is a number between 0-100
      const score = Math.min(100, Math.max(0, data.score));




      setATSScore({
        score,
        strengths: data.strengths.slice(0, 5),
        weaknesses: data.weaknesses.slice(0, 5),
        suggestions: data.suggestions.slice(0, 8),
      });
    } catch (error) {
      console.error('Error analyzing resume:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to analyze resume. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };




  const getScoreBg = (score: number) => {
    if (score >= 80) return 'from-primary to-primary/80';
    if (score >= 60) return 'from-primary/70 to-primary/50';
    return 'from-primary/60 to-primary/40';
  };




  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            ATS Resume <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Analyzer</span>
          </motion.h1>
          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Upload your resume and get an AI-powered ATS score analysis powered by Google Gemini. Discover what's working and how to improve your chances of passing ATS systems.
          </motion.p>
        </div>




        {/* Upload Section */}
        <div className="max-w-2xl mx-auto mb-16">
          <CardContainer className="inter-var">
            <CardBody className="bg-gradient-to-br from-background to-card border border-border/50 relative group/card w-full rounded-2xl p-8 md:p-12 shadow-lg hover:shadow-2xl transition-shadow duration-300">
              <CardItem translateZ="50" className="w-full mb-8">
                <div className="flex items-center justify-center mb-6">
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <Upload className="w-12 h-12 text-primary" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-center mb-2">
                  Upload Your Resume
                </h2>
                <p className="text-muted-foreground text-center">
                  Support PDF and DOC formats
                </p>
              </CardItem>




              <CardItem translateZ="40" className="w-full mb-8">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-primary/50 rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {fileName ? (
                    <div className="flex items-center justify-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span className="text-foreground font-medium">{fileName}</span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-foreground font-medium mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-muted-foreground">
                        PDF or DOC file (Max 5MB)
                      </p>
                    </div>
                  )}
                </div>
              </CardItem>




              {error && (
                <CardItem translateZ="35" className="w-full mb-8">
                  <div className="bg-destructive/10 border border-destructive/50 text-destructive p-4 rounded-lg flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{error}</span>
                  </div>
                </CardItem>
              )}




              <CardItem translateZ="30" className="w-full">
                <Button
                  onClick={analyzeResume}
                  disabled={!file || loading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  size="lg"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Analyzing with Gemini...</span>
                    </div>
                  ) : (
                    'Analyze Resume'
                  )}
                </Button>
              </CardItem>
            </CardBody>
          </CardContainer>
        </div>




        {/* Results Section */}
        {atsScore && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            {/* Score Display */}
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {/* Main Score */}
              <CardContainer className="inter-var md:col-span-1">
                <CardBody className={`bg-gradient-to-br ${getScoreBg(atsScore.score)} relative group/card w-full rounded-2xl p-8 shadow-xl border border-white/20`}>
                  <CardItem translateZ="50" className="w-full text-center">
                    <div className="mb-4">
                      <p className="text-white/90 text-sm font-medium mb-2">ATS Score</p>
                      <div className="text-6xl font-bold text-white">
                        {atsScore.score}
                      </div>
                      <p className="text-white/90 text-sm mt-2">/100</p>
                    </div>
                  </CardItem>




                  <CardItem translateZ="40" className="w-full">
                    <div className="w-full bg-white/30 rounded-full h-2">
                      <div
                        className="bg-white h-2 rounded-full transition-all duration-500"
                        style={{ width: `${atsScore.score}%` }}
                      />
                    </div>
                  </CardItem>




                  <CardItem translateZ="30" className="w-full mt-4">
                    <p className="text-white text-center text-sm font-medium">
                      {atsScore.score >= 80
                        ? '✓ Excellent! Ready to apply'
                        : atsScore.score >= 60
                        ? '⚠ Good, needs improvement'
                        : '✗ Needs significant work'}
                    </p>
                  </CardItem>
                </CardBody>
              </CardContainer>




              {/* Stats */}
              <div className="md:col-span-2 space-y-4">
                <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-3">
                        Strengths ({atsScore.strengths.length})
                      </h3>
                      <ul className="space-y-2">
                        {atsScore.strengths.map((strength, idx) => (
                          <li key={idx} className="text-sm text-foreground flex items-start space-x-2">
                            <span className="text-primary font-bold mt-0.5">✓</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>




                <div className="bg-card border border-border rounded-xl p-6 hover:border-destructive/50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-destructive/10 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-3">
                        Weaknesses ({atsScore.weaknesses.length})
                      </h3>
                      <ul className="space-y-2">
                        {atsScore.weaknesses.map((weakness, idx) => (
                          <li key={idx} className="text-sm text-foreground flex items-start space-x-2">
                            <span className="text-destructive font-bold mt-0.5">✗</span>
                            <span>{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>




            {/* Suggestions */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-8 mb-12">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">
                  How to Improve Your ATS Score
                </h3>
              </div>




              <div className="space-y-3">
                {atsScore.suggestions.map((suggestion, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    className="flex items-start space-x-4 p-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors group hover:shadow-md"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold text-sm group-hover:bg-primary/20 transition-colors">
                      {idx + 1}
                    </div>
                    <p className="text-foreground pt-1">{suggestion}</p>
                  </motion.div>
                ))}
              </div>
            </div>




            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => {
                  setFile(null);
                  setFileName('');
                  setATSScore(null);
                  setError(null);
                }}
                variant="outline"
                size="lg"
                className="hover:border-primary/50"
              >
                Analyze Another Resume
              </Button>
            </div>
          </motion.div>
        )}
      </section>
    </div>
  );
}
