import React, { useState } from 'react';

interface LoginPageProps {
    onLogin: (user: { email: string; }) => void;
    onSignUp: (user: { email: string; password?: string }) => void;
}

export default function LoginPage({ onLogin, onSignUp }: LoginPageProps) {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please fill in all fields.');
            return;
        }

        const users: {email: string, password?: string}[] = JSON.parse(localStorage.getItem('mr-pdf-users') || '[]');

        if (isLoginView) {
            // Sign In Logic
            const existingUser = users.find(user => user.email === email);
            if (existingUser) {
                if (existingUser.password === password) {
                    onLogin({ email });
                } else {
                    setError('Invalid password.');
                }
            } else {
                setError('No account found with this email. Please sign up.');
            }
        } else {
            // Sign Up Logic
            const isEmailTaken = users.some(user => user.email === email);
            if (isEmailTaken) {
                setError('An account with this email already exists.');
                return;
            }
            onSignUp({ email, password });
        }
    };

    return (
        <div className="w-full max-w-md bg-base-100 dark:bg-dark-base-100 rounded-2xl shadow-2xl p-8">
            <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2">
                Welcome to Mr.PDF
            </h1>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
                {isLoginView ? 'Sign in to continue' : 'Create an account to get started'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email Address
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 rounded-lg bg-base-200 dark:bg-dark-base-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        placeholder="you@example.com"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="password"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 rounded-lg bg-base-200 dark:bg-dark-base-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        placeholder="••••••••"
                        required
                    />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                    type="submit"
                    className="w-full py-3 px-4 bg-brand-primary text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary">
                    {isLoginView ? 'Sign In' : 'Create Account'}
                </button>
            </form>

            <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
                {isLoginView ? "Don't have an account?" : "Already have an account?"}{' '}
                <button
                    type="button"
                    onClick={() => {
                        setIsLoginView(!isLoginView);
                        setError('');
                    }}
                    className="font-semibold text-brand-primary hover:underline focus:outline-none"
                >
                    {isLoginView ? 'Sign Up' : 'Sign In'}
                </button>
            </p>
        </div>
    );
}