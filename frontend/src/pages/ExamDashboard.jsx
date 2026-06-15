import React from 'react';
import { useFocus } from '../hooks/useFocus';

export const ExamDashboard = () => {
  const { isFocused, blurCount } = useFocus();

  return (
    <div className="max-w-7xl mx-auto">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Advanced Algorithms Final</h2>
          <p className="text-gray-500 text-sm font-medium">Candidate ID: BTECH-CSE-2026</p>
        </div>
        
        {/* Focus Status Indicator */}
        <div className={`px-5 py-2.5 rounded-xl font-bold text-sm border flex items-center gap-2 shadow-sm ${
          isFocused 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700 animate-pulse'
        }`}>
          {isFocused ? '✅ Status: FOCUSED' : '❌ DISTRACTED - VIOLATION LOGGED'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: The Exam Area */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-8 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Question 1</h3>
            <span className="text-sm font-bold text-gray-400">10 Points</span>
          </div>
          
          <p className="text-gray-700 mb-6 text-lg leading-relaxed">
            Explain the time complexity of QuickSort in the worst-case scenario and describe how to mitigate it.
          </p>
          
          <textarea 
            className="w-full h-72 bg-gray-50 text-gray-900 p-5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all outline-none resize-none font-medium"
            placeholder="Type your answer here..."
          ></textarea>
          
          <div className="flex justify-end mt-6">
             <button className="bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md">
               Save & Next 
             </button>
          </div>
        </div>

        {/* Right Column: Proctoring Sidebar */}
        <div className="flex flex-col gap-6">
          
          {/* Mock Video Feed Container (Clean light theme) */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative overflow-hidden">
             <div className="flex justify-between items-center mb-3">
               <h3 className="text-gray-900 font-bold text-sm flex items-center gap-2">
                 Live Proctor Feed
               </h3>
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
             </div>
             
             {/* The Video Element */}
             <div className="w-full aspect-video bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center">
                <span className="text-gray-400 font-medium text-sm">🎥 Camera Active</span>
             </div>
          </div>
          
          {/* Telemetry Box */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
            <h3 className="text-gray-900 font-bold mb-4 text-sm uppercase tracking-wider">Integrity Telemetry</h3>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600 font-medium">Tab Switches (Blur)</span>
              <span className="bg-red-50 text-red-600 font-bold px-3 py-1 rounded-lg border border-red-100">{blurCount}</span>
            </div>
            
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600 font-medium">Environment</span>
              <span className="text-green-600 font-bold">Secure</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
