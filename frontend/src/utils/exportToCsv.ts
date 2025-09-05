export const exportToCsv = (columns: any[], rows: any[], filename: string) => {
  // Get visible columns and their headers
  const headers = columns
    .filter(col => !col.hide)
    .map(col => col.headerName)
    .join(',');

  // Format rows data
  const csvRows = rows.map(row => {
    return columns
      .filter(col => !col.hide)
      .map(col => {
        const value = row[col.field];
        
        // Skip if value is null or undefined
        if (value == null) return '""';

        // Handle date type columns
        if (col.type === 'date') {
          const dateValue = typeof value === 'string' ? new Date(value) : value;
          return `"${dateValue.toISOString().split('T')[0]}"`;
        }

        // Use column's valueFormatter if available
        if (col.valueFormatter) {
          return `"${col.valueFormatter({ value }) || ''}"`;
        }

        // Handle other types
        return `"${value}"`;
      })
      .join(',');
  });

  const csvContent = [headers, ...csvRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};