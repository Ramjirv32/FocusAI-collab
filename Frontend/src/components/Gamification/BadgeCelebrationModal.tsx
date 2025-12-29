import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Flame, Trophy, Star, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BadgeCelebrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    badge: {
        name: string;
        days: number;
        rarity: string;
        focusScore: number;
        points: number;
    } | null;
}

const BadgeCelebrationModal: React.FC<BadgeCelebrationModalProps> = ({ isOpen, onClose, badge }) => {
    React.useEffect(() => {
        if (isOpen && badge) {
            
            const duration = 3000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

            function randomInRange(min: number, max: number) {
                return Math.random() * (max - min) + min;
            }

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);

                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                });
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [isOpen, badge]);

    if (!badge) return null;

    const getRarityColor = (rarity: string) => {
        const colors = {
            bronze: 'from-amber-400 to-orange-600',
            silver: 'from-gray-300 to-gray-500',
            gold: 'from-yellow-300 to-yellow-600',
            platinum: 'from-cyan-300 to-cyan-600',
            diamond: 'from-indigo-400 to-purple-600',
            legendary: 'from-rose-400 to-pink-600'
        };
        return colors[rarity as keyof typeof colors] || colors.bronze;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-yellow-400/50 text-white overflow-hidden">
                {}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                </div>

                {}
                <div className="relative z-10 flex flex-col items-center justify-center py-8 space-y-6">
                    {}
                    <div className="relative">
                        <div className={`absolute inset-0 bg-gradient-to-r ${getRarityColor(badge.rarity)} rounded-full blur-xl opacity-75 animate-ping`}></div>
                        <div className={`relative w-32 h-32 rounded-full bg-gradient-to-r ${getRarityColor(badge.rarity)} flex items-center justify-center shadow-2xl animate-bounce`}>
                            <Flame className="w-16 h-16 text-white fill-current drop-shadow-lg" />
                        </div>
                        <div className="absolute -top-2 -right-2">
                            <Sparkles className="w-8 h-8 text-yellow-300 animate-spin" />
                        </div>
                    </div>

                    {}
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-200 to-orange-300 bg-clip-text text-transparent animate-pulse">
                            🎉 Badge Unlocked! 🎉
                        </h2>
                        <h3 className="text-2xl font-semibold text-white">
                            {badge.name}
                        </h3>
                        <p className="text-gray-300">
                            {badge.days} consecutive days of productivity
                        </p>
                    </div>

                    {}
                    <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center border border-white/20">
                            <div className="text-sm text-gray-300">Focus Score</div>
                            <div className="text-3xl font-bold text-emerald-400">{badge.focusScore}%</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center border border-white/20">
                            <div className="text-sm text-gray-300">Points Earned</div>
                            <div className="text-3xl font-bold text-yellow-400">+{badge.points}</div>
                        </div>
                    </div>

                    {}
                    <div className={`px-6 py-2 rounded-full bg-gradient-to-r ${getRarityColor(badge.rarity)} font-bold text-white shadow-lg uppercase tracking-wider text-sm`}>
                        {badge.rarity} Badge
                    </div>

                    {}
                    <button
                        onClick={onClose}
                        className="mt-4 px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg font-semibold text-white shadow-lg transform transition hover:scale-105"
                    >
                        Awesome! 🚀
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default BadgeCelebrationModal;
