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
import { CreateStockAdditionDto } from '../../../../types/stockAddition';

interface StockAdditionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStockAdditionDto) => void;
  title: string;
}

const StockAdditionDialog: React.FC<StockAdditionDialogProps> = ({
  open,
  onClose,
  onSubmit,
  title,
}) => {
  const [formData, setFormData] = React.useState<CreateStockAdditionDto>({
    SKU: '',
    fulfilled_quantity: 0,
    cost: 0,
    manufacture_completion_date: '',
  });
  const [errors, setErrors] = React.useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (open) {
      setFormData({
        SKU: '',
        fulfilled_quantity: 0,
        cost: 0,
        manufacture_completion_date: '',
      });
      setErrors({});
    }
  }, [open]);

  const handleChange = (field: keyof CreateStockAdditionDto) => (
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
      manufacture_completion_date: date
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!formData.SKU?.trim()) {
      newErrors.SKU = 'SKU is required';
    }
    if (!formData.fulfilled_quantity || formData.fulfilled_quantity <= 0) {
      newErrors.fulfilled_quantity = 'Valid quantity is required';
    }
    if (!formData.cost || formData.cost <= 0) {
      newErrors.cost = 'Valid cost is required';
    }
    if (!formData.manufacture_completion_date) {
      newErrors.manufacture_completion_date = 'Date is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const submitData = {
      ...formData,
      manufacture_completion_date: formData.manufacture_completion_date instanceof Date 
        ? formData.manufacture_completion_date.toISOString().split('T')[0]
        : formData.manufacture_completion_date
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
                label="SKU"
                value={formData.SKU}
                onChange={handleChange('SKU')}
                fullWidth
                error={!!errors.SKU}
                helperText={errors.SKU}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Addition Quantity"
                type="number"
                value={formData.fulfilled_quantity || ''}
                onChange={handleChange('fulfilled_quantity')}
                fullWidth
                error={!!errors.fulfilled_quantity}
                helperText={errors.fulfilled_quantity}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Cost"
                type="number"
                value={formData.cost || ''}
                onChange={handleChange('cost')}
                fullWidth
                error={!!errors.cost}
                helperText={errors.cost}
                inputProps={{ step: "0.01" }}
              />
            </Grid>
            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Addition Date"
                  value={formData.manufacture_completion_date ? new Date(formData.manufacture_completion_date) : null}
                  onChange={handleDateChange}
                  format="yyyy-MM-dd"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.manufacture_completion_date,
                      helperText: errors.manufacture_completion_date
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

export default StockAdditionDialog; 