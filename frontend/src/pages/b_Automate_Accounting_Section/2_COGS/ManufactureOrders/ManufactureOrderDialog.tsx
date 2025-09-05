import React, { useEffect, useState } from 'react';
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
import { ManufactureOrder } from '../../../../types/manufactureOrder';

interface ManufactureOrderDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  manufactureOrders?: ManufactureOrder[];
  products: string[];
  title: string;
}

const ManufactureOrderDialog: React.FC<ManufactureOrderDialogProps> = ({
  open,
  onClose,
  onSubmit,
  manufactureOrders,
  products,
  title,
}) => {
  const [formData, setFormData] = React.useState<{ [key: string]: any }[]>([]);
  const [errors, setErrors] = React.useState<{ [key: string]: string }[]>([]);

  useEffect(() => {
    if (manufactureOrders && manufactureOrders.length > 0) {
      setFormData(manufactureOrders.map(() => ({})));
      setErrors(manufactureOrders.map(() => ({})));
    } else {
      setFormData([{
        sku: '',
        product: '',
        manufacture_quantity: '',
        manufacture_date: '',
      }]);
      setErrors([{}]);
    }
  }, [manufactureOrders, open]);

  const handleChange = (index: number) => (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => {
      const newData = [...prev];
      newData[index] = {
        ...newData[index],
        [field]: event.target.value
      };
      return newData;
    });
  };

  const handleDateChange = (index: number) => (date: Date | null) => {
    setFormData(prev => {
      const newData = [...prev];
      newData[index] = {
        ...newData[index],
        manufacture_date: date
      };
      return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string }[] = formData.map(() => ({}));
    let hasError = false;

    formData.forEach((data, index) => {
      if (!data.sku?.trim()) {
        newErrors[index].sku = 'SKU is required';
        hasError = true;
      }
      if (!data.product?.trim()) {
        newErrors[index].product = 'Product is required';
        hasError = true;
      }
      if (!data.manufacture_quantity || data.manufacture_quantity <= 0) {
        newErrors[index].manufacture_quantity = 'Valid quantity is required';
        hasError = true;
      }
      if (!data.manufacture_date) {
        newErrors[index].manufacture_date = 'Date is required';
        hasError = true;
      }
    });

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    if (manufactureOrders) {
      onSubmit({
        update_data: formData.map(data => ({
          ...data,
          manufacture_date: data.manufacture_date instanceof Date 
            ? data.manufacture_date.toISOString().split('T')[0]
            : data.manufacture_date
        }))
      });
    } else {
      const submitData = {
        ...formData[0],
        manufacture_date: formData[0].manufacture_date instanceof Date 
          ? formData[0].manufacture_date.toISOString().split('T')[0]
          : formData[0].manufacture_date
      };
      onSubmit(submitData);
    }
  };

  const renderField = (index: number, label: string, field: string, type: string = 'text', options?: string[], disabled?: boolean) => {
    const value = disabled ? manufactureOrders?.[index]?.[field as keyof ManufactureOrder] : formData[index]?.[field];
    
    if (field === 'manufacture_date') {
      if (disabled) {
        return (
          <TextField
            label={label}
            value={value || ''}
            disabled
            fullWidth
            inputProps={{
              placeholder: 'yyyy-MM-dd'
            }}
          />
        );
      }
      return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label={label}
            value={value ? new Date(value) : null}
            onChange={handleDateChange(index)}
            disabled={disabled}
            format="yyyy-MM-dd"
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!errors[index]?.[field],
                helperText: errors[index]?.[field],
                inputProps: {
                  placeholder: 'yyyy-MM-dd'
                }
              },
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
          value={value || ''}
          onChange={handleChange(index)(field)}
          fullWidth
          error={!!errors[index]?.[field]}
          helperText={errors[index]?.[field]}
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
        value={value || ''}
        onChange={handleChange(index)(field)}
        fullWidth
        error={!!errors[index]?.[field]}
        helperText={errors[index]?.[field]}
        disabled={disabled}
      />
    );
  };

  const renderFormFields = (index: number, data?: ManufactureOrder, disabled?: boolean) => {
    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          {renderField(index, 'SKU', 'sku', 'text', undefined, disabled)}
        </Grid>
        <Grid item xs={12}>
          {renderField(index, 'Product', 'product', 'text', products, disabled)}
        </Grid>
        <Grid item xs={12}>
          {renderField(index, 'Quantity', 'manufacture_quantity', 'number', undefined, disabled)}
        </Grid>
        <Grid item xs={12}>
          {renderField(index, 'Manufacture Date', 'manufacture_date', 'date', undefined, disabled)}
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
            {manufactureOrders && manufactureOrders.length > 0 ? (
              manufactureOrders.map((mo, index) => (
                <Box key={mo.id} sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Record {index + 1}: {mo.sku} - {mo.product}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle1" sx={{ mb: 2 }}>Current Values</Typography>
                      {renderFormFields(index, mo, true)}
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle1" sx={{ mb: 2 }}>New Values</Typography>
                      {renderFormFields(index)}
                    </Grid>
                  </Grid>
                  {index < manufactureOrders.length - 1 && (
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
            {manufactureOrders ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ManufactureOrderDialog; 