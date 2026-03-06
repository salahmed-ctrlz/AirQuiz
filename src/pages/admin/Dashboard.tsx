/**
 * AirQuiz - Classroom Assessment Platform
 * Admin Dashboard Component
 * 
 * @author Salah Eddine Medkour
 * @copyright 2024 Salah Eddine Medkour. All rights reserved.
 * @license MIT
 * @see https://github.com/salahmed-ctrlz
 * @see https://linkedin.com/in/salah-eddine-medkour
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { StudentCard } from '@/components/StudentCard';
import { ExamBuilder } from '@/components/ExamBuilder';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';
import { demoStudents, demoExam } from '@/lib/demoData';
import { config } from '@/lib/config';
import type { Student, Exam } from '@/lib/types';
import {
  Play,
  Eye,
  Upload,
  RotateCcw,
  Download,
  Users,
  CheckCircle,
  LogOut,
  FlaskConical,
  StopCircle,
  FileJson,
  Loader2,
  Clock,
  Plus,
  DoorOpen,
  ArrowRight,
  RefreshCw,
  Trash2,
  X
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import logo from '@/assets/AirQuizLogoBLACKndBlueMain.svg';

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Room State
  const [roomId, setRoomId] = useState<string>(''); // Current Room ID
  const [roomCode, setRoomCode] = useState<string>(''); // Generated Code
  const [roomInput, setRoomInput] = useState<string>(''); // Free text input
  const [selectedRoom, setSelectedRoom] = useState<string>(''); // Dropdown selection
  const [inRoom, setInRoom] = useState(false);

  // Available Rooms List
  const [activeRooms, setActiveRooms] = useState<{ id: string, code: string, name: string }[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State
  const [exam, setExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [availableExams, setAvailableExams] = useState<any[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showExamBuilder, setShowExamBuilder] = useState(false);

  // Exam Control State
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [examActive, setExamActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Hook for socket connection
  const { status, connect, send, requestRooms, isDemo, toggleDemo } = useSocket({
    // Handle standard data updates
    onDashboardUpdate: (updatedStudents, count, active, remaining) => {
      setStudents(updatedStudents);
      setAnsweredCount(count);
      setExamActive(active);
      setTimeRemaining(remaining);
    },
    // Handle errors
    onError: (message) => {
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
    onRoomInfo: (data) => {
      setRoomCode(data.code);
    },
    onRoomList: (rooms) => {
      setActiveRooms(rooms);
      setIsRefreshing(false);
    }
  });

  // Check admin authentication
  useEffect(() => {
    const isAdmin = sessionStorage.getItem('isAdmin');
    if (!isAdmin) {
      navigate('/admin');
    }
  }, [navigate]);

  // Connect on mount & fetch exams
  // NOTE: Empty deps - we only want to run this once on mount
  useEffect(() => {
    connect();
    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Listen/fetch rooms when not in room
  useEffect(() => {
    if (!inRoom) {
      const t = setTimeout(() => requestRooms(), 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRoom]);

  const handleRefreshRooms = () => {
    setIsRefreshing(true);
    requestRooms();
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  // Room Selection Handler
  const handleEnterRoom = () => {
    // Prefer dropdown selection if not "new", else use input
    let target = '';
    if (selectedRoom && selectedRoom !== 'new') {
      target = selectedRoom;
    } else {
      target = roomInput;
    }

    if (!target.trim()) return;

    const cleanId = target.trim().toLowerCase().replace(/\s+/g, '-');
    setRoomId(cleanId);
    setInRoom(true);

    // Join room channel to get updates
    send({ type: 'JOIN_ROOM_ADMIN', payload: { room_id: cleanId } });

    toast({ title: "Joined Room", description: `Subject: ${cleanId}` });
  };

  // Load demo data when demo mode is enabled
  useEffect(() => {
    if (isDemo) {
      setExam(demoExam);
      setStudents(demoStudents);
    }
  }, [isDemo]);

  const fetchExams = async () => {
    setIsLoadingExams(true);
    try {
      const res = await fetch(`${config.apiUrl}/api/exams`);
      if (res.ok) {
        const data = await res.json();
        setAvailableExams(data);
      }
    } catch (e) {
      console.error("Failed to fetch exams", e);
    } finally {
      setIsLoadingExams(false);
    }
  };

  const uploadExamToBackend = async (examData: Exam) => {
    try {
      // Upload to persistent storage
      // We need to send the full JSON to the load endpoint
      const res = await fetch(`${config.apiUrl}/api/exam/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examData)
      });

      if (res.ok) {
        setExam(examData);
        toast({
          title: 'Exam Loaded & Saved',
          description: `"${examData.title}" is ready and saved to Available Exams.`,
        });
        // Refresh list
        fetchExams();
      } else {
        throw new Error("Failed to save");
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save exam to server.', variant: 'destructive' });
    }
  };

  const handleSelectExam = async (filename: string) => {
    if (examActive) return;
    try {
      const res = await fetch(`${config.apiUrl}/api/exams/${filename}`);
      if (!res.ok) throw new Error('Failed to fetch exam content');
      const data = await res.json();
      setExam(data);
      toast({ title: 'Exam Selected', description: `Loaded "${data.title}"` });
    } catch (e) {
      toast({ title: 'Error', description: 'Could not load the selected exam.', variant: 'destructive' });
    }
  };

  const handleDeselectExam = () => {
    if (examActive) return;
    setExam(null);
    toast({ description: 'Exam deselected.' });
  };

  const handleDeleteExam = async (filename: string, title: string) => {
    if (examActive) return;
    if (!confirm(`Delete "${title}" permanently?`)) return;
    try {
      const res = await fetch(`${config.apiUrl}/api/exams/${filename}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      // if the deleted exam was loaded, clear it
      if (exam?.title === title) setExam(null);
      fetchExams();
      toast({ description: `"${title}" deleted.` });
    } catch (e) {
      toast({ title: 'Error', description: 'Could not delete exam.', variant: 'destructive' });
    }
  };

  const handleLoadExamFromFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as Exam;
        uploadExamToBackend(data);
      } catch {
        toast({
          title: 'Invalid File',
          description: 'Could not parse the exam JSON file.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  }, [toast]);

  const handleStartExam = useCallback((durationOverride?: number) => {
    if (!exam) return;

    // Use override if provided, otherwise state
    const d = typeof durationOverride === 'number' ? durationOverride : durationMinutes;

    send({
      type: 'ADMIN_START_EXAM',
      payload: { durationMinutes: d, room_id: roomId, exam_title: exam.title }
    });

    toast({
      title: 'Exam Started',
      description: `Timer set for ${d} minutes in room ${roomId}.`,
    });
  }, [exam, durationMinutes, send, toast, roomId]);

  const handleEndExam = useCallback(() => {
    send({ type: 'ADMIN_END_EXAM', payload: { room_id: roomId } });
    toast({ description: "Exam ended manually." });
  }, [send, toast, roomId]);

  const handleExtendExam = useCallback((minutes: number) => {
    send({
      type: 'ADMIN_EXTEND_EXAM',
      payload: { room_id: roomId, minutes }
    });
    toast({
      title: "Exam Extended",
      description: `Added ${minutes} minutes to the exam.`,
      className: "bg-green-50 border-green-200 text-green-900"
    });
  }, [send, toast, roomId]);

  const handleRevealResults = useCallback(() => {
    send({ type: 'ADMIN_REVEAL_RESULTS', payload: { room_id: roomId } });
    toast({
      title: 'Results Revealed',
      description: 'Students can now see their scores and correct answers.',
    });
  }, [send, toast, roomId]);

  const handleResetRoom = useCallback(() => {
    setAnsweredCount(0);
    setStudents([]);
    // Crucial: Call Reset on backend for this room
    send({ type: 'ADMIN_RESET_ROOM', payload: { room_id: roomId } });
    setExam(null);

    toast({
      title: 'Room Reset',
      description: 'All data for this room has been wiped.',
    });
  }, [send, toast, roomId]);

  const handleExportCSV = useCallback(() => {
    // Navigate to REST endpoint for download
    window.location.href = `${config.apiUrl}/admin/export_csv?room_id=${roomId}`;
    toast({ description: "Downloading CSV Report..." });
  }, [roomId]);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('isAdmin');
    navigate('/admin');
  }, [navigate]);

  // Drag and Drop Handlers
  const onDragStart = (e: React.DragEvent, filename: string) => {
    e.dataTransfer.setData("text/plain", filename);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    // Handle File Drop (Desktop)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/json" || file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string) as Exam;
            uploadExamToBackend(data);
          } catch {
            toast({
              title: 'Invalid File',
              description: 'Could not parse the dropped JSON file.',
              variant: 'destructive',
            });
          }
        };
        reader.readAsText(file);
      } else {
        toast({ title: 'Invalid File Type', description: 'Please drop a JSON file.', variant: 'destructive' });
      }
      return;
    }

    // Handle Exam List Drop
    const filename = e.dataTransfer.getData("text/plain");
    if (filename) {
      handleSelectExam(filename);
    }
  };

  const onlineStudents = students.filter(s => s.isOnline).length;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  // ROOM SELECTION OVERLAY
  if (!inRoom) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center">
                <DoorOpen className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Manager Access</CardTitle>
            <CardDescription className="text-lg">
              Manage an active room or create a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-md">Select Room</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleRefreshRooms}
                  title="Refresh List"
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue placeholder="-- Select Active Room --" />
                </SelectTrigger>
                <SelectContent>
                  {activeRooms.map(r => (
                    <SelectItem key={r.id} value={r.id} className="text-md">
                      {r.name}
                    </SelectItem>
                  ))}
                  {activeRooms.length === 0 && (
                    <div className="p-2 text-center text-muted-foreground text-sm">No active rooms</div>
                  )}
                  <SelectItem value="new" className="text-md font-semibold text-primary">
                    + Create New Room
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRoom === 'new' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label className="text-md">New Room Name</Label>
                <Input
                  placeholder="e.g. Biology-101"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  className="text-lg h-14"
                  onKeyDown={(e) => e.key === 'Enter' && handleEnterRoom()}
                />
              </div>
            )}

            <Button onClick={handleEnterRoom} className="w-full h-14 text-lg font-semibold shadow-lg" disabled={!selectedRoom || (selectedRoom === 'new' && !roomInput.trim())}>
              Open Dashboard <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="w-full">
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img src={logo} alt="AirQuiz" className="h-14 w-auto" />

            <div className="hidden md:flex flex-col">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Room</span>
              <span className="font-bold text-lg">{roomId}</span>
            </div>

            {/* Room Code Display */}
            <div className="hidden md:flex flex-col bg-primary/10 px-4 py-1 rounded-md border border-primary/20">
              <span className="text-[10px] text-primary uppercase tracking-widest font-bold text-center">Join Code</span>
              <span className="font-mono text-2xl font-black text-primary tracking-widest text-center">
                {roomCode || '---'}
              </span>
            </div>

            <ConnectionStatus status={status} isDemo={isDemo} />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setInRoom(false)}>
              <DoorOpen className="mr-2 h-4 w-4" /> Switch Room
            </Button>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="demo-mode" className="text-sm text-muted-foreground">
                Demo
              </Label>
              <Switch id="demo-mode" checked={isDemo} onCheckedChange={toggleDemo} />
            </div>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar / Controls */}
          <div className="space-y-6">
            {/* Exam Selector */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 bg-secondary/10">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileJson className="h-4 w-4" /> Library: Available Exams
                </CardTitle>
                <CardDescription className="text-xs">Drag specific exam to right area to load</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {isLoadingExams ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : availableExams.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {availableExams.map((ex) => (
                      <div
                        key={ex.filename}
                        draggable={!examActive}
                        onDragStart={(e) => onDragStart(e, ex.filename)}
                        onClick={() => handleSelectExam(ex.filename)}
                        className={`
                                      p-3 rounded-lg border transition-all flex items-center gap-3 cursor-grab active:cursor-grabbing group
                                      ${exam?.title === ex.title
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:bg-secondary/50 hover:border-primary/50'}
                                      ${examActive ? 'opacity-50 cursor-not-allowed' : ''}
                                  `}
                      >
                        <div className="h-8 w-8 rounded-full bg-background border flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <FileJson className="h-4 w-4 text-foreground/70" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{ex.title}</p>
                          <p className="text-xs text-muted-foreground">{ex.questionCount} Qs</p>
                        </div>
                        {/* delete button — stops propagation so click doesn't also select */}
                        {!examActive && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteExam(ex.filename, ex.title); }}
                            className="p-1.5 rounded-md text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100"
                            title={`Delete ${ex.title}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
                    Library is empty. Drop files here or use Upload.
                  </p>
                )}

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                  >
                    <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground">Upload JSON</p>
                  </div>
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-1 border-2 border-dashed hover:border-primary/50 hover:bg-primary/5"
                    onClick={() => setShowExamBuilder(true)}
                    disabled={examActive}
                  >
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Create New</span>
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleLoadExamFromFile}
                  className="hidden"
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader className="pb-3 bg-secondary/10">
                <CardTitle className="text-sm font-medium">Session Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                <Button variant="outline" className="w-full justify-start text-xs font-normal" onClick={handleExportCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Report (CSV)
                </Button>
                <div className="h-px bg-border my-2" />
                <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 text-xs" onClick={handleResetRoom} disabled={examActive}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset Room (Wipe Data)
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold tracking-tight">{onlineStudents}</p>
                      <p className="text-sm font-medium text-muted-foreground">Active Students</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold tracking-tight">{answeredCount}</p>
                      <p className="text-sm font-medium text-muted-foreground">Submissions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Exam Controls - Droppable Area */}
            <Card
              className={`border-2 transition-all shadow-md ${isDragging ? 'border-primary bg-primary/5 border-dashed scale-[1.01]' : 'border-transparent'}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <CardHeader className={examActive ? "bg-primary/5" : "bg-secondary/20"}>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {examActive ? <ActivityIndicator /> : <FileJson className="h-5 w-5 text-muted-foreground" />}
                    {exam ? exam.title : "No Exam Loaded"}
                    {/* deselect button — only when exam loaded but not running */}
                    {exam && !examActive && (
                      <button onClick={handleDeselectExam} className="p-1 rounded hover:bg-secondary" title="Clear selection">
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </span>
                  {examActive && (
                    <span className="text-xl font-mono font-bold text-primary">
                      {formatTime(timeRemaining)}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {exam ? (
                  <>
                    {examActive && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center p-8 border rounded-lg bg-background">
                          <div className="text-center space-y-2">
                            <div className="h-3 w-3 bg-green-500 rounded-full mx-auto animate-ping" />
                            <p className="text-sm font-medium">Exam is Live</p>
                            <p className="text-xs text-muted-foreground">Monitor student progress below</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <Button onClick={() => handleExtendExam(5)} variant="outline" className="border-amber-500/50 hover:bg-amber-50 text-amber-700">
                            <Plus className="mr-2 h-4 w-4" />
                            +5 Mins
                          </Button>
                          <Button onClick={handleEndExam} variant="destructive">
                            <StopCircle className="mr-2 h-4 w-4" /> End Exam
                          </Button>
                        </div>
                      </div>
                    )}

                    {!examActive && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                        {/* Controls */}
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                          <div className="space-y-2 flex-1 w-full">
                            <Label>Duration (Minutes)</Label>
                            <Input
                              type="number"
                              value={durationMinutes}
                              onChange={(e) => setDurationMinutes(Number(e.target.value))}
                              min={1}
                              className="text-lg h-12"
                            />
                          </div>
                          <Button onClick={() => handleStartExam()} className="h-12 px-8 flex-1 w-full text-lg shadow-sm">
                            <Play className="mr-2 h-5 w-5" /> Start Exam
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <Button onClick={() => handleStartExam(5)} variant="outline" className="h-10">
                            Resume (+5m)
                          </Button>
                          <Button onClick={handleRevealResults} variant="secondary" className="h-10 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200">
                            <Eye className="mr-2 h-4 w-4" /> Distribute Results
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-lg text-muted-foreground h-64 bg-background/50">
                    <Upload className="h-12 w-12 mb-4 opacity-20" />
                    <p className="font-medium">Exam Area Empty</p>
                    <p className="text-xs mt-1 opacity-70">Select an exam from the library on the left</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Students Grid */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Student Progress</CardTitle>
                {/* Could add View Toggle here (Grid/List) */}
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12 bg-secondary/10 rounded-lg border border-dashed">
                    Waiting for students to join... <br />
                    <span className="text-xs opacity-70">Share the Room code with them.</span>
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {students.map((student) => (
                      <StudentCard key={student.id} student={student} totalQuestions={exam?.questions?.length} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Exam Builder Modal */}
      {showExamBuilder && (
        <ExamBuilder
          onSave={(examData) => {
            // Construct full exam object with required fields
            const fullExam = {
              ...examData,
              institution: '',
              subject: '',
              year: ''
            };
            uploadExamToBackend(fullExam as any);
            setShowExamBuilder(false);
          }}
          onCancel={() => setShowExamBuilder(false)}
        />
      )}
    </div>
  );
}

function ActivityIndicator() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
    </span>
  );
}
