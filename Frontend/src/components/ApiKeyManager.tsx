import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Key, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const ApiKeyManager = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentApiKey, setCurrentApiKey] = useState('');
    const [newApiKey, setNewApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [testStatus, setTestStatus] = useState('idle'); // 'idle' | 'testing' | 'success' | 'error'
    const [testMessage, setTestMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Load current API key
    useEffect(() => {
        if (isOpen) {
            fetchCurrentApiKey();
        }
    }, [isOpen]);

    const fetchCurrentApiKey = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/settings/groq-api-key`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setCurrentApiKey(data.apiKey || '');
            }
        } catch (error) {
            console.error('Error fetching API key:', error);
        }
    };

    const testApiKey = async () => {
        if (!newApiKey.trim()) {
            setTestStatus('error');
            setTestMessage('Please enter an API key to test');
            return;
        }

        setTestStatus('testing');
        setTestMessage('Testing API key...');

        try {
            const response = await fetch(`${API_BASE_URL}/api/settings/test-groq-api-key`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ apiKey: newApiKey })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setTestStatus('success');
                setTestMessage('API key is valid and working!');
            } else {
                setTestStatus('error');
                setTestMessage(data.error || 'API key test failed');
            }
        } catch (error) {
            setTestStatus('error');
            setTestMessage('Failed to test API key. Please check your connection.');
        }
    };

    const saveApiKey = async () => {
        if (!newApiKey.trim()) {
            setTestStatus('error');
            setTestMessage('Please enter an API key');
            return;
        }

        setIsSaving(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/settings/groq-api-key`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ apiKey: newApiKey })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setCurrentApiKey(newApiKey);
                setTestStatus('success');
                setTestMessage('API key updated successfully!');
                setTimeout(() => {
                    setIsOpen(false);
                    setNewApiKey('');
                    setTestStatus('idle');
                }, 1500);
            } else {
                setTestStatus('error');
                setTestMessage(data.error || 'Failed to update API key');
            }
        } catch (error) {
            setTestStatus('error');
            setTestMessage('Failed to save API key. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const maskApiKey = (key) => {
        if (!key) return '';
        if (key.length <= 8) return '••••••••';
        return `${key.substring(0, 4)}${'•'.repeat(key.length - 8)}${key.substring(key.length - 4)}`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Key className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-primary" />
                        <span>Groq API Key Management</span>
                    </DialogTitle>
                    <DialogDescription>
                        View and update your Groq API key for AI-powered features.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Current API Key */}
                    <div className="space-y-2">
                        <Label htmlFor="current-key">Current API Key</Label>
                        <div className="flex gap-2">
                            <Input
                                id="current-key"
                                type={showKey ? 'text' : 'password'}
                                value={showKey ? currentApiKey : maskApiKey(currentApiKey)}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setShowKey(!showKey)}
                            >
                                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    {/* New API Key */}
                    <div className="space-y-2">
                        <Label htmlFor="new-key">New API Key</Label>
                        <Input
                            id="new-key"
                            type="text"
                            placeholder="Enter new Groq API key"
                            value={newApiKey}
                            onChange={(e) => {
                                setNewApiKey(e.target.value);
                                setTestStatus('idle');
                            }}
                            className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Get your API key from{' '}
                            <a
                                href="https://console.groq.com/keys"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                console.groq.com/keys
                            </a>
                        </p>
                    </div>

                    {/* Test Button */}
                    {newApiKey && (
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={testApiKey}
                            disabled={testStatus === 'testing'}
                        >
                            {testStatus === 'testing' ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Test API Key
                                </>
                            )}
                        </Button>
                    )}

                    {/* Status Message */}
                    {testStatus !== 'idle' && (
                        <Alert variant={testStatus === 'success' ? 'default' : 'destructive'}>
                            <div className="flex items-center gap-2">
                                {testStatus === 'success' ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : testStatus === 'error' ? (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                ) : (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                <AlertDescription>{testMessage}</AlertDescription>
                            </div>
                        </Alert>
                    )}
                </div>

                <DialogFooter className="sm:justify-between">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setIsOpen(false);
                            setNewApiKey('');
                            setTestStatus('idle');
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={saveApiKey}
                        disabled={!newApiKey || testStatus === 'testing' || isSaving}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save API Key'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ApiKeyManager;
