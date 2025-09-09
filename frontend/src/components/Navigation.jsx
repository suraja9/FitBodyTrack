import React from 'react';
import { NavLink } from 'react-router-dom';

const Navigation = ({ user, logout }) => {
  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/workouts', label: 'Workouts' },
    { path: '/nutrition', label: 'Nutrition' },
    { path: '/progress', label: 'Progress' },
  ];

  return (
    <nav className="bg-white shadow-md">
  <div className="container mx-auto flex justify-between items-center px-4 py-3">
    <h1 className="text-2xl font-bold text-blue-600">FitBodyTrack</h1>
    <div className="flex space-x-6">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `text-gray-700 hover:text-blue-600 ${isActive ? "font-semibold text-blue-600" : ""}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
    <div className="flex items-center space-x-4">
      <span className="text-gray-600">Welcome, {user?.name}</span>
      <button
        onClick={logout}
        className="px-3 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
      >
        Logout
      </button>
    </div>
  </div>
</nav>

  );
};

export default Navigation;