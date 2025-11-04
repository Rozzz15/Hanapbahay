import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  size?: number;
  showLabels?: boolean;
  showLegend?: boolean;
}

export default function PieChart({ 
  data, 
  size = 200, 
  showLabels = true,
  showLegend = true 
}: PieChartProps) {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  const innerRadius = size * 0.2; // For donut chart effect
  
  // Validate data prop
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.chartContainer, { width: size, height: size }]}>
          <Text style={styles.noDataText}>No data available</Text>
        </View>
      </View>
    );
  }
  
  // Calculate total
  const total = data.reduce((sum, item) => sum + (item?.value || 0), 0);
  
  if (total === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.chartContainer, { width: size, height: size }]}>
          <Text style={styles.noDataText}>No data available</Text>
        </View>
      </View>
    );
  }
  
  // Calculate angles and paths
  let currentAngle = -90; // Start from top
  const paths = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    // Calculate start and end points for outer arc
    const startX = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
    const startY = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
    const endX = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
    const endY = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
    
    // Calculate start and end points for inner arc
    const innerStartX = centerX + innerRadius * Math.cos((startAngle * Math.PI) / 180);
    const innerStartY = centerY + innerRadius * Math.sin((startAngle * Math.PI) / 180);
    const innerEndX = centerX + innerRadius * Math.cos((endAngle * Math.PI) / 180);
    const innerEndY = centerY + innerRadius * Math.sin((endAngle * Math.PI) / 180);
    
    // Determine if arc is large (>180 degrees)
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    // Create path for donut segment
    const path = `M ${startX} ${startY} 
                  A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}
                  L ${innerEndX} ${innerEndY}
                  A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY}
                  Z`;
    
    // Calculate label position (middle of segment)
    const labelAngle = (startAngle + endAngle) / 2;
    const labelRadius = (radius + innerRadius) / 2;
    const labelX = centerX + labelRadius * Math.cos((labelAngle * Math.PI) / 180);
    const labelY = centerY + labelRadius * Math.sin((labelAngle * Math.PI) / 180);
    
    currentAngle += angle;
    
    return {
      path,
      color: item.color,
      label: item.label,
      value: item.value,
      percentage,
      labelX,
      labelY,
      labelAngle,
    };
  });
  
  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G>
            {paths.map((segment, index) => (
              <Path
                key={index}
                d={segment.path}
                fill={segment.color}
                stroke="#FFFFFF"
                strokeWidth={3}
                opacity={0.95}
              />
            ))}
          </G>
          
          {showLabels && paths.map((segment, index) => {
            if (segment.value === 0) return null;
            // Only show label if segment is large enough (>5%)
            if (segment.percentage < 5) return null;
            
            return (
              <SvgText
                key={`label-${index}`}
                x={segment.labelX}
                y={segment.labelY + 4}
                fontSize={12}
                fontWeight="600"
                fill="#fff"
                textAnchor="middle"
              >
                {segment.percentage.toFixed(0)}%
              </SvgText>
            );
          })}
          
          {/* Center circle with total */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={innerRadius - 5}
            fill="#FFFFFF"
            stroke="#E5E7EB"
            strokeWidth={2}
          />
          <SvgText
            x={centerX}
            y={centerY - 6}
            fontSize={24}
            fontWeight="700"
            fill="#111827"
            textAnchor="middle"
          >
            {total}
          </SvgText>
          <SvgText
            x={centerX}
            y={centerY + 14}
            fontSize={13}
            fontWeight="600"
            fill="#6B7280"
            textAnchor="middle"
          >
            Total
          </SvgText>
        </Svg>
      </View>
      
      {showLegend && (
        <View style={styles.legend}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
              <Text style={styles.legendValue}>
                {item.value} ({((item.value / total) * 100).toFixed(1)}%)
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  noDataText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  legend: {
    marginTop: 24,
    width: '100%',
    gap: 12,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 6,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  legendLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  legendValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
  },
});

