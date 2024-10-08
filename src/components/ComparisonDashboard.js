import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, PieChart, ChevronUp, ChevronDown, List} from 'react-feather';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend, Label
} from 'recharts';
import { format, parseISO, isValid } from 'date-fns';
import Button from './Button';
import DetailedChartInfo from './DetailedChartInfo';

const ComparisonDashboard = ({ comparisonData, onClose, isLoading, error, onExportExcel, onExportImage }) => {
  const [view, setView] = useState('overview');
  const [expandedSection, setExpandedSection] = useState(null);
  const [selectedChartItem, setSelectedChartItem] = useState(null);

  const timeDifference = useMemo(() => {
    if (!comparisonData) return 0;
    const date1 = parseISO(comparisonData.table1.upload_date);
    const date2 = parseISO(comparisonData.table2.upload_date);
    if (!isValid(date1) || !isValid(date2)) return 0;
    const diffTime = Math.abs(date2 - date1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [comparisonData]);

  const structureChangeData = useMemo(() => {
    if (!comparisonData || !comparisonData.aggregated_report) return [];
    const { department_changes, role_changes, rank_changes, reporting_line_changes } = comparisonData.aggregated_report;
    const totalChanges = 
      (department_changes?.total || 0) + 
      (role_changes?.total || 0) + 
      (rank_changes?.total || 0) + 
      (reporting_line_changes?.total || 0);
    return [
      { name: 'Department', value: department_changes?.total || 0, percent: totalChanges ? ((department_changes?.total || 0) / totalChanges * 100).toFixed(1) : '0.0' },
      { name: 'Role', value: role_changes?.total || 0, percent: totalChanges ? ((role_changes?.total || 0) / totalChanges * 100).toFixed(1) : '0.0' },
      { name: 'Rank', value: rank_changes?.total || 0, percent: totalChanges ? ((rank_changes?.total || 0) / totalChanges * 100).toFixed(1) : '0.0' },
      { name: 'Reporting Line', value: reporting_line_changes?.total || 0, percent: totalChanges ? ((reporting_line_changes?.total || 0) / totalChanges * 100).toFixed(1) : '0.0' }
    ];
  }, [comparisonData]);

  const departmentSizeData = useMemo(() => {
    if (!comparisonData || !comparisonData.aggregated_report) return [];
    const { department_size_changes } = comparisonData.aggregated_report;
    return Object.entries(department_size_changes || {}).map(([dept, data]) => ({
      name: dept || 'Unknown',
      before: data.before || 0,
      after: data.after || 0,
      change: data.change || 0
    }));
  }, [comparisonData]);

  const ageDistributionData = useMemo(() => {
    if (!comparisonData || !comparisonData.aggregated_report) return [];
    const { age_distribution_change } = comparisonData.aggregated_report;
    return [
      { name: 'Before', ...age_distribution_change.before },
      { name: 'After', ...age_distribution_change.after }
    ];
  }, [comparisonData]);

  const rankDistributionData = useMemo(() => {
    if (!comparisonData || !comparisonData.aggregated_report) return [];
    const { rank_distribution_change } = comparisonData.aggregated_report;
    return Object.entries(rank_distribution_change).map(([rank, change]) => ({
      name: rank,
      change: change
    }));
  }, [comparisonData]);

  const roleDiversityData = useMemo(() => {
    if (!comparisonData || !comparisonData.aggregated_report) return [];
    const { role_diversity } = comparisonData.aggregated_report;
    return [
      { name: 'Before', uniqueRoles: role_diversity.before.unique_roles, ratio: role_diversity.before.role_to_employee_ratio },
      { name: 'After', uniqueRoles: role_diversity.after.unique_roles, ratio: role_diversity.after.role_to_employee_ratio }
    ];
  }, [comparisonData]);

  const orgDepthData = useMemo(() => {
    if (!comparisonData || !comparisonData.aggregated_report) return [];
    const { org_depth_analysis } = comparisonData.aggregated_report;
    return [
      { name: 'Before', depth: org_depth_analysis.before },
      { name: 'After', depth: org_depth_analysis.after }
    ];
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
    changes
  } = comparisonData;

  const handlePieClick = (entry) => {
    setSelectedChartItem({
      name: entry.name,
      value: entry.value,
      percent: entry.percent,
      description: `This represents the ${entry.name.toLowerCase()} changes in the organizational structure.`,
      details: {
        'Total Changes': entry.value,
        'Percentage of Total': `${entry.percent}%`
      }
    });
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 text-xs rounded shadow-md border border-gray-200">
          <p className="font-semibold">{data.name}</p>
          <p className="text-blue-600">{`Value: ${data.value}`}</p>
          <p className="text-gray-600">{`Percentage: ${data.percent}%`}</p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded shadow-md border border-gray-200">
          <p className="font-semibold text-sm">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className={`text-sm text-${entry.color}`}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
          <p className="text-xs text-gray-500 mt-1">Click for more details</p>
        </div>
      );
    }
    return null;
  };

  const handleBarClick = (entry) => {
    const departmentData = aggregated_report.department_size_changes[entry.name] || {};
    setSelectedChartItem({
      name: entry.name,
      value: entry.after,
      percent: entry.before ? ((entry.after - entry.before) / entry.before * 100).toFixed(1) : 'N/A',
      description: `This shows the change in size for the ${entry.name} department.`,
      details: {
        'Before': departmentData.before || 0,
        'After': departmentData.after || 0,
        'Change': departmentData.change || 0,
        'Percent Change': departmentData.percent_change ? `${departmentData.percent_change.toFixed(1)}%` : 'N/A'
      }
    });
  };

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

  const StatBox = ({ stat }) => (
    <div className={`bg-${stat.color}-50 p-3 rounded-lg relative group`}>
      <h4 className={`font-semibold text-${stat.color}-700`}>{stat.title}</h4>
      <p className={`text-2xl font-bold text-${stat.color}-800`}>{stat.value}</p>
      <div className={`absolute inset-0 bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center`}>
        <div className="text-center p-3">
          <h5 className="font-semibold text-gray-800 mb-2">{stat.title}</h5>
          <p className="text-sm text-gray-600">{stat.description}</p>
        </div>
      </div>
    </div>
  );

  const OverviewView = () => (
    <div className="space-y-4">
      <ExpandableSection 
        title="Overview"
        isExpanded={expandedSection === 'overview'}
        onToggle={() => setExpandedSection(expandedSection === 'overview' ? null : 'overview')}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {[
            { key: 'timeDifference', title: 'Time Difference', value: `${timeDifference} days`, color: 'blue', description: "The number of days between the two compared organizational snapshots." },
            { key: 'totalEmployees', title: 'Total Employees', value: `${aggregated_report.total_employees?.before || 0} → ${aggregated_report.total_employees?.after || 0}`, color: 'green', description: "The change in total number of employees." },
            { key: 'newEmployees', title: 'New Employees', value: aggregated_report.new_employees || 0, color: 'purple', description: "The number of new employees added." },
            { key: 'departedEmployees', title: 'Departed Employees', value: aggregated_report.departed_employees || 0, color: 'red', description: "The number of employees who have left." },
            { key: 'promotionRate', title: 'Promotion Rate', value: `${(aggregated_report.promotion_rate || 0).toFixed(2)}%`, color: 'indigo', description: "The percentage of employees who received a promotion." },
            { key: 'turnoverRate', title: 'Turnover Rate', value: `${(aggregated_report.turnover_rate || 0).toFixed(2)}%`, color: 'yellow', description: "The employee turnover rate between the two snapshots." }
          ].map((stat) => (
            <StatBox key={stat.key} stat={stat} />
          ))}
        </div>
      </ExpandableSection>

      <ExpandableSection 
        title="Structure Changes"
        isExpanded={expandedSection === 'structureChanges'}
        onToggle={() => setExpandedSection(expandedSection === 'structureChanges' ? null : 'structureChanges')}
      >
        <div className="h-80">
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
                label={({ name, percent }) => `${name} ${percent}%`}
                onClick={handlePieClick}
              >
                {structureChangeData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend verticalAlign="bottom" height={36} />
              <Label value="Structure Changes Distribution" position="top" />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      </ExpandableSection>

      <ExpandableSection 
      title="Department Size Changes"
      isExpanded={expandedSection === 'departmentSizes'}
      onToggle={() => setExpandedSection(expandedSection === 'departmentSizes' ? null : 'departmentSizes')}
    >
      <div className="h-96"> {/* Increased height to accommodate full labels */}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={departmentSizeData} 
            margin={{top: 20, right: 30, left: 60, bottom: 70}} // Increased left and bottom margins
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name">
              <Label value="Departments" offset={-40} position="insideBottom" /> {/* Increased offset */}
            </XAxis>
            <YAxis 
              label={{ 
                value: 'Number of Employees', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' },
                offset: -50 // Offset to move label further from axis
              }} 
            />
            <Tooltip content={<CustomBarTooltip />} />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{bottom: -10}} /> {/* Moved legend down */}
            <Bar dataKey="before" fill="#8884d8" name="Before" />
            <Bar dataKey="after" fill="#82ca9d" name="After" />
            <Bar dataKey="change" fill="#ffc658" onClick={handleBarClick} name="Change" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ExpandableSection>

    <ExpandableSection 
      title="Age Distribution"
      isExpanded={expandedSection === 'ageDistribution'}
      onToggle={() => setExpandedSection(expandedSection === 'ageDistribution' ? null : 'ageDistribution')}
    >
      <div className="h-[450px] flex flex-col items-center"> {/* Increased height */}
        <div className="w-full h-[calc(100%-60px)]"> {/* Increased space for legend */}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={ageDistributionData} 
              margin={{
                top: 20, right: 30, left: 60, bottom: 20 // Increased bottom margin
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name">
                <Label value="Time Period" offset={-10} position="insideBottom" />
              </XAxis>
              <YAxis 
                label={{ 
                  value: 'Age', 
                  angle: -90, 
                  position: 'insideLeft', 
                  offset: -40 // Adjusted offset
                }} 
              />
              <Tooltip />
              <Bar dataKey="average" fill="#8884d8" name="Average Age" />
              <Bar dataKey="median" fill="#82ca9d" name="Median Age" />
              <Bar dataKey="min" fill="#ffc658" name="Minimum Age" />
              <Bar dataKey="max" fill="#ff7300" name="Maximum Age" />
              <Label value="Age Distribution Changes" position="top" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ExpandableSection>

      <ExpandableSection 
        title="Rank Distribution Changes"
        isExpanded={expandedSection === 'rankDistribution'}
        onToggle={() => setExpandedSection(expandedSection === 'rankDistribution' ? null : 'rankDistribution')}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={rankDistributionData} 
              margin={{
                top: 20, 
                right: 30, 
                left: 60,  // Increased left margin to accommodate y-axis labels
                bottom: 10
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name">
                <Label value="Ranks" offset={-5} position="insideBottom" />
              </XAxis>
              <YAxis 
                label={{ 
                  value: 'Change in Number of Employees', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }} 
              />
              <Tooltip />
              <Bar dataKey="change" fill="#8884d8" />
              <Label value="Rank Distribution Changes" position="top" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ExpandableSection>

      <ExpandableSection 
        title="Role Diversity"
        isExpanded={expandedSection === 'roleDiversity'}
        onToggle={() => setExpandedSection(expandedSection === 'roleDiversity' ? null : 'roleDiversity')}
      >
        <div className="h-96"> {/* Increased height to accommodate more space */}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={roleDiversityData} 
              margin={{ top: 20, right: 30, left: 40, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name">
                <Label value="Time Period" offset={-20} position="insideBottom" />
              </XAxis>
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8">
                <Label value="Number of Unique Roles" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
              </YAxis>
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d">
                <Label value="Role to Employee Ratio" angle={90} position="insideRight" style={{ textAnchor: 'middle' }} />
              </YAxis>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ bottom: -20 }} />
              <Bar yAxisId="left" dataKey="uniqueRoles" fill="#8884d8" name="Unique Roles" />
              <Bar yAxisId="right" dataKey="ratio" fill="#82ca9d" name="Role to Employee Ratio" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ExpandableSection>

      <ExpandableSection 
        title="Organizational Depth"
        isExpanded={expandedSection === 'orgDepth'}
        onToggle={() => setExpandedSection(expandedSection === 'orgDepth' ? null : 'orgDepth')}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={orgDepthData} 
              margin={{ top: 20, right: 30, left: 40, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name">
                <Label value="Time Period" offset={-10} position="insideBottom" />
              </XAxis>
              <YAxis 
                domain={[-2, 'auto']} // This sets the Y-axis to start from -2
                label={{ 
                  value: 'Organizational Depth', 
                  angle: -90, 
                  position: 'insideLeft', 
                  style: { textAnchor: 'middle' } 
                }} 
              />
              <Tooltip />
              <Bar dataKey="depth" fill="#8884d8" />
              <Label value="Organizational Depth Changes" position="top" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ExpandableSection>
    </div>
  );

  const DetailedView = () => (
    <div className="space-y-4">
      <ExpandableSection 
        title="Detailed Changes"
        isExpanded={expandedSection === 'detailedChanges'}
        onToggle={() => setExpandedSection(expandedSection === 'detailedChanges' ? null : 'detailedChanges')}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(changes?.changed || []).map((change, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">Changed</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{change.name}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {Object.entries(change.changes || {}).map(([field, [oldValue, newValue]]) => (
                      <p key={field}>{`${field}: ${oldValue || 'N/A'} → ${newValue || 'N/A'}`}</p>
                    ))}
                  </td>
                </tr>
              ))}
              {(changes?.added || []).map((change, index) => (
                <tr key={`added-${index}`} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-3 py-2 whitespace-nowrap font-medium text-green-600">Added</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{change.name}</td>
                  <td className="px-3 py-2 text-gray-500">
                    <p>{`Role: ${change.role || 'N/A'}`}</p>
                    <p>{`Department: ${change.department || 'N/A'}`}</p>
                    <p>{`Rank: ${change.rank || 'N/A'}`}</p>
                  </td>
                </tr>
              ))}
              {(changes?.removed || []).map((change, index) => (
                <tr key={`removed-${index}`} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-3 py-2 whitespace-nowrap font-medium text-red-600">Removed</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{change.name}</td>
                  <td className="px-3 py-2 text-gray-500">
                    <p>{`Role: ${change.role || 'N/A'}`}</p>
                    <p>{`Department: ${change.department || 'N/A'}`}</p>
                    <p>{`Rank: ${change.rank || 'N/A'}`}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ExpandableSection>

      <ExpandableSection 
        title="Role Changes"
        isExpanded={expandedSection === 'roleChanges'}
        onToggle={() => setExpandedSection(expandedSection === 'roleChanges' ? null : 'roleChanges')}
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
              {Object.entries(aggregated_report.role_changes?.details || {}).map(([personId, change], index) => (
                <tr key={personId} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">{change.name || 'N/A'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{change.old || 'N/A'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{change.new || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ExpandableSection>
    </div>
  );

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
            Download Report
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
          transition={{duration: 0.3, delay: 0.2 }}
          className="flex space-x-2 mb-4"
        >
          <Button 
            onClick={() => setView('overview')} 
            icon={PieChart}
            variant={view === 'overview' ? 'primary' : 'secondary'}
          >
            Overview
          </Button>
          <Button 
            onClick={() => setView('detailed')} 
            icon={List}
            variant={view === 'detailed' ? 'primary' : 'secondary'}
          >
            Detailed View
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
            {view === 'overview' ? <OverviewView /> : <DetailedView />}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedChartItem && (
          <DetailedChartInfo 
            data={selectedChartItem} 
            onClose={() => setSelectedChartItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ComparisonDashboard;