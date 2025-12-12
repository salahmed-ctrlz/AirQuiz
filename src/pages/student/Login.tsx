/**
 * AirQuiz - Classroom Assessment Platform
 * Student Login Component
 * 
 * @author Salah Eddine Medkour
 * @copyright 2024 Salah Eddine Medkour. All rights reserved.
 * @license MIT
 * @see https://github.com/salahmed-ctrlz
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/Footer';
import { useSocket } from '@/hooks/useSocket';
import { config } from '@/lib/config';
import logo from '@/assets/AirQuizLogoBLACKndBlueMain.svg';
import { Loader2, RefreshCw } from 'lucide-react';

export default function StudentLogin() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [group, setGroup] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // New State for Rooms
  const [activeRooms, setActiveRooms] = useState<{ id: string, code: string, name: string }[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hook for room discovery
  const { connect, disconnect, requestRooms } = useSocket({
    onRoomList: (rooms) => {
      setActiveRooms(rooms);
      setIsRefreshing(false);
    }
  });

  // Connect on mount to listen for rooms
  // NOTE: Empty deps - we only want to run this once on mount
  useEffect(() => {
    connect();
    // Tiny delay to allow connection before requesting, though onRoomList should fire on connect in backend
    const t = setTimeout(() => requestRooms(), 500);
    return () => {
      clearTimeout(t);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    requestRooms();
    setTimeout(() => setIsRefreshing(false), 2000); // Timeout fallback
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !group) return;

    // Use selected room code OR manual entry
    let finalCode = roomCode === 'manual' ? manualCode.trim() : roomCode;
    if (!finalCode) return;

    // Normalize code to match backend expectations
    finalCode = finalCode.toLowerCase().replace(/\s+/g, '-');

    setIsLoading(true);

    // Store student info in session storage
    // Note: room_id in storage is used by waiting room to displaying context.
    // If using code, we might not know the exact room ID name yet, but we will send the code to join.
    sessionStorage.setItem('studentInfo', JSON.stringify({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      group,
      room_id: finalCode // This will be sent as 'room_id' payload which backend now checks as Code too.
    }));

    // Navigate to waiting room
    navigate('/waiting');
  };

  const isValid = firstName.trim() && lastName.trim() && group && (roomCode === 'manual' ? manualCode.trim().length >= 3 : roomCode);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img src={logo} alt="AirQuiz" className="h-16 w-auto" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Welcome to AirQuiz</CardTitle>
              <CardDescription className="mt-2">
                Join an active session below.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="roomSelect">Select Room</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleRefresh}
                    title="Refresh room list"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                <Select value={roomCode} onValueChange={setRoomCode}>
                  <SelectTrigger id="roomSelect" className="h-12">
                    <SelectValue placeholder={activeRooms.length > 0 ? "Select a room..." : "Searching for rooms..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeRooms.map((room) => (
                      <SelectItem key={room.code} value={room.code}>
                        <span className="font-semibold">{room.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">({room.code})</span>
                      </SelectItem>
                    ))}
                    {activeRooms.length === 0 && (
                      <div className="p-2 text-sm text-center text-muted-foreground">No active rooms found.</div>
                    )}
                    <SelectItem value="manual" className="font-semibold text-primary">
                      + Enter Code Manually
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {roomCode === 'manual' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label htmlFor="manualCode">Enter Code</Label>
                  <Input
                    id="manualCode"
                    type="text"
                    placeholder="e.g. 129482"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="h-12 font-mono tracking-widest text-center"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    autoComplete="family-name"
                    className="h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="group">Group</Label>
                <Select value={group} onValueChange={setGroup} required>
                  <SelectTrigger id="group" className="h-12">
                    <SelectValue placeholder="Select your group" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.groups.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg font-semibold mt-6 shadow-md"
                disabled={!isValid || isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isLoading ? 'Connecting...' : 'Join Quiz'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
