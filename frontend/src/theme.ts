import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#47709B',
      light: '#AFC8DA',
      dark: '#345273',
    },
    secondary: {
      main: '#000000',
      light: '#333333',
      dark: '#000000',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#47709B',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '10px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          '&::placeholder': {
            color: '#9e9e9e',
            opacity: 1,
          }
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        input: {
          '&::placeholder': {
            color: '#9e9e9e',
            opacity: 1,
          }
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-input::placeholder': {
            color: '#9e9e9e',
            opacity: 1,
          }
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#9e9e9e',
          '&.Mui-focused': {
            color: '#9e9e9e'
          }
        }
      }
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: '#9e9e9e',
          '&.Mui-focused': {
            color: '#9e9e9e'
          }
        }
      }
    },
    MuiInputAdornment: {
      styleOverrides: {
        root: {
          '& .MuiButtonBase-root': {
            color: '#9e9e9e',
          }
        }
      }
    },
  },
}); 