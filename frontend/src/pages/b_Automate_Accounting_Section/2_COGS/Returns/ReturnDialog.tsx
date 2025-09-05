import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { Return } from '../../../../types/return';
import { Supplier } from '../../../../types/supplier';

interface ReturnDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  returns?: Return[];
  suppliers: Supplier[];
  title: string;
}

const CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP', 'CNY'];

const ReturnDialog: React.FC<ReturnDialogProps> = ({
  open,
  onClose,
  onSubmit,
  returns,
  suppliers,
  title,
}) => {
  const [formData, setFormData] = React.useState<{ [key: string]: any }[]>([]);
  const [errors, setErrors] = React.useState<{ [key: string]: string }[]>([]);

  useEffect(() => {
    if (returns && returns.length > 0) {
      // Initialize empty form data for each record
      setFormData(returns.map(() => ({})));
      setErrors(returns.map(() => ({})));
    } else {
      // For creating new record
      setFormData([{
        return_order_id: '',
        SKU: '',
        return_date: '',
        return_quantity: '',
        return_unit_price: '',
        supplier_name: '',
        return_currency: '',
        target_currency: '',
        fx_rate: '',
      }]);
      setErrors([{}]);
    }
  }, [returns, open]);

  const handleChange = (index: number) => (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => {
      const newData = [...prev];
      newData[index] = {
        ...newData[index],
        [field]: field === 'SKU' ? event.target.value.toUpperCase() : event.target.value
      };
      return newData;
    });
  };

  const handleDateChange = (index: number) => (date: Date | null) => {
    setFormData(prev => {
      const newData = [...prev];
      newData[index] = {
        ...newData[index],
        return_date: date
      };
      return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (returns && returns.length > 0) {
      // For updates, send both selected records and update data
      const submitData = {
        selected_records: returns.map(ret => ({
          return_order_id: ret.return_order_id,
          SKU: ret.SKU,
          return_date: ret.return_date
        })),
        update_data: formData.map(data => ({
          ...data,
          return_date: data.return_date instanceof Date 
            ? data.return_date.toISOString().split('T')[0]
            : data.return_date
        }))
      };
      onSubmit(submitData);
    } else {
      // For create, just send the form data
      const submitData = formData.map(data => ({
        ...data,
        return_date: data.return_date instanceof Date 
          ? data.return_date.toISOString().split('T')[0]
          : data.return_date
      }));
      onSubmit(submitData[0]); // Send first record for create
    }
  };

  const renderField = (index: number, label: string, field: string, type: string = 'text', options?: string[], disabled: boolean = false) => {
    const displayData = disabled && returns?.[index] 
      ? returns[index] 
      : formData[index] || {};

    const value = (displayData as { [key: string]: any })[field] || '';

    if (field === 'return_date') {
      if (disabled) {
        return (
          <TextField
            label={label}
            value={displayData.return_date || ''}
            disabled
            fullWidth
          />
        );
      }
      return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label={label}
            value={displayData.return_date ? new Date(displayData.return_date) : null}
            onChange={handleDateChange(index)}
            disabled={disabled}
            format="yyyy-MM-dd"
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!errors?.[index]?.return_date,
                helperText: errors?.[index]?.return_date,
              }
            }}
          />
        </LocalizationProvider>
      );
    }

    if (options) {
      return (
        <TextField
          select
          label={label}
          fullWidth
          value={value}
          onChange={handleChange(index)(field)}
          error={!!errors?.[index]?.[field]}
          helperText={errors?.[index]?.[field]}
          disabled={disabled}
        >
          {options.map(option => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    return (
      <TextField
        label={label}
        type={type}
        fullWidth
        value={value}
        onChange={handleChange(index)(field)}
        error={!!errors?.[index]?.[field]}
        helperText={errors?.[index]?.[field]}
        disabled={disabled}
        inputProps={type === 'number' ? { step: field === 'fx_rate' ? "0.0001" : "0.01" } : {}}
      />
    );
  };

  const renderFormFields = (index: number, data?: Return, disabled: boolean = false) => {
    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          {renderField(index, 'Return ID', 'return_order_id', 'text', undefined, disabled)}
        </Grid>
        <Grid item xs={12}>
          {renderField(index, 'SKU', 'SKU', 'text', undefined, disabled)}
        </Grid>
        <Grid item xs={12}>
          {renderField(index, 'Return Date', 'return_date', 'date', undefined, disabled)}
        </Grid>
        <Grid item xs={12}>
          <TextField
            select
            label="Supplier"
            fullWidth
            value={(disabled ? data?.supplier_name : formData[index]?.supplier_name) || ''}
            onChange={handleChange(index)('supplier_name')}
            error={!!errors?.[index]?.supplier_name}
            helperText={errors?.[index]?.supplier_name}
            disabled={disabled}
          >
            {suppliers.map(supplier => (
              <MenuItem key={supplier.name} value={supplier.name}>
                {supplier.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={6}>
          {renderField(index, 'Quantity', 'return_quantity', 'number', undefined, disabled)}
        </Grid>
        <Grid item xs={6}>
          {renderField(index, 'Unit Price', 'return_unit_price', 'number', undefined, disabled)}
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          {renderField(index, 'Return Currency', 'return_currency', 'text', CURRENCIES, disabled)}
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          {renderField(index, 'Target Currency', 'target_currency', 'text', CURRENCIES, disabled)}
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          {renderField(index, 'FX Rate', 'fx_rate', 'number', undefined, disabled)}
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
            {returns && returns.length > 0 ? (
              returns.map((ret, index) => (
                <Box key={`${ret.return_order_id}_${ret.SKU}_${ret.return_date}`} sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Record {index + 1}: {ret.return_order_id} - {ret.SKU}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle1" sx={{ mb: 2 }}>Current Values</Typography>
                      {renderFormFields(index, ret, true)}
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle1" sx={{ mb: 2 }}>&nbsp;</Typography>
                      {renderFormFields(index)}
                    </Grid>
                  </Grid>
                  {index < returns.length - 1 && (
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
            {returns ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ReturnDialog; 