export const dataGridStyles = {
  height: '100%',
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  border: 'none',
  overflow: 'auto', // Add this to ensure scrollbars appear
  
  // Make sure the virtual scroller shows scrollbars when needed
  '& .MuiDataGrid-virtualScroller': {
    '&::-webkit-scrollbar': {
      width: '4px',
      backgroundColor: '#f5f5f5',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: '#c1c1c1',
      borderRadius: '4px',
    }
  },

  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: '#E8F4FF',  // Match our light blue color style
    padding: 0, // Remove left padding, keep right padding
    '& .MuiDataGrid-columnHeaderTitle': {
      fontWeight: 'bold'
    },
    borderBottom: 'none' // Remove bottom border of headers
  },

  '& .MuiDataGrid-footerContainer': {
    borderTop: 'none',  // Remove the top border for the footer
    marginTop: 0,       // Remove top margin
    marginBottom: 0,    // Remove bottom margin
    paddingBottom: 0,   // Remove bottom padding
    padding: 0,  // Remove all padding
    height: 'auto',  // Let the height be determined by content
    maxHeight: '36px',  // Minimum height just enough for the pagination controls
    '& .MuiToolbar-root': {
      maxHeight: '36px'  // Also control the height of the toolbar itself
    }
  },

  '& .MuiTablePagination-root': {
    margin: 0,
    padding: 0,
    height: 'auto',
    maxHeight: '36px',
    overflow: 'hidden'
  },

  '& .MuiTablePagination-toolbar': {
    margin: 0,
    padding: 0,
    maxHeight: '36px',
    height: 'auto'
  },

  '& .MuiDataGrid-columnSeparator': {
    display: 'none' // Remove the column separators
  },

  '& .MuiDataGrid-main': {
    border: 'none' // Remove borders from the main container
  }
}; 