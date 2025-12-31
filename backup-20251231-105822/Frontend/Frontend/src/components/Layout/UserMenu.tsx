import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/context/AuthContext';
import { User, LogOut, Camera } from 'lucide-react';
import axios from 'axios';
const UserMenu = () => {
  const { user, logout, token } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState({
    displayName: '',
    profilePhoto: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const getAuthHeader = () => {
    const authToken = token || localStorage.getItem('token');
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  };
  const fetchUserProfile = React.useCallback(async () => {
    try {
      const authToken = token || localStorage.getItem('token');
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const response = await axios.get('http://localhost:5001/api/profile', { headers });
      if (response.data) {
        setUserProfile({
          displayName: response.data.displayName || '',
          profilePhoto: response.data.profilePhoto || ''
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }, [token]);
  useEffect(() => {
    if (isProfileOpen) {
      fetchUserProfile();
    }
  }, [isProfileOpen, fetchUserProfile]);
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);
  if (!user) return null;
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError('Profile photo must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          setUserProfile(prev => ({
            ...prev,
            profilePhoto: result
          }));
          setError('');
        }
      };
      reader.onerror = () => {
        setError('Failed to read image file.');
      };
      reader.readAsDataURL(file);
    }
  };
  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      const headers = getAuthHeader();
      if (!headers.Authorization) {
        setError('You must be logged in to update your profile.');
        return;
      }
      if (!userProfile.displayName || userProfile.displayName.trim() === '') {
        setError('Display name is required.');
        setIsLoading(false);
        return;
      }
      const profileData = {
        displayName: userProfile.displayName.trim(),
        profilePhoto: userProfile.profilePhoto || ''
      };
      const response = await axios.put('http://localhost:5001/api/profile', profileData, { headers });
      if (response.data) {
        setUserProfile({
          displayName: response.data.displayName || '',
          profilePhoto: response.data.profilePhoto || ''
        });
      }
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        setSuccess('');
        setIsProfileOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.response?.data?.error || 'Failed to save profile. Ensure the server is running.');
    } finally {
      setIsLoading(false);
    }
  };
  const initials = user.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user.email.charAt(0).toUpperCase();
  const displayName = userProfile.displayName || user.name || user.email.split('@')[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full border">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={userProfile.profilePhoto}
              alt={displayName}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel>
          <div className="flex items-center space-x-3 py-1">
            <Avatar className="h-10 w-10 border">
              <AvatarImage
                src={userProfile.profilePhoto}
                alt={displayName}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-0.5 min-w-0">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Edit Profile
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Personal Profile</DialogTitle>
              <DialogDescription>
                Customize how you appear in your FocusAI dashboard.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {error && (
                <div className="p-3 text-xs text-red-600 bg-red-50 rounded-md border border-red-100 font-medium">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 text-xs text-green-600 bg-green-50 rounded-md border border-green-100 font-medium">
                  {success}
                </div>
              )}
              {}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-2 border-primary/20 transition-all group-hover:border-primary/50">
                    <AvatarImage
                      src={userProfile.profilePhoto}
                      alt={displayName}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl bg-primary/5 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="photo-upload"
                    className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform"
                  >
                    <Camera className="h-4 w-4" />
                  </label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>
              {}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-sm font-semibold">Username / Nickname</Label>
                  <Input
                    id="displayName"
                    value={userProfile.displayName}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Enter display name"
                    className="rounded-lg shadow-sm"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground bg-muted/50 p-2 rounded border italic">
                  Avatar data is stored in your local browser storage for speed.
                </p>
              </div>
              {}
              <div className="flex justify-end space-x-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsProfileOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  className="px-6"
                >
                  {isLoading ? 'Saving...' : 'Update Profile'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()} className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
export default UserMenu;
