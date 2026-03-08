import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '../api/authClient';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      await auth.signup(email, password);
      navigate('/'); // Redirect to home or dashboard after successful registration
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthLayout>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleRegister}>
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-gray-300">Email address</Label>
              <div className="mt-1">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</Label>
              <div className="mt-1">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300">Confirm Password</Label>
              <div className="mt-1">
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-700 text-white"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

            <div>
              <Button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign up
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-gray-400">
              Already have an account? <Link to="/login" className="font-medium text-blue-500 hover:text-blue-400">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Register;