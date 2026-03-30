import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Camera, 
  TrendingUp, 
  Award, 
  BookOpen, 
  FileText, 
  Clock,
  User,
  LogOut,
  Settings,
  HelpCircle,
  Shield,
  Mail,
  GitBranch,
  Play
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useUserStats } from "@/hooks/useUserStats";

type DashboardUserStats = {
  interviewsCompleted: number;
  averageScore: number;
  atsScore: number;
  recentInterviews: Array<{
    id: string;
    date: string;
    score: number;
    position: string;
    status: string;
  }>;
};

const getStatsData = (userStats: DashboardUserStats, statsLoading: boolean) => [
  {
    title: "Interviews Completed",
    value: statsLoading ? "..." : userStats.interviewsCompleted.toString(),
    icon: Clock,
    change: statsLoading ? "Loading..." : userStats.interviewsCompleted > 0 ? "+1 this week" : "No interviews yet",
    color: "text-primary"
  },
  {
    title: "Average Score",
    value: statsLoading ? "..." : userStats.averageScore.toString(),
    icon: Award,
    change: statsLoading ? "Loading..." : userStats.averageScore > 0 ? "+5% improvement" : "Start your first interview",
    color: "text-success"
  },
  {
    title: "ATS Score",
    value: statsLoading ? "..." : `${userStats.atsScore}%`,
    icon: FileText,
    change: statsLoading ? "Loading..." : userStats.atsScore > 0 ? "Excellent match" : "Upload resume to check",
    color: "text-accent"
  }
];

const getRecentInterviews = (userStats: DashboardUserStats, statsLoading: boolean) => {
  if (statsLoading || !userStats.recentInterviews.length) {
    return [
      { date: "No interviews yet", score: 0, position: "Start your first interview", status: "pending" }
    ];
  }
  return userStats.recentInterviews;
};

const suggestedCourses = [
  { title: "Advanced React Patterns", difficulty: "Intermediate", duration: "4 weeks" },
  { title: "System Design Fundamentals", difficulty: "Advanced", duration: "6 weeks" },
  { title: "TypeScript Mastery", difficulty: "Intermediate", duration: "3 weeks" }
];

export const Dashboard = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { user, profile, loading, signOut } = useAuth();
  const { stats: userStats, loading: statsLoading, error: statsError } = useUserStats(user?.id);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  const handleProfileOption = (option: string) => {
    setOpen(false);
    switch (option) {
      case 'settings':
        // Navigate to settings page or open settings modal
        console.log('Opening settings...');
        break;
      case 'help':
        // Open help documentation or support
        console.log('Opening help...');
        break;
      case 'privacy':
        // Open privacy settings
        console.log('Opening privacy settings...');
        break;
      case 'feedback':
        // Open feedback form
        console.log('Opening feedback form...');
        break;
      default:
        break;
    }
  };

  const handleStartInterview = () => {
    navigate("/interview-setup");
  };

  const handleATSCheck = () => {
    navigate("/ats-checker");
  };

  const handlePipelineBuilder = () => {
    navigate("/pipeline-builder");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3"
          >
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Camera className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">CareerMentor</h1>
              <p className="text-sm text-muted-foreground">AI Interview Platform</p>
            </div>
          </motion.div>
          
          <div className="flex items-center space-x-4">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                  {/* Notification indicator */}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                </Button>
              </PopoverTrigger>
                             <PopoverContent className="w-80 p-0" align="end">
                 <div className="p-4">
                   <div className="flex items-center space-x-4 mb-4">
                     <Avatar className="h-12 w-12">
                       <AvatarImage src={profile?.avatar_url || "https://github.com/shadcn.png"} />
                       <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                         {loading ? '...' : profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : user?.email ? user.email[0].toUpperCase() : 'U'}
                       </AvatarFallback>
                     </Avatar>
                     <div>
                       <h3 className="font-semibold text-lg">
                         {loading ? 'Loading...' : profile?.full_name || user?.email?.split('@')[0] || 'User'}
                       </h3>
                       <p className="text-sm text-muted-foreground">
                         {loading ? 'Loading...' : profile?.email || user?.email || 'No email'}
                       </p>
                       <p className="text-xs text-muted-foreground">
                         Member since {loading ? '...' : profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'}
                       </p>
                       <div className="flex items-center mt-1">
                         <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                         <span className="text-xs text-green-600 font-medium">Online</span>
                       </div>
                     </div>
                   </div>
                   
                   {/* Error Display */}
                   {(statsError) && (
                     <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                       <p className="text-xs text-destructive">
                         {statsError}
                       </p>
                     </div>
                   )}
                   
                   {/* User Stats */}
                   <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-muted rounded-lg">
                     <div className="text-center">
                       <p className="text-lg font-bold text-primary">
                         {loading || statsLoading ? '...' : userStats.interviewsCompleted}
                       </p>
                       <p className="text-xs text-muted-foreground">Interviews</p>
                     </div>
                     <div className="text-center">
                       <p className="text-lg font-bold text-success">
                         {loading || statsLoading ? '...' : `${userStats.averageScore}%`}
                       </p>
                       <p className="text-xs text-muted-foreground">Avg Score</p>
                     </div>
                     <div className="text-center">
                       <p className="text-lg font-bold text-accent">
                         {loading || statsLoading ? '...' : `${userStats.atsScore}%`}
                       </p>
                       <p className="text-xs text-muted-foreground">ATS Score</p>
                     </div>
                   </div>
                   
                   {/* Subscription Status */}
                   <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                     <div className="flex items-center space-x-2">
                       <div className="w-2 h-2 bg-primary rounded-full"></div>
                       <span className="text-sm font-medium">Premium Plan</span>
                     </div>
                     <Badge variant="secondary" className="text-xs">Active</Badge>
                   </div>
                 </div>
                 
                 <Separator />
                 
                 <div className="p-2">
                   <div className="flex flex-col space-y-1">
                     <Button 
                       variant="ghost" 
                       className="w-full justify-start h-10 px-3 hover:bg-accent"
                       onClick={() => handleProfileOption('settings')}
                     >
                       <Settings className="h-4 w-4 mr-3" />
                       <div className="flex flex-col items-start">
                         <span className="text-sm font-medium">Settings</span>
                         <span className="text-xs text-muted-foreground">Account preferences</span>
                       </div>
                     </Button>
                     <Button 
                       variant="ghost" 
                       className="w-full justify-start h-10 px-3 hover:bg-accent"
                       onClick={() => handleProfileOption('help')}
                     >
                       <HelpCircle className="h-4 w-4 mr-3" />
                       <div className="flex flex-col items-start">
                         <span className="text-sm font-medium">Help & Support</span>
                         <span className="text-xs text-muted-foreground">Get assistance</span>
                       </div>
                     </Button>
                     <Button 
                       variant="ghost" 
                       className="w-full justify-start h-10 px-3 hover:bg-accent"
                       onClick={() => handleProfileOption('privacy')}
                     >
                       <Shield className="h-4 w-4 mr-3" />
                       <div className="flex flex-col items-start">
                         <span className="text-sm font-medium">Privacy & Security</span>
                         <span className="text-xs text-muted-foreground">Manage your data</span>
                       </div>
                     </Button>
                     <Button 
                       variant="ghost" 
                       className="w-full justify-start h-10 px-3 hover:bg-accent"
                       onClick={() => handleProfileOption('feedback')}
                     >
                       <Mail className="h-4 w-4 mr-3" />
                       <div className="flex flex-col items-start">
                         <span className="text-sm font-medium">Send Feedback</span>
                         <span className="text-xs text-muted-foreground">Help us improve</span>
                       </div>
                     </Button>
                   </div>
                 </div>
                 
                 <Separator />
                 
                 <div className="p-2">
                   <Button 
                     variant="ghost" 
                     className="w-full justify-start h-10 px-3 text-destructive hover:text-destructive hover:bg-destructive/10" 
                     onClick={async () => {
                       await signOut();
                       navigate("/login");
                     }}
                   >
                     <LogOut className="h-4 w-4 mr-3" />
                     <div className="flex flex-col items-start">
                       <span className="text-sm font-medium">Sign Out</span>
                       <span className="text-xs text-muted-foreground">End your session</span>
                     </div>
                   </Button>
                 </div>
               </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="cursor-pointer transition-all duration-300 hover:shadow-primary hover:scale-105">
              <CardContent className="p-6" onClick={handleStartInterview}>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <Camera className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Start AI Interview</h3>
                    <p className="text-muted-foreground">Begin your practice session</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all duration-300 hover:shadow-primary hover:scale-105">
              <CardContent className="p-6" onClick={handleATSCheck}>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">ATS Score Checker</h3>
                    <p className="text-muted-foreground">Optimize your resume</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all duration-300 hover:shadow-primary hover:scale-105">
              <CardContent className="p-6" onClick={handlePipelineBuilder}>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <GitBranch className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Pipeline Builder</h3>
                    <p className="text-muted-foreground">Create custom interview flows</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">Performance Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {getStatsData(userStats, statsLoading).map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {stat.title}
                        </p>
                        <div className="flex items-center space-x-2">
                          <p className="text-3xl font-bold">{stat.value}</p>
                          {stat.title === "Average Score" && <span className="text-lg">%</span>}
                        </div>
                        <p className="text-sm text-success">{stat.change}</p>
                      </div>
                      <stat.icon className={`h-8 w-8 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Interviews */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Recent Interviews</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getRecentInterviews(userStats, statsLoading).map((interview, index) => (
                                          <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{interview.position}</p>
                          <p className="text-sm text-muted-foreground">{interview.date}</p>
                        </div>
                        <div className="text-right">
                          {interview.score > 0 ? (
                            <Badge variant="secondary" className="mb-1">
                              {interview.score}%
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="mb-1">
                              No score
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground capitalize">
                            {interview.status}
                          </p>
                        </div>
                      </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Suggested Courses */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>Recommended Courses</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suggestedCourses.map((course, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">{course.title}</h4>
                      <div className="flex items-center justify-between text-sm">
                        <Badge variant="outline">{course.difficulty}</Badge>
                        <span className="text-muted-foreground">{course.duration}</span>
                      </div>
                      <Progress value={Math.random() * 100} className="mt-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;