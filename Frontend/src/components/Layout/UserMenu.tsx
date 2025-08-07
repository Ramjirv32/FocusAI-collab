import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/context/AuthContext';
import { Settings, User, LogOut, Camera } from 'lucide-react';
import axios from 'axios';

const UserMenu = () => {
  const { user, logout, token } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState({
    displayName: '',
    bio: '',
    location: '',
    website: '',
    profilePhoto: '',
    twitter: '',
    linkedin: '',
    github: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Get auth headers
  const getAuthHeader = () => {
    const authToken = token || localStorage.getItem('token');
    console.log('Token from context:', token ? 'Token exists' : 'No token from context');
    console.log('Token from localStorage:', localStorage.getItem('token') ? 'Token exists' : 'No token from localStorage');
    console.log('Using token:', authToken ? 'Token exists' : 'No token found');
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  };

  // Fetch user profile data
  const fetchUserProfile = React.useCallback(async () => {
    try {
      const authToken = token || localStorage.getItem('token');
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      console.log('Fetching profile with headers:', headers);
      const response = await axios.get('http://localhost:5001/api/profile', { headers });
      if (response.data) {
        // Map backend data to frontend state
        const profile = response.data;
        setUserProfile({
          displayName: profile.displayName || '',
          bio: profile.bio || '',
          location: profile.location || '',
          website: profile.socialLinks?.website || '',
          profilePhoto: profile.profilePhoto || '',
          twitter: profile.socialLinks?.twitter || '',
          linkedin: profile.socialLinks?.linkedin || '',
          github: profile.socialLinks?.github || ''
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }, [token]);

  // Load profile when dialog opens
  useEffect(() => {
    if (isProfileOpen) {
      fetchUserProfile();
    }
  }, [isProfileOpen, fetchUserProfile]);

  // Load profile data on component mount to ensure avatar is updated
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  if (!user) return null;

  // Handle profile photo upload
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Profile photo must be less than 5MB');
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
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save profile data
  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      const headers = getAuthHeader();
      
      // Validate required data
      if (!headers.Authorization) {
        setError('You must be logged in to update your profile.');
        return;
      }
      
      // Map frontend state to backend format
      const profileData = {
        displayName: userProfile.displayName || '',
        bio: userProfile.bio || '',
        location: userProfile.location || '',
        profilePhoto: userProfile.profilePhoto || '',
        socialLinks: {
          website: userProfile.website || '',
          twitter: userProfile.twitter || '',
          linkedin: userProfile.linkedin || '',
          github: userProfile.github || ''
        }
      };
      
      console.log('Sending profile data:', profileData);
      console.log('Headers:', headers);
      
      const response = await axios.put('http://localhost:5001/api/profile', profileData, { headers });
      
      console.log('Profile update response:', response.data);
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        setSuccess('');
        setIsProfileOpen(false);
      }, 2000);
      
    } catch (err) {
      console.error('Error saving profile:', err);
      
      // Provide more specific error messages
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        setError('Cannot connect to server. Please check if the backend is running.');
      } else {
        setError(`Failed to save profile: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email.charAt(0).toUpperCase();

  const displayName = userProfile.displayName || user.name || user.email.split('@')[0];
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={userProfile.profilePhoto} 
              alt={displayName}
              className="object-cover"
            />
            <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={userProfile.profilePhoto} 
                alt={displayName}
                className="object-cover"
              />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <User className="mr-2 h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Profile Settings</DialogTitle>
              <DialogDescription>
                Update your profile information and customize your public profile
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
                  {success}
                </div>
              )}

              {/* Profile Photo Section */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={userProfile.profilePhoto} 
                      alt={displayName}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-xl bg-blue-100 text-blue-600">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <label 
                    htmlFor="photo-upload" 
                    className="absolute bottom-0 right-0 p-1 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
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
                <div className="text-center">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Click the camera icon to upload a new profile photo (max 5MB)
                </p>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={userProfile.displayName}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Your display name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={userProfile.location}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Your location"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={userProfile.bio}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={userProfile.website}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://your-website.com"
                />
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Social Links</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter</Label>
                    <Input
                      id="twitter"
                      value={userProfile.twitter}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, twitter: e.target.value }))}
                      placeholder="@yourusername"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      value={userProfile.linkedin}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, linkedin: e.target.value }))}
                      placeholder="linkedin.com/in/yourusername"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="github">GitHub</Label>
                    <Input
                      id="github"
                      value={userProfile.github}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, github: e.target.value }))}
                      placeholder="github.com/yourusername"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsProfileOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;