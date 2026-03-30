import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Briefcase, 
  Code, 
  Users, 
  Brain, 
  Settings, 
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { INTERVIEW_ROLES, InterviewRole } from "@/lib/aiService";

interface PipelineStage {
  id: string;
  name: string;
  type: 'ai-screening' | 'ai-deep' | 'human';
  duration: number;
  enabled: boolean;
}

interface InterviewConfig {
  role: InterviewRole | null;
  experienceLevel: string;
  targetCompany: string;
  pipeline: PipelineStage[];
}

const defaultPipeline: PipelineStage[] = [
  { id: 'stage-1', name: 'AI Screening', type: 'ai-screening', duration: 15, enabled: true },
  { id: 'stage-2', name: 'AI Deep Interview', type: 'ai-deep', duration: 30, enabled: true },
  { id: 'stage-3', name: 'Human Interview', type: 'human', duration: 45, enabled: false },
];

export const InterviewSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<InterviewConfig>({
    role: null,
    experienceLevel: 'mid',
    targetCompany: '',
    pipeline: defaultPipeline
  });
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);

  const handleRoleSelect = (roleId: string) => {
    const role = INTERVIEW_ROLES.find(r => r.id === roleId);
    setConfig({ ...config, role: role || null });
  };

  const handlePermissionCheck = async (type: 'camera' | 'mic') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'camera',
        audio: type === 'mic'
      });
      
      if (type === 'camera') setCameraReady(true);
      else setMicReady(true);
      
      stream.getTracks().forEach(track => track.stop());
      
      toast({
        title: `${type === 'camera' ? 'Camera' : 'Microphone'} Ready`,
        description: `${type === 'camera' ? 'Camera' : 'Microphone'} access granted successfully.`,
      });
    } catch (error) {
      toast({
        title: "Permission Denied",
        description: `Please allow ${type === 'camera' ? 'camera' : 'microphone'} access to continue.`,
        variant: "destructive"
      });
    }
  };

  const togglePipelineStage = (stageId: string) => {
    const updatedPipeline = config.pipeline.map(stage => 
      stage.id === stageId ? { ...stage, enabled: !stage.enabled } : stage
    );
    setConfig({ ...config, pipeline: updatedPipeline });
  };

  const updateStageDuration = (stageId: string, duration: number) => {
    const updatedPipeline = config.pipeline.map(stage => 
      stage.id === stageId ? { ...stage, duration } : stage
    );
    setConfig({ ...config, pipeline: updatedPipeline });
  };

  const startInterview = () => {
    if (!config.role) {
      toast({
        title: "Role Required",
        description: "Please select a job role before starting the interview.",
        variant: "destructive"
      });
      return;
    }

    if (!cameraReady || !micReady) {
      toast({
        title: "Permissions Required",
        description: "Please enable camera and microphone access.",
        variant: "destructive"
      });
      return;
    }

    const enabledStages = config.pipeline.filter(s => s.enabled);
    const totalDuration = enabledStages.reduce((acc, s) => acc + s.duration, 0);

    sessionStorage.setItem('interviewConfig', JSON.stringify({
      role: config.role,
      experienceLevel: config.experienceLevel,
      targetCompany: config.targetCompany,
      pipeline: enabledStages,
      totalDuration
    }));

    navigate("/interview");
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical': return <Code className="h-5 w-5" />;
      case 'behavioral': return <Users className="h-5 w-5" />;
      case 'management': return <Brain className="h-5 w-5" />;
      default: return <Briefcase className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button 
            variant="ghost" 
            onClick={() => navigate("/dashboard")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Interview Setup</h1>
              <p className="text-muted-foreground">Configure your AI interview experience</p>
            </div>
            <div className="flex items-center space-x-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-3 h-3 rounded-full ${
                    step >= s ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Select Your Role</CardTitle>
                  <CardDescription>
                    Choose the position you're interviewing for
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['technical', 'behavioral', 'management'].map((category) => (
                      <div key={category} className="space-y-3">
                        <h3 className="font-semibold capitalize flex items-center space-x-2">
                          {getCategoryIcon(category)}
                          <span>{category}</span>
                        </h3>
                        {INTERVIEW_ROLES.filter(r => r.category === category).map((role) => (
                          <Card 
                            key={role.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              config.role?.id === role.id 
                                ? 'border-primary bg-primary/5' 
                                : ''
                            }`}
                            onClick={() => handleRoleSelect(role.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{role.name}</span>
                                {config.role?.id === role.id && (
                                  <CheckCircle className="h-4 w-4 text-primary" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Experience Level</Label>
                      <Select 
                        value={config.experienceLevel}
                        onValueChange={(v) => setConfig({ ...config, experienceLevel: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="junior">Junior (0-2 years)</SelectItem>
                          <SelectItem value="mid">Mid-Level (2-5 years)</SelectItem>
                          <SelectItem value="senior">Senior (5-8 years)</SelectItem>
                          <SelectItem value="lead">Lead (8+ years)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target Company (Optional)</Label>
                      <Input
                        placeholder="e.g., Google, Startup..."
                        value={config.targetCompany}
                        onChange={(e) => setConfig({ ...config, targetCompany: e.target.value })}
                      />
                    </div>
                  </div>

                  {config.role && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Selected: <strong>{config.role.name}</strong> - 
                        Will test skills: {config.role.skills.slice(0, 4).join(', ')}...
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-end">
                    <Button 
                      onClick={() => setStep(2)}
                      disabled={!config.role}
                      className="bg-gradient-primary"
                    >
                      Continue
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Build Interview Pipeline</CardTitle>
                  <CardDescription>
                    Create a multi-stage interview workflow
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {config.pipeline.map((stage, index) => (
                      <div 
                        key={stage.id}
                        className={`p-4 border rounded-lg ${
                          stage.enabled ? 'border-primary bg-primary/5' : 'border-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium">{stage.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {stage.type === 'ai-screening' && 'Quick AI assessment with basic questions'}
                                {stage.type === 'ai-deep' && 'In-depth AI interview with coding tasks'}
                                {stage.type === 'human' && 'Traditional human interviewer'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm">Duration:</Label>
                              <Input
                                type="number"
                                value={stage.duration}
                                onChange={(e) => updateStageDuration(stage.id, parseInt(e.target.value) || 15)}
                                className="w-16 h-8"
                                min={5}
                                max={60}
                              />
                              <span className="text-sm text-muted-foreground">min</span>
                            </div>
                            <Button
                              variant={stage.enabled ? "default" : "outline"}
                              size="sm"
                              onClick={() => togglePipelineStage(stage.id)}
                            >
                              {stage.enabled ? 'Enabled' : 'Disabled'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Total interview time: <strong>
                        {config.pipeline.filter(s => s.enabled).reduce((acc, s) => acc + s.duration, 0)} minutes
                      </strong>
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button onClick={() => setStep(3)} className="bg-gradient-primary">
                      Continue
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Permissions & Ready</CardTitle>
                  <CardDescription>
                    Grant camera and microphone access for the interview
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className={`p-4 ${cameraReady ? 'bg-success/10 border-success' : 'bg-muted'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {cameraReady ? <CheckCircle className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-muted-foreground" />}
                          <span className="font-medium">Camera</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {cameraReady ? 'Ready for gesture analysis' : 'Required for proctoring'}
                      </p>
                      {!cameraReady && (
                        <Button onClick={() => handlePermissionCheck('camera')} variant="outline" size="sm" className="w-full">
                          Enable Camera
                        </Button>
                      )}
                    </Card>

                    <Card className={`p-4 ${micReady ? 'bg-success/10 border-success' : 'bg-muted'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {micReady ? <CheckCircle className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-muted-foreground" />}
                          <span className="font-medium">Microphone</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {micReady ? 'Ready for voice responses' : 'Required for answering'}
                      </p>
                      {!micReady && (
                        <Button onClick={() => handlePermissionCheck('mic')} variant="outline" size="sm" className="w-full">
                          Enable Microphone
                        </Button>
                      )}
                    </Card>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Interview Summary</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p><strong>Role:</strong> {config.role?.name}</p>
                      <p><strong>Level:</strong> {config.experienceLevel}</p>
                      <p><strong>Stages:</strong> {config.pipeline.filter(s => s.enabled).map(s => s.name).join(' → ')}</p>
                      <p><strong>Total Duration:</strong> {config.pipeline.filter(s => s.enabled).reduce((acc, s) => acc + s.duration, 0)} minutes</p>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      onClick={startInterview}
                      disabled={!cameraReady || !micReady}
                      className="bg-gradient-primary"
                    >
                      Start Interview
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default InterviewSetup;
