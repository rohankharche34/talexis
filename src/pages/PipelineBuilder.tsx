import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Trash2, 
  Save, 
  Copy,
  Settings,
  Bot,
  User,
  Code,
  FileText,
  Clock,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface PipelineStage {
  id: string;
  name: string;
  type: 'ai-screening' | 'ai-deep' | 'human' | 'code-challenge' | 'ats-review';
  description: string;
  duration: number;
  questions: number;
  weight: number;
  enabled: boolean;
}

interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  role: string;
  stages: PipelineStage[];
}

const stageTypeData = [
  { type: 'ai-screening', name: 'AI Screening', icon: 'Bot', desc: 'Quick automated assessment', duration: 15, questions: 10 },
  { type: 'ai-deep', name: 'AI Deep Interview', icon: 'Bot', desc: 'Comprehensive AI evaluation', duration: 30, questions: 8 },
  { type: 'code-challenge', name: 'Code Challenge', icon: 'Code', desc: 'Technical coding assessment', duration: 45, questions: 3 },
  { type: 'human', name: 'Human Interview', icon: 'User', desc: 'Traditional interviewer', duration: 45, questions: 5 },
  { type: 'ats-review', name: 'ATS Resume Review', icon: 'FileText', desc: 'Automated resume scoring', duration: 5, questions: 0 },
];

const defaultPipeline: PipelineTemplate = {
  id: 'default',
  name: 'Standard Tech Interview',
  description: 'Default pipeline for technical roles',
  role: 'software-engineer',
  stages: [
    { id: 's1', name: 'AI Screening', type: 'ai-screening', description: 'Quick screening', duration: 15, questions: 10, weight: 25, enabled: true },
    { id: 's2', name: 'AI Deep Interview', type: 'ai-deep', description: 'Technical evaluation', duration: 30, questions: 8, weight: 40, enabled: true },
    { id: 's3', name: 'Human Interview', type: 'human', description: 'Final round', duration: 45, questions: 5, weight: 35, enabled: true },
  ]
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Bot,
  User,
  Code,
  FileText,
  Settings
};

function getIconComponent(iconName: string) {
  return iconMap[iconName] || Settings;
}

export const PipelineBuilder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [templates, setTemplates] = useState<PipelineTemplate[]>([defaultPipeline]);
  const [currentTemplate, setCurrentTemplate] = useState<PipelineTemplate>(defaultPipeline);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const selectedStage = currentTemplate.stages.find(s => s.id === selectedStageId) || null;

  const addStage = useCallback((type: string) => {
    const typeInfo = stageTypeData.find(t => t.type === type);
    if (!typeInfo) {
      console.error('Stage type not found:', type);
      return;
    }

    const newStage: PipelineStage = {
      id: `stage-${Date.now()}`,
      name: typeInfo.name,
      type: type as PipelineStage['type'],
      description: typeInfo.desc,
      duration: typeInfo.duration,
      questions: typeInfo.questions,
      weight: Math.floor(100 / (currentTemplate.stages.length + 1)),
      enabled: true
    };

    const newStages = [...currentTemplate.stages, newStage];
    const weightEach = Math.floor(100 / newStages.length);
    const adjusted = newStages.map((s, i) => ({
      ...s,
      weight: i === newStages.length - 1 ? 100 - (weightEach * (newStages.length - 1)) : weightEach
    }));

    setCurrentTemplate({ ...currentTemplate, stages: adjusted });
    setSelectedStageId(newStage.id);
    
    toast({ title: "Stage Added", description: `${typeInfo.name} added to pipeline` });
  }, [currentTemplate, toast]);

  const removeStage = useCallback((stageId: string) => {
    const newStages = currentTemplate.stages.filter(s => s.id !== stageId);
    if (newStages.length === 0) {
      setCurrentTemplate({ ...currentTemplate, stages: [] });
      setSelectedStageId(null);
      return;
    }
    const weightEach = Math.floor(100 / newStages.length);
    const adjusted = newStages.map((s, i) => ({
      ...s,
      weight: i === newStages.length - 1 ? 100 - (weightEach * (newStages.length - 1)) : weightEach
    }));
    setCurrentTemplate({ ...currentTemplate, stages: adjusted });
    setSelectedStageId(null);
  }, [currentTemplate]);

  const updateStageField = useCallback((field: keyof PipelineStage, value: PipelineStage[keyof PipelineStage]) => {
    if (!selectedStageId) return;
    const newStages = currentTemplate.stages.map(s => 
      s.id === selectedStageId ? { ...s, [field]: value } : s
    );
    setCurrentTemplate({ ...currentTemplate, stages: newStages });
  }, [currentTemplate, selectedStageId]);

  const saveTemplate = useCallback(() => {
    const existing = templates.findIndex(t => t.id === currentTemplate.id);
    if (existing >= 0) {
      const newTemplates = [...templates];
      newTemplates[existing] = currentTemplate;
      setTemplates(newTemplates);
    } else {
      setTemplates([...templates, { ...currentTemplate, id: `tmpl-${Date.now()}` }]);
    }
    toast({ title: "Saved", description: "Pipeline saved successfully" });
  }, [currentTemplate, templates, toast]);

  const createNewPipeline = useCallback(() => {
    const newPipeline: PipelineTemplate = {
      id: `tmpl-${Date.now()}`,
      name: 'New Pipeline',
      description: '',
      role: 'software-engineer',
      stages: []
    };
    setTemplates([...templates, newPipeline]);
    setCurrentTemplate(newPipeline);
    setSelectedStageId(null);
  }, [templates]);

  const duplicatePipeline = useCallback((tpl: PipelineTemplate) => {
    const dup: PipelineTemplate = {
      ...tpl,
      id: `tmpl-${Date.now()}`,
      name: `${tpl.name} (Copy)`
    };
    setTemplates([...templates, dup]);
    setCurrentTemplate(dup);
  }, [templates]);

  const loadPipeline = useCallback((tpl: PipelineTemplate) => {
    setCurrentTemplate(tpl);
    setSelectedStageId(null);
  }, []);

  const totalDuration = currentTemplate.stages.filter(s => s.enabled).reduce((a, s) => a + s.duration, 0);
  const totalWeight = currentTemplate.stages.filter(s => s.enabled).reduce((a, s) => a + s.weight, 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Button>
            <h1 className="text-3xl font-bold">Pipeline Builder</h1>
            <p className="text-muted-foreground">Create custom interview workflows</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={createNewPipeline}>
              <Plus className="h-4 w-4 mr-2" />New Pipeline
            </Button>
            <Button onClick={saveTemplate} className="bg-gradient-primary">
              <Save className="h-4 w-4 mr-2" />Save
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Saved Pipelines</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {templates.map(tpl => (
                  <div
                    key={tpl.id}
                    onClick={() => loadPipeline(tpl)}
                    className={`p-3 rounded-lg cursor-pointer border ${
                      currentTemplate.id === tpl.id ? 'border-primary bg-primary/10' : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{tpl.name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); duplicatePipeline(tpl); }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{tpl.stages.length} stages • {tpl.stages.reduce((a, s) => a + s.duration, 0)} min</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Add Stage</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {stageTypeData.map(stage => {
                  const IconComponent = getIconComponent(stage.icon);
                  return (
                    <Button
                      key={stage.type}
                      variant="outline"
                      className="w-full justify-start text-sm h-auto py-2"
                      onClick={() => addStage(stage.type)}
                    >
                      <IconComponent className="h-4 w-4 mr-2 flex-shrink-0" />
                      <div className="text-left">
                        <div>{stage.name}</div>
                        <div className="text-xs text-muted-foreground">{stage.desc}</div>
                      </div>
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <Input
                  value={currentTemplate.name}
                  onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                  className="text-xl font-bold border-none p-0 focus-visible:ring-0"
                />
                <Textarea
                  value={currentTemplate.description}
                  onChange={(e) => setCurrentTemplate({ ...currentTemplate, description: e.target.value })}
                  className="text-sm text-muted-foreground border-none p-0 focus-visible:ring-0"
                  placeholder="Description..."
                />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentTemplate.stages.map((stage, index) => (
                    <motion.div
                      key={stage.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 border rounded-lg cursor-pointer ${
                        selectedStageId === stage.id ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedStageId(stage.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium">{stage.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">{stage.duration} min</span>
                          <Switch checked={stage.enabled} onCheckedChange={(v) => updateStageField('enabled', v)} />
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); removeStage(stage.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 ml-11 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{stage.questions} questions</span>
                        <span>Weight: {stage.weight}%</span>
                        <Badge variant="secondary" className="text-xs">{stage.type}</Badge>
                      </div>
                    </motion.div>
                  ))}

                  {currentTemplate.stages.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No stages yet - click a stage type to add</p>
                    </div>
                  )}
                </div>

                {currentTemplate.stages.length > 0 && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Total: {totalDuration} min</span>
                      <span className={totalWeight === 100 ? 'text-green-600' : 'text-yellow-600'}>Weight: {totalWeight}%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader><CardTitle className="text-lg">Stage Settings</CardTitle></CardHeader>
              <CardContent>
                {selectedStage ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={selectedStage.name} onChange={(e) => updateStageField('name', e.target.value)} />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea value={selectedStage.description} onChange={(e) => updateStageField('description', e.target.value)} rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Duration (min)</Label>
                        <Input type="number" value={selectedStage.duration} onChange={(e) => updateStageField('duration', parseInt(e.target.value) || 15)} min={5} max={120} />
                      </div>
                      <div>
                        <Label>Questions</Label>
                        <Input type="number" value={selectedStage.questions} onChange={(e) => updateStageField('questions', parseInt(e.target.value) || 0)} min={0} max={50} />
                      </div>
                    </div>
                    <div>
                      <Label>Weight (%)</Label>
                      <Input type="number" value={selectedStage.weight} onChange={(e) => updateStageField('weight', parseInt(e.target.value) || 0)} min={0} max={100} />
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8 text-sm">Select a stage to edit</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PipelineBuilder;
