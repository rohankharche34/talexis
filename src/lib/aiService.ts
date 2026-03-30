const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface InterviewRole {
  id: string;
  name: string;
  category: 'technical' | 'behavioral' | 'management';
  questions: string[];
  skills: string[];
}

export const INTERVIEW_ROLES: InterviewRole[] = [
  {
    id: 'frontend',
    name: 'Frontend Developer',
    category: 'technical',
    questions: [],
    skills: ['React', 'TypeScript', 'CSS', 'HTML', 'JavaScript', 'State Management', 'Performance Optimization']
  },
  {
    id: 'backend',
    name: 'Backend Developer',
    category: 'technical',
    questions: [],
    skills: ['Node.js', 'Python', 'Databases', 'API Design', 'Security', 'Scalability']
  },
  {
    id: 'fullstack',
    name: 'Full Stack Developer',
    category: 'technical',
    questions: [],
    skills: ['Frontend', 'Backend', 'Databases', 'DevOps', 'API Design']
  },
  {
    id: 'ml',
    name: 'Machine Learning Engineer',
    category: 'technical',
    questions: [],
    skills: ['Python', 'TensorFlow', 'PyTorch', 'Data Science', 'ML Algorithms', 'Neural Networks']
  },
  {
    id: 'devops',
    name: 'DevOps Engineer',
    category: 'technical',
    questions: [],
    skills: ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Infrastructure', 'Automation']
  },
  {
    id: 'hr',
    name: 'HR / Behavioral',
    category: 'behavioral',
    questions: [],
    skills: ['Communication', 'Leadership', 'Conflict Resolution', 'Team Building', 'Recruiting']
  },
  {
    id: 'product',
    name: 'Product Manager',
    category: 'management',
    questions: [],
    skills: ['Product Strategy', 'Roadmapping', 'User Research', 'Stakeholder Management', 'Analytics']
  },
  {
    id: 'lead',
    name: 'Tech Lead',
    category: 'management',
    questions: [],
    skills: ['Architecture', 'Team Leadership', 'Code Review', 'Mentoring', 'System Design']
  }
];

export interface Question {
  id: string;
  text: string;
  type: 'behavioral' | 'programming' | 'technical';
  category: string;
  programmingPrompt?: string;
  expectedSkills?: string[];
  followUp?: string;
}

export interface EvaluationResult {
  skillScore: number;
  communicationScore: number;
  depthScore: number;
  redFlags: string[];
  strengths: string[];
  weaknesses: string[];
  missedConcepts: string[];
  suggestions: string[];
  overallScore: number;
}

export const generateAdaptiveQuestion = async (
  role: InterviewRole,
  previousQuestions: Question[],
  userResponses: { question: string; response: string }[],
  questionNumber: number
): Promise<Question> => {
  const context = previousQuestions.length > 0 
    ? `Previous questions: ${previousQuestions.map(q => q.text).join(', ')}\n\nUser responses: ${userResponses.map(r => `Q: ${r.question}\nA: ${r.response}`).join('\n\n')}`
    : '';

  const prompt = `You are an AI interviewer conducting a ${role.name} interview. Generate one interview question that adapts to the candidate's previous responses.

${context}

Generate a question that:
1. Is appropriate for a ${role.name} position
2. Tests the key skills: ${role.skills.join(', ')}
3. If there are previous responses, either:
   - Ask a follow-up question to go deeper on a weak area
   - Ask about a new topic they seemed confident about
   - Challenge them with a more advanced version of something they answered well
4. For technical roles, include programming problems occasionally

Return ONLY a JSON object with this exact structure (no other text):
{
  "id": "q${questionNumber + 1}",
  "text": "The question text",
  "type": "behavioral" or "programming" or "technical",
  "category": "A brief category name",
  "programmingPrompt": "For programming questions, include the problem description with examples and constraints (otherwise null)",
  "expectedSkills": ["skill1", "skill2"],
  "followUp": "Potential follow-up question (can be null)"
}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (generatedText) {
      const cleanedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanedText);
      return {
        ...parsed,
        programmingPrompt: parsed.programmingPrompt === 'null' ? undefined : parsed.programmingPrompt,
        followUp: parsed.followUp === 'null' ? undefined : parsed.followUp,
      };
    }
  } catch (error) {
    console.error('Error generating question:', error);
  }

  return getFallbackQuestion(role, questionNumber);
};

const getFallbackQuestion = (role: InterviewRole, questionNumber: number): Question => {
  const fallbackQuestions: Record<string, Question[]> = {
    frontend: [
      { id: 'q1', text: 'Explain the difference between useEffect and useLayoutEffect in React.', type: 'technical', category: 'React', expectedSkills: ['React', 'Hooks'] },
      { id: 'q2', text: 'How do you optimize a React application for performance?', type: 'technical', category: 'Performance', expectedSkills: ['React', 'Performance'] },
      { id: 'q3', text: 'Write a function to debounce a button click.', type: 'programming', category: 'JavaScript', programmingPrompt: 'Implement a debounce function that delays executing a function until after a specified wait time has elapsed since the last time it was invoked.\n\nExample:\nconst debouncedFn = debounce(() => console.log("Clicked"), 300);', expectedSkills: ['JavaScript', 'Algorithms'] },
      { id: 'q4', text: 'Describe your approach to responsive design.', type: 'behavioral', category: 'CSS', expectedSkills: ['CSS', 'Responsive Design'] },
      { id: 'q5', text: 'What is the Virtual DOM and how does it work?', type: 'technical', category: 'React', expectedSkills: ['React', 'DOM'] },
    ],
    backend: [
      { id: 'q1', text: 'Explain the differences between SQL and NoSQL databases.', type: 'technical', category: 'Databases', expectedSkills: ['SQL', 'NoSQL'] },
      { id: 'q2', text: 'How do you handle authentication and authorization in a REST API?', type: 'technical', category: 'Security', expectedSkills: ['JWT', 'OAuth'] },
      { id: 'q3', text: 'Write a function to reverse a string in place.', type: 'programming', category: 'Algorithms', programmingPrompt: 'Reverse a string in place without using additional memory.\n\nExample:\nInput: "hello"\nOutput: "olleh"', expectedSkills: ['Algorithms'] },
      { id: 'q4', text: 'What is database indexing and how does it improve performance?', type: 'technical', category: 'Databases', expectedSkills: ['Indexing', 'Performance'] },
      { id: 'q5', text: 'Describe your experience with microservices architecture.', type: 'behavioral', category: 'Architecture', expectedSkills: ['Microservices'] },
    ],
    ml: [
      { id: 'q1', text: 'Explain the difference between supervised and unsupervised learning.', type: 'technical', category: 'ML Fundamentals', expectedSkills: ['ML', 'Supervised', 'Unsupervised'] },
      { id: 'q2', text: 'What is overfitting and how do you prevent it?', type: 'technical', category: 'ML', expectedSkills: ['Overfitting', 'Regularization'] },
      { id: 'q3', text: 'Write a function to implement linear regression from scratch.', type: 'programming', category: 'ML', programmingPrompt: 'Implement simple linear regression using gradient descent.\n\nInput: X array, y array\nOutput: slope and intercept', expectedSkills: ['Python', 'Linear Regression'] },
      { id: 'q4', text: 'How do you handle imbalanced datasets?', type: 'technical', category: 'Data Science', expectedSkills: ['Data Processing', 'Class Imbalance'] },
      { id: 'q5', text: 'Explain the vanishing gradient problem.', type: 'technical', category: 'Deep Learning', expectedSkills: ['Neural Networks', 'Gradient Descent'] },
    ],
    hr: [
      { id: 'q1', text: 'Tell me about a time you had to deal with a difficult employee.', type: 'behavioral', category: 'Conflict Resolution', expectedSkills: ['Communication', 'Conflict Resolution'] },
      { id: 'q2', text: 'How do you prioritize multiple urgent tasks?', type: 'behavioral', category: 'Time Management', expectedSkills: ['Prioritization', 'Time Management'] },
      { id: 'q3', text: 'Describe your approach to mentoring team members.', type: 'behavioral', category: 'Leadership', expectedSkills: ['Mentoring', 'Leadership'] },
      { id: 'q4', text: 'How do you handle confidential employee information?', type: 'behavioral', category: 'Privacy', expectedSkills: ['Confidentiality', 'Ethics'] },
      { id: 'q5', text: 'What strategies do you use for effective recruitment?', type: 'behavioral', category: 'Recruiting', expectedSkills: ['Recruiting', 'HR'] },
    ],
  };

  const roleQuestions = fallbackQuestions[role.id] || fallbackQuestions['frontend'];
  return roleQuestions[questionNumber % roleQuestions.length];
};

export const evaluateResponse = async (
  question: Question,
  response: string,
  code?: string,
  role?: InterviewRole
): Promise<EvaluationResult> => {
  const prompt = `You are an expert interviewer evaluating a candidate's response.

Question: ${question.text}
${question.programmingPrompt ? `\nProgramming Problem: ${question.programmingPrompt}` : ''}
Candidate's Response: ${response}
${code ? `Candidate's Code: ${code}` : ''}

Evaluate this response and return ONLY a JSON object with this exact structure:

{
  "skillScore": number (0-100),
  "communicationScore": number (0-100),
  "depthScore": number (0-100),
  "redFlags": ["flag1", "flag2"] (list any red flags like "vague answers", "incorrect technical info", "no examples"),
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "missedConcepts": ["concept1", "concept2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "overallScore": number (0-100)
}

Be strict but fair. Consider:
- Technical accuracy for technical questions
- Structure and clarity for behavioral questions
- Code quality for programming questions
- Depth of understanding
- Use of specific examples`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      }),
    });

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (generatedText) {
      const cleanedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanedText);
    }
  } catch (error) {
    console.error('Error evaluating response:', error);
  }

  return getDefaultEvaluation();
};

const getDefaultEvaluation = (): EvaluationResult => ({
  skillScore: 70,
  communicationScore: 75,
  depthScore: 65,
  redFlags: ['Evaluation unavailable'],
  strengths: ['Provided a response'],
  weaknesses: ['Could not be analyzed'],
  missedConcepts: [],
  suggestions: ['Continue practicing'],
  overallScore: 70
});

export const generateFollowUp = async (
  question: Question,
  response: string
): Promise<string | null> => {
  const prompt = `Based on this question and response, generate a natural follow-up question to dig deeper:

Question: ${question.text}
Response: ${response}

If a follow-up makes sense, return ONLY the follow-up question as a string. If not, return null.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    });

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (generatedText && generatedText.length > 10 && generatedText.length < 300) {
      return generatedText;
    }
  } catch (error) {
    console.error('Error generating follow-up:', error);
  }

  return null;
};
