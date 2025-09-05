import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Alert, 
  Typography, 
  Paper, 
  CircularProgress,
  Grid,
  styled
} from '@mui/material';
import { 
  AccountBalance as AccountBalanceIcon,
  Calculate as CalculateIcon,
  TableView as TableViewIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate } from 'react-router-dom';
import BasePage from '../../../../components/common/BasePage';
import { format, parse, isAfter, isBefore } from 'date-fns';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ReceiptIcon from '@mui/icons-material/Receipt';

import { manufactureResultService } from '../../../../services/manufactureResultService';
import { cogsService } from '../../../../services/cogsService';

// Card styled components
const CardContainer = styled(Box)(({ theme }) => ({
  backgroundColor: '#fefefe',
  padding: theme.spacing(2),
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  marginBottom: theme.spacing(2),
  border: '1px solid #e0e0e0',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
  },
}));

const NonClickableCardContainer = styled(Box)(({ theme }) => ({
  backgroundColor: '#fefefe',
  padding: theme.spacing(2),
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  marginBottom: theme.spacing(2),
  border: '1px solid #e0e0e0',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
}));

const CardTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: '#47709B',
  marginBottom: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  '& svg': {
    marginRight: theme.spacing(1),
    color: '#47709B',
  }
}));

const CardContent = styled(Box)(({ theme }) => ({
  fontSize: '0.9rem',
  color: '#666',
  marginBottom: theme.spacing(1),
  flexGrow: 1,
}));

interface Message {
  type: 'success' | 'error';
  text: string;
}

// Interface for COGS status
interface COGSStatus {
  all_cogs_generated: boolean;
}

// Interface for Manufacture Result status
interface ManufactureResultStatus {
  all_manufacture_costs_generated: boolean;
  all_stock_exchange_generated: boolean;
}

const COGSBooking: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [cogsAmount, setCogsAmount] = useState<number | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Status checks for the cards
  const [cogsStatus, setCogsStatus] = useState<COGSStatus | null>(null);
  const [manufactureStatus, setManufactureStatus] = useState<ManufactureResultStatus | null>(null);
  
  const navigate = useNavigate();

  // Load statuses on page load
  useEffect(() => {
    loadStatusData();
  }, []);

  const loadStatusData = async () => {
    try {
      // Load COGS status
      const cogsStatusData = await cogsService.checkStatus();
      setCogsStatus(cogsStatusData);
      
      // Load Manufacture Result status
      const manufactureStatusData = await manufactureResultService.checkStatus();
      setManufactureStatus(manufactureStatusData);
    } catch (error) {
      console.error('Error loading status data:', error);
    }
  };

  // Format date as YYYY-MM-DD
  const formatDateForAPI = (date: Date | null): string => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  };

  // Format date for display
  const formatDateForDisplay = (date: Date | null): string => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  };

  const calculateCOGS = async () => {
    if (!startDate || !endDate) {
      setMessage({
        type: 'error',
        text: 'Please select both start and end dates'
      });
      return;
    }

    setIsCalculating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/cogs/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_date_start: formatDateForAPI(startDate),
          booking_date_end: formatDateForAPI(endDate)
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Failed to calculate COGS (${response.status})`);
      }

      const data = await response.json();
      setCogsAmount(data.amount);
      // setMessage({
      //   type: 'success',
      //   text: `Total COGS for the selected period: $${data.amount.toLocaleString('en-US', {
      //     minimumFractionDigits: 2,
      //     maximumFractionDigits: 2
      //   })}`
      // });
    } catch (error) {
      console.error('Error calculating COGS:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred'
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const bookCOGS = async () => {
    if (!startDate || !endDate || cogsAmount === null) {
      setMessage({
        type: 'error',
        text: 'Please calculate COGS before booking'
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/quickbooks/book-cogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_date_start: formatDateForAPI(startDate),
          booking_date_end: formatDateForAPI(endDate)
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Failed to book COGS (${response.status})`);
      }

      const data = await response.json();
      setMessage({
        type: 'success',
        text: `Successfully booked $${data.amount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })} of COGS to QuickBooks for period ${data.period}`
      });
    } catch (error) {
      console.error('Error booking COGS:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToCOGSPage = () => {
    navigate('/automate-accounting/cogs-results');
  };
  
  const navigateToManufactureResultsPage = () => {
    navigate('/automate-accounting/manufacture-results');
  };

  return (
    <BasePage>
      {/* Three-Card Layout */}
      <Box sx={{ height: '25%', maxHeight: '200px', mb: 2, mt: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Card 1: Action Guider - Manufacture Cost */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <CardContainer 
              sx={{ height: '100%', overflow: 'hidden' }}
              onClick={navigateToManufactureResultsPage}
            >
              <CardTitle variant="subtitle1">
                <AssignmentTurnedInIcon fontSize="small" />
                Action Guider - Manufacture Cost
              </CardTitle>
              <CardContent>
                {manufactureStatus ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" fontSize="1.2rem" color="black" mb={1}>
                      {manufactureStatus.all_manufacture_costs_generated && manufactureStatus.all_stock_exchange_generated ? (
                        "No Action Needed"
                      ) : (
                        "Take Action"
                      )}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      Cost Calculated for All Manufacture Orders: {manufactureStatus.all_manufacture_costs_generated ? (
                        <span style={{ color: 'green' }}>Yes</span>
                      ) : (
                        <span style={{ color: 'red' }}>No</span>
                      )}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      Stock Exchange Refreshed for All Requests: {manufactureStatus.all_stock_exchange_generated ? (
                        <span style={{ color: 'green' }}>Yes</span>
                      ) : (
                        <span style={{ color: 'red' }}>No</span>
                      )}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2">Loading status information...</Typography>
                )}
              </CardContent>
            </CardContainer>
          </Grid>
          
          {/* Card 2: Action Guider - COGS */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <CardContainer 
              sx={{ height: '100%', overflow: 'hidden' }}
              onClick={navigateToCOGSPage}
            >
              <CardTitle variant="subtitle1">
                <ReceiptIcon fontSize="small" />
                Action Guider - COGS
              </CardTitle>
              <CardContent>
                {cogsStatus ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" fontSize="1.2rem" color="black" mb={1}>
                      {cogsStatus.all_cogs_generated ? "No Action Needed" : "Take Action"}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      COGS Generated for All Sales Records: {cogsStatus.all_cogs_generated ? (
                        <span style={{ color: 'green' }}>Yes</span>
                      ) : (
                        <span style={{ color: 'red' }}>No</span>
                      )}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2">Loading status information...</Typography>
                )}
              </CardContent>
            </CardContainer>
          </Grid>
          
          {/* Card 3: COGS Booking Preview */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <NonClickableCardContainer sx={{ height: '100%', overflow: 'hidden' }}>
              <CardTitle variant="subtitle1">
                <CalendarMonthIcon fontSize="small" />
                COGS Booking Preview
              </CardTitle>
              <CardContent>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <DatePicker
                        label="Start Date"
                        value={startDate}
                        onChange={(newValue) => setStartDate(newValue)}
                        format="yyyy-MM-dd"
                        slotProps={{ 
                          textField: { 
                            size: "small", 
                            fullWidth: true,
                            placeholder: 'YYYY-MM-DD',
                            sx: { 
                              '& .MuiInputBase-input::placeholder': {
                                color: '#9e9e9e',
                                opacity: 1
                              },
                              '& input': {
                                '&::placeholder': {
                                  color: '#9e9e9e',
                                  opacity: 1
                                }
                              }
                            }
                          } 
                        }}
                        maxDate={endDate || undefined}
                        shouldDisableDate={(date) => 
                          endDate ? isAfter(date, endDate) : false
                        }
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <DatePicker
                        label="End Date"
                        value={endDate}
                        onChange={(newValue) => setEndDate(newValue)}
                        format="yyyy-MM-dd"
                        slotProps={{ 
                          textField: { 
                            size: "small",
                            fullWidth: true,
                            placeholder: 'YYYY-MM-DD',
                            sx: { 
                              '& .MuiInputBase-input::placeholder': {
                                color: '#9e9e9e',
                                opacity: 1
                              },
                              '& input': {
                                '&::placeholder': {
                                  color: '#9e9e9e',
                                  opacity: 1
                                }
                              }
                            }
                          } 
                        }}
                        minDate={startDate || undefined}
                        shouldDisableDate={(date) => 
                          startDate ? isBefore(date, startDate) : false
                        }
                      />
                    </Grid>
                  </Grid>
                </LocalizationProvider>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'stretch', width: '100%' }}>
                  <Button
                    variant="contained"
                    size="small"
                    fullWidth
                    startIcon={isCalculating ? <CircularProgress size={16} color="inherit" /> : <CalculateIcon />}
                    onClick={calculateCOGS}
                    disabled={isCalculating || !startDate || !endDate}
                  >
                    {isCalculating ? 'Calculating...' : 'Calculate COGS'}
                  </Button>
                </Box>
              </CardContent>
            </NonClickableCardContainer>
          </Grid>
        </Grid>
      </Box>

      {cogsAmount !== null && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
            COGS Summary
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 3 }}>
            <strong>Period:</strong> {formatDateForAPI(startDate)} to {formatDateForAPI(endDate)}
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 3 }}>
            <strong>Total COGS:</strong> ${cogsAmount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<TableViewIcon />}
              onClick={navigateToCOGSPage}
            >
              View COGS Details
            </Button>
            
            <Button
              variant="contained"
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <AccountBalanceIcon />}
              onClick={bookCOGS}
              disabled={isLoading}
            >
              {isLoading ? 'Booking...' : 'Book COGS to QuickBooks'}
            </Button>
          </Box>
        </Paper>
      )}

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

    </BasePage>
  );
};

export default COGSBooking;