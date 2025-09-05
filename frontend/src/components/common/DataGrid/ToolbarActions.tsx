import React from 'react';
import {
  Box,
  Button,
  IconButton,
  TextField,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { exportToCsv } from '../../../utils/exportToCsv';

interface ToolbarActionsProps {
  selected: any[];
  searchText?: string;
  onSearchChange?: (value: string) => void;
  onAdd: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  searchPlaceholder?: string;
  onBulkUpload?: () => void;
  searchWidth?: number;
  rows: any[];
  columns: any[];
  filename: string;
}

const ToolbarActions: React.FC<ToolbarActionsProps> = ({
  selected,
  searchText,
  onSearchChange,
  onAdd,
  onEdit,
  onDelete,
  searchPlaceholder = "Search...",
  onBulkUpload,
  searchWidth,
  rows,
  columns,
  filename,
}) => {
  const hasSelected = selected.length > 0;

  return (
    <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
      <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          variant="outlined"
          value={searchText}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ 
            minWidth: searchWidth || 250,
            maxWidth: '100%',
            flexGrow: 1
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onAdd}
        >
          Add
        </Button>
        {onBulkUpload && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<UploadFileIcon />}
            onClick={onBulkUpload}
          >
            Bulk Upload
          </Button>
        )}
        <Button
          startIcon={<DownloadIcon />}
          onClick={() => exportToCsv(columns, rows, filename)}
        >
          Download
        </Button>
        <Tooltip title={!hasSelected ? "Select records to edit" : ""}>
          <span>
            <IconButton
              color="primary"
              onClick={onEdit}
              disabled={!hasSelected}
            >
              <EditIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={!hasSelected ? "Select records to delete" : ""}>
          <span>
            <IconButton
              color="error"
              onClick={onDelete}
              disabled={!hasSelected}
            >
              <DeleteIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default ToolbarActions; 