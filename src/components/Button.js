import React from 'react';
import { motion } from 'framer-motion';

const Button = ({ onClick, children, icon: Icon, variant = 'primary' }) => {
  const baseClasses = 'px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50 flex items-center justify-center backdrop-filter backdrop-blur-sm text-black';
  const variantClasses = {
    primary: 'bg-blue-500 bg-opacity-20 hover:bg-opacity-30 focus:ring-blue-500',
    secondary: 'bg-gray-500 bg-opacity-20 hover:bg-opacity-30 focus:ring-gray-400',
    danger: 'bg-red-500 bg-opacity-20 hover:bg-opacity-30 focus:ring-red-500',
    active: 'bg-blue-500 text-blue-50'
  };

  return (
    <motion.button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]}`}
      whileHover={{ 
        scale: 1.05, 
        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)',
        textShadow: '0 0 5px rgba(255, 255, 255, 0.5)'
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {Icon && (
        <motion.span
          className="mr-2"
          initial={{ rotate: 0 }}
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Icon size={18} />
        </motion.span>
      )}
      {children}
    </motion.button>
  );
};

export default Button;