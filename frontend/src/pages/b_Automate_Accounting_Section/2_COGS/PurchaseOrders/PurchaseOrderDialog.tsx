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
import { PurchaseOrder } from '../../../../types/purchaseOrder';

interface PurchaseOrderDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  purchaseOrders?: PurchaseOrder[];
  suppliers: { name: string }[]; // For supplier dropdown
  title: string;
}

const CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP', 'CNY'];  // Add more as needed

const PurchaseOrderDialog: React.FC<PurchaseOrderDialogProps> = ({
  open,
  onClose,
  onSubmit,
  purchaseOrders,
  suppliers,
  title,
}) => {
  const [formData, setFormData] = React.useState<{ [key: string]: any }[]>([]);
  const [errors, setErrors] = React.useState<{ [key: string]: string }[]>([]);

  useEffect(() => {
    if (purchaseOrders && purchaseOrders.length > 0) {
      // Initialize empty form data for each record
      setFormData(purchaseOrders.map(() => ({})));
      setErrors(purchaseOrders.map(() => ({})));
    } else {
      // For creating new record
      const today = new Date();
      setFormData([{
        purchase_order_id: '',
        supplier_name: '',
        order_date: '',
        product: '',
        purchase_quantity: '',
        purchase_unit_price: '',
        purchase_currency: '',
        target_currency: '',
        fx_rate: '',
      }]);
      setErrors([{}]);
    }
  }, [purchaseOrders, open]);

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
        order_date: date
      };
      return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (purchaseOrders && purchaseOrders.length > 0) {
      // For updates, send both selected records and update data
      const submitData = {
        selected_records: purchaseOrders.map(po => ({
          purchase_order_id: po.purchase_order_id,
          product: po.product
        })),
        update_data: formData.map(data => ({
          ...data,
          order_date: data.order_date instanceof Date 
            ? data.order_date.toISOString().split('T')[0]
            : data.order_date
        }))
      };
      onSubmit(submitData);
    } else {
      // For create, just send the form data
      const submitData = formData.map(data => ({
        ...data,
        order_date: data.order_date instanceof Date 
          ? data.order_date.toISOString().split('T')[0]
          : data.order_date
      }));
      onSubmit(submitData[0]); // Send first record for create
    }
  };

  const renderField = (index: number, label: string, field: string, type: string = 'text', options?: string[], disabled: boolean = false) => {
    const displayData = disabled && purchaseOrders?.[index] 
      ? purchaseOrders[index] 
      : formData[index] || {};

    const commonProps = {
      fullWidth: true,
      value: displayData[field as keyof typeof displayData] || '',
      onChange: handleChange(index)(field),
      error: !!errors?.[index]?.[field],  // Add optional chaining
      helperText: errors?.[index]?.[field],  // Add optional chaining
      disabled,
    };

    if (field === 'order_date') {
      if (disabled) {
        return (
          <TextField
            label={label}
            value={displayData.order_date || ''}
            disabled
            fullWidth
          />
        );
      }
      return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label={label}
            value={displayData.order_date ? new Date(displayData.order_date) : null}
            onChange={handleDateChange(index)}
            disabled={disabled}
            format="yyyy-MM-dd"
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!errors?.[index]?.order_date,
                helperText: errors?.[index]?.order_date,
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
          {...commonProps}
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
        {...commonProps}
        inputProps={type === 'number' ? { step: type === 'number' && field.includes('fx_rate') ? "0.0001" : "0.01" } : {}}
      />
    );
  };

  const renderFormFields = (index: number, data?: PurchaseOrder, disabled: boolean = false) => {
    const displayData = disabled ? data || {} : formData[index] || {};  // Add fallback empty object
    
    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          {renderField(index, 'PO ID', 'purchase_order_id', 'text', undefined, disabled)}
        </Grid>
        <Grid item xs={12}>
          <TextField
            select
            label="Supplier"
            fullWidth
            value={displayData.supplier_name || ''}
            onChange={handleChange(index)('supplier_name')}
            error={!!errors?.[index]?.supplier_name}  // Add optional chaining
            helperText={errors?.[index]?.supplier_name}  // Add optional chaining
            disabled={disabled}
          >
            {suppliers.map(supplier => (
              <MenuItem key={supplier.name} value={supplier.name}>
                {supplier.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          {renderField(index, 'Order Date', 'order_date', 'date', undefined, disabled)}
        </Grid>
        <Grid item xs={12}>
          {renderField(index, 'Product', 'product', 'text', undefined, disabled)}
        </Grid>
        <Grid item xs={6}>
          {renderField(index, 'Quantity', 'purchase_quantity', 'number', undefined, disabled)}
        </Grid>
        <Grid item xs={6}>
          {renderField(index, 'Unit Price', 'purchase_unit_price', 'number', undefined, disabled)}
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          {renderField(index, 'Purchase Currency', 'purchase_currency', 'text', CURRENCIES, disabled)}
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
          <Box sx={{ mt: 2, maxHeight: '70vh', overflow: 'auto' }}>  {/* Make content scrollable */}
            {purchaseOrders && purchaseOrders.length > 0 ? (
              purchaseOrders.map((po, index) => (
                <Box key={`${po.purchase_order_id}_${po.product}`} sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Record {index + 1}: {po.purchase_order_id} - {po.product}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle1" sx={{ mb: 2 }}>Current Values</Typography>
                      {renderFormFields(index, po, true)}
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle1" sx={{ mb: 2 }}>New Values</Typography>
                      {renderFormFields(index)}
                    </Grid>
                  </Grid>
                  {index < purchaseOrders.length - 1 && (
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
            {purchaseOrders ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PurchaseOrderDialog; 