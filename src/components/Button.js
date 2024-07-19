import React from 'react';
import { motion } from 'framer-motion';

const Button = ({ onClick, children, icon: Icon, variant = 'primary' }) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50 flex items-center justify-center shadow-md';
  const variantClasses = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-400',
    danger: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500',
  };

  return (
    <motion.button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]}`}
      whileHover={{ y: -2, boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {Icon && <Icon size={18} className="mr-2" />}
      {children}
    </motion.button>
  );
};

export default Button;
