import React from 'react';
import { motion } from 'framer-motion';
import { X, ArrowUp, ArrowDown, Minus } from 'react-feather';

const DetailedChartInfo = ({ data, onClose }) => {
  const getTrendIcon = (value) => {
    if (value > 0) return <ArrowUp className="text-green-500" />;
    if (value < 0) return <ArrowDown className="text-red-500" />;
    return <Minus className="text-gray-500" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-lg p-6 max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800">{data.name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-semibold">Current Value</p>
            <p className="text-3xl font-bold text-blue-800">{data.value}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-semibold">Percentage</p>
            <p className="text-3xl font-bold text-green-800">{data.percent}%</p>
          </div>
        </div>

        {data.description && (
          <div className="mb-6">
            <p className="text-gray-600">{data.description}</p>
          </div>
        )}

        {data.trends && (
          <div>
            <h4 className="text-lg font-semibold text-gray-700 mb-3">Trends</h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(data.trends).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">{key}</p>
                    <p className="text-lg font-semibold text-gray-800">{typeof value === 'number' ? value.toFixed(2) : value}%</p>
                  </div>
                  {getTrendIcon(value)}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.relatedInfo && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">Related Information</h4>
            <ul className="list-disc list-inside text-gray-600">
              {data.relatedInfo.map((info, index) => (
                <li key={index}>{info}</li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default DetailedChartInfo;