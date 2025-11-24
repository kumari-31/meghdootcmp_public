import React from 'react';
import { Box, Typography, CircularProgress, Stack } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction'; // Or any other suitable icon


const LogMonitoring = () => {
    return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh', // Takes full viewport height
            backgroundColor: '#f5f5f5', // Light background
            color: '#333', // Darker text for contrast
            textAlign: 'center',
            padding: 3, // Some padding around the content
          }}
        >
          <Stack spacing={2} alignItems="center">
            {/* Icon */}
            <ConstructionIcon sx={{ fontSize: 80, color: '#ff9800' }} /> {/* Large, orange icon */}
    
            {/* Heading */}
            <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              DEVELOPMENT UNDER PROGRESS
            </Typography>
    
            {/* Subtitle/Description */}
            <Typography variant="h6" color="text.secondary">
              We're working hard to bring you an amazing experience.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Please check back soon!
            </Typography>
    
            {/* Optional: A subtle loading spinner */}
            <CircularProgress sx={{ color: '#ff9800' }} size={50} thickness={4} />
          </Stack>
        </Box>
      );
    };
    
export default LogMonitoring;