import React from 'react';
import { Box } from '@mui/material';

interface FeatherLogoProps {
  size?: number;
  color?: string;
}

const FeatherLogo: React.FC<FeatherLogoProps> = ({ size = 48, color = '#4A90E2' }) => {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', mr: 2 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
          fill={color}
          opacity="0.1"
        />
        <path
          d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
          fill={color}
          opacity="0.3"
        />
        <path
          d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
          fill={color}
          opacity="0.5"
        />
        <path
          d="M12 12c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1z"
          fill={color}
          opacity="0.7"
        />
        <path
          d="M12 12c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1z"
          fill={color}
          opacity="0.9"
        />
      </svg>
    </Box>
  );
};

export default FeatherLogo; 