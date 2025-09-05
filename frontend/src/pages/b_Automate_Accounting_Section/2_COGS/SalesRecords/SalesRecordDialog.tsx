import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  MenuItem,
  Box,
  Divider,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { SalesRecord } from '../../../../types/salesRecord';
import { Customer } from '../../../../types/customer';

interface SalesRecordDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  salesRecords?: SalesRecord[];
  customers: Customer[];
  title: string;
}

const SalesRecordDialog: React.FC<SalesRecordDialogProps> = ({
  open,
  onClose,
  onSubmit,
  salesRecords,
  customers,
  title,
}) => {
  const [formData, setFormData] = React.useState<{ [key: string]: any }[]>([]);
  const [errors, setErrors] = React.useState<{ [key: string]: string }[]>([]);

  useEffect(() => {
    if (salesRecords && salesRecords.length > 0) {
      // Initialize empty form data for each record
      setFormData(salesRecords.map(() => ({})));
      setErrors(salesRecords.map(() => ({})));
    } else {
      // For creating new record
      setFormData([{
        sales_record_id: '',
        sales_date: '',
        sku: '',
        quantity_sold: '',
        customer_name: '',
      }]);
      setErrors([{}]);
    }
  }, [salesRecords, open]);

  const handleChange = (index: number) => (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => {
      const newData = [...prev];
      newData[index] = {
        ...newData[index],
        [field]: field === 'sku' ? event.target.value.toUpperCase() : event.target.value
      };
      return newData;
    });
  };

  const handleDateChange = (index: number) => (date: Date | null) => {
    setFormData(prev => {
      const newData = [...prev];
      newData[index] = {
        ...newData[index],
        sales_date: date
      };
      return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (salesRecords && salesRecords.length > 0) {
      // For updates, send both selected records and update data
      const submitData = {
        selected_records: salesRecords.map(record => ({
          sales_record_id: record.sales_record_id,
          sku: record.sku
        })),
        update_data: formData.map(data => ({
          ...data,
          sales_date: data.sales_date instanceof Date 
            ? data.sales_date.toISOString().split('T')[0]
            : data.sales_date
        }))
      };
      onSubmit(submitData);
    } else {
      // For create, just send the form data
      const submitData = formData.map(data => ({
        ...data,
        sales_date: data.sales_date instanceof Date 
          ? data.sales_date.toISOString().split('T')[0]
          : data.sales_date
      }));
      onSubmit(submitData[0]); // Send first record for create
    }
  };

  const renderField = (index: number, label: string, field: string, type: string = 'text', disabled: boolean = false) => {
    const displayData = disabled && salesRecords?.[index] 
      ? salesRecords[index] 
      : formData[index] || {};

    const value = (displayData as { [key: string]: any })[field] || '';

    if (field === 'sales_date') {
      if (disabled) {
        return (
          <TextField
            label={label}
            value={displayData.sales_date || ''}
            disabled
            fullWidth
          />
        );
      }
      return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label={label}
            value={displayData.sales_date ? new Date(displayData.sales_date) : null}
            onChange={handleDateChange(index)}
            disabled={disabled}
            format="yyyy-MM-dd"
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!errors?.[index]?.sales_date,
                helperText: errors?.[index]?.sales_date,
              }
            }}
          />
        </LocalizationProvider>
      );
    }

    if (field === 'customer_name' && !disabled) {
      return (
        <TextField
          select
          fullWidth
          label={label}
          value={value}
          onChange={handleChange(index)(field)}
          error={!!errors?.[index]?.[field]}
          helperText={errors?.[index]?.[field]}
          disabled={disabled}
        >
          {customers.map((customer) => (
            <MenuItem key={customer.customer_id} value={customer.name}>
              {customer.name}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    return (
      <TextField
        fullWidth
        label={label}
        type={type}
        value={value}
        onChange={handleChange(index)(field)}
        error={!!errors?.[index]?.[field]}
        helperText={errors?.[index]?.[field]}
        disabled={disabled}
      />
    );
  };

  const renderFormFields = (index: number, data?: SalesRecord, disabled: boolean = false) => {
    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          {renderField(index, 'Sales Record ID', 'sales_record_id', 'text', disabled)}
        </Grid>
        <Grid item xs={12}>
          {renderField(index, 'SKU', 'sku', 'text', disabled)}
        </Grid>
        <Grid item xs={12}>
          {renderField(index, 'Sales Date', 'sales_date', 'date', disabled)}
        </Grid>
        <Grid item xs={12}>
          {renderField(index, 'Quantity', 'quantity_sold', 'number', disabled)}
        </Grid>
        <Grid item xs={12}>
          {renderField(index, 'Customer', 'customer_name', 'text', disabled)}
        </Grid>
      </Grid>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, maxHeight: '70vh', overflow: 'auto' }}>
            {salesRecords && salesRecords.length > 0 ? (
              salesRecords.map((record, index) => (
                <Box key={`${record.sales_record_id}_${record.sku}`} sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Record {index + 1}: {record.sales_record_id} - {record.sku}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle1" sx={{ mb: 2 }}>Current Values</Typography>
                      {renderFormFields(index, record, true)}
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle1" sx={{ mb: 2 }}>New Values</Typography>
                      {renderFormFields(index)}
                    </Grid>
                  </Grid>
                  {index < salesRecords.length - 1 && (
                    <Divider sx={{ my: 3 }} />
                  )}
                </Box>
              ))
            ) : (
              renderFormFields(0)
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            {salesRecords ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SalesRecordDialog; 