import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  Eye, 
  EyeOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Code,
  MessageSquare,
  Brain,
  Clock,
  Target,
  Zap,
  Loader2,
  Send,
  Volume2,
  VolumeX
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import CodeEditor from "@/components/CodeEditor";
import { 
  generateAdaptiveQuestion, 
  evaluateResponse,
  generateFollowUp,
  Question, 
  EvaluationResult,
  InterviewRole,
  INTERVIEW_ROLES
} from "@/lib/aiService";
import { gestureAnalyzer, GestureAnalysisResult } from "@/lib/gestureAnalysis";

interface UserResponse {
  question: string;
  response: string;
  code?: string;
  evaluation?: EvaluationResult;
}

const MAX_QUESTIONS = 10;

export const Interview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { user } = useAuth();
  
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userResponses, setUserResponses] = useState<UserResponse[]>([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [currentCode, setCurrentCode] = useState("");
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [gestureStatus, setGestureStatus] = useState<GestureAnalysisResult>({
    attention: 'good',
    eyeContact: 'good',
    posture: 'good',
    faceDetected: true,
    confidence: 0,
    details: []
  });
  const [interviewProgress, setInterviewProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'video' | 'code' | 'response'>('video');
  
  const [selectedRole, setSelectedRole] = useState<InterviewRole | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [gestureError, setGestureError] = useState<string | null>(null);
  
  const webcamRef = useRef<Webcam>(null);
  const gestureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('interviewConfig');
    if (stored) {
      try {
        const config = JSON.parse(stored);
        setSelectedRole(config.role);
      } catch (e) {
        console.error('Error parsing interview config:', e);
      }
    }
  }, []);

  const initGestureAnalysis = useCallback(async () => {
    try {
      await gestureAnalyzer.loadModels();
      setModelsLoaded(true);
      toast({
        title: "Gesture Analysis Ready",
        description: "AI-powered gesture detection is now active.",
      });
    } catch (error) {
      console.error('Failed to load gesture models:', error);
      setGestureError("Gesture analysis unavailable. Using basic detection.");
      setModelsLoaded(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isInterviewStarted && cameraEnabled && modelsLoaded) {
      const setupGestureAnalysis = () => {
        // `react-webcam` exposes the underlying <video> element on the ref.
        // Using this is more reliable than passing a `videoRef` prop.
        const videoEl = (webcamRef.current as unknown as { video?: HTMLVideoElement | null })?.video ?? null;

        if (videoEl) {
          gestureAnalyzer.setVideo(videoEl);
          
          gestureIntervalRef.current = setInterval(async () => {
            const currentVideoEl = (webcamRef.current as unknown as { video?: HTMLVideoElement | null })?.video ?? null;
            if (currentVideoEl && currentVideoEl.readyState === 4) {
              const result = await gestureAnalyzer.analyzeFrame();
              setGestureStatus(result);
            }
          }, 800);

          return true;
        }
        return false;
      };

      if (!setupGestureAnalysis()) {
        const retryTimeout = setTimeout(() => {
          setupGestureAnalysis();
        }, 1000);
        return () => clearTimeout(retryTimeout);
      }

      return () => {
        if (gestureIntervalRef.current) {
          clearInterval(gestureIntervalRef.current);
        }
      };
    }
  }, [isInterviewStarted, cameraEnabled, modelsLoaded]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isInterviewStarted) {
        const newCount = tabSwitchCount + 1;
        setTabSwitchCount(newCount);
        
        if (newCount === 1) {
          toast({
            title: "Warning",
            description: "Tab switching detected. Please stay focused on the interview.",
            variant: "destructive"
          });
        } else if (newCount === 2) {
          toast({
            title: "Final Warning",
            description: "One more tab switch will terminate the interview.",
            variant: "destructive"
          });
        } else if (newCount >= 3) {
          toast({
            title: "Interview Terminated",
            description: "Interview cancelled due to multiple tab switches.",
            variant: "destructive"
          });
          navigate("/dashboard");
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isInterviewStarted, tabSwitchCount, navigate, toast]);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setCameraEnabled(true);
      setMicEnabled(true);
      stream.getTracks().forEach(track => track.stop());
      
      await initGestureAnalysis();
      
      toast({
        title: "Permissions Granted",
        description: "Camera and microphone access enabled.",
      });
    } catch (error) {
      toast({
        title: "Permission Denied",
        description: "Please allow camera and microphone access to continue.",
        variant: "destructive"
      });
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setSpeechError("Speech recognition not supported in this browser");
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in your browser. Please use Chrome or Edge.",
        variant: "destructive"
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechError(null);
      toast({
        title: "Listening",
        description: "Speak your answer now...",
      });
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const newTranscript = finalTranscript || interimTranscript;
      setTranscript(newTranscript);
      setCurrentResponse((prev) => prev + newTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      let errorMessage = "An error occurred";
      switch (event.error) {
        case 'no-speech':
          errorMessage = "No speech detected. Please try again.";
          break;
        case 'audio-capture':
          errorMessage = "Microphone not available.";
          break;
        case 'not-allowed':
          errorMessage = "Microphone permission denied.";
          break;
      }
      
      setSpeechError(errorMessage);
      toast({
        title: "Speech Error",
        description: errorMessage,
        variant: "destructive"
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  };

  const stopSpeechRecognition = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    setIsListening(false);
  };

  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
    };
  }, []);

  const generateNextQuestion = async () => {
    if (!selectedRole) return;

    setIsLoadingQuestion(true);
    try {
      const previousQuestions = questions;
      const responseHistory = userResponses.map(r => ({
        question: r.question,
        response: r.response
      }));

      const questionNum = questions.length;
      const newQuestion = await generateAdaptiveQuestion(
        selectedRole,
        previousQuestions,
        responseHistory,
        questionNum
      );

      setQuestions(prev => {
        const exists = prev.some(q => q.id === newQuestion.id);
        if (exists) {
          return [...prev, { ...newQuestion, id: `q-${Date.now()}` }];
        }
        return [...prev, newQuestion];
      });
      setCurrentResponse("");
      setCurrentCode("");
    } catch (error) {
      console.error('Error generating question:', error);
      toast({
        title: "Error",
        description: "Failed to generate question. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const submitResponse = async () => {
    if (!currentResponse.trim() && !currentCode.trim()) {
      toast({
        title: "Response Required",
        description: "Please provide an answer or code before submitting.",
        variant: "destructive"
      });
      return;
    }

    setIsEvaluating(true);
    const currentQ = questions[currentQuestionIndex];

    try {
      const evaluation = await evaluateResponse(
        currentQ,
        currentResponse,
        currentCode,
        selectedRole || undefined
      );

      const newResponse: UserResponse = {
        question: currentQ.text,
        response: currentResponse,
        code: currentCode,
        evaluation
      };

      const updatedResponses = [...userResponses, newResponse];
      setUserResponses(updatedResponses);
      setShowEvaluation(true);
      
      toast({
        title: "Response Evaluated",
        description: `Overall Score: ${evaluation.overallScore}%`,
      });
    } catch (error) {
      console.error('Error evaluating response:', error);
      toast({
        title: "Evaluation Error",
        description: "Could not evaluate your response.",
        variant: "destructive"
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const skipQuestion = () => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;

    const defaultEvaluation: EvaluationResult = {
      skillScore: 0,
      communicationScore: 0,
      depthScore: 0,
      redFlags: ['Question not answered'],
      strengths: [],
      weaknesses: ['Did not provide an answer'],
      missedConcepts: ['Question was skipped'],
      suggestions: ['Try to answer all questions for better evaluation'],
      overallScore: 0
    };

    const newResponse: UserResponse = {
      question: currentQ.text,
      response: '',
      code: '',
      evaluation: defaultEvaluation
    };

    setUserResponses(prev => [...prev, newResponse]);
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setInterviewProgress(((currentQuestionIndex + 2) / MAX_QUESTIONS) * 100);
      setShowEvaluation(false);
    } else if (currentQuestionIndex < MAX_QUESTIONS - 1) {
      generateNextQuestion().then(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setInterviewProgress(((currentQuestionIndex + 2) / MAX_QUESTIONS) * 100);
        setShowEvaluation(false);
      });
    } else {
      finishInterview();
    }
  };

  const finishInterview = async () => {
    const answeredCount = userResponses.filter(r => r.response && r.response.trim()).length;
    const totalQuestions = questions.length;
    
    let totalScore = 0;
    let scoreCount = 0;
    
    userResponses.forEach(r => {
      if (r.evaluation) {
        totalScore += r.evaluation.overallScore;
        scoreCount++;
      }
    });

    if (answeredCount === 0 && scoreCount === 0) {
      totalScore = 15;
      scoreCount = 1;
    }

    const finalScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : totalScore;

    const interviewResult = {
      totalQuestions,
      answeredQuestions: answeredCount,
      skippedQuestions: totalQuestions - answeredCount,
      overallScore: finalScore,
      responses: userResponses,
      role: selectedRole?.name
    };

    sessionStorage.setItem('interviewResult', JSON.stringify(interviewResult));

    if (user?.id) {
      try {
        await supabase.from('interviews').insert({
          user_id: user.id,
          position: selectedRole?.name || 'Interview',
          score: finalScore,
          status: 'completed',
          created_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error saving interview:', error);
      }
    }

    toast({
      title: "Interview Completed",
      description: `Final Score: ${finalScore}% - ${answeredCount}/${totalQuestions} questions answered`,
    });
    setTimeout(() => navigate("/dashboard"), 2500);
  };

  const nextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setInterviewProgress(((currentQuestionIndex + 2) / MAX_QUESTIONS) * 100);
      setShowEvaluation(false);
      setCurrentResponse("");
      setCurrentCode("");
    } else if (currentQuestionIndex < MAX_QUESTIONS - 1) {
      await generateNextQuestion();
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setInterviewProgress(((currentQuestionIndex + 2) / MAX_QUESTIONS) * 100);
      setShowEvaluation(false);
    } else {
      finishInterview();
    }
  };

  const startInterview = async () => {
    if (!cameraEnabled || !micEnabled) {
      toast({
        title: "Permissions Required",
        description: "Please enable camera and microphone first.",
        variant: "destructive"
      });
      return;
    }

    setIsInterviewStarted(true);
    setIsRecording(true);
    
    await generateNextQuestion();
    
    toast({
      title: "Interview Started",
      description: `Good luck! You'll be asked ${MAX_QUESTIONS} questions adapted to your responses.`,
    });
  };

  const getGestureIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="h-4 w-4 text-gesture-success" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-gesture-warning" />;
      case 'poor': return <XCircle className="h-4 w-4 text-gesture-error" />;
      default: return <CheckCircle className="h-4 w-4 text-gesture-success" />;
    }
  };

  const getGestureColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-gesture-success';
      case 'warning': return 'text-gesture-warning';
      case 'poor': return 'text-gesture-error';
      default: return 'text-gesture-success';
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentEvaluation = userResponses[currentQuestionIndex]?.evaluation;

  if (!isInterviewStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <Card className="shadow-secondary">
            <CardContent className="p-8 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-3xl font-bold mb-4">AI Interview Setup</h1>
                {selectedRole && (
                  <div className="mb-4 p-3 bg-primary/10 rounded-lg inline-block">
                    <Badge>Interviewing for: {selectedRole.name}</Badge>
                  </div>
                )}
                <p className="text-muted-foreground mb-8">
                  We'll need access to your camera and microphone for proctoring and gesture analysis.
                  The AI will adapt questions based on your responses.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-6 mb-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className={`p-4 ${cameraEnabled ? 'bg-success/10 border-success' : 'bg-muted'}`}>
                    <div className="flex items-center space-x-3">
                      {cameraEnabled ? <Camera className="h-5 w-5 text-success" /> : <CameraOff className="h-5 w-5 text-muted-foreground" />}
                      <div className="text-left">
                        <p className="font-medium">Camera Access</p>
                        <p className="text-sm text-muted-foreground">
                          {cameraEnabled ? 'Enabled' : 'Required for gesture analysis'}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className={`p-4 ${micEnabled ? 'bg-success/10 border-success' : 'bg-muted'}`}>
                    <div className="flex items-center space-x-3">
                      {micEnabled ? <Mic className="h-5 w-5 text-success" /> : <MicOff className="h-5 w-5 text-muted-foreground" />}
                      <div className="text-left">
                        <p className="font-medium">Microphone Access</p>
                        <p className="text-sm text-muted-foreground">
                          {micEnabled ? 'Enabled' : 'Required for voice responses'}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {(!cameraEnabled || !micEnabled) && (
                  <Button 
                    onClick={requestPermissions}
                    className="w-full bg-gradient-primary text-primary-foreground"
                  >
                    Grant Permissions
                  </Button>
                )}

                {cameraEnabled && micEnabled && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      All permissions granted! You're ready to start the adaptive AI interview.
                    </AlertDescription>
                  </Alert>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-4"
              >
                <Button 
                  onClick={startInterview}
                  disabled={!cameraEnabled || !micEnabled}
                  size="lg"
                  className="w-full bg-gradient-primary text-primary-foreground hover:shadow-glow"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Start Adaptive AI Interview
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/dashboard")}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge variant={isRecording ? "destructive" : "secondary"}>
              {isRecording ? "Recording" : "Paused"}
            </Badge>
            <div className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {MAX_QUESTIONS}
            </div>
            {selectedRole && (
              <Badge variant="outline">{selectedRole.name}</Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              Tab Switches: <span className={tabSwitchCount >= 2 ? "text-destructive" : "text-muted-foreground"}>
                {tabSwitchCount}/3
              </span>
            </div>
            <Progress value={interviewProgress} className="w-32" />
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <Card className="h-fit">
              <CardContent className="p-6">
                <div className="aspect-video bg-secondary rounded-lg overflow-hidden relative">
                  {cameraEnabled ? (
                    <>
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        className="w-full h-full object-cover"
                        mirrored
                      />
                      <div className="absolute top-4 left-4">
                        <Badge variant="destructive" className="animate-pulse">
                          ● LIVE
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <CameraOff className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Current Question:</h3>
                    {currentQuestion && (
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        {currentQuestion.type === 'programming' && <Code className="h-3 w-3" />}
                        {currentQuestion.type === 'technical' && <Brain className="h-3 w-3" />}
                        {currentQuestion.type === 'behavioral' && <MessageSquare className="h-3 w-3" />}
                        <span>{currentQuestion.category}</span>
                      </Badge>
                    )}
                  </div>
                  
                  {isLoadingQuestion ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="ml-3 text-muted-foreground">Generating adaptive question...</span>
                    </div>
                  ) : currentQuestion ? (
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'video' | 'code' | 'response')}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="video" className="flex items-center space-x-2">
                          <MessageSquare className="h-4 w-4" />
                          <span>Question</span>
                        </TabsTrigger>
                        {currentQuestion.type === 'programming' && (
                          <TabsTrigger value="code" className="flex items-center space-x-2">
                            <Code className="h-4 w-4" />
                            <span>Code</span>
                          </TabsTrigger>
                        )}
                        <TabsTrigger value="response" className="flex items-center space-x-2">
                          <Send className="h-4 w-4" />
                          <span>Answer</span>
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="video" className="mt-4">
                        <p className="text-foreground bg-muted p-4 rounded-lg">
                          {currentQuestion.text}
                        </p>
                        {currentQuestion.programmingPrompt && (
                          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-line">
                              {currentQuestion.programmingPrompt}
                            </p>
                          </div>
                        )}
                      </TabsContent>
                      
                      {currentQuestion.type === 'programming' && (
                        <TabsContent value="code" className="mt-4">
                          <div className="max-h-[600px] overflow-y-auto">
                            <CodeEditor 
                              question={currentQuestion.programmingPrompt}
                              onCodeChange={setCurrentCode}
                            />
                          </div>
                        </TabsContent>
                      )}
                      
                      <TabsContent value="response" className="mt-4 space-y-4">
                        <div className="relative">
                          <Textarea
                            placeholder="Type your answer here or use voice input..."
                            value={currentResponse}
                            onChange={(e) => setCurrentResponse(e.target.value)}
                            rows={6}
                            disabled={showEvaluation}
                          />
                          <div className="absolute bottom-3 right-3 flex gap-2">
                            <Button
                              type="button"
                              variant={isListening ? "destructive" : "secondary"}
                              size="sm"
                              onClick={isListening ? stopSpeechRecognition : startSpeechRecognition}
                              disabled={showEvaluation}
                              className="h-8"
                            >
                              {isListening ? (
                                <>
                                  <VolumeX className="h-4 w-4 mr-1" />
                                  Stop
                                </>
                              ) : (
                                <>
                                  <Volume2 className="h-4 w-4 mr-1" />
                                  Voice
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        {isListening && (
                          <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg animate-pulse">
                            <Mic className="h-4 w-4 text-primary" />
                            <span className="text-sm text-primary">Listening... Speak your answer</span>
                          </div>
                        )}
                        
                        {speechError && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{speechError}</AlertDescription>
                          </Alert>
                        )}
                        
                        {!showEvaluation ? (
                          <Button 
                            onClick={submitResponse}
                            disabled={isEvaluating || (!currentResponse.trim() && !currentCode.trim())}
                            className="w-full"
                          >
                            {isEvaluating ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Evaluating...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Submit Answer
                              </>
                            )}
                          </Button>
                        ) : (
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">
                              Answer submitted. Click "Next Question" to continue.
                            </p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <p className="text-muted-foreground">No question loaded</p>
                  )}
                </div>

                <div className="flex justify-between mt-6">
                  <Button 
                    variant="outline" 
                    disabled={currentQuestionIndex === 0}
                    onClick={() => {
                      setCurrentQuestionIndex(currentQuestionIndex - 1);
                      setShowEvaluation(false);
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={skipQuestion}
                    disabled={!currentQuestion}
                  >
                    Skip
                  </Button>
                  <Button 
                    onClick={nextQuestion}
                    className="bg-gradient-primary text-primary-foreground"
                    disabled={currentQuestionIndex === 0 && !currentQuestion}
                  >
                    {currentQuestionIndex >= MAX_QUESTIONS - 1 ? 'Finish Interview' : 'Next Question'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Gesture Analysis</span>
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Attention Level</span>
                    <div className="flex items-center space-x-2">
                      {getGestureIcon(gestureStatus.attention)}
                      <span className={`text-sm capitalize ${getGestureColor(gestureStatus.attention)}`}>
                        {gestureStatus.attention}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Eye Contact</span>
                    <div className="flex items-center space-x-2">
                      {getGestureIcon(gestureStatus.eyeContact)}
                      <span className={`text-sm capitalize ${getGestureColor(gestureStatus.eyeContact)}`}>
                        {gestureStatus.eyeContact}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Posture</span>
                    <div className="flex items-center space-x-2">
                      {getGestureIcon(gestureStatus.posture)}
                      <span className={`text-sm capitalize ${getGestureColor(gestureStatus.posture)}`}>
                        {gestureStatus.posture}
                      </span>
                    </div>
                  </div>

                  {gestureStatus.details.length > 0 && (
                    <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                      {gestureStatus.details.slice(0, 2).map((detail, i) => (
                        <p key={i} className="mb-1">{detail}</p>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {showEvaluation && currentEvaluation && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Evaluation</span>
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Skill Score</span>
                      <span className="font-medium">{currentEvaluation.skillScore}%</span>
                    </div>
                    <Progress value={currentEvaluation.skillScore} />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Communication</span>
                      <span className="font-medium">{currentEvaluation.communicationScore}%</span>
                    </div>
                    <Progress value={currentEvaluation.communicationScore} />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Depth</span>
                      <span className="font-medium">{currentEvaluation.depthScore}%</span>
                    </div>
                    <Progress value={currentEvaluation.depthScore} />
                    
                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Overall</span>
                        <Badge variant={currentEvaluation.overallScore >= 70 ? "default" : "destructive"}>
                          {currentEvaluation.overallScore}%
                        </Badge>
                      </div>
                    </div>

                    {currentEvaluation.strengths.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium mb-1">Strengths:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {currentEvaluation.strengths.map((s, i) => (
                            <li key={i} className="flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1 text-success" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentEvaluation.suggestions.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium mb-1">Suggestions:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {currentEvaluation.suggestions.map((s, i) => (
                            <li key={i} className="flex items-center">
                              <Zap className="h-3 w-3 mr-1 text-warning" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Interview Tips</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Maintain eye contact with the camera</p>
                  <p>• Sit up straight and confident</p>
                  <p>• Speak clearly and at a moderate pace</p>
                  <p>• Take your time to think before responding</p>
                  <p>• Stay focused on the interview tab</p>
                </div>
              </CardContent>
            </Card>

            {tabSwitchCount > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {tabSwitchCount >= 2 
                    ? "Final warning: One more tab switch will end the interview."
                    : "Warning: Tab switching detected. Please stay focused."
                  }
                </AlertDescription>
              </Alert>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Interview;
