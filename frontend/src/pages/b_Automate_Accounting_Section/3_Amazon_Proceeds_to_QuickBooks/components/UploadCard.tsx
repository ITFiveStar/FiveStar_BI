import React from 'react';
import { Box, Typography, styled } from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';

interface UploadCardProps {
  id: string;
  title: string;
  description?: React.ReactNode;
  acceptTypes: string;
  fileNames: string;
  multiple?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const CardContainer = styled(Box)(({ theme }) => ({
  backgroundColor: '#fefefe',
  padding: theme.spacing(2),
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  marginBottom: theme.spacing(2),
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  border: '1px solid #e0e0e0',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 6px 12px rgba(71, 112, 155, 0.2)',
    borderColor: '#AFC8DA',
  },
}));

const CardTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: '#47709B',
  marginBottom: theme.spacing(1),
  display: 'flex',
  alignItems: 'center',
  '& svg': {
    marginRight: theme.spacing(1),
    color: '#47709B',
  }
}));

const CardDescription = styled(Typography)(({ theme }) => ({
  fontSize: '0.9rem',
  color: '#666',
  marginBottom: theme.spacing(1),
}));

const FileNameText = styled(Typography)(({ theme }) => ({
  fontSize: '0.85rem',
  color: '#999',
  fontStyle: 'italic',
  marginTop: 'auto',
  paddingTop: theme.spacing(1),
  borderTop: '1px dashed #eee',
  minHeight: '30px',
  maxHeight: '100px',
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#AFC8DA',
    borderRadius: '2px',
  },
}));

const UploadCard: React.FC<UploadCardProps> = ({
  id,
  title,
  description,
  acceptTypes,
  fileNames,
  multiple = false,
  onChange
}) => {
  return (
    <CardContainer>
      <input
        type="file"
        accept={acceptTypes}
        id={id}
        multiple={multiple}
        onChange={onChange}
        style={{ display: 'none' }}
      />
      <label htmlFor={id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <CardTitle variant="subtitle1">
          <CloudUploadIcon fontSize="small" />
          {title}
        </CardTitle>
        {description && (
          <CardDescription variant="body2">
            {description}
          </CardDescription>
        )}
        <FileNameText variant="body2">
          {fileNames}
        </FileNameText>
      </label>
    </CardContainer>
  );
};

export default UploadCard; 