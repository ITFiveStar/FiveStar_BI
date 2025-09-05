// Create this file at: frontend/src/components/Charts/nivoTheme.ts

import { Theme } from '@nivo/core'

// Create a custom theme that matches your application styling
export const nivoTheme: Theme = {
  background: 'transparent',
  axis: {
    domain: {
      line: {
        stroke: '#AFC8DA',
        strokeWidth: 1
      }
    },
    ticks: {
      line: {
        stroke: 'none',    
        strokeWidth: 0
        // stroke: '#AFC8DA',
        // strokeWidth: 1
      },
      text: {
        // fill: '#47709B',
        fontSize: 12,
        fontWeight: 600
      }
    },
    legend: {
      text: {
        fill: '#47709B',
        fontSize: 12,
        fontWeight: 600
      }
    }
  },
  grid: {
    line: {
      stroke: '#E5EEF6', // Very light blue, derived from #AFC8DA
      strokeWidth: 1
    }
  },
  legends: {
    text: {
      fill: '#47709B',
      fontSize: 12,
      fontWeight: 500
    }
  },
  labels: {
    text: {
      fontSize: 12,
      fill: '#000000'
    }
  },
  dots: {
    text: {
      fontSize: 12,
      fill: '#000000'
    }
  },
  tooltip: {
    container: {
      background: '#FFFFFF',
      fontSize: 12,
      borderRadius: 4,
      boxShadow: '0 1px 4px rgba(71, 112, 155, 0.25)', // #47709B with transparency
      padding: '8px 12px',
      color: '#000000',
      border: '1px solid #AFC8DA'
    }
  },
  annotations: {
    text: {
      fontSize: 12,
      fill: '#47709B'
    },
    link: {
      stroke: '#47709B',
      strokeWidth: 1
    },
    outline: {
      fill: 'none',
      stroke: '#47709B',
      strokeWidth: 1
    },
    symbol: {
      fill: '#47709B'
    }
  }
}