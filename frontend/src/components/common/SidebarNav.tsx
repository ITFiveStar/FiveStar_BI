import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Typography,
  Box,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface NavItem {
  type?: 'header' | 'divider';
  label?: string;
  text?: string;
  icon?: React.ReactNode;
  path?: string;
  children?: NavItem[];
}

interface SidebarNavProps {
  items: NavItem[];
}

const SidebarNav: React.FC<SidebarNavProps> = ({ items }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const handleNavigation = (path: string | undefined) => {
    if (path) navigate(path);
  };

  return (
    <List component="nav" aria-label="sidebar navigation" disablePadding>
      {items.map((item, index) => {
        if (item.type === 'header') {
          return (
            <ListItem key={index} sx={{ py: 1.5, px: 2 }}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: '#9e9e9e' }}
              >
                {item.label}
              </Typography>
            </ListItem>
          );
        }

        if (item.type === 'divider') {
          return <Divider key={index} sx={{ my: 0 }} />;
        }

        const isSelected = currentPath === item.path;
        const hasChildren = item.children && item.children.length > 0;

        return (
          <React.Fragment key={item.path || item.text}>
            <ListItem
              className="sidebar-main-item"
              button
              selected={isSelected}
              onClick={() => handleNavigation(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'rgba(71, 112, 155, 0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(71, 112, 155, 0.15)',
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    backgroundColor: '#47709B',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(71, 112, 155, 0.05)',
                },
              }}
            >
              {item.icon && (
                <ListItemIcon
                  sx={{
                    minWidth: 42,
                    color: isSelected ? '#47709B' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
              )}
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? '#47709B' : 'inherit',
                }}
              />
            </ListItem>

            {/* Always render submenu if it exists */}
            {hasChildren && (
              <List disablePadding>
                {item.children?.map((subItem) => {
                  const isSubSelected = currentPath === subItem.path;
                  return (
                    <ListItem
                      key={subItem.path}
                      button
                      selected={isSubSelected}
                      onClick={() => handleNavigation(subItem.path)}
                      sx={{
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(71, 112, 155, 0.1)',
                          '&:hover': {
                            backgroundColor: 'rgba(71, 112, 155, 0.15)',
                          },
                        },
                        '&:hover': {
                          backgroundColor: 'rgba(71, 112, 155, 0.05)',
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 36 }} /> {/* invisible space */}
                          <ChevronRightIcon
                            fontSize="small"
                            sx={{ 
                              color: isSubSelected ? '#47709B' : 'rgba(0, 0, 0, 0.38)',
                              mr: 1,
                            }}
                          />
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={subItem.text}
                        primaryTypographyProps={{
                          fontSize: '0.9rem',
                          fontWeight: isSubSelected ? 500 : 400,
                          color: isSubSelected ? '#47709B' : 'inherit',
                        }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            )}
          </React.Fragment>
        );
      })}
    </List>
  );
};

export default SidebarNav;
export type { NavItem };
