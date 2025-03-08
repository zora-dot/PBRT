import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import NativeAd from './NativeAd';
import { useTheme } from '../context/ThemeContext'; 

export default function Layout() {
  const { theme } = useTheme();
  
  return (
    <div className={`${theme} min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-b from-primary-800 to-primary-900'}`}>
      <Navbar />
      <NativeAd />

      <main className="min-h-[75vh] px-4 py-8 w-[75%] mx-auto">
        <Outlet />
      </main>
      
      <NativeAd />
      <Footer />
    </div>
  );
}