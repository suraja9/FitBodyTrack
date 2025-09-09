import React from 'react';

const Navbar = ({ user, logout }) => {
  return (
    <nav className="bg-blue-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-white text-xl font-bold">FitBodyTrack</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-white">Welcome, {user?.name}</span>
            <button
              onClick={logout}
              className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;