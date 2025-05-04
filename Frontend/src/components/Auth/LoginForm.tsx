import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/context/AuthContext'; // Import useAuth

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login } = useAuth(); // Use the login function from context
  
  const fetchUserInfoAndSendToExtension = async () => {
    try {
  
      const response = await axios.get('http://localhost:5000/api/user'); // adjust endpoint as needed
      const user = response.data.user;
  
      // Send login data to the Chrome extension
      if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage('jjjokkpobnafkfomfojdnhgndanjihpl', {
          action: 'userInfo',
          userId: user.id,
          email: user.email,
          token: user.token,
        });
      }
  
      console.log('Sent user info to extension:', { id: user.id, email: user.email , token: user.token });
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Use the context login function instead of handling it here
      await login(email, password);
      
      // The navigation is now handled in the context
      fetchUserInfoAndSendToExtension();
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.response?.data?.error || "Failed to login. Please check your credentials.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Login to FocuAI</CardTitle>
        <CardDescription>
          Enter your credentials to access your dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
                Logging in...
              </>
            ) : (
              "Log in"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t p-4">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <a 
            onClick={() => navigate("/register")}
            className="underline cursor-pointer text-primary"
          >
            Sign up
          </a>
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;