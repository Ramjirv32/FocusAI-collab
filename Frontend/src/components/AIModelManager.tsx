import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Cloud, Eye, EyeOff, CheckCircle, XCircle, Loader2, Database, Cpu, Settings2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const AIModelManager = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState({
        provider: 'groq',
        groqKey: '',
        ollamaModel: 'llama3:latest',
        ollamaUrl: 'http://localhost:11434'
    });
    const [ollamaModels, setOllamaModels] = useState<any[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [status, setStatus] = useState({ type: 'idle', message: '' });

    // Load configuration
    useEffect(() => {
        if (isOpen) {
            fetchConfig();
        }
    }, [isOpen]);

    const fetchConfig = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/settings/ai-config`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setConfig(data);

                // If provider is ollama, fetch models
                if (data.provider === 'ollama') {
                    fetchOllamaModels();
                }
            }
        } catch (error) {
            console.error('Error fetching AI config:', error);
        }
    };

    const fetchOllamaModels = async () => {
        setIsLoadingModels(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/settings/ollama-models`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setOllamaModels(data.models || []);
            }
        } catch (error) {
            console.error('Error fetching Ollama models:', error);
        } finally {
            setIsLoadingModels(false);
        }
    };

    const handleSave = async () => {
        // Validate based on provider
        if (config.provider === 'groq' && !config.groqKey) {
            setStatus({ type: 'error', message: 'Please enter a Groq API key' });
            return;
        }

        if (config.provider === 'ollama' && !config.ollamaModel) {
            setStatus({ type: 'error', message: 'Please select an Ollama model' });
            return;
        }

        setIsSaving(true);
        setStatus({ type: 'loading', message: 'Saving configuration...' });

        try {
            // Only send relevant config based on provider
            const configToSave = {
                provider: config.provider,
                groqKey: config.provider === 'groq' ? config.groqKey : '',
                ollamaModel: config.provider === 'ollama' ? config.ollamaModel : '',
                ollamaUrl: config.provider === 'ollama' ? config.ollamaUrl : ''
            };

            const response = await fetch(`${API_BASE_URL}/api/settings/ai-config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(configToSave)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setStatus({
                    type: 'success',
                    message: data.message
                });

                if (data.autoRestarted) {
                    localStorage.removeItem('focusai_restart_pending');
                } else {
                    localStorage.setItem('focusai_restart_pending', 'true');
                }
            } else {
                setStatus({ type: 'error', message: data.error || 'Failed to save configuration' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Connection error. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    const maskKey = (key: string) => {
        if (!key) return '';
        if (key.length <= 8) return '••••••••';
        return `${key.substring(0, 4)}${'•'.repeat(Math.max(0, key.length - 8))}${key.substring(key.length - 4)}`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="AI Model Settings">
                    <Cloud className="h-5 w-5 text-blue-500" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5 text-primary" />
                        <span>AI Intelligence Settings</span>
                    </DialogTitle>
                    <DialogDescription>
                        Choose between Cloud (Groq) or Local (Ollama) AI engines.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={config.provider} onValueChange={(v) => {
                    setConfig({ ...config, provider: v });
                    if (v === 'ollama' && ollamaModels.length === 0) fetchOllamaModels();
                }} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="groq" className="flex items-center gap-2">
                            <Cloud className="h-4 w-4" /> Cloud (Groq)
                            {config.provider === 'groq' && <span className="ml-1 h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>}
                        </TabsTrigger>
                        <TabsTrigger value="ollama" className="flex items-center gap-2">
                            <Database className="h-4 w-4" /> Local (Ollama)
                            {config.provider === 'ollama' && <span className="ml-1 h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="groq" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="groq-key">Groq API Key</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="groq-key"
                                    type={showKey ? 'text' : 'password'}
                                    value={showKey ? config.groqKey : maskKey(config.groqKey)}
                                    onChange={(e) => setConfig({ ...config, groqKey: e.target.value })}
                                    className="font-mono text-xs"
                                    placeholder="gsk_..."
                                    disabled={config.provider !== 'groq'}
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setShowKey(!showKey)}
                                >
                                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                                Get a free key at <a href="https://console.groq.com/keys" target="_blank" className="text-blue-500 hover:underline">console.groq.com/keys</a>
                            </p>
                        </div>
                        <Alert className="py-2 bg-blue-50 border-blue-200">
                            <Cloud className="h-3 w-3" />
                            <AlertDescription className="text-[10px]">
                                <b>Cloud AI:</b> Fast, powerful models hosted by Groq. Requires internet connection.
                            </AlertDescription>
                        </Alert>
                    </TabsContent>

                    <TabsContent value="ollama" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Active Model</Label>
                            <div className="flex gap-2">
                                <Select
                                    value={config.ollamaModel}
                                    onValueChange={(v) => setConfig({ ...config, ollamaModel: v })}
                                    disabled={config.provider !== 'ollama'}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ollamaModels.length > 0 ? (
                                            ollamaModels.map((m) => (
                                                <SelectItem key={m.name} value={m.name}>
                                                    {m.name} ({Math.round(m.size / 1024 / 1024 / 1024 * 10) / 10}GB)
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="none" disabled>
                                                {isLoadingModels ? 'Detecting models...' : 'No models found'}
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={fetchOllamaModels}
                                    disabled={isLoadingModels}
                                    title="Refresh models"
                                >
                                    <Loader2 className={`h-4 w-4 ${isLoadingModels ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ollama-url">Ollama URL</Label>
                            <Input
                                id="ollama-url"
                                value={config.ollamaUrl}
                                onChange={(e) => setConfig({ ...config, ollamaUrl: e.target.value })}
                                className="font-mono text-xs"
                                placeholder="http://localhost:11434"
                                disabled={config.provider !== 'ollama'}
                            />
                        </div>
                        <Alert className="py-2 bg-slate-50 border-slate-200">
                            <Cpu className="h-3 w-3" />
                            <AlertDescription className="text-[10px]">
                                Ollama must be running locally. Recommended: <b>llama3.2</b> or <b>mistral</b>.
                            </AlertDescription>
                        </Alert>
                    </TabsContent>
                </Tabs>

                {status.type !== 'idle' && (
                    <Alert variant={status.type === 'error' ? 'destructive' : 'default'} className="mt-2">
                        <div className="flex items-center gap-2">
                            {status.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-500" /> :
                                status.type === 'error' ? <XCircle className="h-4 w-4" /> :
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                            <AlertDescription className="text-xs">{status.message}</AlertDescription>
                        </div>
                    </Alert>
                )}

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save Settings
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AIModelManager;
