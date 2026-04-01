import { useState, useRef } from "react";
import { Editor } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Play, Square, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface Language {
  id: string;
  name: string;
  extension: string;
  template: string;
  language: string;
  version: string;
}

const languages: Language[] = [
  {
    id: "python",
    name: "Python",
    extension: "py",
    template: `# Python code
def solution():
    # Write your code here
    pass

# Test your solution
if __name__ == "__main__":
    result = solution()
    print(result)`,
    language: "python",
    version: "3.10.0"
  },
  {
    id: "javascript",
    name: "JavaScript",
    extension: "js", 
    template: `// JavaScript code
function solution() {
    // Write your code here
}

// Test your solution
console.log(solution());`,
    language: "javascript",
    version: "18.15.0"
  },
  {
    id: "cpp",
    name: "C++",
    extension: "cpp",
    template: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    // Write your code here
    
    return 0;
}`,
    language: "c++",
    version: "10.2.0"
  },
  {
    id: "java",
    name: "Java",
    extension: "java",
    template: `public class Solution {
    public static void main(String[] args) {
        // Write your code here
        
    }
}`,
    language: "java",
    version: "15.0.2"
  },
  {
    id: "go",
    name: "Go",
    extension: "go",
    template: `package main

import "fmt"

func main() {
    // Write your code here
    
}`,
    language: "go",
    version: "1.16.2"
  }
];

interface CodeEditorProps {
  question?: string;
  onCodeChange?: (code: string) => void;
}

export const CodeEditor = ({ question, onCodeChange }: CodeEditorProps) => {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(languages[0]);
  const [code, setCode] = useState(selectedLanguage.template);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [memory, setMemory] = useState<number | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const editorRef = useRef(null);
  const { toast } = useToast();

  const handleLanguageChange = (languageId: string) => {
    const language = languages.find(lang => lang.id === languageId);
    if (language) {
      setSelectedLanguage(language);
      setCode(language.template);
      setOutput("");
      setExecutionTime(null);
      setMemory(null);
      setCompileError(null);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || "";
    setCode(newCode);
    onCodeChange?.(newCode);
  };

  const executeCode = async () => {
    if (!code.trim()) {
      toast({
        title: "No Code",
        description: "Please write some code before running.",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setOutput("");
    setExecutionTime(null);
    setMemory(null);
    setCompileError(null);

    try {
      const startTime = Date.now();
      
      const response = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          language: selectedLanguage.language,
          version: selectedLanguage.version,
          files: [{
            content: code
          }],
          stdin: input
        })
      });

      const endTime = Date.now();
      setExecutionTime((endTime - startTime) / 1000);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.run) {
        if (result.run.stderr) {
          setOutput(result.run.stderr);
          setCompileError("Runtime Error");
          toast({
            title: "Runtime Error",
            description: "Check your code logic",
            variant: "destructive"
          });
        } else if (result.run.output) {
          setOutput(result.run.output);
          toast({
            title: "Code Executed Successfully",
            description: `Executed in ${((endTime - startTime) / 1000).toFixed(2)}s`
          });
        } else {
          setOutput("No output");
          toast({
            title: "Code Executed",
            description: "Code ran successfully with no output"
          });
        }
      } else if (result.message) {
        setOutput(result.message);
        setCompileError("Error");
        toast({
          title: "Execution Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Execution error:", error);
      setOutput("Error: Unable to execute code. Please try again.");
      toast({
        title: "Execution Failed",
        description: "Unable to connect to code execution service",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      {question && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Programming Challenge</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground whitespace-pre-wrap">{question}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Code Editor</CardTitle>
          <div className="flex items-center space-x-4">
            <Select value={selectedLanguage.id} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={executeCode} 
              disabled={isRunning}
              className="bg-gradient-primary text-primary-foreground"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Code
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border border-border rounded-lg overflow-hidden">
            <Editor
              height="400px"
              language={selectedLanguage.language === 'c++' ? 'cpp' : selectedLanguage.language}
              value={code}
              onChange={handleCodeChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on"
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Input (stdin)</label>
              <Textarea
                placeholder="Enter input for your program..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[100px] font-mono text-sm"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Output</label>
                {executionTime !== null && (
                  <Badge variant="secondary" className="text-xs">
                    {executionTime.toFixed(2)}s
                  </Badge>
                )}
              </div>
              <div className={`border border-border rounded-lg p-3 min-h-[100px] bg-muted font-mono text-sm whitespace-pre-wrap ${compileError ? 'text-destructive' : ''}`}>
                {output || "Output will appear here..."}
              </div>
            </div>
          </div>

          {compileError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                There was an error executing your code. Check the output above for details.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CodeEditor;