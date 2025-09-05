import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  LinearProgress,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, CloudDownload as CloudDownloadIcon } from '@mui/icons-material';
import axios from 'axios';

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (data: any[]) => void;
}

const TEMPLATE_HEADERS = [
  'sales_record_id',
  'sales_date',
  'sku',
  'quantity_sold',
  'customer_name'
];

const BATCH_SIZE = 1000; // Process 1000 records at a time

const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({
  open,
  onClose,
  onUpload,
}) => {
  const [error, setError] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setError('');
    setProgress(0);
    setProgressText('');
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [open]);

  const handleDownloadTemplate = () => {
    const csvContent = [
      TEMPLATE_HEADERS.join(','),
      'SR123,2024-03-20,SKU001,10,Customer A'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales_records_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const uploadBatch = async (records: any[], batchIndex: number, totalBatches: number) => {
    try {
      setProgressText(`Uploading batch ${batchIndex + 1} of ${totalBatches} (${records.length} records)...`);
      
      const response = await axios.post('/sales_records/bulk', {
        records: records
      });
      
      return { success: true, count: response.data.processed_count };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Unknown error occurred'
      };
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setProgress(0);
    setProgressText('');
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      setProgressText('Reading file...');
      
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

      setProgressText('Parsing data...');

      // Parse data rows
      const data = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.trim().split(',');
          const record = TEMPLATE_HEADERS.reduce((obj, header, index) => {
            let value = values[index];
            if (header === 'sales_date' && value) {
              const date = new Date(value);
              value = date.toISOString().split('T')[0];
            }
            if (header === 'sku' && value) {
              value = value.toUpperCase();
            }
            obj[header] = value;
            return obj;
          }, {} as any);
          return record;
        });

      if (data.length === 0) {
        throw new Error('No valid data rows found in the CSV file');
      }

      // Split data into batches
      const batches = [];
      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        batches.push(data.slice(i, i + BATCH_SIZE));
      }

      setProgressText(`Processing ${data.length} records in ${batches.length} batches...`);

      let totalProcessed = 0;
      const errors: string[] = [];

      // Process batches sequentially
      for (let i = 0; i < batches.length; i++) {
        const result = await uploadBatch(batches[i], i, batches.length);
        
        if (result.success) {
          totalProcessed += result.count || 0;
        } else {
          errors.push(`Batch ${i + 1}: ${result.error}`);
        }

        // Update progress
        const progressPercent = ((i + 1) / batches.length) * 100;
        setProgress(progressPercent);
      }

      if (errors.length > 0) {
        throw new Error(`Upload completed with errors:\n${errors.join('\n')}`);
      }

      setProgressText(`Successfully uploaded ${totalProcessed} sales records!`);
      
      // Call the original onUpload callback to refresh the data
      await onUpload([]);
      
      // Close dialog after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process CSV file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Dialog open={open} onClose={!uploading ? onClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle>Bulk Upload Sales Records</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {!uploading ? (
            <>
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
            </>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                {progressText}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ mt: 2, mb: 2 }}
              />
              <Typography variant="body2" color="text.secondary">
                {progress.toFixed(0)}% complete
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                {error}
              </Typography>
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Cancel'}
        </Button>
        {!uploading && (
          <Button onClick={onClose} variant="contained" color="primary">
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BulkUploadDialog; 