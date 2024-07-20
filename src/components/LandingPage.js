import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, ChevronRight } from 'react-feather';
import { ReactComponent as OrgChartSVG } from '../assets/landing_page_image.svg';

const MotionPath = motion.path;

const AnimatedLogo = () => (
  <svg width="60" height="60" viewBox="0 0 50 50">
    <MotionPath
      d="M25,10 L40,40 L10,40 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
    />
  </svg>
);

const LandingPage = ({ hasTables, onViewTables, onUpload, onCreateTable }) => {
  const handleFirstTimeUserClick = () => {
    onUpload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white bg-opacity-90 rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden backdrop-filter backdrop-blur-lg"
      >
        <div className="p-8 bg-blue-500 bg-opacity-20 backdrop-filter backdrop-blur-sm">
          <div className="flex items-center space-x-4">
            <AnimatedLogo />
            <h1 className="text-4xl font-black text-black tracking-tight">OrgChart Visualizer</h1>
          </div>
        </div>
        <div className="p-8 grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-700"
            >
              Transform your organizational structure into an interactive, easy-to-understand visual chart.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-blue-500 bg-opacity-20 rounded-xl p-6 space-y-4"
            >
              <h2 className="text-2xl font-bold text-black">Visualize Your Organization</h2>
              <p className="text-gray-700">
                Whether you're a small startup or a large corporation, our OrgChart Visualizer helps you create clear, 
                interactive organizational charts that bring your company structure to life.
              </p>
            </motion.div>
            <AnimatePresence>
              {hasTables ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4"
                >
                  <motion.button
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onViewTables}
                    className="w-full px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-600 hover:bg-opacity-30 transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <FileText size={20} className="mr-2" />
                      <span className="font-bold">View Existing Charts</span>
                    </span>
                    <ChevronRight size={20} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onUpload}
                    className="w-full px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-600 hover:bg-opacity-30 transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <Upload size={20} className="mr-2" />
                      <span className="font-bold">Upload New Data</span>
                    </span>
                    <ChevronRight size={20} />
                  </motion.button>
                </motion.div>
              ) : (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleFirstTimeUserClick}
                  className="w-full px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-600 hover:bg-opacity-30 transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center">
                    <Upload size={20} className="mr-2" />
                    <span className="font-bold">Upload Your First File</span>
                  </span>
                  <ChevronRight size={20} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="bg-blue-500 bg-opacity-20 rounded-xl p-6 flex items-center justify-center"
          >
            <OrgChartSVG className="w-full h-auto" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default LandingPage;