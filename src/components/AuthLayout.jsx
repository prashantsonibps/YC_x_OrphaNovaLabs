import React from 'react';
import logo from '../assets/logo.svg';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <img
            className="mx-auto h-24 w-auto"
            src={logo}
            alt="OrphaNova Labs Logo"
          />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Welcome to OrphaNova Labs
          </h2>
        </div>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;