// src/components/LandingPage.js
import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, Users, Briefcase, ChevronRight } from 'react-feather';
import { ReactComponent as OrgChartSVG } from '../assets/landing_page_image.svg';

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow-md border border-blue-200">
    <Icon className="w-12 h-12 text-blue-500 mb-4" />
    <h3 className="text-xl font-semibold mb-2 text-blue-700">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

const LandingPage = ({ hasTables, onViewTables, onUpload, onCreateTable }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold text-blue-600 mb-4">OrgChart Visualizer</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transform your organizational structure into an interactive, easy-to-understand visual chart.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white p-4 rounded-lg shadow-lg"
          >
            <OrgChartSVG className="w-full h-auto" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col justify-center"
          >
            <h2 className="text-3xl font-semibold text-blue-600 mb-4">Visualize Your Organization</h2>
            <p className="text-gray-600 mb-6">
              Whether you're a small startup or a large corporation, our OrgChart Visualizer helps you create clear, 
              interactive organizational charts that bring your company structure to life.
            </p>
            {hasTables ? (
              <div className="space-y-4">
                <button
                  onClick={onViewTables}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 flex items-center justify-center"
                >
                  <FileText className="mr-2" /> View Existing Charts
                </button>
                <button
                  onClick={onUpload}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 flex items-center justify-center"
                >
                  <Upload className="mr-2" /> Upload New Data
                </button>
              </div>
            ) : (
              <button
                onClick={onCreateTable}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 flex items-center justify-center"
              >
                <ChevronRight className="mr-2" /> Create Your First Chart
              </button>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-3xl font-semibold text-center text-blue-600 mb-8">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Users}
              title="Interactive Visualization"
              description="Create dynamic, clickable org charts that bring your company structure to life."
            />
            <FeatureCard 
              icon={Upload}
              title="Easy Data Import"
              description="Quickly import your organizational data from CSV files or other common formats."
            />
            <FeatureCard 
              icon={Briefcase}
              title="Role-based Insights"
              description="Gain valuable insights into roles, departments, and reporting structures at a glance."
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage;