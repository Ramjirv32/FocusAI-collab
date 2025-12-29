const { Groq } = require('groq-sdk');


class AIProvider {
    constructor() {
        this.provider = process.env.AI_PROVIDER || 'groq';
        this.groqKey = process.env.GROQ_API_KEY;
        this.ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';
        this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

        this.initGroq();
    }

    initGroq() {
        
        if (this.provider === 'groq' && this.groqKey) {
            this.groq = new Groq({
                apiKey: this.groqKey
            });
        } else {
            this.groq = null;
        }
    }

    refreshConfig() {
        this.provider = process.env.AI_PROVIDER || 'groq';
        this.groqKey = process.env.GROQ_API_KEY;
        this.ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';
        this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

        
        this.initGroq();
    }

    async createChatCompletion({ messages, temperature = 0.7, max_tokens = 1024 }) {
        this.refreshConfig(); 

        if (this.provider === 'groq') {
            if (!this.groq) {
                
                this.initGroq();
                if (!this.groq) throw new Error('Groq selected but API key not configured');
            }

            console.log('☁️ Using Cloud AI (Groq)');
            const completion = await this.groq.chat.completions.create({
                messages,
                model: 'llama-3.3-70b-versatile',
                temperature,
                max_tokens
            });

            return completion.choices[0].message.content;
        } else if (this.provider === 'ollama') {
            
            console.log('🏠 Using Local AI (Ollama)');
            try {
                const response = await fetch(`${this.ollamaUrl}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: this.ollamaModel,
                        messages: messages.map(m => ({
                            role: m.role,
                            content: m.content
                        })),
                        options: {
                            temperature: temperature,
                            num_predict: max_tokens
                        },
                        stream: false
                    })
                });

                if (!response.ok) {
                    const err = await response.text();
                    throw new Error(`Ollama error: ${err}`);
                }

                const data = await response.json();
                return data.message.content;
            } catch (error) {
                console.error('Ollama completion error:', error);
                throw new Error(`Failed to connect to local Ollama at ${this.ollamaUrl}. Make sure it is running and you have pulled the model '${this.ollamaModel}'.`);
            }
        }
    }

    async getAvailableOllamaModels() {
        try {
            const response = await fetch(`${this.ollamaUrl}/api/tags`);
            if (!response.ok) return [];
            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('Error fetching Ollama models:', error);
            return [];
        }
    }

    setProvider(provider) {
        this.provider = provider;
        process.env.AI_PROVIDER = provider;
    }

    setOllamaModel(model) {
        this.ollamaModel = model;
        process.env.OLLAMA_MODEL = model;
    }

    formatSummaryForPrompt(summary) {
        if (!summary) return "No productivity data available for this user yet.";

        const productiveApps = summary.productiveContent ?
            (typeof summary.productiveContent === 'object' ? Object.entries(summary.productiveContent) : [])
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([n, d]) => `${n} (${Math.round(d / 60)}m)`)
                .join(', ') : 'None';

        const distractionApps = (summary.nonProductiveContent || summary.distractionApps) ?
            (typeof (summary.nonProductiveContent || summary.distractionApps) === 'object' ?
                Object.entries(summary.nonProductiveContent || summary.distractionApps) : []
            )
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([n, d]) => `${n} (${Math.round(d / 60)}m)`)
                .join(', ') : 'None';

        return `
PROMPT CONTEXT - USER PRODUCTIVITY SUMMARY:
- Focus Score: ${summary.focusScore || 0}%
- Total Active Time: ${((summary.overallTotalUsage || 0) / 3600).toFixed(1)} hours
- Productive Time: ${((summary.totalProductiveTime || 0) / 3600).toFixed(1)} hours
- Distraction Time: ${((summary.totalNonProductiveTime || 0) / 3600).toFixed(1)} hours
- Top Productive Tools: ${productiveApps}
- Top Distractions: ${distractionApps}
- Top Website: ${summary.mostVisitedTab || 'None'}
- Streak: ${summary.streak || 0} days
`;
    }
}

const aiProvider = new AIProvider();
module.exports = aiProvider;
