import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { submitSupportFeedback } from '../../services/api';

const SupportFeedbackPage = () => {
    const { address } = useWallet();
    const [email, setEmail] = useState('');
    const [type, setType] = useState<'complaint' | 'feedback'>('complaint');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        const trimmedEmail = email.trim();
        const trimmedMessage = message.trim();

        if (!trimmedEmail) {
            toast.error('Enter your email address.');
            return;
        }

        if (!trimmedMessage) {
            toast.error('Enter your complaint or feedback.');
            return;
        }

        try {
            setSubmitting(true);
            const result = await submitSupportFeedback({
                email: trimmedEmail,
                type,
                message: trimmedMessage,
                ...(address ? { walletAddress: address } : {})
            });
            toast.success(result.message || 'Your message was sent successfully.');
            setMessage('');
        } catch (error: any) {
            console.error('Failed to submit support feedback', error);
            toast.error(error?.message || 'Failed to send your message.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="page-container relative min-h-screen">
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-amber-400/10 rounded-full blur-[100px] animate-float-delayed" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-orange-500/5 rounded-full blur-[120px] animate-pulse-slow" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 mx-auto mt-10 w-full max-w-2xl"
            >
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Register Complaint / Feedback</h1>
                        <p className="mt-2 text-sm leading-6 text-white/60">
                            Send your issue or product feedback to NullPay support and receive a confirmation email.
                        </p>
                    </div>
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Link>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-[#0A0A0A]/90 p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] backdrop-blur-[32px]">
                    <div className="space-y-5">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-white">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="you@example.com"
                                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-orange-400/40"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-white">Type</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setType('complaint')}
                                    className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${type === 'complaint'
                                        ? 'border-orange-400/40 bg-orange-500/15 text-orange-100'
                                        : 'border-white/10 bg-black/20 text-white/60 hover:text-white'
                                        }`}
                                >
                                    Complaint
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('feedback')}
                                    className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${type === 'feedback'
                                        ? 'border-orange-400/40 bg-orange-500/15 text-orange-100'
                                        : 'border-white/10 bg-black/20 text-white/60 hover:text-white'
                                        }`}
                                >
                                    Feedback
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-white">Message</label>
                            <textarea
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                placeholder="Tell us what happened or what you would like improved."
                                rows={8}
                                maxLength={3000}
                                className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-orange-400/40"
                            />
                            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-white/40">
                                <span>{address ? `Wallet attached: ${address}` : 'No wallet address will be attached.'}</span>
                                <span>{message.length}/3000</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="inline-flex items-center justify-center rounded-2xl border border-orange-400/20 bg-gradient-to-r from-orange-400 to-amber-300 px-5 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                        >
                            {submitting ? 'Sending...' : 'Submit'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SupportFeedbackPage;
