'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { markAttendance, markOutgoingAttendance, getTodayUserAttendance } from '@/app/actions/attendance';
import { createClient } from '@/lib/supabase/client';
import { Loader2, MapPin, Camera, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AttendancePage() {
  const webcamRef = useRef<Webcam>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [alreadyMarkedRecord, setAlreadyMarkedRecord] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAttendance() {
      try {
        const record = await getTodayUserAttendance();
        if (record) {
          setAlreadyMarkedRecord(record);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setInitialLoading(false);
      }
    }
    checkAttendance();
  }, []);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) setImageSrc(imageSrc);
  }, [webcamRef]);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });

        // Reverse geocode
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.display_name) {
              setLocationAddress(data.display_name);
            }
          })
          .catch(err => console.error('Geocoding error:', err));
      },
      () => {
        setError('Unable to retrieve your location. Please grant permission.');
      }
    );
  };

  const handleMarkAttendance = async () => {
    if (!imageSrc || !location) {
      setError('Please capture a photo and allow location access.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Convert base64 to Blob
      const res = await fetch(imageSrc);
      const blob = await res.blob();

      // Upload to Supabase Storage
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attendance-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('attendance-photos')
        .getPublicUrl(fileName);

      if (alreadyMarkedRecord) {
        await markOutgoingAttendance(publicUrlData.publicUrl, location.lat, location.lng, locationAddress);
      } else {
        await markAttendance(publicUrlData.publicUrl, location.lat, location.lng, locationAddress);
      }
      setSuccess(true);
      setTimeout(() => router.push('/dashboard/attendance/history'), 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while marking attendance.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (alreadyMarkedRecord && alreadyMarkedRecord.sign_out_time) {
    return (
      <main className="flex-1 w-full px-4 md:px-6 py-6 space-y-6 relative text-slate-900 bg-slate-50 min-h-screen mx-auto max-w-[1600px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Attendance
            </h1>
            <p className="text-sm text-slate-500 mt-1">Mark your daily attendance.</p>
          </div>
          <Link href="/dashboard/attendance/history">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <History className="w-4 h-4 mr-2" /> View History
            </Button>
          </Link>
        </div>

        <div className="w-full">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Attendance Completed</h2>
              <p className="text-slate-500 text-sm">You have completed your shift for today.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg overflow-hidden border bg-black/5 aspect-video relative flex items-center justify-center">
                <img src={alreadyMarkedRecord.photo_url} alt="Incoming Captured" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded">Sign In</div>
              </div>
              <div className="rounded-lg overflow-hidden border bg-black/5 aspect-video relative flex items-center justify-center">
                <img src={alreadyMarkedRecord.sign_out_photo_url} alt="Outgoing Captured" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded">Sign Out</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
                <div className="w-5 h-5 flex items-center justify-center text-primary font-bold text-lg">
                  🕒
                </div>
                <div className="flex flex-row justify-between flex-1">
                  <div>
                    <p className="font-medium text-sm">Sign In</p>
                    <p className="text-xs text-muted-foreground">{new Date(alreadyMarkedRecord.sign_in_time).toLocaleTimeString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">Sign Out</p>
                    <p className="text-xs text-muted-foreground">{new Date(alreadyMarkedRecord.sign_out_time).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
            </div>
            <Button className="w-full" onClick={() => router.push('/dashboard/attendance/history')}>
              View Attendance History
            </Button>
          </div>
        </div>
    </main>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Attendance Marked!</h2>
            <p className="text-muted-foreground">Redirecting to history...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="flex-1 w-full px-4 md:px-6 py-6 space-y-6 relative text-slate-900 bg-slate-50 min-h-screen mx-auto max-w-[1600px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Attendance
          </h1>
          <p className="text-sm text-slate-500 mt-1">Mark your daily attendance.</p>
        </div>
        <Link href="/dashboard/attendance/history">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <History className="w-4 h-4 mr-2" /> View History
          </Button>
        </Link>
      </div>

      <div className="w-full">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{alreadyMarkedRecord ? 'Outgoing Attendance' : 'Incoming Attendance'}</h2>
            <p className="text-slate-500 text-sm">
              {alreadyMarkedRecord 
                ? 'Capture your live photo and location to mark your end of shift.' 
                : 'Capture your live photo and location to mark attendance.'}
            </p>
          </div>
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="rounded-lg overflow-hidden border bg-black/5 aspect-video max-w-xl mx-auto relative flex items-center justify-center shadow-inner">
              {!imageSrc ? (
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                  videoConstraints={{ facingMode: 'user' }}
                />
              ) : (
                <img src={imageSrc} alt="Captured" className="w-full h-full object-cover" />
              )}
            </div>
            
            <div className="flex gap-2 justify-center">
              {!imageSrc ? (
                <Button onClick={capture} type="button" variant="secondary">
                  <Camera className="w-4 h-4 mr-2" /> Capture Photo
                </Button>
              ) : (
                <Button onClick={() => setImageSrc(null)} type="button" variant="outline">
                  Retake Photo
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <MapPin className={`w-5 h-5 ${location ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-medium text-sm">Location</p>
                <div className="text-xs text-muted-foreground">
                  {location ? (
                    <div className="flex flex-col">
                      <span className="text-xs">{locationAddress || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}</span>
                      {locationAddress && <span className="text-[10px] text-muted-foreground">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>}
                    </div>
                  ) : 'Location not acquired'}
                </div>
              </div>
            </div>
            {!location && (
              <Button size="sm" variant="outline" onClick={getLocation}>
                Get Location
              </Button>
            )}
          </div>

          <Button 
            className="w-full" 
            size="lg"
            onClick={handleMarkAttendance}
            disabled={!imageSrc || !location || loading}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {alreadyMarkedRecord ? 'Mark Outgoing Attendance' : 'Mark Incoming Attendance'}
          </Button>
        </div>
      </div>
    </main>
  );
}
