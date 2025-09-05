import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { CreateStockExchangeDto } from '../../../../types/stockExchange';

interface StockExchangeDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStockExchangeDto) => void;
  title: string;
}

const StockExchangeDialog: React.FC<StockExchangeDialogProps> = ({
  open,
  onClose,
  onSubmit,
  title,
}) => {
  const [formData, setFormData] = React.useState<CreateStockExchangeDto>({
    SKU_original: '',
    SKU_new: '',
    quantity: 0,
    exchange_date: '',
  });
  const [errors, setErrors] = React.useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (open) {
      setFormData({
        SKU_original: '',
        SKU_new: '',
        quantity: 0,
        exchange_date: '',
      });
      setErrors({});
    }
  }, [open]);

  const handleChange = (field: keyof CreateStockExchangeDto) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleDateChange = (date: Date | null) => {
    setFormData(prev => ({
      ...prev,
      exchange_date: date
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!formData.SKU_original?.trim()) {
      newErrors.SKU_original = 'Original SKU is required';
    }
    if (!formData.SKU_new?.trim()) {
      newErrors.SKU_new = 'New SKU is required';
    }
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Valid quantity is required';
    }
    if (!formData.exchange_date) {
      newErrors.exchange_date = 'Date is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const submitData = {
      ...formData,
      exchange_date: formData.exchange_date instanceof Date 
        ? formData.exchange_date.toISOString().split('T')[0]
        : formData.exchange_date
    };

    onSubmit(submitData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Original SKU"
                value={formData.SKU_original}
                onChange={handleChange('SKU_original')}
                fullWidth
                error={!!errors.SKU_original}
                helperText={errors.SKU_original}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="New SKU"
                value={formData.SKU_new}
                onChange={handleChange('SKU_new')}
                fullWidth
                error={!!errors.SKU_new}
                helperText={errors.SKU_new}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Exchange Quantity"
                type="number"
                value={formData.quantity || ''}
                onChange={handleChange('quantity')}
                fullWidth
                error={!!errors.quantity}
                helperText={errors.quantity}
              />
            </Grid>
            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Exchange Date"
                  value={formData.exchange_date ? new Date(formData.exchange_date) : null}
                  onChange={handleDateChange}
                  format="yyyy-MM-dd"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.exchange_date,
                      helperText: errors.exchange_date
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            Add
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default StockExchangeDialog; 