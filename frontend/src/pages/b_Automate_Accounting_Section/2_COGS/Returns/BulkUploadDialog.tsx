import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Link,
  Alert,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, CloudDownload as CloudDownloadIcon } from '@mui/icons-material';

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (data: any[]) => void;
}

const TEMPLATE_HEADERS = [
  'return_order_id',
  'SKU',
  'return_date',
  'return_quantity',
  'return_unit_price',
  'supplier_name',
  'return_currency',
  'target_currency',
  'fx_rate'
];

const ReturnBulkUploadDialog: React.FC<BulkUploadDialogProps> = ({
  open,
  onClose,
  onUpload,
}) => {
  const [error, setError] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [open]);

  const handleDownloadTemplate = () => {
    const csvContent = [
      TEMPLATE_HEADERS.join(','),
      'RET001,SKU1,2024-03-20,10,15.00,ADATA,USD,USD,1.0000'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'returns_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      const lines = text.split('\n');
      const headers = lines[0].trim().split(',');

      // Validate headers
      if (!TEMPLATE_HEADERS.every(h => headers.includes(h))) {
        throw new Error('CSV headers do not match template format');
      }

      // Parse data rows
      const data = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.trim().split(',');
          const record = TEMPLATE_HEADERS.reduce((obj, header, index) => {
            let value = values[index];
            if (header === 'return_date' && value) {
              const date = new Date(value);
              value = date.toISOString().split('T')[0];
            }
            if (header === 'SKU' && value) {
              value = value.toUpperCase();
            }
            obj[header] = value;
            return obj;
          }, {} as any);
          return record;
        });

      await onUpload(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to parse CSV file');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Bulk Upload Returns</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            1. Download the CSV template
          </Typography>
          <Button
            variant="contained"
            onClick={handleDownloadTemplate}
            startIcon={<CloudDownloadIcon sx={{ verticalAlign: 'middle', marginTop: '-3px' }} />}
            size="small"
            color="primary"
            sx={{ 
              mb: 3, 
              width: '200px',
              '& .MuiButton-startIcon': {
                marginRight: 1.5,
                marginTop: 0
              }
            }}
          >
            Download Template
          </Button>

          <Typography variant="body1" gutterBottom>
            2. Fill in the template with your data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Follow the example row format in the template
          </Typography>

          <Typography variant="body1" gutterBottom>
            3. Upload your completed CSV file
          </Typography>
          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUploadIcon sx={{ verticalAlign: 'middle', marginTop: '-3px' }} />}
            size="small"
            color="primary"
            sx={{ 
              mb: 2, 
              width: '200px',
              '& .MuiButton-startIcon': {
                marginRight: 1.5,
                marginTop: 0
              }
            }}
          >
            Upload CSV
            <input
              type="file"
              hidden
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileUpload}
            />
          </Button>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReturnBulkUploadDialog; 