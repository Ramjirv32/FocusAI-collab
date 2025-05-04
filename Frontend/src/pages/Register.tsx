import React from 'react';
import RegisterForm from '@/components/Auth/RegisterForm';

const Register = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">FocuAI</h1>
          <p className="text-muted-foreground">Your AI-powered productivity tracker</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
};

export default Register;