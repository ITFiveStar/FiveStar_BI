import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Alert, Typography, Grid } from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import BasePage from '../../../../components/common/BasePage';
import UploadCard from '../components/UploadCard';
import { Message, FileState } from './types';

const StatementDecomp: React.FC = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileState>({
    depositStatement: null,
    orderData: null
  });
  const [message, setMessage] = useState<Message | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, field: keyof FileState) => {
    if (event.target.files) {
      setFiles(prev => ({
        ...prev,
        [field]: event.target.files && (field === 'orderData' ? event.target.files : event.target.files[0])
      }));
    }
  };

  const getFileNames = (fileList: FileList | null | File): string => {
    if (!fileList) return 'No file chosen';
    if (fileList instanceof File) return fileList.name;
    return Array.from(fileList).map(file => file.name).join(', ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting form...');
    
    const formData = new FormData();
    if (files.depositStatement) {
      formData.append('deposit_statement', files.depositStatement);
      console.log('Added deposit statement:', files.depositStatement.name);
    }
    
    if (files.orderData) {
      Array.from(files.orderData).forEach(file => {
        formData.append('order_data', file);
        console.log('Added order data:', file.name);
      });
    }

    try {
      console.log('Sending request to /quickbooks/statement-decomp');
      const response = await fetch('/quickbooks/statement-decomp', {
        method: 'POST',
        body: formData
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.status === 'success') {
        navigate('/quickbooks/post-month-end', {
          state: { decompositionTable: data.table }
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to process files' });
      }
    } catch (error) {
      console.error('Error details:', error);
      setMessage({ type: 'error', text: 'Failed to process files' });
    }
  };

  return (
    <BasePage>
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        <Typography variant="body1" sx={{ mb: 2, fontStyle: 'italic', color: '#666' }}>
          Upload required files to obtain a decomposition of the deposited statement to guide post month-end financials booking.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <UploadCard
              id="deposit-statement"
              title="Newly Deposited Statement"
              description={<>Upload TXT file - <span style={{ color: 'red' }}>single</span> file for the statement received post month-end</>}
              acceptTypes=".txt"
              fileNames={getFileNames(files.depositStatement)}
              onChange={(e) => handleFileChange(e, 'depositStatement')}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <UploadCard
              id="order-data"
              title="Order Data History"
              description={<>Upload CSV files - at least 6 months of order data <span style={{ color: 'red' }}>before and during</span> the statement period</>}
              acceptTypes=".csv"
              multiple
              fileNames={getFileNames(files.orderData)}
              onChange={(e) => handleFileChange(e, 'orderData')}
            />
          </Grid>
        </Grid>

        <Button
          type="submit"
          variant="contained"
          startIcon={<CloudUploadIcon />}
          sx={{ mt: 3 }}
        >
          Submit and Go to Post Month-End Booking
        </Button>
      </Box>
    </BasePage>
  );
};

export default StatementDecomp;