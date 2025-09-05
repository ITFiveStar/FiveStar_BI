import React, { useState } from 'react';
import { Box, Button, Alert, Typography, CircularProgress, Grid } from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import BasePage from '../../../../components/common/BasePage';
import UploadCard from '../components/UploadCard';

interface FileState {
  orderData: File | null;
  skuEconomics: FileList | null;
  inboundShipping: File | null;
  depositedStatements: FileList | null;
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

const MonthEndStatement: React.FC = () => {
  const [files, setFiles] = useState<FileState>({
    orderData: null,
    skuEconomics: null,
    inboundShipping: null,
    depositedStatements: null
  });
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, field: keyof FileState) => {
    if (event.target.files) {
      setFiles(prev => ({
        ...prev,
        [field]: event.target.files && (field === 'skuEconomics' || field === 'depositedStatements' 
          ? event.target.files 
          : event.target.files[0])
      }));
    }
  };

  const getFileNames = (fileList: FileList | null | File): string => {
    if (!fileList) return 'No file chosen';
    if (fileList instanceof File) return fileList.name;
    return Array.from(fileList).map(file => file.name).join(', ');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log('Submitting form...');
    setIsLoading(true);
    setMessage(null);

    try {
      // Validate all required files are present
      if (!files.orderData || !files.skuEconomics || !files.inboundShipping || 
          !files.depositedStatements) {
        throw new Error('Please upload all required files');
      }

      const formData = new FormData();
      
      if (files.orderData) {
        formData.append('order_data', files.orderData);
        console.log('Added order data:', files.orderData.name);
      }
      
      if (files.skuEconomics) {
        Array.from(files.skuEconomics).forEach(file => {
          formData.append('sku_economics', file);
          console.log('Added SKU economics:', file.name);
        });
      }
      
      if (files.inboundShipping) {
        formData.append('inbound_shipping', files.inboundShipping);
        console.log('Added inbound shipping:', files.inboundShipping.name);
      }
      
      if (files.depositedStatements) {
        Array.from(files.depositedStatements).forEach(file => {
          formData.append('deposited_statements', file);
          console.log('Added deposited statement:', file.name);
        });
      }

      console.log('Sending request to /quickbooks/month-end-booking');
      const response = await fetch('/quickbooks/month-end-booking', {
        method: 'POST',
        body: formData
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('API endpoint not found. Please check the server is running and the endpoint is correct.');
        }
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Failed to process files (${response.status})`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (data.status === 'success') {
        setMessage({
          type: 'success',
          text: data.message || 'Files processed successfully'
        });

        // Clear files after successful submission
        setFiles({
          orderData: null,
          skuEconomics: null,
          inboundShipping: null,
          depositedStatements: null
        });
      } else {
        throw new Error(data.error || 'Failed to process files');
      }

    } catch (error) {
      console.error('Error details:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred'
      });
    } finally {
      setIsLoading(false);
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
          Upload required files to book month-end financials.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <UploadCard
              id="order-data"
              title="Amazon Order Data"
              description={<>Upload CSV file - <span style={{ color: 'red' }}>single</span> file for order month</>}
              acceptTypes=".csv"
              fileNames={getFileNames(files.orderData)}
              onChange={(e) => handleFileChange(e, 'orderData')}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <UploadCard
              id="sku-economics"
              title="SKU Economics"
              description={<>Upload CSV files - all monthly files <span style={{ color: 'red' }}>before and at</span> order month</>}
              acceptTypes=".csv"
              multiple
              fileNames={getFileNames(files.skuEconomics)}
              onChange={(e) => handleFileChange(e, 'skuEconomics')}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <UploadCard
              id="inbound-shipping"
              title="Inbound Shipping"
              description={<>Upload CSV file - <span style={{ color: 'red' }}>single</span> tracking file with all records</>}
              acceptTypes=".csv"
              fileNames={getFileNames(files.inboundShipping)}
              onChange={(e) => handleFileChange(e, 'inboundShipping')}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <UploadCard
              id="deposited-statements"
              title="Deposited Statements"
              description={<>Upload TXT files - one or more files for deposits <span style={{ color: 'red' }}>during</span> order month</>}
              acceptTypes=".txt"
              multiple
              fileNames={getFileNames(files.depositedStatements)}
              onChange={(e) => handleFileChange(e, 'depositedStatements')}
            />
          </Grid>
        </Grid>

        <Button
          type="submit"
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
          disabled={isLoading}
          sx={{ mt: 3 }}
        >
          {isLoading ? 'Processing...' : 'Submit and Book in QuickBooks'}
        </Button>
      </Box>
    </BasePage>
  );
};

export default MonthEndStatement;