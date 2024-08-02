import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, PieChart, List, ChevronDown, ChevronUp } from 'react-feather';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import Button from './Button';

const ComparisonDashboard = ({ comparisonData, onClose, isLoading, error }) => {
  const [view, setView] = useState('macro');
  const [expandedSection, setExpandedSection] = useState(null);


  const timeDifference = useMemo(() => {
    if (!comparisonData) return 0;
    const date1 = parseISO(comparisonData.table1.upload_date);
    const date2 = parseISO(comparisonData.table2.upload_date);
    const diffTime = Math.abs(date2 - date1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [comparisonData]);

  const structureChangeData = useMemo(() => {
    if (!comparisonData) return [];
    const { aggregated_report } = comparisonData;
    return Object.entries(aggregated_report.structure_changes).map(([name, value]) => ({ name, value }));
  }, [comparisonData]);

  const areaChangeData = useMemo(() => {
    if (!comparisonData) return [];
    return comparisonData.aggregated_report.most_affected_areas.map(([area, count]) => ({
      name: area,
      value: count
    }));
  }, [comparisonData]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xl font-semibold text-gray-600"
        >
          Loading comparison data...
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={onClose} icon={ArrowLeft}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!comparisonData) {
    return null;
  }

  const {
    table1,
    table2,
    aggregated_report,
    structure_changes,
    role_changes
  } = comparisonData;

  const ExpandableSection = ({ title, children, isExpanded, onToggle }) => (
    <motion.div
      layout
      className="bg-white rounded-lg shadow-sm overflow-hidden mb-4"
    >
      <motion.div 
        className="flex justify-between items-center px-4 py-3 cursor-pointer bg-gray-50"
        onClick={onToggle}
      >
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </motion.div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="content"
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: "auto" },
              collapsed: { opacity: 0, height: 0 }
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <div className="p-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 text-xs rounded shadow-md border border-gray-200">
          <p className="font-semibold">{label}</p>
          <p className="text-blue-600">{`Value: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  const MacroView = () => (
    <div className="space-y-4">
      <ExpandableSection 
        title="Overview"
        isExpanded={expandedSection === 'overview'}
        onToggle={() => setExpandedSection(expandedSection === 'overview' ? null : 'overview')}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-semibold text-blue-700">Time Difference</h4>
            <p className="text-2xl font-bold text-blue-800">{timeDifference} days</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <h4 className="font-semibold text-green-700">Total Changes</h4>
            <p className="text-2xl font-bold text-green-800">{aggregated_report.total_changes}</p>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <h4 className="font-semibold text-yellow-700">Change Percentage</h4>
            <p className="text-2xl font-bold text-yellow-800">{aggregated_report.change_percentage.toFixed(2)}%</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <h4 className="font-semibold text-purple-700">Growth Rate</h4>
            <p className="text-2xl font-bold text-purple-800">{aggregated_report.growth_rate.toFixed(2)}%</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <h4 className="font-semibold text-red-700">Role Changes</h4>
            <p className="text-2xl font-bold text-red-800">{aggregated_report.role_changes}</p>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg">
            <h4 className="font-semibold text-indigo-700">Structure Changes</h4>
            <p className="text-2xl font-bold text-indigo-800">
              {Object.values(aggregated_report.structure_changes).reduce((a, b) => a + b, 0)}
            </p>
          </div>
        </div>
      </ExpandableSection>

      <ExpandableSection 
        title="Structure Changes"
        isExpanded={expandedSection === 'structureChanges'}
        onToggle={() => setExpandedSection(expandedSection === 'structureChanges' ? null : 'structureChanges')}
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart>
              <Pie
                data={structureChangeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {structureChangeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      </ExpandableSection>

      <ExpandableSection 
        title="Most Affected Areas"
        isExpanded={expandedSection === 'areas'}
        onToggle={() => setExpandedSection(expandedSection === 'areas' ? null : 'areas')}
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={areaChangeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#8884d8">
                {areaChangeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ExpandableSection>
    </div>
  );

  const MicroView = () => (
    <div className="space-y-4">
      <ExpandableSection 
        title="Structure Changes"
        isExpanded={expandedSection === 'detailedStructure'}
        onToggle={() => setExpandedSection(expandedSection === 'detailedStructure' ? null : 'detailedStructure')}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Path</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {structure_changes.map((change, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">{change.type}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{change.path}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                    {change.type === 'changed' ? (
                      <>
                        <p>Old: {change.old.name} ({change.old.role})</p>
                        <p>New: {change.new.name} ({change.new.role})</p>
                      </>
                    ) : (
                      <p>{change.name} ({change.role})</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ExpandableSection>

      <ExpandableSection 
        title="Role Changes"
        isExpanded={expandedSection === 'detailedRoles'}
        onToggle={() => setExpandedSection(expandedSection === 'detailedRoles' ? null : 'detailedRoles')}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Old Role</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">New Role</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {role_changes.map((change, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">{change.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{change.old_role || 'N/A'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{change.new_role || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ExpandableSection>
    </div>
  );

  const downloadReport = () => {
    const reportData = JSON.stringify(comparisonData, null, 2);
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_report_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-gray-50 overflow-hidden flex flex-col">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center p-4 bg-white shadow-sm"
      >
        <h1 className="text-xl font-semibold text-gray-800">Comparison Dashboard</h1>
        <div className="flex space-x-2">
          <Button onClick={onClose} icon={ArrowLeft}>
            Back
          </Button>
          <Button onClick={downloadReport} icon={Download}>
            Download
          </Button>
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm p-4 mb-4"
        >
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Comparison Overview</h2>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-gray-600">
            <p>Table 1: {table1.name}</p>
            <p>Table 2: {table2.name}</p>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-gray-500 mt-1">
            <p>Uploaded: {format(parseISO(table1.upload_date), 'MMM d, yyyy')}</p>
            <p>Uploaded: {format(parseISO(table2.upload_date), 'MMM d, yyyy')}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex space-x-2 mb-4"
        >
          <Button 
            onClick={() => setView('macro')} 
            icon={PieChart}
            variant={view === 'macro' ? 'primary' : 'secondary'}
          >
            Macro View
          </Button>
          <Button 
            onClick={() => setView('micro')} 
            icon={List}
            variant={view === 'micro' ? 'primary' : 'secondary'}
          >
            Micro View
          </Button>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {view === 'macro' ? <MacroView /> : <MicroView />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ComparisonDashboard;